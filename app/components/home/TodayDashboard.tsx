import Link from 'next/link'
import { AlertTriangle, ArrowRight, BookOpen, Library, Repeat2 } from 'lucide-react'
import { prisma } from '@/app/lib/prisma'
import { memoryDB } from '@/app/lib/memory-db'
import { noteDbUnavailable, shouldUseLocalDb } from '@/app/lib/db-fallback'
import { QuickLearnForm } from './QuickLearnForm'

interface TodayDashboardProps {
  userId: string
}

interface DashboardData {
  dueCount: number
  noteCount: number
  sourceCount: number
  isLocal: boolean
  activeSession: {
    conversationId: string
    subject: string
    topic: string
    currentStep: string
  } | null
}

async function loadLocalDashboard(userId: string): Promise<DashboardData> {
  const [reviewMeta, sessions, notes, sources] = await Promise.all([
    memoryDB.getReviewCardCounts(userId),
    memoryDB.getAllLearningSessions(50, 0, userId),
    memoryDB.getNotes({ userId, includeArchived: false }),
    memoryDB.getKnowledgeBaseItems(userId),
  ])
  const session = sessions.find((item) => !item.isCompleted)

  return {
    dueCount: reviewMeta.dueCount,
    activeSession: session
      ? {
          conversationId: session.conversationId,
          subject: session.subject,
          topic: session.topic,
          currentStep: session.currentStep,
        }
      : null,
    noteCount: notes.length,
    sourceCount: sources.length,
    isLocal: true,
  }
}

async function loadDashboard(userId: string): Promise<DashboardData> {
  if (shouldUseLocalDb()) return loadLocalDashboard(userId)

  try {
    const now = new Date()
    const [dueCount, activeSession, noteCount, sourceCount] = await Promise.all([
      prisma.reviewCard.count({ where: { userId, nextReviewAt: { lte: now } } }),
      prisma.learningSession.findFirst({
        where: { userId, isCompleted: false },
        orderBy: { updatedAt: 'desc' },
        select: { conversationId: true, subject: true, topic: true, currentStep: true },
      }),
      prisma.note.count({ where: { userId, isArchived: false } }),
      prisma.knowledgeBaseItem.count({ where: { userId } }),
    ])
    return { dueCount, activeSession, noteCount, sourceCount, isLocal: false }
  } catch (error) {
    if (noteDbUnavailable(error)) return loadLocalDashboard(userId)
    throw error
  }
}

function DashboardContent({ data }: { data: DashboardData }) {
  const { dueCount, activeSession, noteCount, sourceCount, isLocal } = data

  return (
    <main className="zen-page">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="zen-chip">今日</span>
          {isLocal && <span className="text-xs text-slate-400">本地开发数据</span>}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">今天只做最有价值的学习</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">从一个真实问题开始，学完立即验证，并留下可复习的资产。</p>
      </header>

      <QuickLearnForm />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Link href="/review" className="zen-link-card p-5">
          <Repeat2 className="h-5 w-5 text-amber-600" />
          <div className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white">{dueCount}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">张到期复习卡</div>
        </Link>
        <Link href="/knowledge-base" className="zen-link-card p-5">
          <Library className="h-5 w-5 text-sky-600" />
          <div className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white">{noteCount + sourceCount}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">项知识资产</div>
        </Link>
        <Link href="/learning-history" className="zen-link-card p-5">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          <div className="mt-4 text-base font-semibold text-slate-950 dark:text-white">查看学习档案</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">回看掌握变化，而不只是次数</div>
        </Link>
      </section>

      {activeSession && (
        <section className="zen-panel mt-6 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-sky-600">继续上次</p>
          <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{activeSession.topic}</h2>
              <p className="mt-1 text-sm text-slate-500">{activeSession.subject} · {activeSession.currentStep}</p>
            </div>
            <Link href={`/learning-interface?conversationId=${encodeURIComponent(activeSession.conversationId)}&subject=${encodeURIComponent(activeSession.subject)}&topic=${encodeURIComponent(activeSession.topic)}`} className="zen-button inline-flex items-center justify-center gap-2 px-5 py-2.5">
              继续学习 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </main>
  )
}

export async function TodayDashboard({ userId }: TodayDashboardProps) {
  try {
    return <DashboardContent data={await loadDashboard(userId)} />
  } catch (error) {
    console.error('加载今日学习台失败:', error)
    return (
      <main className="zen-page">
        <div className="zen-panel border-amber-200 p-6">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">学习数据暂时不可用</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">请检查数据库连接和最新迁移后重试。</p>
        </div>
      </main>
    )
  }
}
