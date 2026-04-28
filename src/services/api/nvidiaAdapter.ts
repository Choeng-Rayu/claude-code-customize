/**
 * NVIDIA API Adapter
 * Wraps NVIDIA's OpenAI-compatible API to work with the Anthropic SDK interface
 * NVIDIA API docs: https://docs.api.nvidia.com/nim/reference
 */
import type { Stream } from '@anthropic-ai/sdk/streaming.js'
import { ReadableStream } from 'stream/web'

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'

// Default model to use when calling NVIDIA API
const DEFAULT_MODEL = 'moonshotai/kimi-k2.5'

export interface NVIDIAConfig {
  apiKey: string
  baseURL?: string
  defaultHeaders?: Record<string, string>
}

// Anthropic-compatible message types
interface MessageParam {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; [key: string]: unknown }>
}

interface MessageCreateParams {
  model: string
  messages: MessageParam[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stream?: boolean
  system?: string
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

interface ContentBlock {
  type: 'text' | 'thinking'
  text?: string
  thinking?: string
  signature?: string
}

interface MessageResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: ContentBlock[]
  model: string
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

interface StreamEvent {
  type: 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_start' | 'message_delta' | 'message_stop'
  index?: number
  content_block?: ContentBlock
  delta?: {
    type: 'text_delta' | 'thinking_delta'
    text?: string
    thinking?: string
    signature?: string
    stop_reason?: string | null
  }
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
  message?: {
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
}

/**
 * Convert Anthropic messages format to OpenAI format
 */
function convertMessagesToOpenAI(messages: MessageParam[], system?: string): Array<{ role: string; content: string }> {
  const openaiMessages: Array<{ role: string; content: string }> = []

  // Add system message if present
  if (system) {
    openaiMessages.push({ role: 'system', content: system })
  }

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      openaiMessages.push({ role: msg.role, content: msg.content })
    } else if (Array.isArray(msg.content)) {
      // Handle content blocks - extract text
      const textContent = msg.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text' && typeof c.text === 'string')
        .map(c => c.text)
        .join('')
      openaiMessages.push({ role: msg.role, content: textContent })
    }
  }

  return openaiMessages
}

/**
 * Map NVIDIA/OpenAI model to internal model name
 */
function getNvidiaModel(model: string): string {
  // Map Anthropic model names to NVIDIA model names
  const modelMap: Record<string, string> = {
    'claude-3-opus': 'moonshotai/kimi-k2.5',
    'claude-3-sonnet': 'moonshotai/kimi-k2.5',
    'claude-3-haiku': 'moonshotai/kimi-k2.5',
    'claude-4-opus': 'moonshotai/kimi-k2.5',
    'claude-4-sonnet': 'moonshotai/kimi-k2.5',
    'claude-opus-4-0': 'moonshotai/kimi-k2.5',
    'claude-opus-4-1': 'moonshotai/kimi-k2.5',
    'claude-sonnet-4-5': 'moonshotai/kimi-k2.5',
    'claude-sonnet-4-6': 'moonshotai/kimi-k2.5',
    'claude-haiku-4-5': 'moonshotai/kimi-k2.5',
  }

  // Check if it's already a NVIDIA model
  if (model.includes('/')) {
    return model
  }

  return modelMap[model] ?? DEFAULT_MODEL
}

/**
 * Convert OpenAI stream chunk to Anthropic-compatible stream event
 */
function convertOpenAIChunkToAnthropicEvent(chunk: Record<string, unknown>, index: number): StreamEvent | null {
  const choices = chunk.choices as Array<{ delta: { content?: string; role?: string }; finish_reason?: string }> | undefined

  if (!choices || choices.length === 0) {
    return null
  }

  const choice = choices[0]
  const delta = choice.delta

  // Handle content
  if (delta?.content) {
    return {
      type: 'content_block_delta',
      index: 0,
      delta: {
        type: 'text_delta',
        text: delta.content,
      },
    }
  }

  // Handle finish
  if (choice.finish_reason) {
    return {
      type: 'message_stop',
    }
  }

  return null
}

/**
 * Create a streaming response that mimics Anthropic's SDK
 */
async function* createStreamingResponse(
  response: Response,
): AsyncGenerator<StreamEvent, MessageResponse, unknown> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  let fullContent = ''
  let inputTokens = 0
  let outputTokens = 0

