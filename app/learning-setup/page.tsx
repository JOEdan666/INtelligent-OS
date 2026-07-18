'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, BookOpen, Brain, Wrench } from 'lucide-react'

const MODES = [
  { value: 'understand', label: '理解', description: '建立清晰模型，能用自己的话解释', icon: Brain },
  { value: 'remember', label: '记住', description: '提炼关键事实，使用主动回忆巩固', icon: BookOpen },
  { value: 'apply', label: '应用', description: '解决真实问题，形成下一步行动', icon: Wrench },
] as const

function LearningSetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [topic, setTopic] = useState(searchParams.get('topic') || '')
  const [mode, setMode] = useState(searchParams.get('goal') || 'understand')
  const [context, setContext] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!topic.trim()) return
    const params = new URLSearchParams({ subject: '个人学习', topic: topic.trim(), goal: mode })
    if (context.trim()) params.set('context', context.trim())
    router.push(`/learning-interface?${params.toString()}`)
  }

  return (
    <main className="zen-page max-w-4xl">
      <header className="mb-8">
        <span className="zen-chip">学习</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">从一个真实问题开始</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">不必先分类。说明你想学什么，以及学完要能做到什么。</p>
      </header>

      <form onSubmit={handleSubmit} className="zen-panel p-6 md:p-8">
        <label htmlFor="topic" className="text-sm font-medium text-slate-700 dark:text-slate-200">问题或主题</label>
        <input
          id="topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="例如：如何为 AI 产品设计真正有效的留存指标？"
          className="zen-input mt-2 min-h-12"
          autoFocus
        />

        <fieldset className="mt-7">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">这次学习的目标</legend>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">AI 会根据主题选择带学或实战共创，进入后可以随时切换，不强制测验。</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {MODES.map(({ value, label, description, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={`rounded-2xl border p-4 text-left transition ${mode === value ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-100 dark:bg-sky-950/30' : 'border-slate-200 bg-white hover:border-sky-200 dark:border-slate-700 dark:bg-slate-900'}`}
              >
                <Icon className="h-5 w-5 text-sky-600" />
                <div className="mt-3 font-medium text-slate-950 dark:text-white">{label}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</div>
              </button>
            ))}
          </div>
        </fieldset>

        <label htmlFor="context" className="mt-7 block text-sm font-medium text-slate-700 dark:text-slate-200">
          当前背景或材料 <span className="font-normal text-slate-400">（可选）</span>
        </label>
        <textarea
          id="context"
          value={context}
          onChange={(event) => setContext(event.target.value)}
          placeholder="粘贴一段材料、你的现有理解，或说明它将用于哪个项目。"
          className="zen-input mt-2 min-h-32 resize-y py-3"
        />

        <div className="mt-7 flex justify-end">
          <button type="submit" disabled={!topic.trim()} className="zen-button inline-flex min-h-12 items-center gap-2 px-6 disabled:opacity-50">
            开始学习 <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </main>
  )
}

export default function LearningSetupPage() {
  return (
    <Suspense fallback={<main className="zen-page"><div className="zen-panel h-80 animate-pulse" /></main>}>
      <LearningSetupForm />
    </Suspense>
  )
}
