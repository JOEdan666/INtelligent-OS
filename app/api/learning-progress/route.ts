import { NextRequest, NextResponse } from 'next/server';
import LearningProgressService from '@/app/services/learningProgressService';
import { prisma } from '@/app/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { memoryDB } from '@/app/lib/memory-db';
import { clearDbUnavailable, noteDbUnavailable, shouldUseLocalDb } from '@/app/lib/db-fallback';
import { syncKnowledgeNoteFromSession, syncReviewCardsFromSession } from '@/app/services/reviewCardService';

// GET - 获取学习进度
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const includeStats = searchParams.get('includeStats') === 'true';
    const getAllSessions = searchParams.get('getAllSessions') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const useLocalDb = shouldUseLocalDb();

    // 如果请求获取所有学习会话
    if (getAllSessions) {
      if (useLocalDb) {
        const sessions = await memoryDB.getAllLearningSessions(limit, offset, userId);
        return NextResponse.json({
          success: true,
          sessions,
          source: 'local',
        });
      }

      try {
        const sessions = await LearningProgressService.getAllLearningSessions(userId, limit, offset);
        clearDbUnavailable();
        return NextResponse.json({
          success: true,
          sessions: sessions
        });
      } catch (e: any) {
        if (noteDbUnavailable(e)) {
           const sessions = await memoryDB.getAllLearningSessions(limit, offset, userId);
           return NextResponse.json({ success: true, sessions, source: 'local' });
        }
        throw e;
      }
    }

    // 如果没有conversationId，返回错误
    if (!conversationId) {
      return NextResponse.json(
        { error: '缺少conversationId参数' },
        { status: 400 }
      );
    }

    let progress;
    try {
      if (useLocalDb) {
        progress = includeStats
          ? await memoryDB.getCompleteLearningData(conversationId, userId)
          : await memoryDB.getLearningProgress(conversationId, userId);
      } else {
        if (includeStats) {
          // 获取完整的学习数据（包含统计信息）
          progress = await LearningProgressService.getCompleteLearningData(conversationId, userId);
        } else {
          // 只获取基本学习进度
          progress = await LearningProgressService.getLearningProgress(conversationId, userId);
        }
        clearDbUnavailable();
      }
    } catch (e: any) {
      if (!noteDbUnavailable(e)) {
        throw e;
      }

      progress = includeStats
        ? await memoryDB.getCompleteLearningData(conversationId, userId)
        : await memoryDB.getLearningProgress(conversationId, userId);
    }
    
    if (!progress) {
      return NextResponse.json(
        { error: '未找到学习进度' },
        { status: 404 }
      );
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error('获取学习进度失败:', error);
    return NextResponse.json(
      { error: '获取学习进度失败' },
      { status: 500 }
    );
  }
}

