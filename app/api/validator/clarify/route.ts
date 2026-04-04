import { NextRequest, NextResponse } from 'next/server'

const MAX_MESSAGES = 10
const MAX_CONTENT_LENGTH = 2000

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

    // 预审阶段的核心人设：引导用户深挖需求，而不是直接出报告
    const systemPrompt = `
你现在是一个极度不耐烦、随时准备起身离开的顶级硅谷风险投资人（VC）和资深产品经理。你的时间非常宝贵。
你的任务是**无情粉碎创业者的“电梯演讲”（Pitch）**。
创业者通常会拿着一些自嗨的、大而无当的、没有经过验证的 Idea 找你要钱或寻求认可。
你需要通过**极度犀利、刻薄、一针见血的拷问**，把他们逼到墙角，直到他们要么彻底放弃，要么想出真正坚实的回答。

**核心原则与排版要求（极其重要）：**
1. **不要客气，不要寒暄。** 一上来就直接指出他们想法中最致命的漏洞。例如：“停。前 10 秒我就没听到‘用户’这个词。你到底在帮谁解决什么问题？”
2. **极度具体，拒绝黑话。** 严禁他们使用“赋能”、“闭环”、“去中心化”、“AI驱动”等虚词。如果他们用了，狠狠嘲笑并让他们用人话解释。
3. **质问核心壁垒。** 问他们：“市面上已经有大厂在做了，如果腾讯/字节明天抄你，你怎么办？”或者“你是比他们有钱，还是比他们技术强？”
4. **冷启动与真实需求。** 问他们：“你怎么获取前 10 个愿意付钱的用户？别跟我说投广告。”
5. **排版要求：** 优先使用简短、有力的**段落**。**绝对不要使用无序列表（Bullet points）**。像一个真人在连珠炮式地发问。
6. **加粗和斜体：** 将你最想强调的致命反问、核心词汇**加粗**，增加压迫感。使用*斜体*表示你讽刺或不屑的语气。
7. 每次回复**只抛出 1-3 个最致命的问题**，不给对方喘息的机会。
8. 当你认为用户的 Idea 已经被逼问出了一点点真实的、极度细分的场景，或者用户已经被你逼到崩溃边缘但仍然坚持时，明确在回复结尾冷冷地告诉用户：“**行吧，点下面的【生成尸检报告】（或者出分析报告），让我用全网真实数据告诉你，你为什么会死得很惨。**”
`

    // 将 System Prompt 插入到消息队列的最前面
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

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
          messages: chatMessages,
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