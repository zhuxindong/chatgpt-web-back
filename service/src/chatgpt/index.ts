import type { ChatGPTAPIOptions, ChatMessage } from 'chatgpt'
import type { ApiModel, ChatContext, ChatGPTUnofficialProxyAPIOptions, ModelConfig } from '../types'
import type { ExtendedChatMessage, RequestOptions, SetProxyOptions, UsageResponse } from './types'
import process from 'node:process'
import { ChatGPTAPI, ChatGPTUnofficialProxyAPI } from 'chatgpt'
import * as dotenv from 'dotenv'
import httpsProxyAgent from 'https-proxy-agent'
import fetch from 'node-fetch'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { sendResponse } from '../utils'
import { isNotEmptyString } from '../utils/is'
import 'isomorphic-fetch'

const { HttpsProxyAgent } = httpsProxyAgent

dotenv.config()

const ErrorCodeMessage: Record<string, string> = {
  401: '[OpenAI] 提供错误的API密钥 | Incorrect API key provided',
  403: '[OpenAI] 服务器拒绝访问，请稍后再试 | Server refused to access, please try again later',
  502: '[OpenAI] 错误的网关 |  Bad Gateway',
  503: '[OpenAI] 服务器繁忙，请稍后再试 | Server is busy, please try again later',
  504: '[OpenAI] 网关超时 | Gateway Time-out',
  500: '[OpenAI] 服务器繁忙，请稍后再试 | Internal Server Error',
}

const timeoutMs: number = !Number.isNaN(+process.env.TIMEOUT_MS) ? +process.env.TIMEOUT_MS : 100 * 1000
const disableDebug: boolean = process.env.OPENAI_API_DISABLE_DEBUG === 'true'

let apiModel: ApiModel
// 支持多个模型，用逗号分隔
const models = isNotEmptyString(process.env.OPENAI_API_MODEL)
  ? process.env.OPENAI_API_MODEL.split(',').map(m => m.trim())
  : ['gpt-3.5-turbo']
const model = models[0] // 默认使用第一个模型

if (!isNotEmptyString(process.env.OPENAI_API_KEY) && !isNotEmptyString(process.env.OPENAI_ACCESS_TOKEN))
  throw new Error('Missing OPENAI_API_KEY or OPENAI_ACCESS_TOKEN environment variable')

// eslint-disable-next-line unused-imports/no-unused-vars
let api: ChatGPTAPI | ChatGPTUnofficialProxyAPI;

(async () => {
  // More Info: https://github.com/transitive-bullshit/chatgpt-api

  if (isNotEmptyString(process.env.OPENAI_API_KEY)) {
    const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL

    const options: ChatGPTAPIOptions = {
      apiKey: process.env.OPENAI_API_KEY,
      completionParams: { model },
      debug: !disableDebug,
    }

    // increase max token limit if use gpt-4
    if (model.toLowerCase().includes('gpt-4')) {
      // if use 32k model
      if (model.toLowerCase().includes('32k')) {
        options.maxModelTokens = 32768
        options.maxResponseTokens = 8192
      }
      else if (/-4o-mini/.test(model.toLowerCase())) {
        options.maxModelTokens = 128000
        options.maxResponseTokens = 16384
      }
      // if use GPT-4 Turbo or GPT-4o
      else if (/-preview|-turbo|o/.test(model.toLowerCase())) {
        options.maxModelTokens = 128000
        options.maxResponseTokens = 4096
      }
      else {
        options.maxModelTokens = 8192
        options.maxResponseTokens = 2048
      }
    }
    else if (model.toLowerCase().includes('gpt-3.5')) {
      if (/16k|1106|0125/.test(model.toLowerCase())) {
        options.maxModelTokens = 16384
        options.maxResponseTokens = 4096
      }
    }
    else {
      options.maxModelTokens = 256000
      options.maxResponseTokens = 256000
    }

    if (isNotEmptyString(OPENAI_API_BASE_URL)) {
      // if find /v1 in OPENAI_API_BASE_URL then use it
      if (OPENAI_API_BASE_URL.includes('/v1'))
        options.apiBaseUrl = `${OPENAI_API_BASE_URL}`
      else
        options.apiBaseUrl = `${OPENAI_API_BASE_URL}/v1`
    }

    setupProxy(options as any)

    api = new ChatGPTAPI({ ...options })
    apiModel = 'ChatGPTAPI'
  }
  else {
    const options: ChatGPTUnofficialProxyAPIOptions = {
      accessToken: process.env.OPENAI_ACCESS_TOKEN,
      apiReverseProxyUrl: isNotEmptyString(process.env.API_REVERSE_PROXY) ? process.env.API_REVERSE_PROXY : 'https://ai.fakeopen.com/api/conversation',
      model,
      debug: !disableDebug,
    }

    setupProxy(options as any)

    api = new ChatGPTUnofficialProxyAPI({ ...options })
    apiModel = 'ChatGPTUnofficialProxyAPI'
  }
})()

