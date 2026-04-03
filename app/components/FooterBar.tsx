'use client'

export default function FooterBar() {
  return (
    <footer role="contentinfo" className="border-t border-sky-100/90 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
        <div className="text-base font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">学伴</div>
        <div className="text-right text-xs uppercase tracking-[0.12em] text-sky-600/70 dark:text-sky-400/70">
          AI Learning Companion
        </div>
      </div>
    </footer>
  )
}
