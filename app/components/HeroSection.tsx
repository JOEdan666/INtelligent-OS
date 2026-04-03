'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { ArrowRight, Rocket, Sparkles, BrainCircuit, Target, Network } from 'lucide-react'

const CurrentLearningCard = dynamic(() => import('./Dashboard/CurrentLearningCard'), { ssr: false })

export default function HeroSection() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-main)]">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] h-[40rem] w-[40rem] rounded-full bg-blue-500/20 blur-[120px] dark:bg-blue-600/15" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40rem] w-[40rem] rounded-full bg-sky-400/20 blur-[120px] dark:bg-sky-500/10" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.08)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)]" />
      </div>

      {/* Hero Content */}
      <section className="relative z-10 flex flex-col items-center pt-32 pb-20 text-center px-6 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-[var(--border-color)] bg-[var(--bg-glass)] backdrop-blur-md text-sm font-medium text-[var(--accent)] shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span>全新 AI 学习引擎已上线</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight text-[var(--highlight)] mb-6 leading-tight"
        >
          重塑你的
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-sky-400 dark:from-blue-400 dark:to-cyan-300"> 学习体验</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl mx-auto text-lg md:text-xl text-[var(--text-secondary)] mb-10 leading-relaxed font-light"
        >
          通过人工智能驱动的个性化诊断、知识图谱与智能互动，打破传统学习边界，为你打造沉浸式的高效学习环境。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 w-full mb-20"
        >
          <Link
            href="/learning-setup"
            className="group relative inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-105 hover:shadow-blue-500/40"
          >
            <Rocket className="h-5 w-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
            开启学习之旅
          </Link>
          <Link
            href="/unified-chat"
            className="group inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-glass)] px-8 py-4 text-base font-semibold text-[var(--text-primary)] backdrop-blur-md transition-all hover:bg-[var(--bg-card)] hover:border-blue-500/30"
          >
            AI 智能探索
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* Dashboard Card Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="w-full max-w-4xl mx-auto relative"
        >
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-blue-500/20 to-transparent blur-xl opacity-50 dark:opacity-30" />
          <div className="relative rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]/80 backdrop-blur-2xl shadow-2xl p-2 md:p-6 text-left">
            <CurrentLearningCard />
          </div>
        </motion.div>
      </section>

      {/* Features Bento Grid */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--highlight)] mb-4 tracking-tight">为什么选择学伴？</h2>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto font-light">结合最前沿的 AI 技术，提供全方位的学习辅助与反馈。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="group relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 transition-all duration-300 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10 md:col-span-2">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity duration-500 dark:opacity-10 dark:group-hover:opacity-20">
              <BrainCircuit className="w-48 h-48 text-blue-500" />
            </div>
            <div className="relative z-10">
              <div className="mb-6 inline-flex rounded-2xl bg-blue-500/10 p-3.5 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--highlight)] mb-3">AI 深度问答</h3>
              <p className="text-[var(--text-secondary)] text-lg max-w-md leading-relaxed">
                不仅是简单的问答，AI 能够理解你的学习进度，提供启发式的解答，引导你自主思考，掌握知识本质。
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 transition-all duration-300 hover:border-sky-500/30 hover:shadow-2xl hover:shadow-sky-500/10">
            <div className="absolute bottom-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity duration-500 dark:opacity-10 dark:group-hover:opacity-20">
              <Target className="w-32 h-32 text-sky-500" />
            </div>
            <div className="relative z-10">
              <div className="mb-6 inline-flex rounded-2xl bg-sky-500/10 p-3.5 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[var(--highlight)] mb-3">精准能力诊断</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                通过智能生成的极速诊断题，快速定位你的知识薄弱点，告别低效的题海战术。
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10">
            <div className="absolute bottom-0 left-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity duration-500 dark:opacity-10 dark:group-hover:opacity-20">
              <Network className="w-32 h-32 text-indigo-500" />
            </div>
            <div className="relative z-10">
              <div className="mb-6 inline-flex rounded-2xl bg-indigo-500/10 p-3.5 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Network className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[var(--highlight)] mb-3">知识图谱构建</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                将零散的知识点结构化，形成清晰的个人知识网络，让学习轨迹一目了然。
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="group relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 transition-all duration-300 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10 md:col-span-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="relative z-10 max-w-lg">
              <h3 className="text-2xl font-bold text-[var(--highlight)] mb-3">沉浸式体验</h3>
              <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-6">
                支持优雅的深色模式、专注模式与极致排版，全方位保护视力，让你专注于探索知识本身。
              </p>
              <Link href="/learning-setup" className="text-[var(--accent)] font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all">
                立即体验 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="relative w-full md:w-64 h-40 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-[var(--border-color)] shadow-inner overflow-hidden">
               <div className="absolute top-4 left-4 right-4 h-3 bg-white/50 dark:bg-slate-700 rounded-full w-1/3" />
               <div className="absolute top-10 left-4 right-4 h-3 bg-white/30 dark:bg-slate-700/50 rounded-full w-2/3" />
               <div className="absolute bottom-4 right-4 w-12 h-12 bg-blue-500/20 dark:bg-blue-500/40 rounded-full flex items-center justify-center backdrop-blur-sm">
                 <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse" />
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