// POST - 保存学习进度
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const data = await request.json();
    
    const {
      conversationId,
      subject,
      topic,
      aiExplanation,
      socraticDialogue,
      currentStep,
      isCompleted,
      region,
      grade,
      coachingHistory,
      finalScore,
      feedback,
      reviewNotes,
      quizQuestions,
      userAnswers,
      stats
    } = data;

    const useLocalDb = shouldUseLocalDb();

    if (!conversationId) {
      return NextResponse.json(
        { error: '缺少conversationId参数' },
        { status: 400 }
      );
    }

    const saveWithLocalDb = async () => {
      const progress = await memoryDB.upsertLearningSession({
        conversationId,
        userId,
        subject,
        topic,
        aiExplanation,
        socraticDialogue,
        currentStep,
        isCompleted,
        region,
        grade,
        coachingHistory,
        finalScore,
        feedback,
        reviewNotes,
      });

      if (quizQuestions && quizQuestions.length > 0) {
        await memoryDB.saveQuizQuestions(progress.id, quizQuestions);
      }

      if (userAnswers && userAnswers.length > 0) {
        await memoryDB.saveUserAnswers(progress.id, userAnswers);
      }

      if (stats) {
        await memoryDB.updateLearningStats(conversationId, { ...stats, userId });
      }

      const savedProgress = await memoryDB.getLearningProgress(conversationId, userId);

      if (isCompleted && savedProgress) {
        await memoryDB.syncReviewCardsFromSession({
          userId,
          sessionId: progress.id,
          subject: progress.subject,
          topic: progress.topic,
          questions: (savedProgress.quizQuestions || []).map((question: any) => ({
            question: question.question,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
          })),
        });
        await memoryDB.syncKnowledgeNoteFromSession({
          userId,
          sessionId: progress.id,
          subject: progress.subject,
          topic: progress.topic,
          content: data.aiSummary || reviewNotes || aiExplanation,
        });
      }

      return savedProgress;
    };

    try {
      if (useLocalDb) {
        const progress = await saveWithLocalDb();
        return NextResponse.json(progress, { status: 201 });
      }

      // 保存基本学习进度
      const progress = await LearningProgressService.saveLearningProgress({
        userId,
        conversationId,
        subject,
        topic,
        aiExplanation,
        socraticDialogue,
        currentStep,
        isCompleted,
        region,
        grade,
        coachingHistory,
        finalScore,
        feedback,
        reviewNotes
      });

      // 如果有练习题，保存练习题
      if (quizQuestions && quizQuestions.length > 0) {
        await LearningProgressService.saveQuizQuestions(progress.id, quizQuestions);
      }

      // 如果有用户答案，保存用户答案（将前端索引/占位ID映射为数据库真实题目ID）
      if (userAnswers && userAnswers.length > 0) {
        try {
          // 获取该会话的题目列表，按order排序
          const questions = await prisma.quizQuestion.findMany({
            where: { sessionId: progress.id },
            orderBy: { order: 'asc' },
            select: { id: true, order: true, question: true }
          });

          const mapped = userAnswers
            .map((ans: any, idx: number) => {
              const qByIndex = questions[idx];
              // 支持questionId为数字/字符串索引用于回退匹配
              const raw = ans.questionId as any;
              const num = typeof raw === 'number' ? raw : (raw && /^\d+$/.test(String(raw)) ? parseInt(String(raw), 10) : NaN);
              const qByOrder = Number.isFinite(num)
                ? (questions.find(q => q.order === num) || questions.find(q => q.order === num + 1))
                : undefined;
              const realId = (qByIndex?.id) || (qByOrder?.id);
              if (!realId) return null;
              return {
                ...ans,
                questionId: realId,
              };
            })
            .filter(Boolean);

          if (mapped.length > 0) {
            await LearningProgressService.saveUserAnswers(progress.id, mapped as any);
          }
        } catch (e) {
          console.warn('用户答案ID映射失败，跳过保存用户答案:', e);
        }
      }

      // 如果有统计数据，保存统计数据
      if (stats) {
        await LearningProgressService.updateLearningStats(conversationId, userId, stats);
      }

      if (isCompleted) {
        const savedQuestions = await prisma.quizQuestion.findMany({
          where: { sessionId: progress.id },
          orderBy: { order: 'asc' },
          select: { question: true, correctAnswer: true, explanation: true },
        });
        await syncReviewCardsFromSession({
          userId,
          sessionId: progress.id,
          subject: progress.subject,
          topic: progress.topic,
          questions: savedQuestions,
        });
        await syncKnowledgeNoteFromSession({
          userId,
          sessionId: progress.id,
          subject: progress.subject,
          topic: progress.topic,
          summary: data.aiSummary,
          reviewNotes,
          explanation: aiExplanation,
        });
      }

      clearDbUnavailable();
      return NextResponse.json(progress, { status: 201 });
    } catch (dbError: any) {
      // 数据库故障兜底 - 内存模式
      if (noteDbUnavailable(dbError)) {
        console.warn('🚨 [POST Learning] 数据库不可用，切换至本地持久化数据库');
        const progress = await saveWithLocalDb();
        return NextResponse.json(progress, { status: 201 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('保存学习进度失败:', error);
    return NextResponse.json(
      { error: '保存学习进度失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新学习进度
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const body = await request.json();
    const { conversationId, aiExplanation, socraticDialogue, currentStep, isCompleted } = body;

    const useLocalDb = shouldUseLocalDb();

    if (!conversationId) {
      return NextResponse.json(
        { error: '缺少conversationId参数' },
        { status: 400 }
      );
    }

    let learningProgress;

    if (useLocalDb) {
      const existing = await memoryDB.getLearningProgress(conversationId, userId);
      learningProgress = await memoryDB.upsertLearningSession({
        conversationId,
        userId,
        subject: existing?.subject || '未设置',
        topic: existing?.topic || '未设置',
        aiExplanation,
        socraticDialogue,
        currentStep,
        isCompleted,
      });
    } else {
      try {
        // 读取现有会话，避免覆盖必填字段为空字符串
        const existing = await LearningProgressService.getLearningProgress(conversationId, userId);
        learningProgress = await LearningProgressService.saveLearningProgress({
          userId,
          conversationId,
          subject: existing?.subject || '未设置',
          topic: existing?.topic || '未设置',
          aiExplanation,
          socraticDialogue,
          currentStep,
          isCompleted
        });
        clearDbUnavailable();
      } catch (error) {
        if (!noteDbUnavailable(error)) {
          throw error;
        }

        const existing = await memoryDB.getLearningProgress(conversationId, userId);
        learningProgress = await memoryDB.upsertLearningSession({
          conversationId,
          userId,
          subject: existing?.subject || '未设置',
          topic: existing?.topic || '未设置',
          aiExplanation,
          socraticDialogue,
          currentStep,
          isCompleted,
        });
      }
    }

    return NextResponse.json(learningProgress);
  } catch (error) {
    console.error('更新学习进度失败:', error);
    return NextResponse.json(
      { error: '更新学习进度失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除学习进度
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: '缺少conversationId参数' },
        { status: 400 }
      );
    }

    if (shouldUseLocalDb()) {
      await memoryDB.deleteLearningProgress(conversationId, userId);
      return NextResponse.json({ success: true, source: 'local' });
    }

    await LearningProgressService.deleteLearningProgress(conversationId, userId);
    clearDbUnavailable();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (noteDbUnavailable(error)) {
      const { searchParams } = new URL(request.url);
      const conversationId = searchParams.get('conversationId');
      if (conversationId) {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });
        await memoryDB.deleteLearningProgress(conversationId, userId);
        return NextResponse.json({ success: true, source: 'local' });
      }
    }

    console.error('删除学习进度失败:', error);
    return NextResponse.json(
      { error: '删除学习进度失败' },
      { status: 500 }
    );
  }
}