async function chatReplyProcess(requestOptions: RequestOptions) {
  const { message, lastContext, process: callback, systemMessage, temperature, top_p, selectedModel } = requestOptions
  try {
    const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY

    // 使用传入的模型或默认模型
    const modelToUse = (selectedModel && models.includes(selectedModel)) ? selectedModel : model

    const messages = []
    if (isNotEmptyString(systemMessage))
      messages.push({ role: 'system', content: systemMessage })

    // 修复类型问题
    if (lastContext && 'history' in lastContext && Array.isArray(lastContext.history)) {
      lastContext.history.forEach((chat) => {
        if (chat.inversion)
          messages.push({ role: 'user', content: chat.text })
        else
          messages.push({ role: 'assistant', content: chat.text })
      })
    }

    messages.push({ role: 'user', content: message })

    const requestBody = {
      model: modelToUse,
      messages,
      temperature,
      top_p,
      stream: true,
      google: {
        thinking_config: {
          include_thoughts: true,
        },
      },
    }

    console.warn('Sending request to API with body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (response.status !== 200) {
      const errorData = await response.json() as { error: { message: string } }
      const code = response.status
      if (Reflect.has(ErrorCodeMessage, code))
        return sendResponse({ type: 'Fail', message: ErrorCodeMessage[code] })
      return sendResponse({ type: 'Fail', message: errorData.error.message ?? 'Please check the back-end console' })
    }

    for await (const chunk of response.body as any) {
      try {
        const chunkStr = chunk.toString()
        console.warn('Received chunk from API:', chunkStr) // Log the raw chunk
        const lines = chunkStr.split('\n\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6)
            if (jsonStr.trim() === '[DONE]')
              return

            try {
              const data = JSON.parse(jsonStr)
              const delta = data.choices[0].delta
              const chatMessage: ExtendedChatMessage = {
                id: data.id,
                text: delta.content || '',
                reasoning: delta.reasoning_content || '',
                role: 'assistant',
                conversationId: lastContext?.conversationId ?? data.id,
                parentMessageId: lastContext?.parentMessageId,
                model: modelToUse, // 添加模型信息
              }
              callback?.(chatMessage)
            }
            catch {
              // Skips noisy errors from the stream ending
            }
          }
        }
      }
      catch (error) {
        console.warn(error)
      }
    }
  }
  catch (error: any) {
    console.warn(error)
    return sendResponse({ type: 'Fail', message: error.message ?? 'Please check the back-end console' })
  }
}

async function fetchUsage() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL

  if (!isNotEmptyString(OPENAI_API_KEY))
    return Promise.resolve('-')

  const API_BASE_URL = isNotEmptyString(OPENAI_API_BASE_URL)
    ? OPENAI_API_BASE_URL
    : 'https://api.openai.com'

  const [startDate, endDate] = formatDate()

  // 每月使用量
  const urlUsage = `${API_BASE_URL}/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`

  const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  }

  const options = {} as SetProxyOptions

  setupProxy(options)

  // 确保options.fetch被正确设置
  if (!options.fetch)
    options.fetch = fetch

  try {
    // 获取已使用量
    const useResponse = await options.fetch(urlUsage, { headers })
    if (!useResponse.ok) {
      console.warn('获取使用量失败:', useResponse.statusText)
      return Promise.resolve('-')
    }
    const usageData = await useResponse.json() as UsageResponse
    const usage = Math.round(usageData.total_usage) / 100
    return Promise.resolve(usage ? `$${usage}` : '-')
  }
  catch (error) {
    console.warn('获取使用量异常:', error)
    return Promise.resolve('-')
  }
}

function formatDate(): string[] {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const lastDay = new Date(year, month, 0)
  const formattedFirstDay = `${year}-${month.toString().padStart(2, '0')}-01`
  const formattedLastDay = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`
  return [formattedFirstDay, formattedLastDay]
}

async function chatConfig() {
  const usage = await fetchUsage()
  const reverseProxy = process.env.API_REVERSE_PROXY ?? '-'
  const httpsProxy = (process.env.HTTPS_PROXY || process.env.ALL_PROXY) ?? '-'
  const socksProxy = (process.env.SOCKS_PROXY_HOST && process.env.SOCKS_PROXY_PORT)
    ? (`${process.env.SOCKS_PROXY_HOST}:${process.env.SOCKS_PROXY_PORT}`)
    : '-'
  return sendResponse<ModelConfig>({
    type: 'Success',
    data: { apiModel, reverseProxy, timeoutMs, socksProxy, httpsProxy, usage, models },
  })
}

function setupProxy(options: SetProxyOptions) {
  if (isNotEmptyString(process.env.SOCKS_PROXY_HOST) && isNotEmptyString(process.env.SOCKS_PROXY_PORT)) {
    const agent = new SocksProxyAgent({
      hostname: process.env.SOCKS_PROXY_HOST,
      port: process.env.SOCKS_PROXY_PORT,
      userId: isNotEmptyString(process.env.SOCKS_PROXY_USERNAME) ? process.env.SOCKS_PROXY_USERNAME : undefined,
      password: isNotEmptyString(process.env.SOCKS_PROXY_PASSWORD) ? process.env.SOCKS_PROXY_PASSWORD : undefined,
    })
    options.fetch = (url, options) => {
      return fetch(url, { agent, ...options })
    }
  }
  else if (isNotEmptyString(process.env.HTTPS_PROXY) || isNotEmptyString(process.env.ALL_PROXY)) {
    const httpsProxy = process.env.HTTPS_PROXY || process.env.ALL_PROXY
    if (httpsProxy) {
      const agent = new HttpsProxyAgent(httpsProxy)
      options.fetch = (url, options) => {
        return fetch(url, { agent, ...options })
      }
    }
  }
  else {
    options.fetch = (url, options) => {
      return fetch(url, { ...options })
    }
  }
}

function currentModel(): ApiModel {
  return apiModel
}

export type { ChatContext, ChatMessage, ExtendedChatMessage }

export { chatConfig, chatReplyProcess, currentModel }

export { models }
