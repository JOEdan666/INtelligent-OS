'use client'

const items = [
  { label: '日均学习', value: '3.2h', desc: '单人平均高效学习时长' },
  { label: '题目生成', value: '3分钟', desc: '一套测验自动生成' },
  { label: '覆盖教材', value: '20+版本', desc: '地区/版本持续更新' },
  { label: '复习提醒', value: '自动', desc: '按遗忘曲线安排' },
]

export default function TrustStrip() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-6 pt-3">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-[1.5rem] border border-sky-100/90 bg-white/80 px-5 py-4 shadow-[0_24px_60px_-48px_rgba(59,130,246,0.28)] backdrop-blur-sm"
          >
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{it.label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-sky-700">{it.value}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">{it.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
