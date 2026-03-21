import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { prisma } from '@/app/lib/prisma';
import { memoryDB } from '@/app/lib/memory-db';
import { clearDbUnavailable, noteDbUnavailable, shouldUseLocalDb } from '@/app/lib/db-fallback';

// 统一解析用户：优先 Clerk，失败则使用 guest cookie
const resolveUser = async (req: NextRequest) => {
  let userId: string | null = null;
  let shouldSetCookie = false;

  try {
    const authData = await auth();
    userId = authData.userId;
  } catch (e) {
    console.warn('Clerk auth failed:', e);
  }

  if (!userId) {
    const store = cookies();
    const guest = store.get('guest_id');
    if (guest?.value) {
      userId = guest.value;
    } else {
      userId = `guest-${randomUUID()}`;
      shouldSetCookie = true;
    }
  }

  return { userId, shouldSetCookie };
};

const respond = (payload: any, shouldSetCookie: boolean, userId: string) => {
  const res = NextResponse.json(payload);
  if (shouldSetCookie) {
    res.cookies.set('guest_id', userId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 180, // 180 天
      path: '/',
    });
  }
  return res;
};

export async function GET(req: NextRequest) {
  try {
    const { userId, shouldSetCookie } = await resolveUser(req);
    if (!userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const where: any = { userId, isArchived: false };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ];
    }

    const respondWithLocalData = async () => {
      const allConversations = await memoryDB.getConversations(where);
      const conversations = allConversations.slice(skip, skip + limit);
      return respond(
        {
          conversations,
          total: allConversations.length,
          page,
          limit,
          hasMore: skip + conversations.length < allConversations.length,
          source: 'local',
        },
        shouldSetCookie,
        userId,
      );
    };

    if (shouldUseLocalDb()) {
      return await respondWithLocalData();
    }

    try {
      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where,
          orderBy: { lastActivity: 'desc' },
          skip,
          take: limit,
          include: { learningSession: true },
        }),
        prisma.conversation.count({ where }),
      ]);

      clearDbUnavailable();

      return respond(
        {
          conversations,
          total,
          page,
          limit,
          hasMore: skip + conversations.length < total,
        },
        shouldSetCookie,
        userId,
      );
    } catch (dbError: any) {
      if (noteDbUnavailable(dbError)) {
        console.warn('⚠️ [GET] 数据库不可用，切换本地持久化数据库');
        return await respondWithLocalData();
      }
      throw dbError;
    }
  } catch (error) {
    console.error('获取对话列表失败:', error);
    return NextResponse.json({ error: '获取对话列表失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, type, initialMessage, subject, topic, aiExplanation, learningSession } = body;

  try {
    const { userId, shouldSetCookie } = await resolveUser(req);
    if (!userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 确保 messages 是合法的 JSON 数组，Prisma 需要 JSON 兼容的数据
    // 在这里我们显式地将其转换为对象数组，虽然它已经是数组，但为了类型安全
    const messages = initialMessage ? [initialMessage] : [];
    const safeMessages = Array.isArray(messages) ? messages : [];

    const createData: any = {
      userId,
      title: title || (type === 'learning' ? `${subject} - ${topic}` : '新对话'),
      type: type || 'general',
      messages: safeMessages,
      messageCount: safeMessages.length,
      subject,
      topic,
      aiExplanation,
    };

    if (learningSession) {
      createData.learningSession = {
        create: {
          userId,
          subject: learningSession.subject || subject,
          topic: learningSession.topic || topic,
          currentStep: learningSession.currentStep || 'DIAGNOSE',
          isCompleted: false,
        },
      };
    }

    const useLocalDb = shouldUseLocalDb();

    const findExistingLocalConversation = async () => {
      const memConvs = await memoryDB.getConversations({ userId, type: 'learning', isArchived: false });
      return memConvs.find((conversation: any) => conversation.subject === subject && conversation.topic === topic);
    };

    const createWithLocalDb = async () => {
      const conversation = await memoryDB.createConversation(createData);
      return respond(conversation, shouldSetCookie, userId);
    };

    // 学习型对话去重
    if (type === 'learning' && subject && topic) {
      if (useLocalDb) {
        const existing = await findExistingLocalConversation();
        if (existing) {
          const updated = await memoryDB.updateConversation(
            existing.id,
            {
              messages: initialMessage ? [...(existing.messages || []), initialMessage] : existing.messages,
              messageCount: initialMessage
                ? (existing.messageCount || 0) + 1
                : existing.messageCount,
              aiExplanation: aiExplanation || existing.aiExplanation,
            },
            userId,
          );
          return respond(updated, shouldSetCookie, userId);
        }
      }

      try {
        if (!useLocalDb) {
          const existing = await prisma.conversation.findFirst({
            where: { userId, type: 'learning', subject, topic, isArchived: false },
            include: { learningSession: true },
          });
          if (existing) {
            const updated = await prisma.conversation.update({
              where: { id: existing.id },
              data: {
                lastActivity: new Date(),
                updatedAt: new Date(),
                aiExplanation: aiExplanation || existing.aiExplanation,
                messages: initialMessage
                  ? [...((existing.messages as any[]) || []), initialMessage]
                  : existing.messages || [],
                messageCount: initialMessage
                  ? (existing.messageCount || 0) + 1
                  : existing.messageCount,
              },
              include: { learningSession: true },
            });
            clearDbUnavailable();
            return respond(updated, shouldSetCookie, userId);
          }
        }
      } catch (dbError: any) {
        if (!noteDbUnavailable(dbError)) {
          throw dbError;
        }
        console.warn('⚠️ [POST-Check] DB 不可用，改用本地持久化检查');
        const existing = await findExistingLocalConversation();
        if (existing) {
          const updated = await memoryDB.updateConversation(
            existing.id,
            {
              messages: initialMessage ? [...(existing.messages || []), initialMessage] : existing.messages,
              messageCount: initialMessage
                ? (existing.messageCount || 0) + 1
                : existing.messageCount,
              aiExplanation: aiExplanation || existing.aiExplanation,
            },
            userId,
          );
          return respond(updated, shouldSetCookie, userId);
        }
      }
    }

    if (useLocalDb || shouldUseLocalDb()) {
      return await createWithLocalDb();
    }

    try {
      console.log('Creating conversation with data:', JSON.stringify(createData, null, 2));
      const conversation = await prisma.conversation.create({
        data: createData,
        include: { learningSession: true },
      });
      console.log('Conversation created successfully:', conversation.id);
      clearDbUnavailable();
      return respond(conversation, shouldSetCookie, userId);
    } catch (dbError: any) {
      console.error('Database error during conversation creation:', dbError);
      if (noteDbUnavailable(dbError)) {
        console.warn('🚨 [POST] DB 不可用，使用本地持久化数据库');
        return await createWithLocalDb();
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error('创建对话失败:', error);
    return NextResponse.json(
      {
        error: '创建对话失败',
        details: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
