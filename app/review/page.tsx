'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Eye, Loader2, Repeat2 } from 'lucide-react'

interface ReviewCard {
  id: string
  subject: string
  topic: string
  prompt: string
  answer: string
  stage: number
  reviewCount: number
}

interface ReviewResponse {
  success: boolean
  data: ReviewCard[]
  meta: { total: number; dueCount: number }
  error?: string
}

export default function ReviewPage() {
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [meta, setMeta] = useState({ total: 0, dueCount: 0 })
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadCards = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/review-cards?due=true&limit=30', { cache: 'no-store' })
      const data = await response.json() as ReviewResponse
      if (!response.ok || !data.success) throw new Error(data.error || '获取复习卡失败')
      setCards(data.data)
      setMeta(data.meta)
      setRevealed(false)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '获取复习卡失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCards()
  }, [loadCards])

  async function submitFeedback(feedback: 'remember' | 'fuzzy' | 'forgot') {
    const current = cards[0]
    if (!current) return
    try {
      setSubmitting(true)
      const response = await fetch('/api/review-cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, feedback }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || '保存复习结果失败')
      setCards((currentCards) => currentCards.slice(1))
      setMeta((currentMeta) => ({ ...currentMeta, dueCount: Math.max(0, currentMeta.dueCount - 1) }))
      setRevealed(false)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存复习结果失败')
    } finally {
      setSubmitting(false)
    }
  }

  const current = cards[0]

  return (
    <main className="zen-page max-w-4xl">
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="zen-chip">复习</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">先回忆，再查看答案</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">今天到期 {meta.dueCount} 张 · 总计 {meta.total} 张</p>
        </div>
        <Link href="/learning-setup" className="zen-button-secondary px-4 py-2 text-sm">学习新内容</Link>
      </header>

      {loading && (
        <div className="zen-panel flex min-h-72 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-sky-600" aria-label="正在加载" />
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {!loading && !error && !current && (
        <div className="zen-panel flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">今天的复习已完成</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">完成一次系统学习后，关键问题会自动进入这里。</p>
        </div>
      )}

      {!loading && current && (
        <article className="zen-panel overflow-hidden">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-medium text-sky-600">
              <Repeat2 className="h-4 w-4" /> {current.subject} · {current.topic}
            </div>
            <h2 className="mt-5 text-2xl font-semibold leading-9 text-slate-950 dark:text-white">{current.prompt}</h2>
          </div>

          <div className="p-5 md:p-7">
            {!revealed ? (
              <button onClick={() => setRevealed(true)} className="zen-button inline-flex min-h-12 w-full items-center justify-center gap-2">
                <Eye className="h-4 w-4" /> 我已经想过，查看答案
              </button>
            ) : (
              <>
                <div className="rounded-2xl bg-slate-50 p-5 whitespace-pre-wrap text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {current.answer}
                </div>
                <p className="mt-6 text-center text-sm text-slate-500">根据真实回忆情况选择</p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <button disabled={submitting} onClick={() => submitFeedback('forgot')} className="rounded-xl border border-rose-200 px-3 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">忘了</button>
                  <button disabled={submitting} onClick={() => submitFeedback('fuzzy')} className="rounded-xl border border-amber-200 px-3 py-3 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50">模糊</button>
                  <button disabled={submitting} onClick={() => submitFeedback('remember')} className="rounded-xl border border-emerald-200 px-3 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">记得</button>
                </div>
              </>
            )}
          </div>
        </article>
      )}
    </main>
  )
}
