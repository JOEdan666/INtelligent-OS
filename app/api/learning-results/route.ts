import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/app/lib/auth-user';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: '缺少conversationId参数' },
        { status: 400 }
      );
    }

    // 获取学习会话数据
    const session = await prisma.learningSession.findFirst({
      where: { conversationId, userId },
      include: {
        quizQuestions: true,
        userAnswers: true
      }
    });

    if (!session) {
      return NextResponse.json(
        { error: '未找到学习会话' },
        { status: 404 }
      );
    }

    // 获取学习统计数据
    const stats = await prisma.learningStats.findFirst({
      where: { conversationId, userId }
    });

    // 计算真实的测验成绩
    const totalQuestions = session.quizQuestions.length;
    const correctAnswers = session.userAnswers.filter(answer => answer.isCorrect).length;
    const totalScore = session.userAnswers.reduce((sum, answer) => sum + (typeof answer.score === 'number' ? answer.score : 0), 0);
    const maxPossibleScore = session.quizQuestions.reduce((sum, question) => sum + (typeof question.points === 'number' ? question.points : 1), 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // 新的加权掌握度计算
    // - Quiz accuracy: 40%
    // - Question difficulty bonus: 20%
    // - Time efficiency: 15%
    // - Completion rate: 15%
    // - Streak bonus: 10%
    const weightedMastery = calculateWeightedMastery(
      session.quizQuestions,
      session.userAnswers,
      stats,
      session.isCompleted
    );

    // 计算理解程度（基于加权掌握度）
    let understandingLevel = 1;
    if (weightedMastery.totalScore >= 90) understandingLevel = 5;
    else if (weightedMastery.totalScore >= 80) understandingLevel = 4;
    else if (weightedMastery.totalScore >= 70) understandingLevel = 3;
    else if (weightedMastery.totalScore >= 60) understandingLevel = 2;

    // 计算学习时长
    const learningDuration = stats?.totalTimeSpent || 0;

    // 分析错误题目
    const wrongAnswers = session.userAnswers.filter(answer => !answer.isCorrect);
    const errorAnalysis = wrongAnswers.map(answer => {
      const question = session.quizQuestions.find(q => q.id === answer.questionId);
      return {
        questionId: answer.questionId,
        question: question?.question || '',
        userAnswer: answer.userAnswer,
        correctAnswer: question?.correctAnswer || '',
        explanation: question?.explanation || ''
      };
    });

    // 生成学习建议
    const suggestions = [];
    if (accuracy < 60) {
      suggestions.push('建议重新学习基础概念');
      suggestions.push('增加练习题的数量');
    } else if (accuracy < 80) {
      suggestions.push('加强对错误题目的理解');
      suggestions.push('复习相关知识点');
    } else {
      suggestions.push('继续保持良好的学习状态');
      suggestions.push('可以尝试更有挑战性的内容');
    }

    // 返回真实的学习成果数据
    const learningResults = {
      // 基础数据
      conversationId,
      subject: session.subject,
      topic: session.topic,
      
      // 测验成绩
      quiz: {
        totalQuestions,
        correctAnswers,
        wrongAnswers: totalQuestions - correctAnswers,
        totalScore,
        maxPossibleScore,
        accuracy,
        scorePercentage: maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0
      },
      
      // 理解程度
      understanding: {
        level: understandingLevel,
        description: getUnderstandingDescription(understandingLevel)
      },

      // 加权掌握度 (新的评分体系)
      mastery: {
        score: weightedMastery.totalScore,
        breakdown: weightedMastery.breakdown
      },
      
      // 学习时长
      duration: {
        total: learningDuration,
        explanation: stats?.explanationTime || 0,
        coaching: stats?.coachingTime || 0,
        quiz: stats?.quizTime || 0
      },
      
      // 错误分析
      errorAnalysis,
      
      // 学习建议
      suggestions,
      
      // 学习效率
      efficiency: {
        score: learningDuration > 0 ? Math.round(accuracy / learningDuration * 10) : 0,
        level: getEfficiencyLevel(learningDuration > 0 ? Math.round(accuracy / learningDuration * 10) : 0)
      },
      
      // 时间戳
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };

    return NextResponse.json(learningResults);

  } catch (error) {
    console.error('获取学习成果失败:', error);
    return NextResponse.json(
      { error: '获取学习成果失败' },
      { status: 500 }
    );
  }
}

