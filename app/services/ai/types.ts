export type Role = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  role: Role
  content: string
}

export interface AIRequestOptions {
  purpose?: 'lecture' | 'qa' | 'chat'
  maxTokens?: number
  temperature?: number
}

export interface AIProvider {
  onMessage: (handler: (message: string, isFinal: boolean) => void) => void
  onError: (handler: (error: string) => void) => void
  sendMessage: (query: string, history?: ChatMessage[], options?: AIRequestOptions) => Promise<void>
  close: () => void
  setDebugMode?: (debug: boolean) => void
}

export interface XunfeiProviderConfig {
  appId: string
  apiKey: string
  apiSecret: string
  domain?: string
  apiUrl?: string
}

export interface OpenAIProviderConfig {
  apiKey: string
  baseUrl?: string
  model?: string
}

export type ProviderKind = 'xunfei' | 'openai'

export interface AIProviderConfig {
  provider: ProviderKind
  xunfei?: XunfeiProviderConfig
  openai?: OpenAIProviderConfig
  debug?: boolean
}
