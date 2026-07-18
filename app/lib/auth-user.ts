import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function getAuthenticatedUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: '请先登录' },
    { status: 401 },
  )
}
