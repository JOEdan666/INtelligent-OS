'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  WrongQuestion,
  WrongQuestionFeedback,
  WrongQuestionStats,
  DailyStats,
  WeeklyHeatmapData,
  ErrorType,
  CreateWrongQuestionPayload
} from '@/app/types/wrongQuestion'
import {
  calculateNextReview,
  applyFeedbackToStage,
  REVIEW_INTERVALS
} from '@/app/types/wrongQuestion'

interface WrongQuestionState {
  questions: WrongQuestion[]
  isLoading: boolean
  error: string | null

  // Actions
  loadQuestions: () => Promise<void>
  addQuestion: (payload: CreateWrongQuestionPayload) => WrongQuestion
  updateQuestion: (id: string, updates: Partial<WrongQuestion>) => void
  deleteQuestion: (id: string) => void
  applyFeedback: (id: string, feedback: WrongQuestionFeedback) => void
  archiveQuestion: (id: string) => void
  restoreQuestion: (id: string) => void
  toggleFavorite: (id: string) => void

  // Queries
  getDueQuestions: () => WrongQuestion[]
  getBySubject: (subject: string) => WrongQuestion[]
  getStats: () => WrongQuestionStats
  getDailyStats: (days?: number) => DailyStats[]
  getWeeklyHeatmap: (weeks?: number) => WeeklyHeatmapData[]
  getStageDistribution: () => number[]
}

