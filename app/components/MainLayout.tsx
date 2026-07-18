'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brain, MoonStar, Monitor, SunMedium } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { useThemeMode } from '../providers/ThemeProvider'

const NAV_ITEMS = [
  { key: '/', label: '今日' },
  { key: '/learning-setup', label: '学习' },
  { key: '/knowledge-base', label: '知识库' },
  { key: '/review', label: '复习' },
]

function isActive(pathname: string, key: string) {
  if (key === '/') return pathname === '/'
  return pathname === key || pathname.startsWith(`${key}/`)
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { mode, setMode } = useThemeMode()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-sky-100/80 bg-white/86 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/82">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex shrink-0 items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sm">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <div className="text-base font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">学伴</div>
                </div>
              </Link>

              <label className="hidden items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-2 text-sm text-slate-600 shadow-sm backdrop-blur md:flex dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200">
                {mode === 'light' && <SunMedium className="h-4 w-4 text-amber-500" />}
                {mode === 'dark' && <MoonStar className="h-4 w-4 text-sky-400" />}
                {mode === 'system' && <Monitor className="h-4 w-4 text-slate-500 dark:text-slate-300" />}
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as 'light' | 'dark' | 'system')}
                  className="bg-transparent pr-1 text-sm outline-none"
                  aria-label="切换主题模式"
                >
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                  <option value="system">跟随系统</option>
                </select>
              </label>
            </div>

            <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.key)
                return (
                  <Link
                    key={item.key}
                    href={item.key}
                    className={`rounded-full px-4 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center justify-end shrink-0">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
                    登录 / 注册
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: 'w-9 h-9 border border-sky-100',
                    },
                  }}
                />
              </SignedIn>
            </div>
          </div>

          <div className="pb-3 md:hidden">
            <div className="mb-3 flex items-center">
              <label className="flex items-center gap-2 rounded-full border border-sky-100 bg-white/85 px-3 py-2 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200">
                {mode === 'light' && <SunMedium className="h-4 w-4 text-amber-500" />}
                {mode === 'dark' && <MoonStar className="h-4 w-4 text-sky-400" />}
                {mode === 'system' && <Monitor className="h-4 w-4 text-slate-500 dark:text-slate-300" />}
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as 'light' | 'dark' | 'system')}
                  className="bg-transparent outline-none"
                  aria-label="切换主题模式"
                >
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                  <option value="system">跟随系统</option>
                </select>
              </label>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.key)
                return (
                  <Link
                    key={item.key}
                    href={item.key}
                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                      active
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white'
                        : 'border border-sky-100 bg-white text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      <main key={pathname} className="fade-rise">
        {children}
      </main>
    </div>
  )
}
