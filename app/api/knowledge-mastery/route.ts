import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// 知识点掌握度数据结构
interface TopicMastery {
  topic: string;
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  masteryRate: number; // 0-100
  lastPracticed: Date | null;
  trend: 'improving' | 'stable' | 'declining'; // 趋势
  weakPoints: string[]; // 薄弱知识点
}

// 科目掌握度汇总
interface SubjectMastery {
  subject: string;
  overallMastery: number;
  totalQuestions: number;
  correctAnswers: number;
  topics: TopicMastery[];
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const grade = searchParams.get('grade');
    const days = parseInt(searchParams.get('days') || '30'); // 默认统计30天

    // 计算日期范围
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 查询学习会话和答题记录
    const sessions = await prisma.learningSession.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        ...(subject && { subject }),
        ...(grade && { grade }),
      },
      include: {
        userAnswers: {
          include: {
            question: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 按科目和知识点聚合数据
    const masteryMap = new Map<string, Map<string, {
      totalQuestions: number;
      correctAnswers: number;
      lastPracticed: Date | null;
      recentScores: number[]; // 最近5次的分数，用于计算趋势
    }>>();

    for (const session of sessions) {
      const subjectKey = session.subject;
      const topicKey = session.topic;

      if (!masteryMap.has(subjectKey)) {
        masteryMap.set(subjectKey, new Map());
      }

      const subjectMap = masteryMap.get(subjectKey)!;
      if (!subjectMap.has(topicKey)) {
        subjectMap.set(topicKey, {
          totalQuestions: 0,
          correctAnswers: 0,
          lastPracticed: null,
          recentScores: [],
        });
      }

      const topicData = subjectMap.get(topicKey)!;

      for (const answer of session.userAnswers) {
        topicData.totalQuestions++;
        if (answer.isCorrect) {
          topicData.correctAnswers++;
        }
      }

      // 更新最后练习时间
      if (!topicData.lastPracticed || session.createdAt > topicData.lastPracticed) {
        topicData.lastPracticed = session.createdAt;
      }

      // 记录本次会话的正确率（用于趋势分析）
      if (session.userAnswers.length > 0) {
        const sessionScore = session.userAnswers.filter(a => a.isCorrect).length / session.userAnswers.length * 100;
        topicData.recentScores.push(sessionScore);
        if (topicData.recentScores.length > 5) {
          topicData.recentScores.shift(); // 只保留最近5次
        }
      }
    }

    // 转换为返回格式
    const subjectMasteries: SubjectMastery[] = [];

    masteryMap.forEach((topicMap, subjectKey) => {
      const topics: TopicMastery[] = [];
      let totalSubjectQuestions = 0;
      let totalSubjectCorrect = 0;

      topicMap.forEach((data, topicKey) => {
        const masteryRate = data.totalQuestions > 0
          ? Math.round(data.correctAnswers / data.totalQuestions * 100)
          : 0;

        // 计算趋势
        let trend: 'improving' | 'stable' | 'declining' = 'stable';
        if (data.recentScores.length >= 3) {
          const recent = data.recentScores.slice(-3);
          const earlier = data.recentScores.slice(0, -3);
          if (earlier.length > 0) {
            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
            if (recentAvg - earlierAvg > 10) trend = 'improving';
            else if (earlierAvg - recentAvg > 10) trend = 'declining';
          }
        }

        // 识别薄弱点（正确率低于60%的视为薄弱）
        const weakPoints: string[] = [];
        if (masteryRate < 60 && data.totalQuestions >= 3) {
          weakPoints.push(topicKey);
        }

        topics.push({
          topic: topicKey,
          subject: subjectKey,
          totalQuestions: data.totalQuestions,
          correctAnswers: data.correctAnswers,
          masteryRate,
          lastPracticed: data.lastPracticed,
          trend,
          weakPoints,
        });

        totalSubjectQuestions += data.totalQuestions;
        totalSubjectCorrect += data.correctAnswers;
      });

      // 按掌握度排序（低的排前面，方便看薄弱点）
      topics.sort((a, b) => a.masteryRate - b.masteryRate);

      subjectMasteries.push({
        subject: subjectKey,
        overallMastery: totalSubjectQuestions > 0
          ? Math.round(totalSubjectCorrect / totalSubjectQuestions * 100)
          : 0,
        totalQuestions: totalSubjectQuestions,
        correctAnswers: totalSubjectCorrect,
        topics,
      });
    });

    // 按总体掌握度排序
    subjectMasteries.sort((a, b) => a.overallMastery - b.overallMastery);

    // 提取全局薄弱知识点（正确率最低的5个）
    const allTopics = subjectMasteries.flatMap(s => s.topics);
    const weakestTopics = allTopics
      .filter(t => t.totalQuestions >= 3) // 至少做过3题才有参考价值
      .sort((a, b) => a.masteryRate - b.masteryRate)
      .slice(0, 5);

    // 统计总体数据
    const totalStats = {
      totalSubjects: subjectMasteries.length,
      totalTopics: allTopics.length,
      totalQuestions: allTopics.reduce((sum, t) => sum + t.totalQuestions, 0),
      overallMastery: allTopics.length > 0
        ? Math.round(allTopics.reduce((sum, t) => sum + t.masteryRate, 0) / allTopics.length)
        : 0,
      weakestTopics,
      improvingTopics: allTopics.filter(t => t.trend === 'improving').length,
      decliningTopics: allTopics.filter(t => t.trend === 'declining').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        stats: totalStats,
        subjects: subjectMasteries,
      },
    });

  } catch (error) {
    console.error('获取知识掌握度失败:', error);
    return NextResponse.json(
      { success: false, error: '获取数据失败' },
      { status: 500 }
    );
  }
}
