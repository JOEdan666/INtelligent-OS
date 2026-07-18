import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { memoryDB } from '@/app/lib/memory-db'
import { clearDbUnavailable, noteDbUnavailable, shouldUseLocalDb } from '@/app/lib/db-fallback'

const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60] as const

async function getLocalCards(userId: string, dueOnly: boolean, limit: number) {
  const [cards, meta] = await Promise.all([
    memoryDB.getReviewCards(userId, dueOnly, limit),
    memoryDB.getReviewCardCounts(userId),
  ])
  return NextResponse.json({ success: true, data: cards, meta, source: 'local' })
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })

  const dueOnly = request.nextUrl.searchParams.get('due') !== 'false'
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 30)
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 100)) : 30
  if (shouldUseLocalDb()) return getLocalCards(userId, dueOnly, limit)

  try {
    const now = new Date()
    const [cards, total, dueCount] = await Promise.all([
      prisma.reviewCard.findMany({
        where: { userId, ...(dueOnly ? { nextReviewAt: { lte: now } } : {}) },
        orderBy: [{ nextReviewAt: 'asc' }, { createdAt: 'desc' }],
        take: limit,
      }),
      prisma.reviewCard.count({ where: { userId } }),
      prisma.reviewCard.count({ where: { userId, nextReviewAt: { lte: now } } }),
    ])
    clearDbUnavailable()
    return NextResponse.json({ success: true, data: cards, meta: { total, dueCount } })
  } catch (error) {
    if (noteDbUnavailable(error)) return getLocalCards(userId, dueOnly, limit)
    console.error('获取复习卡失败:', error)
    return NextResponse.json({ success: false, error: '获取复习卡失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })

  const body = await request.json()
  const prompt = String(body.prompt || '').trim()
  const answer = String(body.answer || '').trim()
  if (!prompt || !answer) {
    return NextResponse.json({ success: false, error: '问题和答案不能为空' }, { status: 400 })
  }

  const data = {
    userId,
    subject: String(body.subject || '通用'),
    topic: String(body.topic || '未分类'),
    prompt,
    answer,
  }
  if (shouldUseLocalDb()) {
    const card = await memoryDB.createReviewCard(data)
    return NextResponse.json({ success: true, data: card, source: 'local' }, { status: 201 })
  }

  try {
    const card = await prisma.reviewCard.create({ data: { ...data, nextReviewAt: new Date() } })
    clearDbUnavailable()
    return NextResponse.json({ success: true, data: card }, { status: 201 })
  } catch (error) {
    if (noteDbUnavailable(error)) {
      const card = await memoryDB.createReviewCard(data)
      return NextResponse.json({ success: true, data: card, source: 'local' }, { status: 201 })
    }
    console.error('创建复习卡失败:', error)
    return NextResponse.json({ success: false, error: '创建复习卡失败' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })

  const body = await request.json()
  const feedback = String(body.feedback || '') as 'remember' | 'fuzzy' | 'forgot'
  if (!['remember', 'fuzzy', 'forgot'].includes(feedback)) {
    return NextResponse.json({ success: false, error: '无效的复习反馈' }, { status: 400 })
  }

  const updateLocalCard = async () => {
    const card = await memoryDB.updateReviewCardFeedback(String(body.id || ''), userId, feedback)
    if (!card) return NextResponse.json({ success: false, error: '复习卡不存在' }, { status: 404 })
    return NextResponse.json({ success: true, data: card, source: 'local' })
  }
  if (shouldUseLocalDb()) return updateLocalCard()

  try {
    const existing = await prisma.reviewCard.findFirst({ where: { id: body.id, userId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: '复习卡不存在' }, { status: 404 })
    }

    const stage = feedback === 'remember'
      ? Math.min(existing.stage + 1, REVIEW_INTERVALS.length - 1)
      : feedback === 'fuzzy'
        ? Math.max(existing.stage - 1, 0)
        : 0
    const nextReviewAt = new Date(Date.now() + REVIEW_INTERVALS[stage] * 24 * 60 * 60 * 1000)
    const card = await prisma.reviewCard.update({
      where: { id: existing.id },
      data: {
        stage,
        nextReviewAt,
        lastReviewedAt: new Date(),
        reviewCount: { increment: 1 },
      },
    })
    clearDbUnavailable()
    return NextResponse.json({ success: true, data: card })
  } catch (error) {
    if (noteDbUnavailable(error)) return updateLocalCard()
    console.error('更新复习卡失败:', error)
    return NextResponse.json({ success: false, error: '更新复习卡失败' }, { status: 500 })
  }
}
