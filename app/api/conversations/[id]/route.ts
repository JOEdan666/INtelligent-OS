import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import prisma from '@/app/lib/prisma';
import { memoryDB } from '@/app/lib/memory-db';
import { clearDbUnavailable, noteDbUnavailable, shouldUseLocalDb } from '@/app/lib/db-fallback';

const resolveUser = async () => {
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
      maxAge: 60 * 60 * 24 * 180,
      path: '/',
    });
  }
  return res;
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId, shouldSetCookie } = await resolveUser();
    if (!userId) return NextResponse.json({ error: '未授权' }, { status: 401 });

    if (shouldUseLocalDb()) {
      const conv = await memoryDB.getConversation(params.id, userId);
      if (!conv) return NextResponse.json({ error: '对话不存在' }, { status: 404 });
      return respond(conv, shouldSetCookie, userId);
    }

    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: params.id, userId },
        include: { learningSession: true },
      });
      if (!conversation) return NextResponse.json({ error: '对话不存在' }, { status: 404 });
      clearDbUnavailable();
      return respond(conversation, shouldSetCookie, userId);
    } catch (dbError: any) {
      if (noteDbUnavailable(dbError)) {
        console.warn('⚠️ [GET/:id] DB 不可用，改用本地持久化');
        const conv = await memoryDB.getConversation(params.id, userId);
        if (!conv) return NextResponse.json({ error: '对话不存在' }, { status: 404 });
        return respond(conv, shouldSetCookie, userId);
      }
      throw dbError;
    }
  } catch (error) {
    console.error('获取对话失败:', error);
    return NextResponse.json({ error: '获取对话失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId, shouldSetCookie } = await resolveUser();
    if (!userId) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const body = await req.json();
    const { title, messages, isArchived, tags, aiExplanation } = body;

    const data: any = {
      updatedAt: new Date(),
      lastActivity: new Date(),
    };
    if (title !== undefined) data.title = title;
    if (messages !== undefined) {
      data.messages = messages;
      data.messageCount = messages.length;
    }
    if (isArchived !== undefined) data.isArchived = isArchived;
    if (tags !== undefined) data.tags = tags;
    if (aiExplanation !== undefined) data.aiExplanation = aiExplanation;

    if (shouldUseLocalDb()) {
      const updated = await memoryDB.updateConversation(params.id, data, userId);
      if (!updated) return NextResponse.json({ error: '对话不存在' }, { status: 404 });
      return respond(updated, shouldSetCookie, userId);
    }

    try {
      const existing = await prisma.conversation.findUnique({
        where: { id: params.id, userId },
      });
      if (!existing) return NextResponse.json({ error: '对话不存在' }, { status: 404 });

      const updated = await prisma.conversation.update({
        where: { id: params.id },
        data,
        include: { learningSession: true },
      });
      clearDbUnavailable();
      return respond(updated, shouldSetCookie, userId);
    } catch (dbError: any) {
      if (noteDbUnavailable(dbError)) {
        console.warn('⚠️ [PUT/:id] DB 不可用，改用本地持久化');
        const updated = await memoryDB.updateConversation(params.id, data, userId);
        if (!updated) return NextResponse.json({ error: '对话不存在' }, { status: 404 });
        return respond(updated, shouldSetCookie, userId);
      }
      throw dbError;
    }
  } catch (error) {
    console.error('更新对话失败:', error);
    return NextResponse.json({ error: '更新对话失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId, shouldSetCookie } = await resolveUser();
    if (!userId) return NextResponse.json({ error: '未授权' }, { status: 401 });

    if (shouldUseLocalDb()) {
      const deleted = await memoryDB.deleteConversation(params.id, userId);
      if (!deleted) {
        return NextResponse.json({ error: '对话不存在或无权删除' }, { status: 404 });
      }
      return respond({ success: true }, shouldSetCookie, userId);
    }

    try {
      const result = await prisma.conversation.deleteMany({
        where: { id: params.id, userId },
      });
      if (result.count === 0) {
        return NextResponse.json({ error: '对话不存在或无权删除' }, { status: 404 });
      }
      clearDbUnavailable();
      return respond({ success: true }, shouldSetCookie, userId);
    } catch (dbError: any) {
      if (noteDbUnavailable(dbError)) {
        console.warn('⚠️ [DELETE/:id] DB 不可用，改用本地持久化');
        const deleted = await memoryDB.deleteConversation(params.id, userId);
        if (!deleted) {
          return NextResponse.json({ error: '对话不存在或无权删除' }, { status: 404 });
        }
        return respond({ success: true }, shouldSetCookie, userId);
      }
      throw dbError;
    }
  } catch (error) {
    console.error('删除对话失败:', error);
    return NextResponse.json({ error: '删除对话失败' }, { status: 500 });
  }
}
