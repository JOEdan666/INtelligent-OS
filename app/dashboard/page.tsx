import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PrismaClient } from '../generated/prisma'
import { Target, Activity, CheckCircle, XCircle, BrainCircuit, ExternalLink } from 'lucide-react'

const prisma = new PrismaClient()

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const ideas = await prisma.ideaValidation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })

  // Group ideas by status
  const validatedIdeas = ideas.filter(i => i.status === 'VALIDATED')
  const buildingIdeas = ideas.filter(i => i.status === 'BUILDING')
  const launchedIdeas = ideas.filter(i => i.status === 'LAUNCHED')
  const droppedIdeas = ideas.filter(i => i.status === 'DROPPED')

  const getScoreColor = (score: number) => {
    if (score < 4) return 'text-red-500 bg-red-500/10 border-red-500/20'
    if (score < 7) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  }

  const renderIdeaCard = (idea: any) => (
    <div key={idea.id} className="apple-card p-6 flex flex-col hover:border-blue-500/30 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className={`flex flex-col items-center justify-center p-2 rounded-xl border min-w-[60px] ${getScoreColor(idea.score)}`}>
          <div className="text-xl font-black">{idea.score}</div>
          <div className="text-[10px] font-bold uppercase opacity-80">Score</div>
        </div>
        <span className="text-xs text-[var(--text-secondary)] font-medium">
          {new Date(idea.createdAt).toLocaleDateString()}
        </span>
      </div>
      
      <h3 className="text-lg font-bold text-[var(--highlight)] mb-2 line-clamp-2">
        {idea.refinedIdea || idea.originalIdea}
      </h3>
      
      <p className="text-sm text-[var(--text-secondary)] line-clamp-3 mb-6 flex-1">
        <span className="font-semibold text-[var(--text-primary)]">判决:</span> {idea.verdict}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
        <span className={`text-xs px-2.5 py-1 rounded-full border ${
          idea.status === 'BUILDING' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
          idea.status === 'DROPPED' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          idea.status === 'LAUNCHED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          'bg-white/5 border-white/10 text-[var(--text-secondary)]'
        }`}>
          {idea.status}
        </span>
        <button className="text-[var(--accent)] hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
          查看报告 <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-main)]/70 border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-[var(--highlight)]">
            <Target className="w-6 h-6 text-[var(--accent)]" />
            学伴 <span className="font-light text-[var(--text-secondary)]">| 点子库 (Idea Vault)</span>
          </div>
          <Link href="/validator" className="apple-btn text-sm px-4 py-2 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" />
            验证新想法
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="apple-card p-4 flex flex-col items-center justify-center text-center">
            <div className="text-3xl font-bold text-[var(--highlight)] mb-1">{ideas.length}</div>
            <div className="text-sm text-[var(--text-secondary)]">总验证次数</div>
          </div>
          <div className="apple-card p-4 flex flex-col items-center justify-center text-center">
            <div className="text-3xl font-bold text-blue-400 mb-1">{buildingIdeas.length}</div>
            <div className="text-sm text-[var(--text-secondary)]">正在开发</div>
          </div>
          <div className="apple-card p-4 flex flex-col items-center justify-center text-center">
            <div className="text-3xl font-bold text-emerald-400 mb-1">{launchedIdeas.length}</div>
            <div className="text-sm text-[var(--text-secondary)]">已上线</div>
          </div>
          <div className="apple-card p-4 flex flex-col items-center justify-center text-center">
            <div className="text-3xl font-bold text-red-400 mb-1">{droppedIdeas.length}</div>
            <div className="text-sm text-[var(--text-secondary)]">已放弃避坑</div>
          </div>
        </div>

        {ideas.length === 0 ? (
          <div className="text-center py-20 apple-glass rounded-3xl">
            <Target className="w-16 h-16 mx-auto text-[var(--text-secondary)] opacity-50 mb-4" />
            <h2 className="text-2xl font-bold text-[var(--highlight)] mb-2">你的点子库空空如也</h2>
            <p className="text-[var(--text-secondary)] mb-8">开始验证你的第一个商业想法，避免盲目开发。</p>
            <Link href="/validator" className="apple-btn px-6 py-3">去验证 Idea</Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Recent Validated */}
            {validatedIdeas.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-[var(--highlight)] mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[var(--accent)]" />
                  最新验证的 Idea
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {validatedIdeas.map(renderIdeaCard)}
                </div>
              </section>
            )}

            {/* Building & Launched */}
            {(buildingIdeas.length > 0 || launchedIdeas.length > 0) && (
              <section>
                <h2 className="text-xl font-bold text-[var(--highlight)] mb-6 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  正在行动中
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...buildingIdeas, ...launchedIdeas].map(renderIdeaCard)}
                </div>
              </section>
            )}

            {/* Dropped */}
            {droppedIdeas.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-[var(--highlight)] mb-6 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  已放弃 (成功避坑)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70">
                  {droppedIdeas.map(renderIdeaCard)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}