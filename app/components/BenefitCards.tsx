'use client'
import { motion } from 'framer-motion'

export default function BenefitCards() {
  const items = [
    { title: '系统讲解', desc: '按地区考纲与年级生成结构化讲解，支持导图、表格与公式。', stat: '覆盖 20+ 版本教材', color: 'from-sky-500 to-blue-700' },
    { title: '高效测验', desc: '题目自动生成与错误定位，一键沉淀到错题和复盘记录。', stat: '3 分钟生成一套', color: 'from-blue-500 to-indigo-700' },
    { title: '间隔复习', desc: '自动安排复习计划，提醒待复习内容，帮助记忆真正留住。', stat: '按遗忘曲线规划', color: 'from-cyan-500 to-slate-900' },
  ]
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-2">
        <span className="zen-chip w-fit">能力结构</span>
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950 md:text-4xl">学习不只是一轮问答</h2>
        <p className="max-w-2xl text-sm text-slate-600 md:text-base md:leading-7">
          学伴把讲解、练习和复盘衔接起来，让每一次进入都能直接推进结果。
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((it, idx) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 180, damping: 20, delay: idx * 0.08 }}
            whileHover={{ y: -10, scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-[1.75rem] border border-sky-100/90 bg-white/84 p-7 shadow-[0_28px_80px_-56px_rgba(59,130,246,0.32)] backdrop-blur-sm"
          >
            <div aria-hidden="true" className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r ${it.color} text-white`}>★</div>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{it.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{it.desc}</p>
            <div className="mt-5 inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs text-sky-700">{it.stat}</div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
