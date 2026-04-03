'use client'

import Link from 'next/link'
import { Brain } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

const NewHeader = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-[-0.04em] text-gray-900">学伴</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/learning-setup"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-blue-600"
          >
            系统学习
          </Link>
          <Link
            href="/unified-chat"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-blue-600"
          >
            AI对话
          </Link>
          <Link
            href="/learning-history"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-blue-600"
          >
            自学历史
          </Link>
          <Link
            href="/notes"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-blue-600"
          >
            学习笔记
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors shadow-sm">
                登录/注册
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  )
}

export default NewHeader