function generateId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `wq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const useWrongQuestionStore = create<WrongQuestionState>()(
  persist(
    (set, get) => ({
      questions: [],
      isLoading: false,
      error: null,

      loadQuestions: async () => {
        set({ isLoading: true })
        try {
          // Load from localStorage initially, IndexedDB migration handled separately
          const state = get()
          set({ questions: state.questions, isLoading: false })
        } catch (error) {
          set({ error: 'Failed to load questions', isLoading: false })
        }
      },

      addQuestion: (payload) => {
        const now = Date.now()
        const newQuestion: WrongQuestion = {
          id: generateId(),
          subject: payload.subject,
          question: payload.question,
          correctAnswer: payload.correctAnswer,
          userAnswer: payload.userAnswer,
          analysis: payload.analysis,
          source: payload.source,
          tags: payload.tags || [],
          imageUrls: payload.imageUrls || [],
          answerImageUrls: payload.answerImageUrls || [],
          aiAnalysis: payload.aiAnalysis,
          knowledgePoints: payload.knowledgePoints || [],
          relatedNotes: payload.relatedNotes || [],
          relatedQuestions: payload.relatedQuestions || [],
          stage: 0,
          nextReviewAt: calculateNextReview(0),
          reviewHistory: [],
          reviewCount: 0,
          status: 'active',
          isFavorite: false,
          createdAt: now,
          updatedAt: now
        }

        set((state) => ({
          questions: [newQuestion, ...state.questions]
        }))

        return newQuestion
      },

      updateQuestion: (id, updates) => {
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id ? { ...q, ...updates, updatedAt: Date.now() } : q
          )
        }))
      },

      deleteQuestion: (id) => {
        set((state) => ({
          questions: state.questions.filter((q) => q.id !== id)
        }))
      },

      applyFeedback: (id, feedback) => {
        set((state) => {
          const question = state.questions.find((q) => q.id === id)
          if (!question) return state

          const newStage = applyFeedbackToStage(question.stage, feedback)
          const now = Date.now()

          const historyEntry = {
            reviewedAt: now,
            feedback,
            stageBeforeReview: question.stage,
            stageAfterReview: newStage
          }

          return {
            questions: state.questions.map((q) =>
              q.id === id
                ? {
                    ...q,
                    stage: newStage,
                    nextReviewAt: calculateNextReview(newStage),
                    lastReviewedAt: now,
                    reviewHistory: [...(q.reviewHistory || []), historyEntry],
                    reviewCount: q.reviewCount + 1,
                    updatedAt: now
                  }
                : q
            )
          }
        })
      },

      archiveQuestion: (id) => {
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id ? { ...q, status: 'archived', updatedAt: Date.now() } : q
          )
        }))
      },

      restoreQuestion: (id) => {
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id ? { ...q, status: 'active', updatedAt: Date.now() } : q
          )
        }))
      },

      toggleFavorite: (id) => {
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id ? { ...q, isFavorite: !q.isFavorite, updatedAt: Date.now() } : q
          )
        }))
      },

      getDueQuestions: () => {
        const now = Date.now()
        return get()
          .questions.filter((q) => q.status === 'active' && q.nextReviewAt <= now)
          .sort((a, b) => a.nextReviewAt - b.nextReviewAt)
      },

      getBySubject: (subject) => {
        return get().questions.filter((q) => q.subject === subject)
      },

      getStats: () => {
        const questions = get().questions
        const now = Date.now()

        const active = questions.filter((q) => q.status === 'active')
        const archived = questions.filter((q) => q.status === 'archived')
        const mastered = questions.filter((q) => q.status === 'mastered' || q.stage >= 5)
        const dueToday = active.filter((q) => q.nextReviewAt <= now)

        // By subject
        const bySubject: Record<string, number> = {}
        questions.forEach((q) => {
          bySubject[q.subject] = (bySubject[q.subject] || 0) + 1
        })

        // By error type
        const byErrorType: Record<ErrorType, number> = {
          concept: 0,
          calculation: 0,
          careless: 0,
          method: 0,
          knowledge_gap: 0,
          other: 0
        }
        questions.forEach((q) => {
          if (q.aiAnalysis?.errorType) {
            byErrorType[q.aiAnalysis.errorType]++
          }
        })

        // Calculate accuracy rate from recent reviews
        const recentReviews = questions
          .flatMap((q) => q.reviewHistory || [])
          .filter((r) => r.reviewedAt > now - 30 * 24 * 60 * 60 * 1000) // Last 30 days

        const remembered = recentReviews.filter((r) => r.feedback === 'remember').length
        const accuracyRate = recentReviews.length > 0 ? remembered / recentReviews.length : 0

        // Average stage
        const averageStage =
          active.length > 0 ? active.reduce((sum, q) => sum + q.stage, 0) / active.length : 0

        // Streak calculation
        let streakDays = 0
        const today = new Date().toDateString()
        let checkDate = new Date()
        while (true) {
          const dayStr = checkDate.toDateString()
          const hasReview = questions.some((q) =>
            q.reviewHistory?.some((r) => new Date(r.reviewedAt).toDateString() === dayStr)
          )
          if (hasReview || dayStr === today) {
            if (hasReview) streakDays++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }

        const lastReview = Math.max(
          ...questions.flatMap((q) => q.reviewHistory?.map((r) => r.reviewedAt) || [0])
        )

        return {
          total: questions.length,
          active: active.length,
          archived: archived.length,
          mastered: mastered.length,
          dueToday: dueToday.length,
          bySubject,
          byErrorType,
          accuracyRate,
          averageStage,
          streakDays,
          lastStudyDate: lastReview > 0 ? lastReview : undefined
        }
      },

      getDailyStats: (days = 14) => {
        const questions = get().questions
        const stats: DailyStats[] = []
        const now = new Date()

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().slice(0, 10)
          const dayStart = new Date(dateStr).getTime()
          const dayEnd = dayStart + 24 * 60 * 60 * 1000

          const dayReviews = questions.flatMap((q) =>
            (q.reviewHistory || []).filter((r) => r.reviewedAt >= dayStart && r.reviewedAt < dayEnd)
          )

          const remembered = dayReviews.filter((r) => r.feedback === 'remember').length
          const forgot = dayReviews.filter((r) => r.feedback === 'forgot').length
          const newAdded = questions.filter(
            (q) => q.createdAt >= dayStart && q.createdAt < dayEnd
          ).length

          stats.push({
            date: dateStr,
            reviewed: dayReviews.length,
            remembered,
            forgot,
            newAdded,
            accuracy: dayReviews.length > 0 ? remembered / dayReviews.length : 0
          })
        }

        return stats
      },

      getWeeklyHeatmap: (weeks = 12) => {
        const questions = get().questions
        const data: WeeklyHeatmapData[] = []
        const now = new Date()
        const todayDay = now.getDay()

        // Find the start of the grid (weeks ago, on Sunday)
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - todayDay - (weeks - 1) * 7)

        for (let w = 0; w < weeks; w++) {
          for (let d = 0; d < 7; d++) {
            const date = new Date(startDate)
            date.setDate(date.getDate() + w * 7 + d)
            const dateStr = date.toISOString().slice(0, 10)

            if (date > now) continue

            const dayStart = new Date(dateStr).getTime()
            const dayEnd = dayStart + 24 * 60 * 60 * 1000

            const count = questions.flatMap((q) =>
              (q.reviewHistory || []).filter(
                (r) => r.reviewedAt >= dayStart && r.reviewedAt < dayEnd
              )
            ).length

            data.push({
              week: w,
              day: d,
              count,
              date: dateStr
            })
          }
        }

        return data
      },

      getStageDistribution: () => {
        const questions = get().questions.filter((q) => q.status === 'active')
        const distribution = new Array(REVIEW_INTERVALS.length).fill(0)

        questions.forEach((q) => {
          const stage = Math.min(q.stage, REVIEW_INTERVALS.length - 1)
          distribution[stage]++
        })

        return distribution
      }
    }),
    {
      name: 'wrong-questions-storage',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0 || version === 1) {
          // Migration from old format
          const oldState = persistedState as { questions?: unknown[] }
          if (oldState.questions) {
            return {
              questions: oldState.questions.map((value) => {
                const q = value as Record<string, unknown>
                return ({
                ...q,
                imageUrls: q.imageUrls || [],
                answerImageUrls: q.answerImageUrls || [],
                knowledgePoints: q.knowledgePoints || [],
                relatedNotes: q.relatedNotes || [],
                relatedQuestions: q.relatedQuestions || [],
                reviewHistory: q.reviewHistory || [],
                reviewCount: q.reviewCount || 0,
                isFavorite: q.isFavorite || false,
                updatedAt: q.updatedAt || q.createdAt || Date.now()
                })
              })
            }
          }
        }
        return persistedState
      }
    }
  )
)