// 新的加权掌握度计算函数
// Weights: Quiz accuracy 40%, Difficulty bonus 20%, Time efficiency 15%, Completion 15%, Streak 10%
function calculateWeightedMastery(
  questions: any[],
  answers: any[],
  stats: any,
  isCompleted: boolean
): {
  totalScore: number;
  breakdown: {
    quizAccuracy: number;
    difficultyBonus: number;
    timeEfficiency: number;
    completionRate: number;
    streakBonus: number;
  };
} {
  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return {
      totalScore: 0,
      breakdown: { quizAccuracy: 0, difficultyBonus: 0, timeEfficiency: 0, completionRate: 0, streakBonus: 0 }
    };
  }

  // 1. Quiz Accuracy (40%)
  const correctCount = answers.filter(a => a.isCorrect).length;
  const quizAccuracy = (correctCount / totalQuestions) * 100;
  const quizScore = quizAccuracy * 0.4;

  // 2. Difficulty Bonus (20%)
  // Give bonus points for answering harder questions correctly
  let difficultyBonus = 0;
  answers.forEach(answer => {
    if (answer.isCorrect) {
      const question = questions.find(q => q.id === answer.questionId);
      if (question) {
        const difficulty = question.difficulty || 'medium';
        if (difficulty === 'hard') difficultyBonus += 3;
        else if (difficulty === 'medium') difficultyBonus += 2;
        else difficultyBonus += 1;
      }
    }
  });
  const maxDifficultyBonus = totalQuestions * 3; // max if all hard questions correct
  const difficultyScore = (difficultyBonus / maxDifficultyBonus) * 100 * 0.2;

  // 3. Time Efficiency (15%)
  // Faster completion = better score, but not too fast (might indicate guessing)
  let timeEfficiency = 50; // default middle score
  if (stats?.totalTimeSpent && totalQuestions > 0) {
    const avgTimePerQuestion = stats.totalTimeSpent / totalQuestions / 1000; // in seconds
    if (avgTimePerQuestion >= 10 && avgTimePerQuestion <= 60) {
      timeEfficiency = 100; // optimal range
    } else if (avgTimePerQuestion > 60 && avgTimePerQuestion <= 120) {
      timeEfficiency = 80;
    } else if (avgTimePerQuestion < 10) {
      timeEfficiency = 40; // too fast, might be guessing
    } else {
      timeEfficiency = 60; // too slow
    }
  }
  const timeScore = timeEfficiency * 0.15;

  // 4. Completion Rate (15%)
  const completionRate = isCompleted ? 100 : (answers.length / Math.max(totalQuestions, 1)) * 100;
  const completionScore = completionRate * 0.15;

  // 5. Streak Bonus (10%)
  // Consecutive correct answers bonus
  let maxStreak = 0;
  let currentStreak = 0;
  const sortedAnswers = [...answers].sort((a, b) =>
    new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime()
  );
  sortedAnswers.forEach(answer => {
    if (answer.isCorrect) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });
  const streakBonus = Math.min((maxStreak / totalQuestions) * 100, 100);
  const streakScore = streakBonus * 0.1;

  const totalScore = Math.round(quizScore + difficultyScore + timeScore + completionScore + streakScore);

  return {
    totalScore: Math.min(totalScore, 100),
    breakdown: {
      quizAccuracy: Math.round(quizAccuracy),
      difficultyBonus: Math.round((difficultyBonus / maxDifficultyBonus) * 100),
      timeEfficiency: Math.round(timeEfficiency),
      completionRate: Math.round(completionRate),
      streakBonus: Math.round(streakBonus)
    }
  };
}

// 辅助函数：获取理解程度描述
function getUnderstandingDescription(level: number): string {
  switch (level) {
    case 5: return '完全掌握';
    case 4: return '理解良好';
    case 3: return '基本理解';
    case 2: return '部分理解';
    case 1: return '需要加强';
    default: return '未评估';
  }
}

// 辅助函数：获取学习效率等级
function getEfficiencyLevel(score: number): string {
  if (score > 8) return '高效';
  if (score > 5) return '中等';
  return '待提升';
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { conversationId, manualScore, manualTotal } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: '缺少conversationId参数' },
        { status: 400 }
      );
    }

    const session = await prisma.learningSession.findFirst({
      where: { conversationId, userId },
      select: { id: true }
    });

    if (!session) {
      return NextResponse.json({ error: '未找到学习会话' }, { status: 404 });
    }

    // 如果提供了手动数据，更新学习统计
    if (manualScore !== undefined && manualTotal !== undefined) {
      await prisma.learningStats.upsert({
        where: { conversationId },
        update: {
          userId,
          totalQuestions: manualTotal,
          correctAnswers: manualScore,
          accuracy: (manualScore / manualTotal) * 100,
          updatedAt: new Date()
        },
        create: {
          conversationId,
          userId,
          totalQuestions: manualTotal,
          correctAnswers: manualScore,
          accuracy: (manualScore / manualTotal) * 100
        }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('更新学习成果失败:', error);
    return NextResponse.json(
      { error: '更新学习成果失败' },
      { status: 500 }
    );
  }
}
