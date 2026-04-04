import { NextRequest, NextResponse } from 'next/server'

const MAX_MESSAGES = 16
const MAX_CONTENT_LENGTH = 4000

const sanitizeMessages = (messages: any[] = []) => {
  const trimmed = messages
    .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .slice(-MAX_MESSAGES)
    .map(m => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_CONTENT_LENGTH),
    }))
  return trimmed
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    let messages = body.messages || []
    messages = sanitizeMessages(messages)

    const apiKey = process.env.OPENAI_API_KEY
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    const model = process.env.OPENAI_MODEL || 'deepseek-chat'

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 400 })
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45_000)

    let upstream: Response
    try {
      upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          stream: true,
        }),
        cache: 'no-store',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!upstream.ok) {
      const errText = await upstream.text()
      return NextResponse.json({ error: `Upstream error ${upstream.status}: ${errText}` }, { status: upstream.status })
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstream.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }
        let buffer = ''
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            let sepIndex: number
            while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
              const eventChunk = buffer.slice(0, sepIndex)
              buffer = buffer.slice(sepIndex + 2)
              const lines = eventChunk.split('\n').map(l => l.trim())
              for (const line of lines) {
                if (!line.startsWith('data:')) continue
                const data = line.slice(5).trim()
                if (!data) continue
                if (data === '[DONE]') {
                  controller.close()
                  return
                }
                try {
                  const json = JSON.parse(data)
                  const deltaContent =
                    json?.choices?.[0]?.delta?.content ||
                    json?.choices?.[0]?.message?.content ||
                    ''
                  if (deltaContent) {
                    controller.enqueue(encoder.encode(deltaContent))
                  }
                } catch (e) {
                  // Ignore parse errors for partial chunks
                }
              }
            }
          }
        } catch (e) {
          controller.error(e)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return NextResponse.json({ error: 'Upstream request timed out' }, { status: 504 })
    }
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
