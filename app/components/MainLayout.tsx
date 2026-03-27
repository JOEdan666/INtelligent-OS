'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brain } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

const NAV_ITEMS = [
  { key: '/', label: '主页' },
  { key: '/learning-setup', label: '开始学习' },
  { key: '/unified-chat', label: 'AI 对话' },
  { key: '/learning-history', label: '学习档案' },
  { key: '/notes', label: '学习笔记' },
]

function isActive(pathname: string, key: string) {
  if (key === '/') return pathname === '/'
  return pathname === key || pathname.startsWith(`${key}/`)
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-sky-100/80 bg-white/86 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sm">
                <Brain className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-900 tracking-tight">智学引擎</div>
                <div className="text-[11px] text-slate-500">AI 自学系统</div>
              </div>
            </Link>

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
                        : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900'
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
                        : 'bg-white text-slate-600 border border-sky-100 hover:text-slate-900'
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
