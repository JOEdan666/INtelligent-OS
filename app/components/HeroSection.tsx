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
          <span>Idea 验证器全新上线</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight text-[var(--highlight)] mb-6 leading-tight"
        >
          不要盲目写代码。<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 dark:from-blue-400 dark:to-cyan-300">30秒验证你的 Idea。</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl mx-auto text-lg md:text-xl text-[var(--text-secondary)] mb-10 leading-relaxed font-light"
        >
          通过人工智能驱动的全网数据爬取与商业分析，快速获取你的竞争对手名单、市场拥挤度以及核心破局建议。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 w-full mb-20"
        >
          <Link
            href="/validator"
            className="group relative inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-105 hover:shadow-blue-500/40"
          >
            <Rocket className="h-5 w-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
            💡 立即验证 Idea
          </Link>
          <Link
            href="/unified-chat"
            className="group inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-glass)] px-8 py-4 text-base font-semibold text-[var(--text-primary)] backdrop-blur-md transition-all hover:bg-[var(--bg-card)] hover:border-blue-500/30"
          >
            AI 商业探索
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </section>

      {/* Features Bento Grid */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-32 pt-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--highlight)] mb-4 tracking-tight">为什么你需要验证 Idea？</h2>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto font-light">在写下第一行代码前，了解最残酷的市场真相。</p>
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
              <h3 className="text-2xl font-bold text-[var(--highlight)] mb-3">全网竞品扫描</h3>
              <p className="text-[var(--text-secondary)] text-lg max-w-md leading-relaxed">
                只需输入一句话，AI 将自动检索 ProductHunt、GitHub 与搜索引擎，为你找出那些已经存在的直接竞品，并分析它们的致命弱点。
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
              <h3 className="text-xl font-bold text-[var(--highlight)] mb-3">市场饱和度评分</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                通过量化数据，直观展示当前 Idea 的市场拥挤度，是红海厮杀还是蓝海机遇，一目了然。
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
              <h3 className="text-xl font-bold text-[var(--highlight)] mb-3">SWOT 深度分析</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                自动生成优势、劣势、机会与威胁分析报告，帮助你在早期规避商业逻辑上的致命缺陷。
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="group relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 transition-all duration-300 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10 md:col-span-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="relative z-10 max-w-lg">
              <h3 className="text-2xl font-bold text-[var(--highlight)] mb-3">Pivot 破局建议</h3>
              <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-6">
                不仅指出问题，更提供解决方案。系统将基于市场空白，为你提供极具实操性的转型（Pivot）切入点建议。
              </p>
              <Link href="/validator" className="text-[var(--accent)] font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all">
                立即验证 <ArrowRight className="w-4 h-4" />
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
