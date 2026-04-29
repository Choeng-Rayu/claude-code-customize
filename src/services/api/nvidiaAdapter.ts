/**
 * NVIDIA API Adapter
 * Wraps NVIDIA's OpenAI-compatible API to work with the Anthropic SDK interface
 * NVIDIA API docs: https://docs.api.nvidia.com/nim/reference
 */
import type { Stream } from '@anthropic-ai/sdk/streaming.js'

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'

// Default model to use when calling NVIDIA API
const DEFAULT_MODEL = 'moonshotai/kimi-k2.5'

export interface NVIDIAConfig {
  apiKey: string
  baseURL?: string
  defaultHeaders?: Record<string, string>
}

// Anthropic-compatible types
interface TextBlock {
  type: 'text'
  text: string
}

interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

interface ImageBlock {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

interface ToolDefinition {
  name: string
  description?: string
  input_schema?: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
  }
}

interface MessageParam {
  role: 'user' | 'assistant'
  content: string | Array<TextBlock | ToolUseBlock | ToolResultBlock | ImageBlock>
}

interface MessageCreateParams {
  model: string
  messages: MessageParam[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stream?: boolean
  system?: string
  tools?: ToolDefinition[]
  tool_choice?: { type: 'auto' | 'any' | 'tool' | 'none'; name?: string }
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

interface ContentBlock {
  type: 'text' | 'tool_use'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
}

interface MessageResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: ContentBlock[]
  model: string
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null
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
    type: 'text_delta' | 'input_json_delta'
    text?: string
    partial_json?: string
  }
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
  message?: {
    usage?: {
      input_tokens?: number
      output_tokens?: number
    }
  }
}

// OpenAI types
interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters?: {
      type: 'object'
      properties?: Record<string, unknown>
      required?: string[]
    }
  }
}

interface OpenAIMessage {
  role: string
  content?: string
  name?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
  tool_call_id?: string
}

/**
 * Convert Anthropic tools to OpenAI format
 */
function convertToolsToOpenAI(tools?: ToolDefinition[]): OpenAITool[] | undefined {
  if (!tools || tools.length === 0) return undefined

  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }))
}

/**
 * Convert Anthropic messages format to OpenAI format
 */
