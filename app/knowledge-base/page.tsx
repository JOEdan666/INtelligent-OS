'use client'
import Link from 'next/link'
import { BookOpen, FileText, History } from 'lucide-react'
import KnowledgeBase from '../components/KnowledgeBase'

export default function KnowledgeBasePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <span className="zen-chip">知识库</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">资料、笔记与学习记录</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">所有学习输入与产出从这里进入同一知识上下文。</p>
        </header>
        <nav className="mb-6 grid gap-3 md:grid-cols-3" aria-label="知识资产分类">
          <Link href="/knowledge-base" className="zen-link-card flex items-center gap-3 p-4">
            <BookOpen className="h-5 w-5 text-sky-600" /> <span className="font-medium">资料来源</span>
          </Link>
          <Link href="/notes" className="zen-link-card flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-emerald-600" /> <span className="font-medium">结构化笔记</span>
          </Link>
          <Link href="/learning-history" className="zen-link-card flex items-center gap-3 p-4">
            <History className="h-5 w-5 text-amber-600" /> <span className="font-medium">学习档案</span>
          </Link>
        </nav>
        <KnowledgeBase />
      </div>
    </main>
  )
}
