import type { ChatMessage } from 'chatgpt'
import type fetch from 'node-fetch'

// 扩展ChatMessage类型，添加模型信息
export interface ExtendedChatMessage extends ChatMessage {
  model?: string
  thinking?: boolean
  reasoning?: string
}

export interface RequestOptions {
  message: string
  lastContext?: { conversationId?: string, parentMessageId?: string }
  process?: (chat: ExtendedChatMessage) => void
  systemMessage?: string
  temperature?: number
  top_p?: number
  selectedModel?: string
}

export interface SetProxyOptions {
  fetch?: typeof fetch
}

export interface UsageResponse {
  total_usage: number
}
