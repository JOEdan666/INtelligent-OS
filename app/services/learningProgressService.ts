import { prisma } from '../lib/prisma';

export interface LearningProgressData {
  userId: string;
  conversationId: string;
  subject: string;
  topic: string;
  region?: string;
  grade?: string;
  aiExplanation?: string;
  socraticDialogue?: any;
  coachingHistory?: any;
  currentStep?: string;
  isCompleted?: boolean;
  finalScore?: number;
  feedback?: string;
  reviewNotes?: string;
  aiSummary?: string; // AI生成的课程总结
}

export interface QuizQuestionData {
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  points?: number;
  order: number;
}

export interface UserAnswerData {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  score?: number;
  timeSpent?: number;
}

export class LearningProgressService {
  // 规范化学习步骤枚举，统一为 EXPLAIN | COACH | QUIZ | REVIEW
  private static normalizeStep(step?: string): 'EXPLAIN' | 'COACH' | 'QUIZ' | 'REVIEW' {
    const s = (step || '').toUpperCase();
    if (['EXPLAIN', 'COACH', 'QUIZ', 'REVIEW'].includes(s)) return s as any;
    // 兼容旧值
    const map: Record<string, 'EXPLAIN' | 'COACH' | 'QUIZ' | 'REVIEW'> = {
      EXPLANATION: 'EXPLAIN',
      SOCRATIC: 'COACH',
      RESULT: 'REVIEW',
      CONFIRM: 'EXPLAIN'
    };
    return map[s] || 'EXPLAIN';
  }

