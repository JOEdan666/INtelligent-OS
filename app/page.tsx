import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { ArrowRight, Brain, Library, Repeat2 } from 'lucide-react'
import { TodayDashboard } from './components/home/TodayDashboard'

export default async function Home() {
  const { userId } = await auth()
  if (userId) return <TodayDashboard userId={userId} />

  return (
    <main className="relative overflow-hidden">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl flex-col justify-center px-6 py-20">
        <div className="max-w-3xl">
          <span className="zen-chip">个人 AI 学习操作系统</span>
          <h1 className="mt-6 text-5xl font-semibold tracking-[-0.055em] text-slate-950 md:text-7xl dark:text-white">
            学过的东西，<br />在需要时想得起来。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            把资料和问题变成今天的学习、可验证的掌握与按时出现的复习，并自动沉淀为你的知识资产。
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/sign-in" className="zen-button inline-flex items-center gap-2 px-6 py-3">
              进入我的学习台 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/learning-setup" className="zen-button-secondary px-6 py-3">开始一次学习</Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {[
            { icon: Brain, title: '主动学习', text: '围绕理解、记忆或应用目标组织一次短学习。' },
            { icon: Repeat2, title: '按时复习', text: '学习产出自动进入复习队列，不再学完即忘。' },
            { icon: Library, title: '知识沉淀', text: '资料、笔记、会话与练习共享同一知识上下文。' },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title} className="zen-panel p-6">
              <Icon className="h-6 w-6 text-sky-600" />
              <h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
