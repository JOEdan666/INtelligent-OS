import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import 'katex/dist/katex.min.css'
import MainLayout from './components/MainLayout'
import ThemeProvider from './providers/ThemeProvider'
import ErrorBoundary from './components/ErrorBoundary'

export const metadata: Metadata = {
  metadataBase: new URL('https://xueban.org'),
  title: '学伴',
  description: '个人 AI 学习操作系统：主动学习、验证掌握、按时复习并沉淀知识资产。',
  openGraph: {
    title: '学伴',
    description: '主动学习、验证掌握、按时复习并沉淀知识资产。',
    siteName: '学伴',
    images: [
      { url: '/intelligent.jpg', width: 1200, height: 630, alt: '学伴' }
    ],
    locale: 'zh_CN',
    type: 'website'
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="zh-CN">
        {/* 使用系统字体，避免构建时联网下载 Google Fonts 导致 ECONNRESET */}
        <body className="min-h-screen antialiased">
          <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
            '@context':'https://schema.org', '@type':'WebSite', name:'学伴',
          })}} />
          
          <ErrorBoundary>
            <ThemeProvider>
              {/* 使用 suppressHydrationWarning 消除某些插件或扩展导致的不匹配警告 */}
              <div suppressHydrationWarning>
                <MainLayout>
                  {children}
                </MainLayout>
              </div>
            </ThemeProvider>
          </ErrorBoundary>

          <Toaster
            position="top-right"
            containerStyle={{
              top: 80, // Position below header
            }}
            toastOptions={{
              duration: 3000,
              style: {
                background: '#fff',
                color: '#0f172a',
                boxShadow: '0 18px 42px -30px rgba(15, 23, 42, 0.55)',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500,
                maxWidth: '400px',
              },
              success: {
                style: {
                  borderLeft: '3px solid #0ea5e9',
                },
                iconTheme: { primary: '#0ea5e9', secondary: '#fff' }
              },
              error: {
                style: {
                  borderLeft: '3px solid #ef4444',
                },
                iconTheme: { primary: '#EF4444', secondary: '#fff' }
              },
              loading: {
                style: {
                  borderLeft: '3px solid #2563eb',
                },
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
