import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import * as path from 'path';

type ConversationRecord = {
  id: string;
  userId: string;
  title: string;
  type: string;
  messages: any[];
  messageCount: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  tags: string[];
  subject?: string;
  topic?: string;
  aiExplanation?: string | null;
};

type LearningSessionRecord = {
  id: string;
  conversationId: string;
  userId?: string | null;
  subject: string;
  topic: string;
  aiExplanation?: string | null;
  socraticDialogue?: any;
  currentStep: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  coachingHistory?: any;
  feedback?: string | null;
  finalScore?: number | null;
  grade?: string | null;
  region?: string | null;
  reviewNotes?: string | null;
  aiSummary?: string | null;
};

type QuizQuestionRecord = {
  id: string;
  sessionId: string;
  question: string;
  type: string;
  options?: any;
  correctAnswer: string;
  explanation?: string | null;
  difficulty: string;
  points: number;
  order: number;
  createdAt: string;
};

type UserAnswerRecord = {
  id: string;
  sessionId: string;
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  score: number;
  timeSpent?: number | null;
  answeredAt: string;
};

type LearningStatsRecord = {
  id: string;
  conversationId: string;
  userId?: string | null;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  maxScore: number;
  accuracy: number;
  totalTimeSpent: number;
  explanationTime: number;
  coachingTime: number;
  quizTime: number;
  weaknesses?: any;
  suggestions?: any;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

type LearningItemRecord = {
  id: string;
  userId?: string | null;
  text: string;
  subject: string;
  createdAt: string;
};

type KnowledgeBaseItemRecord = {
  id: string;
  userId?: string | null;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  text?: string | null;
  ocrText?: string | null;
  notes?: string | null;
  dataUrl?: string | null;
  include: boolean;
  createdAt: string;
  updatedAt: string;
};

type NoteRecord = {
  id: string;
  userId?: string | null;
  title: string;
  icon?: string | null;
  cover?: string | null;
  backlinks: string[];
  forwardLinks: string[];
  knowledgePoints: string[];
  relatedQuestions: string[];
  tags: string[];
  template?: string | null;
  color: string;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type NoteBlockRecord = {
  id: string;
  noteId: string;
  type: string;
  content: string;
  properties?: Record<string, unknown> | null;
  order: number;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ReviewCardRecord = {
  id: string;
  userId: string;
  sourceSessionId?: string | null;
  subject: string;
  topic: string;
  prompt: string;
  answer: string;
  stage: number;
  nextReviewAt: string;
  lastReviewedAt?: string | null;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
};

type LocalFallbackState = {
  conversations: ConversationRecord[];
  learningSessions: LearningSessionRecord[];
  quizQuestions: QuizQuestionRecord[];
  userAnswers: UserAnswerRecord[];
  learningStats: LearningStatsRecord[];
  learningItems: LearningItemRecord[];
  knowledgeBaseItems: KnowledgeBaseItemRecord[];
  notes: NoteRecord[];
  noteBlocks: NoteBlockRecord[];
  reviewCards: ReviewCardRecord[];
};

const DB_DIR = process.env.VERCEL
  ? path.join('/tmp', '.local-data')
  : path.join(process.cwd(), '.local-data');
const DB_FILE = path.join(DB_DIR, 'dev-db.json');

const createDefaultState = (): LocalFallbackState => ({
  conversations: [],
  learningSessions: [],
  quizQuestions: [],
  userAnswers: [],
  learningStats: [],
  learningItems: [],
  knowledgeBaseItems: [],
  notes: [],
  noteBlocks: [],
  reviewCards: [],
});

const globalForMemoryDB = global as unknown as { memoryDB: MemoryDB };

class MemoryDB {
  private state: LocalFallbackState;
  private persistenceAvailable = true;

  constructor() {
    this.state = this.loadState();
    console.log(`🌟 [LocalFallbackDB] 初始化本地回退数据库 (${DB_FILE})`);
  }

  private loadState(): LocalFallbackState {
    try {
      if (!existsSync(DB_FILE)) {
        return createDefaultState();
      }

      const raw = readFileSync(DB_FILE, 'utf8');
      if (!raw.trim()) {
        return createDefaultState();
      }

      const parsed = JSON.parse(raw) as Partial<LocalFallbackState>;
      return {
        ...createDefaultState(),
        ...parsed,
      };
    } catch (error) {
      console.warn('⚠️ [LocalFallbackDB] 读取本地数据库失败，使用空库:', error);
      return createDefaultState();
    }
  }

  private persist() {
    if (!this.persistenceAvailable) {
      return;
    }

    try {
      mkdirSync(DB_DIR, { recursive: true });
      writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (error) {
      this.persistenceAvailable = false;
      console.warn('⚠️ [LocalFallbackDB] 持久化失败，已回退为纯内存模式:', error);
    }
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private now() {
    return new Date().toISOString();
  }

  private withLearningSession<T extends ConversationRecord>(conversation: T) {
    return {
      ...conversation,
      learningSession:
        this.state.learningSessions.find((session) => session.conversationId === conversation.id) || null,
    };
  }

  private withNoteBlocks(note: NoteRecord) {
    return {
      ...note,
      blocks: this.state.noteBlocks
        .filter((block) => block.noteId === note.id)
        .sort((a, b) => a.order - b.order),
    };
  }

  private buildLearningSession(session: LearningSessionRecord) {
    const quizQuestions = this.state.quizQuestions
      .filter((question) => question.sessionId === session.id)
      .sort((a, b) => a.order - b.order)
      .map((question) => ({
        ...question,
        userAnswers: this.state.userAnswers
          .filter((answer) => answer.questionId === question.id)
          .sort((a, b) => Date.parse(a.answeredAt) - Date.parse(b.answeredAt)),
      }));

    const userAnswers = this.state.userAnswers
      .filter((answer) => answer.sessionId === session.id)
      .sort((a, b) => Date.parse(b.answeredAt) - Date.parse(a.answeredAt));

    return {
      ...session,
      quizQuestions,
      userAnswers,
    };
  }

  private resolveQuestionId(sessionId: string, rawQuestionId: any, answerIndex: number) {
    const questions = this.state.quizQuestions
      .filter((question) => question.sessionId === sessionId)
      .sort((a, b) => a.order - b.order);

    if (!questions.length) {
      return null;
    }

    const direct = questions.find((question) => question.id === String(rawQuestionId));
    if (direct) {
      return direct.id;
    }

    const numeric =
      typeof rawQuestionId === 'number'
        ? rawQuestionId
        : /^\d+$/.test(String(rawQuestionId || ''))
          ? Number(rawQuestionId)
          : Number.NaN;

    if (Number.isFinite(numeric)) {
      const byOrder = questions.find((question) => question.order === numeric);
      if (byOrder) {
        return byOrder.id;
      }

      const byLegacyOrder = questions.find((question) => question.order === numeric + 1);
      if (byLegacyOrder) {
        return byLegacyOrder.id;
      }
    }

    return questions[answerIndex]?.id || questions[0].id;
  }

  async getConversations(where: any = {}) {
    let results = this.state.conversations.filter((conversation) => {
      if (where.userId && conversation.userId !== where.userId) {
        return false;
      }

      if (where.type && conversation.type !== where.type) {
        return false;
      }

      if (where.isArchived !== undefined && conversation.isArchived !== where.isArchived) {
        return false;
      }

      if (Array.isArray(where.OR) && where.OR.length > 0) {
        const matched = where.OR.some((condition: any) =>
          Object.entries(condition).some(([field, matcher]) => {
            const query = (matcher as { contains?: string })?.contains;
            if (!query) {
              return false;
            }

            const value = String((conversation as Record<string, unknown>)[field] || '').toLowerCase();
            return value.includes(String(query).toLowerCase());
          }),
        );

        if (!matched) {
          return false;
        }
      }

      return true;
    });

    results = results.sort((a, b) => Date.parse(b.lastActivity) - Date.parse(a.lastActivity));

    return this.clone(results.map((conversation) => this.withLearningSession(conversation)));
  }

  async getConversation(id: string, userId?: string) {
    const conversation = this.state.conversations.find((item) => item.id === id);
    if (!conversation) {
      return null;
    }

    if (userId && conversation.userId !== userId) {
      return null;
    }

    return this.clone(this.withLearningSession(conversation));
  }

  async createConversation(data: any) {
    const now = this.now();
    const id = data.id || `mem_conv_${Date.now()}_${randomUUID().slice(0, 8)}`;

    let learningSession = null;
    if (data.learningSession?.create) {
      learningSession = await this.upsertLearningSession({
        conversationId: id,
        ...data.learningSession.create,
      });
    }

    const conversation: ConversationRecord = {
      id,
      userId: data.userId,
      title: data.title || '新对话',
      type: data.type || 'general',
      messages: Array.isArray(data.messages) ? data.messages : [],
      messageCount: Array.isArray(data.messages) ? data.messages.length : 0,
      lastActivity: now,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
      tags: Array.isArray(data.tags) ? data.tags : [],
      subject: data.subject,
      topic: data.topic,
      aiExplanation: data.aiExplanation ?? null,
    };

    this.state.conversations.push(conversation);
    this.persist();

    return this.clone({
      ...conversation,
      learningSession,
    });
  }

  async updateConversation(id: string, data: any, userId?: string) {
    const index = this.state.conversations.findIndex((conversation) => conversation.id === id);
    if (index === -1) {
      return null;
    }

    const existing = this.state.conversations[index];
    if (userId && existing.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const updated: ConversationRecord = {
      ...existing,
      ...data,
      updatedAt: this.now(),
      lastActivity: this.now(),
      messageCount: Array.isArray(data.messages) ? data.messages.length : existing.messageCount,
      tags: Array.isArray(data.tags) ? data.tags : existing.tags,
    };

    this.state.conversations[index] = updated;
    this.persist();

    return this.clone(this.withLearningSession(updated));
  }

  async deleteConversation(id: string, userId?: string) {
    const conversation = this.state.conversations.find((item) => item.id === id);
    if (!conversation) {
      return false;
    }

    if (userId && conversation.userId !== userId) {
      return false;
    }

    const session = this.state.learningSessions.find((item) => item.conversationId === id);
    if (session) {
      this.state.quizQuestions = this.state.quizQuestions.filter((question) => question.sessionId !== session.id);
      this.state.userAnswers = this.state.userAnswers.filter((answer) => answer.sessionId !== session.id);
    }

    this.state.conversations = this.state.conversations.filter((item) => item.id !== id);
    this.state.learningSessions = this.state.learningSessions.filter((item) => item.conversationId !== id);
    this.state.learningStats = this.state.learningStats.filter((item) => item.conversationId !== id);
    this.persist();
    return true;
  }

  async upsertLearningSession(data: any) {
    const now = this.now();
    const existingIndex = this.state.learningSessions.findIndex(
      (session) => session.conversationId === data.conversationId,
    );

    if (existingIndex >= 0) {
      const existing = this.state.learningSessions[existingIndex];
      const updated: LearningSessionRecord = {
        ...existing,
        ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
        subject: data.subject || existing.subject,
        topic: data.topic || existing.topic,
        currentStep: data.currentStep || existing.currentStep,
        isCompleted: data.isCompleted ?? existing.isCompleted,
        updatedAt: now,
      };

      this.state.learningSessions[existingIndex] = updated;
      this.persist();
      return this.clone(updated);
    }

    const created: LearningSessionRecord = {
      id: data.id || `mem_ls_${Date.now()}_${randomUUID().slice(0, 8)}`,
      conversationId: data.conversationId,
      userId: data.userId ?? null,
      subject: data.subject || '未设置',
      topic: data.topic || '未设置',
      aiExplanation: data.aiExplanation ?? null,
      socraticDialogue: data.socraticDialogue,
      currentStep: data.currentStep || 'EXPLAIN',
      isCompleted: data.isCompleted ?? false,
      createdAt: now,
      updatedAt: now,
      coachingHistory: data.coachingHistory,
      feedback: data.feedback ?? null,
      finalScore: data.finalScore ?? null,
      grade: data.grade ?? null,
      region: data.region ?? null,
      reviewNotes: data.reviewNotes ?? null,
      aiSummary: data.aiSummary ?? null,
    };

    this.state.learningSessions.push(created);
    this.persist();
    return this.clone(created);
  }

  async saveQuizQuestions(sessionId: string, questions: any[]) {
    this.state.quizQuestions = this.state.quizQuestions.filter((question) => question.sessionId !== sessionId);
    this.state.userAnswers = this.state.userAnswers.filter((answer) => answer.sessionId !== sessionId);

    const now = this.now();
    const createdQuestions = questions.map((question, index) => ({
      id: question.id || `mem_q_${Date.now()}_${index}_${randomUUID().slice(0, 6)}`,
      sessionId,
      question: question.question,
      type: question.type,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation ?? null,
      difficulty: question.difficulty || 'medium',
      points: question.points || 1,
      order: question.order ?? index,
      createdAt: now,
    })) satisfies QuizQuestionRecord[];

    this.state.quizQuestions.push(...createdQuestions);
    this.persist();
    return this.clone(createdQuestions);
  }

  async saveUserAnswers(sessionId: string, answers: any[]) {
    this.state.userAnswers = this.state.userAnswers.filter((answer) => answer.sessionId !== sessionId);

    const createdAnswers = answers
      .map((answer, index) => {
        const questionId = this.resolveQuestionId(sessionId, answer.questionId, index);
        if (!questionId) {
          return null;
        }

        return {
          id: answer.id || `mem_a_${Date.now()}_${index}_${randomUUID().slice(0, 6)}`,
          sessionId,
          questionId,
          userAnswer: answer.userAnswer,
          isCorrect: Boolean(answer.isCorrect),
          score: answer.score || 0,
          timeSpent: answer.timeSpent ?? null,
          answeredAt: this.now(),
        } satisfies UserAnswerRecord;
      })
      .filter(Boolean) as UserAnswerRecord[];

    this.state.userAnswers.push(...createdAnswers);
    this.persist();
    return this.clone(createdAnswers);
  }

  async getLearningProgress(conversationId: string, userId?: string) {
    const session = this.state.learningSessions.find(
      (item) => item.conversationId === conversationId && (!userId || item.userId === userId),
    );
    if (!session) {
      return null;
    }

    return this.clone(this.buildLearningSession(session));
  }

  async getLearningStats(conversationId: string, userId?: string) {
    const stats = this.state.learningStats.find(
      (item) => item.conversationId === conversationId && (!userId || item.userId === userId),
    );
    return stats ? this.clone(stats) : null;
  }

  async getCompleteLearningData(conversationId: string, userId?: string) {
    const session = await this.getLearningProgress(conversationId, userId);
    const stats = await this.getLearningStats(conversationId, userId);
    return {
      session,
      stats,
    };
  }

  async updateLearningStats(
    conversationId: string,
    statsData: {
      userId?: string;
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
    },
  ) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.toISOString();

    const index = this.state.learningStats.findIndex(
      (item) => item.conversationId === conversationId && (!statsData.userId || item.userId === statsData.userId),
    );

    if (index >= 0) {
      const existing = this.state.learningStats[index];
      let currentStreak = existing.currentStreak || 0;
      let longestStreak = existing.longestStreak || 0;

      if (existing.lastActiveDate) {
        const lastActive = new Date(existing.lastActiveDate);
        lastActive.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
          currentStreak += 1;
        } else if (dayDiff > 1) {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      longestStreak = Math.max(longestStreak, currentStreak);

      const updated: LearningStatsRecord = {
        ...existing,
        ...statsData,
        currentStreak,
        longestStreak,
        lastActiveDate: today,
        updatedAt: this.now(),
      };

      this.state.learningStats[index] = updated;
      this.persist();
      return this.clone(updated);
    }

    const created: LearningStatsRecord = {
      id: `mem_stats_${Date.now()}_${randomUUID().slice(0, 8)}`,
      conversationId,
      userId: statsData.userId ?? null,
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
      lastActiveDate: today,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    this.state.learningStats.push(created);
    this.persist();
    return this.clone(created);
  }

  async deleteLearningProgress(conversationId: string, userId?: string) {
    const session = this.state.learningSessions.find(
      (item) => item.conversationId === conversationId && (!userId || item.userId === userId),
    );
    if (!session) {
      return false;
    }

    this.state.learningSessions = this.state.learningSessions.filter(
      (item) => item.conversationId !== conversationId,
    );
    this.state.quizQuestions = this.state.quizQuestions.filter((question) => question.sessionId !== session.id);
    this.state.userAnswers = this.state.userAnswers.filter((answer) => answer.sessionId !== session.id);
    this.state.learningStats = this.state.learningStats.filter((item) => item.conversationId !== conversationId);
    this.persist();
    return true;
  }

  async getAllLearningSessions(limit = 50, offset = 0, userId?: string) {
    const sessions = this.state.learningSessions
      .filter((session) => !userId || session.userId === userId)
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(offset, offset + limit)
      .map((session) => this.buildLearningSession(session));

    return this.clone(sessions);
  }

  async getLearningItems(userId?: string) {
    return this.clone(
      this.state.learningItems
        .filter((item) => !userId || item.userId === userId)
        .slice()
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    );
  }

  async createLearningItems(items: Array<{ id: string; userId?: string; text: string; subject: string; createdAt: string }>) {
    for (const item of items) {
      const index = this.state.learningItems.findIndex((existing) => existing.id === item.id);
      const record: LearningItemRecord = {
        id: item.id,
        userId: item.userId ?? null,
        text: item.text,
        subject: item.subject,
        createdAt: item.createdAt,
      };

      if (index >= 0) {
        this.state.learningItems[index] = record;
      } else {
        this.state.learningItems.push(record);
      }
    }

    this.persist();
    return this.clone(items);
  }

  async deleteLearningItem(id?: string, userId?: string) {
    if (id) {
      this.state.learningItems = this.state.learningItems.filter(
        (item) => item.id !== id || (!!userId && item.userId !== userId),
      );
    } else {
      this.state.learningItems = userId
        ? this.state.learningItems.filter((item) => item.userId !== userId)
        : [];
    }

    this.persist();
  }

  async getKnowledgeBaseItems(userId?: string) {
    return this.clone(
      this.state.knowledgeBaseItems
        .filter((item) => !userId || item.userId === userId)
        .slice()
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    );
  }

  async createKnowledgeBaseItems(items: any[]) {
    const now = this.now();
    const createdItems: KnowledgeBaseItemRecord[] = [];

    for (const item of items) {
      const existingIndex = this.state.knowledgeBaseItems.findIndex((existing) => existing.id === item.id);
      const createdAt = existingIndex >= 0 ? this.state.knowledgeBaseItems[existingIndex].createdAt : now;

      const record: KnowledgeBaseItemRecord = {
        id: item.id,
        userId: item.userId ?? null,
        name: item.name,
        type: item.type,
        size: item.size,
        lastModified: Number(item.lastModified || Date.now()),
        text: item.text ?? null,
        ocrText: item.ocrText ?? null,
        notes: item.notes ?? null,
        dataUrl: item.dataUrl ?? null,
        include: item.include ?? true,
        createdAt,
        updatedAt: now,
      };

      if (existingIndex >= 0) {
        this.state.knowledgeBaseItems[existingIndex] = record;
      } else {
        this.state.knowledgeBaseItems.push(record);
      }

      createdItems.push(record);
    }

    this.persist();
    return this.clone(createdItems);
  }

  async updateKnowledgeBaseItem(id: string, updates: Record<string, unknown>, userId?: string) {
    const index = this.state.knowledgeBaseItems.findIndex(
      (item) => item.id === id && (!userId || item.userId === userId),
    );
    if (index === -1) {
      throw new Error('Knowledge base item not found');
    }

    const existing = this.state.knowledgeBaseItems[index];
    const updated: KnowledgeBaseItemRecord = {
      ...existing,
      ...updates,
      lastModified:
        updates.lastModified !== undefined ? Number(updates.lastModified) : existing.lastModified,
      updatedAt: this.now(),
    };

    this.state.knowledgeBaseItems[index] = updated;
    this.persist();
    return this.clone(updated);
  }

  async deleteKnowledgeBaseItem(id?: string, userId?: string) {
    if (id) {
      this.state.knowledgeBaseItems = this.state.knowledgeBaseItems.filter(
        (item) => item.id !== id || (!!userId && item.userId !== userId),
      );
    } else {
      this.state.knowledgeBaseItems = userId
        ? this.state.knowledgeBaseItems.filter((item) => item.userId !== userId)
        : [];
    }

    this.persist();
  }

  async getNotes(params?: { userId?: string; includeArchived?: boolean; tag?: string | null; search?: string | null }) {
    const includeArchived = params?.includeArchived ?? false;
    const tag = params?.tag || null;
    const search = params?.search?.toLowerCase() || null;

    let notes = this.state.notes.filter(
      (note) => (!params?.userId || note.userId === params.userId) && (includeArchived ? true : !note.isArchived),
    );

    if (tag) {
      notes = notes.filter((note) => note.tags.includes(tag));
    }

    let hydrated = notes.map((note) => this.withNoteBlocks(note));

    if (search) {
      hydrated = hydrated.filter((note) => {
        const titleMatch = note.title.toLowerCase().includes(search);
        const contentMatch = note.blocks.some((block) => block.content.toLowerCase().includes(search));
        return titleMatch || contentMatch;
      });
    }

    hydrated = hydrated.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    return this.clone(hydrated);
  }

  async createNote(data: any) {
    const now = this.now();
    const noteId = data.id || `mem_note_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const note: NoteRecord = {
      id: noteId,
      userId: data.userId ?? null,
      title: data.title || '未命名',
      icon: data.icon || null,
      cover: data.cover || null,
      backlinks: [],
      forwardLinks: [],
      knowledgePoints: [],
      relatedQuestions: [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      template: data.template || null,
      color: data.color || '#3b82f6',
      isFavorite: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    const blocks =
      Array.isArray(data.blocks) && data.blocks.length > 0
        ? data.blocks
        : [
            {
              type: 'paragraph',
              content: data.content || '',
              properties: null,
              order: 0,
              parentId: null,
            },
          ];

    const noteBlocks: NoteBlockRecord[] = blocks.map((block: any, index: number) => ({
      id: block.id || `mem_block_${Date.now()}_${index}_${randomUUID().slice(0, 6)}`,
      noteId,
      type: block.type || 'paragraph',
      content: block.content || '',
      properties: block.properties || null,
      order: block.order ?? index,
      parentId: block.parentId || null,
      createdAt: now,
      updatedAt: now,
    }));

    this.state.notes.push(note);
    this.state.noteBlocks.push(...noteBlocks);
    this.persist();

    return this.clone(this.withNoteBlocks(note));
  }

  async updateNote(data: any) {
    const index = this.state.notes.findIndex(
      (note) => note.id === data.id && (!data.userId || note.userId === data.userId),
    );
    if (index === -1) {
      throw new Error('Note not found');
    }

    const existing = this.state.notes[index];
    const updatedNote: NoteRecord = {
      ...existing,
      title: data.title !== undefined ? data.title : existing.title,
      color: data.color !== undefined ? data.color : existing.color,
      tags: data.tags !== undefined ? data.tags : existing.tags,
      icon: data.icon !== undefined ? data.icon : existing.icon,
      cover: data.cover !== undefined ? data.cover : existing.cover,
      isFavorite: data.isFavorite !== undefined ? data.isFavorite : existing.isFavorite,
      isArchived: data.isArchived !== undefined ? data.isArchived : existing.isArchived,
      updatedAt: this.now(),
    };

    this.state.notes[index] = updatedNote;

    if (data.blocks !== undefined) {
      this.state.noteBlocks = this.state.noteBlocks.filter((block) => block.noteId !== data.id);
      const now = this.now();
      const blocks: NoteBlockRecord[] = data.blocks.map((block: any, blockIndex: number) => ({
        id: block.id || `mem_block_${Date.now()}_${blockIndex}_${randomUUID().slice(0, 6)}`,
        noteId: data.id,
        type: block.type || 'paragraph',
        content: block.content || '',
        properties: block.properties || null,
        order: block.order ?? blockIndex,
        parentId: block.parentId || null,
        createdAt: now,
        updatedAt: now,
      }));
      this.state.noteBlocks.push(...blocks);
    } else if (data.content !== undefined) {
      const blocks = this.state.noteBlocks
        .filter((block) => block.noteId === data.id)
        .sort((a, b) => a.order - b.order);

      if (blocks.length > 0) {
        blocks[0].content = data.content;
        blocks[0].updatedAt = this.now();
      } else {
        this.state.noteBlocks.push({
          id: `mem_block_${Date.now()}_${randomUUID().slice(0, 6)}`,
          noteId: data.id,
          type: 'paragraph',
          content: data.content,
          properties: null,
          order: 0,
          parentId: null,
          createdAt: this.now(),
          updatedAt: this.now(),
        });
      }
    }

    this.persist();
    return this.clone(this.withNoteBlocks(updatedNote));
  }

  async deleteNote(id: string, userId?: string) {
    const canDelete = this.state.notes.some(
      (note) => note.id === id && (!userId || note.userId === userId),
    );
    if (!canDelete) return;
    this.state.notes = this.state.notes.filter((note) => note.id !== id);
    this.state.noteBlocks = this.state.noteBlocks.filter((block) => block.noteId !== id);
    this.persist();
  }

  async getReviewCards(userId: string, dueOnly = true, limit = 30) {
    const now = Date.now();
    const cards = this.state.reviewCards
      .filter((card) => card.userId === userId && (!dueOnly || Date.parse(card.nextReviewAt) <= now))
      .slice()
      .sort((a, b) => Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt))
      .slice(0, limit);

    return this.clone(cards);
  }

  async getReviewCardCounts(userId: string) {
    const now = Date.now();
    const cards = this.state.reviewCards.filter((card) => card.userId === userId);
    return {
      total: cards.length,
      dueCount: cards.filter((card) => Date.parse(card.nextReviewAt) <= now).length,
    };
  }

  async createReviewCard(data: {
    userId: string;
    sourceSessionId?: string | null;
    subject: string;
    topic: string;
    prompt: string;
    answer: string;
  }) {
    const now = this.now();
    const card: ReviewCardRecord = {
      id: `mem_review_${Date.now()}_${randomUUID().slice(0, 8)}`,
      userId: data.userId,
      sourceSessionId: data.sourceSessionId ?? null,
      subject: data.subject,
      topic: data.topic,
      prompt: data.prompt,
      answer: data.answer,
      stage: 0,
      nextReviewAt: now,
      lastReviewedAt: null,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.state.reviewCards.push(card);
    this.persist();
    return this.clone(card);
  }

  async syncReviewCardsFromSession(input: {
    userId: string;
    sessionId: string;
    subject: string;
    topic: string;
    questions: Array<{ question: string; correctAnswer: string; explanation?: string | null }>;
  }) {
    const existing = this.state.reviewCards.filter(
      (card) => card.userId === input.userId && card.sourceSessionId === input.sessionId,
    );
    if (existing.length > 0) return this.clone(existing);

    const cards = [];
    for (const question of input.questions.slice(0, 5)) {
      if (!question.question?.trim() || !question.correctAnswer?.trim()) continue;
      cards.push(await this.createReviewCard({
        userId: input.userId,
        sourceSessionId: input.sessionId,
        subject: input.subject,
        topic: input.topic,
        prompt: question.question.trim(),
        answer: [question.correctAnswer, question.explanation].filter(Boolean).join('\n\n'),
      }));
    }
    return cards;
  }

  async updateReviewCardFeedback(
    id: string,
    userId: string,
    feedback: 'remember' | 'fuzzy' | 'forgot',
  ) {
    const intervals = [1, 3, 7, 14, 30, 60];
    const index = this.state.reviewCards.findIndex((card) => card.id === id && card.userId === userId);
    if (index === -1) return null;

    const existing = this.state.reviewCards[index];
    const stage = feedback === 'remember'
      ? Math.min(existing.stage + 1, intervals.length - 1)
      : feedback === 'fuzzy'
        ? Math.max(existing.stage - 1, 0)
        : 0;
    const now = this.now();
    const updated: ReviewCardRecord = {
      ...existing,
      stage,
      nextReviewAt: new Date(Date.now() + intervals[stage] * 24 * 60 * 60 * 1000).toISOString(),
      lastReviewedAt: now,
      reviewCount: existing.reviewCount + 1,
      updatedAt: now,
    };
    this.state.reviewCards[index] = updated;
    this.persist();
    return this.clone(updated);
  }

  async syncKnowledgeNoteFromSession(input: {
    userId: string;
    sessionId: string;
    subject: string;
    topic: string;
    content?: string | null;
  }) {
    if (!input.content?.trim()) return null;
    const sessionTag = `session:${input.sessionId}`;
    const existing = this.state.notes.find(
      (note) => note.userId === input.userId && note.tags.includes(sessionTag),
    );
    if (existing) return this.clone(this.withNoteBlocks(existing));

    return this.createNote({
      userId: input.userId,
      title: input.topic,
      color: '#0ea5e9',
      tags: [input.subject, '学习产出', sessionTag],
      blocks: [{ type: 'paragraph', content: input.content.trim(), order: 0 }],
    });
  }
}

export const memoryDB = globalForMemoryDB.memoryDB || new MemoryDB();

if (process.env.NODE_ENV !== 'production') {
  globalForMemoryDB.memoryDB = memoryDB;
}