  // Signal message start with usage (Anthropic SDK compat)
  yield {
    type: 'message_start',
    message: {
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
  }
  yield {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text' },
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue

      const data = trimmed.slice(6)
      if (data === '[DONE]') continue

      try {
        const chunk = JSON.parse(data) as Record<string, unknown>
        const event = convertOpenAIChunkToAnthropicEvent(chunk, 0)

        if (event?.type === 'content_block_delta' && event.delta?.text) {
          fullContent += event.delta.text
          yield event
        }

        // Track usage if available
        const usage = chunk.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined
        if (usage) {
          inputTokens = usage.prompt_tokens ?? inputTokens
          outputTokens = usage.completion_tokens ?? outputTokens
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }

  // Signal content block stop
  yield { type: 'content_block_stop', index: 0 }

  // Signal message delta with usage and stop_reason (Anthropic SDK compat)
  yield {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn' },
    usage: {
      input_tokens: inputTokens || Math.ceil(fullContent.length / 4),
      output_tokens: outputTokens || Math.ceil(fullContent.length / 4),
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  }

  // Signal message stop
  yield { type: 'message_stop' }

  // Return final message
  return {
    id: `nvidia-${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: fullContent }],
    model: 'moonshotai/kimi-k2.5',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: inputTokens || Math.ceil(fullContent.length / 4),
      output_tokens: outputTokens || Math.ceil(fullContent.length / 4),
    },
  }
}

/**
 * NVIDIA API Client that wraps the NVIDIA OpenAI-compatible API
 * to provide an Anthropic SDK-compatible interface
 */
export class NVIDIAClient {
  private apiKey: string
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor(config: NVIDIAConfig) {
    this.apiKey = config.apiKey
    this.baseURL = config.baseURL ?? NVIDIA_BASE_URL
    this.defaultHeaders = config.defaultHeaders ?? {}
  }

  get beta() {
    return {
      messages: {
        create: (
          params: MessageCreateParams,
          options?: { signal?: AbortSignal; headers?: Record<string, string> },
        ): any => {
          // Start the operation immediately, but return a promise-like object
          // with .withResponse() and .asResponse() methods (Anthropic SDK compat)
          const operationPromise = (async () => {
            const openaiMessages = convertMessagesToOpenAI(
              params.messages,
              params.system,
            )
            const nvidiaModel = getNvidiaModel(params.model)

            const requestBody = {
              model: nvidiaModel,
              messages: openaiMessages,
              max_tokens: params.max_tokens ?? 4096,
              temperature: params.temperature ?? 1.0,
              top_p: params.top_p ?? 1.0,
              stream: params.stream ?? false,
            }

            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
              Accept: params.stream ? 'text/event-stream' : 'application/json',
              ...this.defaultHeaders,
              ...(options?.headers ?? {}),
            }

            const response = await fetch(
              `${this.baseURL}/chat/completions`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                ...(options?.signal && { signal: options.signal }),
              },
            )

            if (!response.ok) {
              const errorText = await response
                .text()
                .catch(() => 'Unknown error')
              throw new Error(
                `NVIDIA API error (${response.status}): ${errorText}`,
              )
            }

            // Clone the response for .withResponse() / .asResponse()
            const responseClone = response.clone()

            // Handle streaming
            if (params.stream) {
              const generator = createStreamingResponse(response)

              // Create a Stream-like object
              const streamObj = {
                [Symbol.asyncIterator]: () => generator,
                controller: {
                  abort: () => {
                    // Abort the fetch
                    // Note: fetch abort controller would need to be wired through
                  },
                },
              } as unknown as Stream<StreamEvent>

              return { data: streamObj, rawResponse: responseClone }
            }

            // Handle non-streaming
            const data = (await response.json()) as Record<string, unknown>
            const choices = data.choices as
              | Array<{
                  message: { content: string }
                  finish_reason: string
                }>
              | undefined
            const usage = data.usage as
              | { prompt_tokens: number; completion_tokens: number }
              | undefined

            const content = choices?.[0]?.message?.content ?? ''

            const messageResponse: MessageResponse = {
              id: (data.id as string) ?? `nvidia-${Date.now()}`,
              type: 'message',
              role: 'assistant',
              content: [{ type: 'text', text: content }],
              model: nvidiaModel,
              stop_reason:
                choices?.[0]?.finish_reason === 'stop' ? 'end_turn' : null,
              usage: {
                input_tokens: usage?.prompt_tokens ?? 0,
                output_tokens: usage?.completion_tokens ?? 0,
              },
            }

            return { data: messageResponse, rawResponse: responseClone }
          })()

          // Create a promise that resolves to the data
          const dataPromise = operationPromise.then((r) => r.data)

          // Add .withResponse() and .asResponse() methods (Anthropic SDK compat)
          ;(dataPromise as any).withResponse = async () => {
            const { data, rawResponse } = await operationPromise
            return {
              data,
              response: rawResponse,
              request_id: `nvidia-${Date.now()}`,
            }
          }

          ;(dataPromise as any).asResponse = async () => {
            const { rawResponse } = await operationPromise
            return rawResponse
          }

          return dataPromise
        },
      },
    }
  }
}

/**
 * Factory function to create a NVIDIA client that looks like an Anthropic client
 */
export function createNVIDIAClient(config: NVIDIAConfig): NVIDIAClient {
  return new NVIDIAClient(config)
}
