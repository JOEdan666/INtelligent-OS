import { NextRequest, NextResponse } from 'next/server'
import { LearningProgressService } from '@/app/services/learningProgressService'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    if (type === 'dashboard') {
      const stats = await LearningProgressService.getGlobalLearningStats(userId)
      return NextResponse.json({
        success: true,
        data: stats
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid type parameter'
    }, { status: 400 })
  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics data'
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[Analytics]', {
      path: body?.path,
      event: body?.event,
      meta: body?.meta,
      ts: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Analytics error', e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
