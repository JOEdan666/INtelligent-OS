'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Book, ChevronRight, Clock, FileText, type LucideIcon } from 'lucide-react'

import LearningDashboard from '../components/analytics/LearningDashboard'
import MarkdownRenderer from '../components/MarkdownRenderer'

interface LearningSession {
  id: string
  conversationId: string
  subject: string
  topic: string
  grade: string
  aiExplanation: string
  currentStep: string
  createdAt: string
}

interface UserAnswer {
  id: string
  userAnswer: string
  createdAt: string
  question?: {
    question: string
    correctAnswer: string
    explanation: string
  }
}

interface Note {
  id: string
  title: string
  content: string
  color: string
  tags: string[]
}

const TABS = [
  { id: 'sessions', label: '学习会话', icon: Book },
  { id: 'mistakes', label: '错题回顾', icon: AlertCircle },
  { id: 'notes', label: '学习笔记', icon: FileText },
] as const

type HistoryTab = (typeof TABS)[number]['id']

export default function LearningHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<HistoryTab>('sessions')
  const [sessions, setSessions] = useState<LearningSession[]>([])
  const [mistakes, setMistakes] = useState<UserAnswer[]>([])
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [sessionsRes, mistakesRes, notesRes] = await Promise.all([
          fetch('/api/learning-progress?getAllSessions=true&limit=50&offset=0'),
          fetch('/api/user-answers?incorrectOnly=true&limit=50&offset=0'),
          fetch('/api/notes'),
        ])

        const sessionsData = await sessionsRes.json()
        const mistakesData = await mistakesRes.json()
        const notesData = await notesRes.json()

        setSessions(sessionsData.success && sessionsData.sessions ? sessionsData.sessions : [])
        setMistakes(mistakesData.success && mistakesData.userAnswers ? mistakesData.userAnswers : [])
        setNotes(notesData.success && notesData.data
          ? notesData.data.map((note: any) => ({
              ...note,
              content: Array.isArray(note.blocks)
                ? note.blocks.map((block: any) => block.content || '').join('')
                : '',
            }))
          : [])
      } catch (error) {
        console.error('获取学习历史失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('zh-CN')

  const getStepName = (step: string) =>
    (
      {
        EXPLAIN: '讲解',
        CONFIRM: '确认',
        QUIZ: '测验',
        REVIEW: '复习',
        DONE: '完成',
      } as Record<string, string>
    )[step] || step

  const getStepClass = (step: string) =>
    (
      {
        EXPLAIN: 'bg-sky-100 text-sky-800',
        CONFIRM: 'bg-amber-100 text-amber-800',
        QUIZ: 'bg-indigo-100 text-indigo-800',
        REVIEW: 'bg-orange-100 text-orange-800',
        DONE: 'bg-emerald-100 text-emerald-800',
      } as Record<string, string>
    )[step] || 'bg-slate-100 text-slate-700'

  return (
    <div className="zen-page">
      <header className="mb-6 md:mb-8">
        <span className="zen-chip">学习档案</span>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">回看、复盘、再优化</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">所有学习记录保持在一个清晰视图中。</p>
      </header>

      <LearningDashboard className="mb-6" />

      <section className="zen-panel overflow-hidden">
        <div className="border-b border-slate-200/80 p-2 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="p-4 md:p-6">
          {loading && (
            <div className="py-14 text-center text-slate-500 text-sm">
              正在加载学习档案...
            </div>
          )}

          {!loading && activeTab === 'sessions' && (
            <div className="space-y-3">
              {sessions.length === 0 && <EmptyState icon={Book} text="暂无学习会话" />}
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/learning-history/${session.conversationId}`)}
                  className="w-full text-left zen-link-card p-4 md:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base md:text-lg font-semibold text-slate-900">{session.topic}</h2>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStepClass(session.currentStep)}`}>
                          {getStepName(session.currentStep)}
                        </span>
                      </div>
                      <div className="mt-2 text-xs md:text-sm text-slate-500 flex flex-wrap items-center gap-2">
                        <span>{session.subject}</span>
                        <span>·</span>
                        <span>{session.grade}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(session.createdAt)}
                        </span>
                      </div>
                      {session.aiExplanation && (
                        <p className="mt-2 text-sm text-slate-600 line-clamp-1">
                          {session.aiExplanation.substring(0, 100).replace(/[#*`]/g, '')}...
                        </p>
                      )}
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && activeTab === 'mistakes' && (
            <div className="space-y-4">
              {mistakes.length === 0 && <EmptyState icon={AlertCircle} text="暂无错题记录" />}
              {mistakes.map((answer) => (
                <article key={answer.id} className="zen-link-card p-4 md:p-5">
                  <div className="mb-3 text-xs text-slate-500">{formatDate(answer.createdAt)}</div>
                  {answer.question && (
                    <div className="space-y-4">
                      <MarkdownRenderer
                        content={answer.question.question}
                        fontSize="sm"
                        className="!prose-p:my-1 !prose-h1:mt-3 !prose-h2:mt-3 !prose-h3:mt-2"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                          <div className="text-rose-600 text-xs mb-1">你的答案</div>
                          <div className="font-medium text-rose-900">{answer.userAnswer || '未作答'}</div>
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                          <div className="text-emerald-600 text-xs mb-1">正确答案</div>
                          <div className="font-medium text-emerald-900">{answer.question.correctAnswer}</div>
                        </div>
                      </div>
                      {answer.question.explanation && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                          <div className="font-medium text-slate-900 mb-1">解析</div>
                          <MarkdownRenderer
                            content={answer.question.explanation}
                            fontSize="sm"
                            className="!prose-p:my-1 !prose-h1:mt-3 !prose-h2:mt-3 !prose-h3:mt-2"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {!loading && activeTab === 'notes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {notes.length === 0 && <EmptyState icon={FileText} text="暂无学习笔记" className="md:col-span-2 xl:col-span-3" />}
              {notes.map((note) => (
                <article key={note.id} className="zen-link-card p-4 md:p-5 min-h-[220px] flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-5 w-1.5 rounded-full" style={{ backgroundColor: note.color || '#334155' }} />
                    <h3 className="font-semibold text-slate-900 line-clamp-1">{note.title}</h3>
                  </div>
                  <div className="flex-1 overflow-hidden text-sm text-slate-600">
                    <div
                      className="prose prose-sm max-w-none text-slate-700"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(note.tags || []).slice(0, 3).map((tag) => (
                      <span key={tag} className="zen-chip !text-[11px] !py-1 !px-2">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  text,
  className = '',
}: {
  icon: LucideIcon
  text: string
  className?: string
}) {
  return (
    <div className={`py-14 text-center text-slate-500 ${className}`}>
      <Icon className="h-10 w-10 mx-auto mb-3 text-slate-300" />
      <p>{text}</p>
    </div>
  )
}
