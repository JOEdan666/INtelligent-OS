import { AIProvider, AIRequestOptions, ChatMessage } from '../types'

export class OpenAIProvider implements AIProvider {
  private messageHandler: ((message: string, isFinal: boolean) => void) | null = null
  private errorHandler: ((error: string) => void) | null = null
  // 非流式，客户端不持有长连接

  onMessage(handler: (message: string, isFinal: boolean) => void): void {
    this.messageHandler = handler
  }

  onError(handler: (error: string) => void): void {
    this.errorHandler = handler
  }

  async sendMessage(query: string, history?: ChatMessage[], options?: AIRequestOptions): Promise<void> {
    let timeoutId: number | undefined
    try {
      const controller = new AbortController()
      timeoutId = window.setTimeout(() => controller.abort(), 30_000)
      const startedAt = performance.now()
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          history: history || [],
          purpose: options?.purpose || 'chat',
          max_tokens: options?.maxTokens,
          temperature: options?.temperature,
        }),
        signal: controller.signal,
      };
      const resp = await fetch('/api/openai-chat?stream=1', fetchOptions)
      
      if (!resp.ok) {
        const status = resp.status
        let parsed: any = null
        let rawText = ''
        try {
          parsed = await resp.json()
        } catch (e) {
          console.error('[OpenAIProvider] 解析错误响应JSON失败:', e);
          rawText = await resp.text().catch(() => '')
        }
        const upstreamMsg: string = parsed?.error || rawText || `请求失败: ${status}`
        console.error('[OpenAIProvider] 请求失败:', status, upstreamMsg);

        let friendly = upstreamMsg
        switch (status) {
          case 401:
            friendly = `鉴权失败（401）。请检查 OPENAI_API_KEY 是否正确且具备相应权限。详情：${upstreamMsg}`
            break
          case 402:
            friendly = `余额不足（402）。请为当前账户充值，或切换到讯飞提供商（设置 NEXT_PUBLIC_AI_PROVIDER=xunfei 并重启）。详情：${upstreamMsg}`
            break
          case 403:
            friendly = `无权限（403）。请确认账号已开通对应模型与接口权限。详情：${upstreamMsg}`
            break
          case 404:
            friendly = `未找到接口或模型（404）。请核对 OPENAI_BASE_URL 与 OPENAI_MODEL。详情：${upstreamMsg}`
            break
          case 429:
            friendly = `超出速率/配额限制（429）。请稍后重试或提升配额。详情：${upstreamMsg}`
            break
          default:
            if (status >= 500) {
              friendly = `上游服务异常（${status}）。请稍后再试。详情：${upstreamMsg}`
            }
        }

        this.errorHandler?.(friendly)
        return
      }

      // 如果返回的是 JSON（非流式回退），保持一次性返回
      const ct = resp.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const data = await resp.json()
        const content = data?.content || ''
        this.messageHandler?.(content, true)
        return
      }

      // 流式读取纯文本增量内容
      const reader = resp.body?.getReader()
      const decoder = new TextDecoder('utf-8')
      if (!reader) {
        this.errorHandler?.('浏览器不支持流式读取响应')
        return
      }
      
      let done = false
      let totalContent = ''
      let receivedChunks = 0
      
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        
        if (value) {
          try {
            const chunk = decoder.decode(value, { stream: true })
            receivedChunks++
            
            totalContent += chunk
            if (this.messageHandler && chunk.length > 0) {
              this.messageHandler(chunk, false)
            }
          } catch (decodeError) {
            console.error('[OpenAIProvider] 解码数据块失败:', decodeError);
          }
        }
      }
      
      console.info('[OpenAIProvider] 完成', {
        purpose: options?.purpose || 'chat',
        durationMs: Math.round(performance.now() - startedAt),
        contentLength: totalContent.length,
        chunks: receivedChunks,
      })
      if (this.messageHandler) {
        this.messageHandler('', true)
      }
    } catch (e: any) {
      console.error('[OpenAIProvider] 发生错误:', e);
      this.errorHandler?.(e?.name === 'AbortError' ? '回答超时，请重试' : e?.message || '网络错误')
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }

  close(): void {
    // 无需关闭
  }
}
