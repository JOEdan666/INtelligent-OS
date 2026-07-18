import { NextRequest, NextResponse } from 'next/server'
import { GLOBAL_SYSTEM_PROMPT } from '@/app/lib/aiPrompts'

// 限制消息长度与条数，防止一次请求传入过大的上下文导致上游超时
const MAX_MESSAGES = 32
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

    // 支持两种数据格式：
    // 1. { query, history } - 旧格式
    // 2. { messages } - 新格式（从ExplainStep发送）
    let messages: Array<{ role: string; content: string }> = [];
    let query = '';

    if (body.messages) {
      // 新格式：直接使用messages
      messages = body.messages;
      // 提取最后一个用户消息作为query用于日志
      const lastUserMessage = body.messages.filter((m: any) => m.role === 'user').pop();
      query = lastUserMessage?.content || '';
    } else {
      // 旧格式：从query和history构建messages
      const { query: q, history } = body;
      query = q || '';
      messages = (history || []).concat([{ role: 'user', content: query }]);
    }

    // 清洗消息，限制长度与数量，避免把无效/过长内容传上游
    messages = sanitizeMessages(messages);

    // 在消息开头注入全局系统提示词（如果没有system消息的话）
    const hasSystemMessage = messages.some((m: any) => m.role === 'system');
    if (!hasSystemMessage) {
      messages = [{ role: 'system', content: GLOBAL_SYSTEM_PROMPT }, ...messages];
    } else {
      // 如果已有system消息，将全局提示合并到第一个system消息
      messages = messages.map((m: any, index: number) => {
        if (m.role === 'system' && index === messages.findIndex((msg: any) => msg.role === 'system')) {
          return { ...m, content: GLOBAL_SYSTEM_PROMPT + '\n\n' + m.content };
        }
        return m;
      });
    }

    const url = new URL(req.url)
    const isStream = ['1', 'true', 'yes'].includes((url.searchParams.get('stream') || '').toLowerCase())

    const apiKey = process.env.OPENAI_API_KEY
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    // 支持从请求体指定模型与最大输出长度
    const requestedModel = (body && body.model) ? String(body.model) : ''
    const model = requestedModel || process.env.OPENAI_MODEL || 'deepseek-chat'
    const purpose = ['lecture', 'qa', 'quiz', 'grading', 'chat'].includes(body?.purpose)
      ? body.purpose
      : 'chat'
    const purposeTokenLimits: Record<string, number> = {
      lecture: 1200,
      qa: 700,
      quiz: 900,
      grading: 1800,
      chat: 1200,
    }
    const requestedMaxTokens = typeof body?.max_tokens === 'number' ? body.max_tokens : purposeTokenLimits[purpose]
    const max_tokens = Math.max(200, Math.min(requestedMaxTokens, 2400))
    const requestedTemperature = typeof body?.temperature === 'number' ? body.temperature : 0.5
    const temperature = Math.max(0, Math.min(requestedTemperature, 1))
    const responseFormat = body?.response_format === 'json_object'
      ? { type: 'json_object' as const }
      : undefined

    console.log('[API] 收到请求:', { 
      query: query ? query.substring(0, 50) + '...' : '(无query)', 
      messagesLength: messages?.length || 0, 
      isStream,
      purpose,
    });
    console.log('[API] 配置:', { apiKey: apiKey ? '已设置' : '未设置', baseUrl, model });

    if (!apiKey) {
      console.error('[API] 错误: 缺少 OPENAI_API_KEY');
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 400 })
    }

    if (!messages || messages.length === 0) {
      console.error('[API] 错误: 缺少消息内容');
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 })
    }
    console.log('[API] 发送到上游的消息数量:', messages.length);

    // 流式：将上游 SSE 转换为纯文本增量输出
    if (isStream) {
      console.log('[API] 处理流式请求');
      const upstreamController = new AbortController();
      const timeout = setTimeout(() => upstreamController.abort(), 35_000);

      let upstream: Response;
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
            temperature,
            stream: true,
            max_tokens,
            ...(responseFormat ? { response_format: responseFormat } : {}),
          }),
          cache: 'no-store',
          signal: upstreamController.signal,
        })
      } catch (error) {
        clearTimeout(timeout);
        throw error
      }

      console.log('[API] 上游响应状态:', upstream.status);
      
      if (!upstream.ok) {
        clearTimeout(timeout)
        let errText = ''
        try {
          const j = await upstream.json()
          errText = j?.error?.message || j?.error || JSON.stringify(j)
        } catch {
          errText = await upstream.text()
        }
        const msg = `Upstream error ${upstream.status}: ${errText}`
        console.error('[API] 上游错误:', msg);
        return NextResponse.json({ error: msg }, { status: upstream.status })
      }

      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      let clientCancelled = false
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = upstream.body?.getReader()
          if (!reader) {
            console.error('[API] 错误: 无法获取上游响应的读取器');
            controller.close()
            return
          }
          let buffer = ''
          let totalContent = ''
          let chunksSent = 0
          let pendingText = ''
          let streamFailed = false
          const flush = () => {
            if (!pendingText || clientCancelled || streamFailed) return
            controller.enqueue(encoder.encode(pendingText))
            chunksSent++
            pendingText = ''
          }
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
                    flush()
                    return
                  }
                  try {
                    const json = JSON.parse(data)
                    const deltaContent =
                      json?.choices?.[0]?.delta?.content ||
                      json?.choices?.[0]?.message?.content ||
                      ''
                    if (deltaContent) {
                      totalContent += deltaContent
                      pendingText += deltaContent
                      if (pendingText.length >= 32) flush()
                    }
                  } catch (e) {
                    console.error('[API] 解析JSON数据块失败:', e, '数据:', data);
                    // 尝试直接发送数据作为文本，以防格式不匹配
                    try {
                      const textData = data.replace(/^data:/, '').trim()
                      if (textData && textData !== '[DONE]') {
                        controller.enqueue(encoder.encode(textData))
                      }
                    } catch (fallbackError) {
                      console.error('[API] 回退文本处理也失败:', fallbackError);
                    }
                  }
                }
              }
            }
          } catch (e) {
              console.error('[API] 处理流式响应时出错:', e);
              streamFailed = true
              if (!clientCancelled) controller.error(e)
          } finally {
            clearTimeout(timeout)
            if (!streamFailed && !clientCancelled) {
              flush()
              controller.close()
            }
            console.info('[API] 流式响应完成', { purpose, contentLength: totalContent.length, chunksSent })
          }
        },
        cancel() {
          clientCancelled = true
          clearTimeout(timeout)
          upstreamController.abort()
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // 非流式：保留原有一次性返回
    console.log('[API] 处理非流式请求');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    let resp: Response;
    try {
      resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
          ...(responseFormat ? { response_format: responseFormat } : {}),
        }),
        cache: 'no-store',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout);
    }

    if (!resp.ok) {
      let errText = ''
      try {
        const j = await resp.json()
        errText = j?.error?.message || j?.error || JSON.stringify(j)
      } catch {
        errText = await resp.text()
      }
      const msg = `Upstream error ${resp.status}: ${errText}`
      console.error('[API] 上游错误:', msg);
      return NextResponse.json({ error: msg }, { status: resp.status })
    }

    const data = await resp.json()
    const content =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.delta?.content ||
      ''
    console.log('[API] 非流式响应内容长度:', content.length);
    return NextResponse.json({ content })
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      console.error('[API] 请求超时，已中断上游连接');
      return NextResponse.json({ error: 'Upstream request timed out' }, { status: 504 })
    }
    console.error('[API] 发生未捕获错误:', e);
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
