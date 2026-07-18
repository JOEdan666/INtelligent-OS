import { prisma } from '@/app/lib/prisma'

type ReviewSeed = {
  question: string
  correctAnswer: string
  explanation?: string | null
}

export async function syncReviewCardsFromSession(input: {
  userId: string
  sessionId: string
  subject: string
  topic: string
  questions: ReviewSeed[]
}) {
  const questions = input.questions
    .filter((item) => item.question?.trim() && item.correctAnswer?.trim())
    .slice(0, 5)

  if (questions.length === 0) return []

  const existingCards = await prisma.reviewCard.findMany({
    where: { userId: input.userId, sourceSessionId: input.sessionId },
    orderBy: { createdAt: 'asc' },
  })
  if (existingCards.length > 0) return existingCards

  return prisma.$transaction(
    questions.map((item) =>
      prisma.reviewCard.create({
        data: {
          userId: input.userId,
          sourceSessionId: input.sessionId,
          subject: input.subject,
          topic: input.topic,
          prompt: item.question.trim(),
          answer: [item.correctAnswer, item.explanation].filter(Boolean).join('\n\n'),
          nextReviewAt: new Date(),
        },
      }),
    ),
  )
}

export async function syncKnowledgeNoteFromSession(input: {
  userId: string
  sessionId: string
  subject: string
  topic: string
  summary?: string | null
  reviewNotes?: string | null
  explanation?: string | null
}) {
  const sessionTag = `session:${input.sessionId}`
  const content = input.summary || input.reviewNotes || input.explanation
  if (!content?.trim()) return null

  const existing = await prisma.note.findFirst({
    where: { userId: input.userId, tags: { has: sessionTag } },
    select: { id: true },
  })
  if (existing) return existing

  return prisma.note.create({
    data: {
      userId: input.userId,
      title: input.topic,
      color: '#0ea5e9',
      tags: [input.subject, '学习产出', sessionTag],
      knowledgePoints: [input.topic],
      blocks: {
        create: [{ type: 'paragraph', content: content.trim(), order: 0 }],
      },
    },
  })
}