function convertMessagesToOpenAI(messages: MessageParam[], system?: string): OpenAIMessage[] {
  const openaiMessages: OpenAIMessage[] = []

  // Add system message if present
  if (system) {
    openaiMessages.push({ role: 'system', content: system })
  }

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      openaiMessages.push({ role: msg.role, content: msg.content })
    } else if (Array.isArray(msg.content)) {
      // Handle content blocks
      let textContent = ''
      const toolUses: ToolUseBlock[] = []
      const toolResults: ToolResultBlock[] = []

      for (const block of msg.content) {
        if (block.type === 'text') {
          textContent += block.text
        } else if (block.type === 'tool_use') {
          toolUses.push(block)
        } else if (block.type === 'tool_result') {
          toolResults.push(block)
        }
      }

      // Add text message
      if (textContent) {
        openaiMessages.push({ role: msg.role, content: textContent })
      }

      // Add tool calls (for assistant messages)
      if (msg.role === 'assistant' && toolUses.length > 0) {
        openaiMessages.push({
          role: 'assistant',
          content: textContent || null,
          tool_calls: toolUses.map((tool) => ({
            id: tool.id,
            type: 'function' as const,
            function: {
              name: tool.name,
              arguments: JSON.stringify(tool.input),
            },
          })),
        })
      }

      // Add tool results (for user messages)
      if (msg.role === 'user' && toolResults.length > 0) {
        for (const result of toolResults) {
          openaiMessages.push({
            role: 'tool',
            content: result.content,
            tool_call_id: result.tool_use_id,
          })
        }
      }
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
 * Convert OpenAI tool choice to Anthropic format
 */
function convertToolChoice(toolChoice?: { type: string; name?: string }): string | { type: string; function?: { name: string } } | undefined {
  if (!toolChoice) return undefined

  if (toolChoice.type === 'auto') return 'auto'
  if (toolChoice.type === 'none') return 'none'
  if (toolChoice.type === 'any' || toolChoice.type === 'tool') {
    if (toolChoice.name) {
      return {
        type: 'function',
        function: { name: toolChoice.name },
      }
    }
    return 'auto'
  }
  return undefined
}

/**
 * Convert OpenAI response to Anthropic format
 */
function convertOpenAIResponseToAnthropic(data: Record<string, unknown>): MessageResponse {
  const choice = (data.choices as Array<{
    message: {
      content?: string
      tool_calls?: Array<{
        id: string
        function: { name: string; arguments: string }
      }>
    }
    finish_reason: string
  }>)[0]

  const usage = data.usage as { prompt_tokens: number; completion_tokens: number } | undefined

  const content: ContentBlock[] = []

  // Add text content
  if (choice?.message?.content) {
    content.push({
      type: 'text',
      text: choice.message.content,
    })
  }

  // Add tool calls
  if (choice?.message?.tool_calls) {
    for (const toolCall of choice.message.tool_calls) {
      content.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.function.name,
        input: JSON.parse(toolCall.function.arguments),
      })
    }
  }

  return {
    id: (data.id as string) ?? `nvidia-${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content,
    model: 'moonshotai/kimi-k2.5',
    stop_reason: choice?.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
    usage: {
      input_tokens: usage?.prompt_tokens ?? 0,
      output_tokens: usage?.completion_tokens ?? 0,
    },
  }
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
  let currentToolCall: { id: string; name: string; arguments: string } | null = null
  let inputTokens = 0
  let outputTokens = 0

  // Signal message start
  yield {
    type: 'message_start',
    message: {
      usage: { input_tokens: 0, output_tokens: 0 },
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
        const delta = (chunk.choices as Array<{
          delta: {
            content?: string
            tool_calls?: Array<{
              index: number
              id?: string
              function?: { name?: string; arguments?: string }
            }>
          }
        }>)[0]?.delta

        // Handle text content
        if (delta?.content) {
          fullContent += delta.content
          yield {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: delta.content },
          }
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function?.name) {
              // Start new tool call
              if (currentToolCall) {
                // Finish previous tool call
                yield {
                  type: 'content_block_stop',
                  index: 1,
                }
              }

              currentToolCall = {
                id: toolCall.id ?? `tool_${Date.now()}`,
                name: toolCall.function.name,
                arguments: '',
              }

              yield {
                type: 'content_block_start',
                index: 1,
                content_block: {
                  type: 'tool_use',
                  id: currentToolCall.id,
                  name: currentToolCall.name,
                },
              }
            }

            if (toolCall.function?.arguments) {
              currentToolCall!.arguments += toolCall.function.arguments
              yield {
                type: 'content_block_delta',
                index: 1,
                delta: {
                  type: 'input_json_delta',
                  partial_json: toolCall.function.arguments,
                },
              }
            }
          }
        }

        // Track usage
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

  if (currentToolCall) {
    yield { type: 'content_block_stop', index: 1 }
  }

  // Signal message delta
  yield {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn' },
    usage: {
      input_tokens: inputTokens || Math.ceil(fullContent.length / 4),
      output_tokens: outputTokens || Math.ceil(fullContent.length / 4),
    },
  }

  // Signal message stop
  yield { type: 'message_stop' }

  // Return final message
  const content: ContentBlock[] = []
  if (fullContent) {
    content.push({ type: 'text', text: fullContent })
  }
  if (currentToolCall) {
    content.push({
      type: 'tool_use',
      id: currentToolCall.id,
      name: currentToolCall.name,
      input: JSON.parse(currentToolCall.arguments || '{}'),
    })
  }

  return {
    id: `nvidia-${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content,
    model: 'moonshotai/kimi-k2.5',
    stop_reason: currentToolCall ? 'tool_use' : 'end_turn',
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
          const operationPromise = (async () => {
            const openaiMessages = convertMessagesToOpenAI(
              params.messages,
              params.system,
            )
            const nvidiaModel = getNvidiaModel(params.model)
            const openaiTools = convertToolsToOpenAI(params.tools)

            const requestBody: Record<string, unknown> = {
              model: nvidiaModel,
              messages: openaiMessages,
              max_tokens: params.max_tokens ?? 4096,
              temperature: params.temperature ?? 1.0,
              top_p: params.top_p ?? 1.0,
              stream: params.stream ?? false,
            }

            if (openaiTools) {
              requestBody.tools = openaiTools
            }

            const toolChoice = convertToolChoice(params.tool_choice)
            if (toolChoice) {
              requestBody.tool_choice = toolChoice
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

            const responseClone = response.clone()

            // Handle streaming
            if (params.stream) {
              const generator = createStreamingResponse(response)

              const streamObj = {
                [Symbol.asyncIterator]: () => generator,
                controller: {
                  abort: () => {
                    // Abort logic would go here
                  },
                },
              } as unknown as Stream<StreamEvent>

              return { data: streamObj, rawResponse: responseClone }
            }

            // Handle non-streaming
            const data = (await response.json()) as Record<string, unknown>
            const messageResponse = convertOpenAIResponseToAnthropic(data)

            return { data: messageResponse, rawResponse: responseClone }
          })()

          const dataPromise = operationPromise.then((r) => r.data)

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
