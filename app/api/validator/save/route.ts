import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '../../../generated/prisma'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { originalIdea, refinedIdea, score, verdict, reportJson } = body

    if (!originalIdea || !reportJson) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Save to database
    const validation = await prisma.ideaValidation.create({
      data: {
        userId,
        originalIdea,
        refinedIdea: refinedIdea || null,
        score: score || 0,
        verdict: verdict || '',
        reportJson: reportJson,
      }
    })

    return NextResponse.json({ success: true, id: validation.id })
  } catch (error: any) {
    console.error('[Validator Save API Error]:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
