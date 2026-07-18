'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

const MODES = [
  { value: 'understand', label: '理解' },
  { value: 'remember', label: '记住' },
  { value: 'apply', label: '应用' },
] as const

export function QuickLearnForm() {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<(typeof MODES)[number]['value']>('understand')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!topic.trim()) return
    const params = new URLSearchParams({ subject: '个人学习', topic: topic.trim(), goal: mode })
    router.push(`/learning-interface?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="zen-panel p-5 md:p-6">
      <label htmlFor="quick-topic" className="text-sm font-medium text-slate-700 dark:text-slate-200">
        我现在想学……
      </label>
      <div className="mt-3 flex flex-col gap-3 md:flex-row">
        <input
          id="quick-topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="输入一个问题、概念或当前卡点"
          className="zen-input min-h-12 flex-1"
          autoComplete="off"
        />
        <button type="submit" disabled={!topic.trim()} className="zen-button inline-flex min-h-12 items-center justify-center gap-2 px-6 disabled:opacity-50">
          开始学习 <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <fieldset className="mt-4 flex gap-2">
        <legend className="sr-only">学习目标</legend>
        {MODES.map((item) => (
          <button
            type="button"
            key={item.value}
            onClick={() => setMode(item.value)}
            aria-pressed={mode === item.value}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${mode === item.value ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            {item.label}
          </button>
        ))}
      </fieldset>
    </form>
  )
}
