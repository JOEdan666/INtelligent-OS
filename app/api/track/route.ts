import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const path = body.path;
    const userAgent = request.headers.get('user-agent');
    const ip = (request.headers.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0];

    await prisma.visit.create({
      data: {
        path,
        ip,
        userAgent,
      },
    });

    return NextResponse.json({ message: 'Visit tracked' }, { status: 200 });
  } catch (error) {
    console.error('Failed to track visit:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