  // 保存学习进度
  static async saveLearningProgress(data: LearningProgressData) {
    try {
      const existingSession = await prisma.learningSession.findFirst({
        where: { conversationId: data.conversationId, userId: data.userId }
      });

      if (existingSession) {
        // 更新现有会话
        return await prisma.learningSession.update({
          where: { conversationId: data.conversationId },
          data: {
            // 防止将必填字段置为空字符串
            subject: data.subject || existingSession.subject,
            userId: data.userId,
            topic: data.topic || existingSession.topic,
            region: data.region || existingSession.region,
            grade: data.grade || existingSession.grade,
            aiExplanation: data.aiExplanation || existingSession.aiExplanation,
            socraticDialogue: data.socraticDialogue || existingSession.socraticDialogue,
            coachingHistory: data.coachingHistory || existingSession.coachingHistory,
            currentStep: LearningProgressService.normalizeStep(data.currentStep) || existingSession.currentStep,
            isCompleted: data.isCompleted ?? existingSession.isCompleted,
            finalScore: data.finalScore ?? existingSession.finalScore,
            feedback: data.feedback || existingSession.feedback,
            reviewNotes: data.reviewNotes || existingSession.reviewNotes,
            aiSummary: data.aiSummary || existingSession.aiSummary,
            updatedAt: new Date()
          }
        });
      } else {
        // 创建新会话
        return await prisma.learningSession.create({
          data: {
            conversationId: data.conversationId,
            userId: data.userId,
            subject: data.subject,
            topic: data.topic,
            region: data.region,
            grade: data.grade,
            aiExplanation: data.aiExplanation,
            socraticDialogue: data.socraticDialogue,
            coachingHistory: data.coachingHistory,
            currentStep: LearningProgressService.normalizeStep(data.currentStep) || 'EXPLAIN',
            isCompleted: data.isCompleted || false,
            finalScore: data.finalScore,
            feedback: data.feedback,
            reviewNotes: data.reviewNotes,
            aiSummary: data.aiSummary
          }
        });
      }
    } catch (error) {
      console.error('保存学习进度失败:', error);
      console.error('错误详情:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        data: data
      });
      throw new Error(`保存学习进度失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 获取学习进度（包含关联的练习题和答案）
  static async getLearningProgress(conversationId: string, userId?: string) {
    try {
      return await prisma.learningSession.findFirst({
        where: { conversationId, ...(userId ? { userId } : {}) },
        include: {
          quizQuestions: {
            orderBy: { order: 'asc' },
            include: {
              userAnswers: true
            }
          },
          userAnswers: true
        }
      });
    } catch (error) {
      console.error('获取学习进度失败:', error);
      throw new Error('获取学习进度失败');
    }
  }

  // 更新AI讲解内容
  static async updateAIExplanation(conversationId: string, userId: string, aiExplanation: string) {
    try {
      // 优先更新已存在会话；若不存在，创建占位但不写空字符串
      const exists = await prisma.learningSession.findFirst({ where: { conversationId, userId } });
      if (exists) {
        return await prisma.learningSession.update({
          where: { id: exists.id },
          data: {
            aiExplanation,
            currentStep: 'EXPLAIN',
            updatedAt: new Date()
          }
        });
      }
      return await prisma.learningSession.create({
        data: {
          conversationId,
          userId,
          subject: '未设置',
          topic: '未设置',
          aiExplanation,
          currentStep: 'EXPLAIN'
        }
      });
    } catch (error) {
      console.error('更新AI讲解失败:', error);
      throw new Error('更新AI讲解失败');
    }
  }

  // 更新苏格拉底对话内容
  static async updateSocraticDialogue(conversationId: string, userId: string, socraticDialogue: any) {
    try {
      // 优先更新已存在会话；若不存在，创建占位但不写空字符串
      const exists = await prisma.learningSession.findFirst({ where: { conversationId, userId } });
      if (exists) {
        return await prisma.learningSession.update({
          where: { id: exists.id },
          data: {
            socraticDialogue,
            currentStep: 'COACH',
            updatedAt: new Date()
          }
        });
      }
      return await prisma.learningSession.create({
        data: {
          conversationId,
          userId,
          subject: '未设置',
          topic: '未设置',
          socraticDialogue,
          currentStep: 'COACH'
        }
      });
    } catch (error) {
      console.error('更新苏格拉底对话失败:', error);
      throw new Error('更新苏格拉底对话失败');
    }
  }

  // 删除学习进度
  static async deleteLearningProgress(conversationId: string, userId: string) {
    try {
      return await prisma.learningSession.deleteMany({ where: { conversationId, userId } });
    } catch (error) {
      console.error('删除学习进度失败:', error);
      throw new Error('删除学习进度失败');
    }
  }

  // 保存练习题
  static async saveQuizQuestions(sessionId: string, questions: QuizQuestionData[]) {
    try {
      // 先删除现有的练习题
      await prisma.quizQuestion.deleteMany({
        where: { sessionId }
      });

      // 创建新的练习题
      const createdQuestions = await Promise.all(
        questions.map(question => 
          prisma.quizQuestion.create({
            data: {
              sessionId,
              question: question.question,
              type: question.type,
              options: question.options,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              difficulty: question.difficulty || 'medium',
              points: question.points || 1,
              order: question.order
            }
          })
        )
      );

      return createdQuestions;
    } catch (error) {
      console.error('保存练习题失败:', error);
      throw new Error('保存练习题失败');
    }
  }

  // 保存用户答案
  static async saveUserAnswer(sessionId: string, answerData: UserAnswerData) {
    try {
      return await prisma.userAnswer.create({
        data: {
          sessionId,
          questionId: answerData.questionId,
          userAnswer: answerData.userAnswer,
          isCorrect: answerData.isCorrect,
          score: answerData.score || 0,
          timeSpent: answerData.timeSpent
        }
      });
    } catch (error) {
      console.error('保存用户答案失败:', error);
      throw new Error('保存用户答案失败');
    }
  }

  // 批量保存用户答案
  static async saveUserAnswers(sessionId: string, answers: UserAnswerData[]) {
    try {
      // 先删除现有答案
      await prisma.userAnswer.deleteMany({
        where: { sessionId }
      });

      // 创建新答案
      const createdAnswers = await Promise.all(
        answers.map(answer => 
          prisma.userAnswer.create({
            data: {
              sessionId,
              questionId: answer.questionId,
              userAnswer: answer.userAnswer,
              isCorrect: answer.isCorrect,
              score: answer.score || 0,
              timeSpent: answer.timeSpent
            }
          })
        )
      );

      return createdAnswers;
    } catch (error) {
      console.error('批量保存用户答案失败:', error);
      throw new Error('批量保存用户答案失败');
    }
  }

  // 更新或创建学习统计
  static async updateLearningStats(conversationId: string, userId: string, statsData: {
    totalQuestions?: number;
    correctAnswers?: number;
    totalScore?: number;
    maxScore?: number;
    accuracy?: number;
    totalTimeSpent?: number;
    explanationTime?: number;
    coachingTime?: number;
    quizTime?: number;
    weaknesses?: string[];
    suggestions?: string[];
  }) {
    try {
      // First, get existing stats to calculate streak
      const existingStats = await prisma.learningStats.findUnique({
        where: { conversationId }
      });

      // Calculate streak based on last active date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let currentStreak = existingStats?.currentStreak || 0;
      let longestStreak = existingStats?.longestStreak || 0;
      const lastActiveDate = existingStats?.lastActiveDate;

      if (lastActiveDate) {
        const lastActive = new Date(lastActiveDate);
        lastActive.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
          // Same day, keep streak
        } else if (daysDiff === 1) {
          // Consecutive day, increment streak
          currentStreak++;
        } else {
          // Gap > 1 day, reset streak
          currentStreak = 1;
        }
      } else {
        // First time, start streak
        currentStreak = 1;
      }

      // Update longest streak if current is higher
      longestStreak = Math.max(longestStreak, currentStreak);

      return await prisma.learningStats.upsert({
        where: { conversationId },
        update: {
          userId,
          ...statsData,
          currentStreak,
          longestStreak,
          lastActiveDate: today,
          updatedAt: new Date()
        },
        create: {
          conversationId,
          userId,
          totalQuestions: statsData.totalQuestions || 0,
          correctAnswers: statsData.correctAnswers || 0,
          totalScore: statsData.totalScore || 0,
          maxScore: statsData.maxScore || 0,
          accuracy: statsData.accuracy || 0,
          totalTimeSpent: statsData.totalTimeSpent || 0,
          explanationTime: statsData.explanationTime || 0,
          coachingTime: statsData.coachingTime || 0,
          quizTime: statsData.quizTime || 0,
          weaknesses: statsData.weaknesses,
          suggestions: statsData.suggestions,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today
        }
      });
    } catch (error) {
      console.error('更新学习统计失败:', error);
      throw new Error('更新学习统计失败');
    }
  }

  // 获取全局学习统计（用于Dashboard）
  static async getGlobalLearningStats(userId: string) {
    try {
      // Get aggregate stats across all sessions
      const [sessionCount, statsAgg, recentSessions] = await Promise.all([
        prisma.learningSession.count({ where: { userId } }),
        prisma.learningStats.aggregate({
          where: { userId },
          _sum: {
            totalQuestions: true,
            correctAnswers: true,
            totalTimeSpent: true
          },
          _avg: {
            accuracy: true
          },
          _max: {
            currentStreak: true,
            longestStreak: true
          }
        }),
        prisma.learningSession.findMany({
          where: { userId },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            subject: true,
            topic: true,
            isCompleted: true,
            createdAt: true
          }
        })
      ]);

      // Get subject breakdown
      const subjectBreakdown = await prisma.learningSession.groupBy({
        by: ['subject'],
        where: { userId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      });

      // Calculate completion rate
      const completedSessions = await prisma.learningSession.count({
        where: { userId, isCompleted: true }
      });
      const completionRate = sessionCount > 0 ? Math.round((completedSessions / sessionCount) * 100) : 0;

      return {
        totalSessions: sessionCount,
        completedSessions,
        completionRate,
        totalQuestions: statsAgg._sum.totalQuestions || 0,
        totalCorrect: statsAgg._sum.correctAnswers || 0,
        overallAccuracy: Math.round(statsAgg._avg.accuracy || 0),
        totalTimeSpent: statsAgg._sum.totalTimeSpent || 0,
        currentStreak: statsAgg._max.currentStreak || 0,
        longestStreak: statsAgg._max.longestStreak || 0,
        subjectBreakdown: subjectBreakdown.map(s => ({
          subject: s.subject,
          count: s._count.id
        })),
        recentSessions
      };
    } catch (error) {
      console.error('获取全局学习统计失败:', error);
      throw new Error('获取全局学习统计失败');
    }
  }

  // 获取学习统计
  static async getLearningStats(conversationId: string, userId?: string) {
    try {
      return await prisma.learningStats.findFirst({
        where: { conversationId, ...(userId ? { userId } : {}) }
      });
    } catch (error) {
      console.error('获取学习统计失败:', error);
      throw new Error('获取学习统计失败');
    }
  }

  // 获取完整的学习数据（包含所有关联数据）
  static async getCompleteLearningData(conversationId: string, userId?: string) {
    try {
      const [session, stats] = await Promise.all([
        this.getLearningProgress(conversationId, userId),
        this.getLearningStats(conversationId, userId)
      ]);

      return {
        session,
        stats
      };
    } catch (error) {
      console.error('获取完整学习数据失败:', error);
      throw new Error('获取完整学习数据失败');
    }
  }

  // 获取所有学习会话（用于学习历史页面）
  static async getAllLearningSessions(userId: string, limit: number = 50, offset: number = 0) {
    try {
      return await prisma.learningSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          quizQuestions: {
            orderBy: { order: 'asc' },
            include: {
              userAnswers: true
            }
          },
          userAnswers: true
        }
      });
    } catch (error) {
      console.error('获取所有学习会话失败:', error);
      throw new Error('获取所有学习会话失败');
    }
  }

  // 获取所有用户答案（用于错题集）
  static async getAllUserAnswers(userId: string, limit: number = 100, offset: number = 0) {
    try {
      return await prisma.userAnswer.findMany({
        where: { session: { userId } },
        orderBy: { answeredAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          question: true
        }
      });
    } catch (error) {
      console.error('获取所有用户答案失败:', error);
      throw new Error('获取所有用户答案失败');
    }
  }

  // 根据conversationId获取用户答案
  static async getUserAnswersByConversationId(conversationId: string, userId: string) {
    try {
      // 首先获取学习会话
      const session = await prisma.learningSession.findFirst({
        where: { conversationId, userId }
      });

      if (!session) {
        return [];
      }

      // 获取该会话的所有用户答案
      return await prisma.userAnswer.findMany({
        where: { sessionId: session.id },
        orderBy: { answeredAt: 'desc' },
        include: {
          question: true
        }
      });
    } catch (error) {
      console.error('根据conversationId获取用户答案失败:', error);
      throw new Error('根据conversationId获取用户答案失败');
    }
  }

  // 直接保存用户答案（用于错题集等场景）
  static async saveDirectUserAnswer(data: {
    userId: string;
    conversationId: string;
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation?: string;
  }) {
    try {
      // 首先获取或创建学习会话
      let session = await prisma.learningSession.findFirst({
        where: { conversationId: data.conversationId, userId: data.userId }
      });

      if (!session) {
        // 如果会话不存在，创建一个基本会话
        session = await prisma.learningSession.create({
          data: {
            conversationId: data.conversationId,
            userId: data.userId,
            subject: '未知',
            topic: '练习题',
            currentStep: 'QUIZ'
          }
        });
      }

      // 创建或获取问题
      let question = await prisma.quizQuestion.findFirst({
        where: {
          sessionId: session.id,
          question: data.questionText
        }
      });

      if (!question) {
        question = await prisma.quizQuestion.create({
          data: {
            sessionId: session.id,
            question: data.questionText,
            type: 'short_answer',
            correctAnswer: data.correctAnswer,
            explanation: data.explanation,
            order: 1
          }
        });
      }

      // 保存用户答案
      return await prisma.userAnswer.create({
        data: {
          sessionId: session.id,
          questionId: question.id,
          userAnswer: data.userAnswer,
          isCorrect: data.isCorrect,
          score: data.isCorrect ? 1 : 0
        }
      });
    } catch (error) {
      console.error('直接保存用户答案失败:', error);
      throw new Error('直接保存用户答案失败');
    }
  }
}

export default LearningProgressService;
