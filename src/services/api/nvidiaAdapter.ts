/**
 * OpenAI-compatible API adapter.
 * Wraps providers such as NVIDIA and Doubleword so they can be used through the
 * Anthropic SDK shape expected by the rest of Claude Code.
 */
import type { Stream } from '@anthropic-ai/sdk/streaming.js'

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const DOUBLEWORD_BASE_URL = 'https://api.doubleword.ai/v1'

// Default models for OpenAI-compatible providers.
const DEFAULT_MODEL = 'moonshotai/kimi-k2.6'
const DOUBLEWORD_DEFAULT_MODEL = 'moonshotai/Kimi-K2.6'

export interface OpenAICompatibleConfig {
  apiKey: string
  baseURL?: string
  defaultHeaders?: Record<string, string>
  defaultModel?: string
  providerName?: string
}

export type NVIDIAConfig = OpenAICompatibleConfig

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
  content?: unknown
  is_error?: boolean
}

interface ImageBlock {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

interface GenericContentBlock {
  type: string
  [key: string]: unknown
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
  content:
    | string
    | Array<
        | TextBlock
        | ToolUseBlock
        | ToolResultBlock
        | ImageBlock
        | GenericContentBlock
      >
}

interface MessageCreateParams {
  model: string
  messages: MessageParam[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stream?: boolean
  system?: string | Array<TextBlock | GenericContentBlock>
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

interface StreamingEntityState {
  pendingEntity: string
}

interface OpenAITextPart {
  type: 'text'
  text: string
}

interface OpenAIImagePart {
  type: 'image_url'
  image_url: {
    url: string
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
  content?: string | Array<OpenAITextPart | OpenAIImagePart> | null
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

const HTML_ENTITY_PATTERN = /&(?:#(\d{1,7})|#x([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,31}));/g

const HTML_NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

function decodeHtmlEntities(text: string): string {
  return text.replace(
    HTML_ENTITY_PATTERN,
    (entity, decimal: string | undefined, hex: string | undefined, named: string | undefined) => {
      return decodeHtmlEntity(entity, decimal, hex, named)
    },
  )
}

function decodeHtmlEntity(
  entity: string,
  decimal: string | undefined,
  hex: string | undefined,
  named: string | undefined,
): string {
  if (decimal) {
    const codePoint = Number.parseInt(decimal, 10)
    return Number.isSafeInteger(codePoint)
      ? codePointToString(codePoint, entity)
      : entity
  }
  if (hex) {
    const codePoint = Number.parseInt(hex, 16)
    return Number.isSafeInteger(codePoint)
      ? codePointToString(codePoint, entity)
      : entity
  }
  return HTML_NAMED_ENTITIES[named?.toLowerCase() ?? ''] ?? entity
}

function codePointToString(codePoint: number, fallback: string): string {
  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return fallback
  }
}

function splitTrailingEntityFragment(text: string): {
  complete: string
  pending: string
} {
  const ampIndex = text.lastIndexOf('&')
  if (ampIndex === -1) return { complete: text, pending: '' }

  const fragment = text.slice(ampIndex)
  if (fragment.includes(';')) return { complete: text, pending: '' }

  // Keep only plausible split HTML entities pending. Plain ampersands such as
  // "A & B" should stream immediately.
  if (/^&(?:#x?[0-9a-fA-F]{0,6}|[a-zA-Z][a-zA-Z0-9]{0,31})?$/.test(fragment)) {
    return {
      complete: text.slice(0, ampIndex),
      pending: fragment,
    }
  }

  return { complete: text, pending: '' }
}

function decodeStreamingText(
  chunk: string,
  state: StreamingEntityState,
): string {
  const { complete, pending } = splitTrailingEntityFragment(
    state.pendingEntity + chunk,
  )
  state.pendingEntity = pending
  return decodeHtmlEntities(complete)
}

function flushStreamingText(state: StreamingEntityState): string {
  if (!state.pendingEntity) return ''
  const pending = state.pendingEntity
  state.pendingEntity = ''
  return decodeHtmlEntities(pending)
}

function escapeDecodedEntityForJsonFragment(decoded: string): string {
  return JSON.stringify(decoded).slice(1, -1)
}

function decodeHtmlEntitiesForJsonFragment(text: string): string {
  return text.replace(
    HTML_ENTITY_PATTERN,
    (entity, decimal: string | undefined, hex: string | undefined, named: string | undefined) =>
      escapeDecodedEntityForJsonFragment(
        decodeHtmlEntity(entity, decimal, hex, named),
      ),
  )
}

function decodeStreamingJsonFragment(
  chunk: string,
  state: StreamingEntityState,
): string {
  const { complete, pending } = splitTrailingEntityFragment(
    state.pendingEntity + chunk,
  )
  state.pendingEntity = pending
  return decodeHtmlEntitiesForJsonFragment(complete)
}

function flushStreamingJsonFragment(state: StreamingEntityState): string {
  if (!state.pendingEntity) return ''
  const pending = state.pendingEntity
  state.pendingEntity = ''
  return decodeHtmlEntitiesForJsonFragment(pending)
}

function decodeHtmlEntitiesDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return decodeHtmlEntities(value) as T
  }
  if (Array.isArray(value)) {
    return value.map(item => decodeHtmlEntitiesDeep(item)) as T
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        decodeHtmlEntitiesDeep(nestedValue),
      ]),
    ) as T
  }
  return value
}

function textFromUnknownContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  return content
    .map(block => {
      if (!block || typeof block !== 'object') return ''
      const typedBlock = block as { type?: string; text?: unknown }
      if (typedBlock.type === 'text' && typeof typedBlock.text === 'string') {
        return typedBlock.text
      }
      if (typedBlock.type === 'image') return '[Image]'
      if (typedBlock.type === 'document') return '[Document]'
      if (typedBlock.type === 'tool_reference') return ''
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function systemToString(
  system?: string | Array<TextBlock | GenericContentBlock>,
): string | undefined {
  if (!system) return undefined
  const text = textFromUnknownContent(system)
  return text || undefined
}

function imageToOpenAIContent(block: ImageBlock): OpenAIImagePart {
  return {
    type: 'image_url',
    image_url: {
      url: `data:${block.source.media_type};base64,${block.source.data}`,
    },
  }
}

function flushUserParts(
  openaiMessages: OpenAIMessage[],
  parts: Array<OpenAITextPart | OpenAIImagePart>,
): void {
  if (parts.length === 0) return

  if (parts.length === 1 && parts[0]?.type === 'text') {
    openaiMessages.push({ role: 'user', content: parts[0].text })
  } else {
    openaiMessages.push({ role: 'user', content: [...parts] })
  }
  parts.length = 0
}

/**
 * Convert Anthropic messages format to OpenAI format
 */
function convertMessagesToOpenAI(
  messages: MessageParam[],
  system?: string | Array<TextBlock | GenericContentBlock>,
): OpenAIMessage[] {
  const openaiMessages: OpenAIMessage[] = []

  // Add system message if present
  const systemText = systemToString(system)
  if (systemText) {
    openaiMessages.push({ role: 'system', content: systemText })
  }

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      openaiMessages.push({ role: msg.role, content: msg.content })
    } else if (Array.isArray(msg.content)) {
      if (msg.role === 'assistant') {
        const textContent = msg.content
          .map(block => (block.type === 'text' ? block.text : ''))
          .filter(Boolean)
          .join('')
        const toolUses = msg.content.filter(
          (block): block is ToolUseBlock => block.type === 'tool_use',
        )

        if (toolUses.length === 0) {
          if (textContent) {
            openaiMessages.push({ role: 'assistant', content: textContent })
          }
          continue
        }

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
        continue
      }

      const userParts: Array<OpenAITextPart | OpenAIImagePart> = []
      for (const block of msg.content) {
        if (block.type === 'text') {
          userParts.push({ type: 'text', text: block.text })
        } else if (block.type === 'image') {
          userParts.push(imageToOpenAIContent(block as ImageBlock))
        } else if (block.type === 'tool_result') {
          flushUserParts(openaiMessages, userParts)
          openaiMessages.push({
            role: 'tool',
            content: textFromUnknownContent((block as ToolResultBlock).content),
            tool_call_id: (block as ToolResultBlock).tool_use_id,
          })
        }
      }
      flushUserParts(openaiMessages, userParts)
    }
  }

  return openaiMessages
}

/**
 * Map NVIDIA/OpenAI model to internal model name
 */
function getProviderModel(model: string, defaultModel: string): string {
  // Map Anthropic model names to the provider's selected model.
  const modelMap: Record<string, string> = {
    'claude-3-opus': defaultModel,
    'claude-3-sonnet': defaultModel,
    'claude-3-haiku': defaultModel,
    'claude-4-opus': defaultModel,
    'claude-4-sonnet': defaultModel,
    'claude-opus-4-0': defaultModel,
    'claude-opus-4-1': defaultModel,
    'claude-opus-4-5': defaultModel,
    'claude-opus-4-6': defaultModel,
    'claude-sonnet-4': defaultModel,
    'claude-sonnet-4-5': defaultModel,
    'claude-sonnet-4-6': defaultModel,
    'claude-haiku-4-5': defaultModel,
  }

  // Check if it's already a provider-native model ID.
  if (model.includes('/')) {
    return model
  }

  return modelMap[model] ?? defaultModel
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
    return 'required'
  }
  return undefined
}

/**
 * Convert OpenAI response to Anthropic format
 */
function parseToolArguments(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') {
    return decodeHtmlEntitiesDeep(raw as Record<string, unknown>)
  }
  try {
    const parsed = JSON.parse(typeof raw === 'string' ? raw || '{}' : '{}')
    return parsed && typeof parsed === 'object'
      ? decodeHtmlEntitiesDeep(parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function stopReasonFromFinishReason(
  finishReason: string | null | undefined,
): MessageResponse['stop_reason'] {
  switch (finishReason) {
    case 'tool_calls':
    case 'function_call':
      return 'tool_use'
    case 'length':
      return 'max_tokens'
    case 'stop':
      return 'end_turn'
    default:
      return 'end_turn'
  }
}

function convertOpenAIResponseToAnthropic(
  data: Record<string, unknown>,
  fallbackModel: string,
): MessageResponse {
  const choice = (data.choices as Array<{
    message: {
      content?: string
      tool_calls?: Array<{
        id: string
        function: { name: string; arguments: unknown }
      }>
    }
    finish_reason: string | null
  }>)[0]

  const usage = data.usage as { prompt_tokens: number; completion_tokens: number } | undefined

  const content: ContentBlock[] = []

  // Add text content
  if (choice?.message?.content) {
    content.push({
      type: 'text',
      text: decodeHtmlEntities(choice.message.content),
    })
  }

  // Add tool calls
  if (choice?.message?.tool_calls) {
    for (const toolCall of choice.message.tool_calls) {
      content.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.function.name,
        input: parseToolArguments(toolCall.function.arguments),
      })
    }
  }

  return {
    id: (data.id as string) ?? `openai-compatible-${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content,
    model: (data.model as string | undefined) ?? fallbackModel,
    stop_reason:
      choice?.message?.tool_calls && choice.message.tool_calls.length > 0
        ? 'tool_use'
        : stopReasonFromFinishReason(choice?.finish_reason),
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
  model: string,
  providerId: string,
): AsyncGenerator<StreamEvent, MessageResponse, unknown> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  let fullContent = ''
  let textBlockIndex: number | null = null
  const textEntityState: StreamingEntityState = { pendingEntity: '' }
  let nextContentIndex = 0
  let finalStopReason: MessageResponse['stop_reason'] = 'end_turn'
  const toolCalls = new Map<
    number,
    {
      contentIndex: number
      id: string
      name: string
      arguments: string
      emittedArgumentsLength: number
      pendingArgumentEntity: StreamingEntityState
      started: boolean
    }
  >()
  let inputTokens = 0
  let outputTokens = 0

  // Signal message start
  yield {
    type: 'message_start',
    message: {
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  }

  const decoder = new TextDecoder()
  let buffer = ''

  const ensureTextBlock = function* () {
    if (textBlockIndex !== null) return textBlockIndex
    textBlockIndex = nextContentIndex++
    yield {
      type: 'content_block_start' as const,
      index: textBlockIndex,
      content_block: { type: 'text' as const },
    }
    return textBlockIndex
  }

  const ensureToolBlock = function* (
    toolCallIndex: number,
    id?: string,
    name?: string,
  ) {
    let existing = toolCalls.get(toolCallIndex)
    if (!existing) {
      existing = {
        contentIndex: nextContentIndex++,
        id: id ?? `tool_${Date.now()}_${toolCallIndex}`,
        name: name ?? '',
        arguments: '',
        emittedArgumentsLength: 0,
        pendingArgumentEntity: { pendingEntity: '' },
        started: false,
      }
      toolCalls.set(toolCallIndex, existing)
    }

    if (id) existing.id = id
    if (name) existing.name = name

    if (!existing.started && existing.name) {
      existing.started = true
      yield {
        type: 'content_block_start' as const,
        index: existing.contentIndex,
        content_block: {
          type: 'tool_use' as const,
          id: existing.id,
          name: existing.name,
        },
      }
      if (existing.arguments) {
        yield {
          type: 'content_block_delta' as const,
          index: existing.contentIndex,
          delta: {
            type: 'input_json_delta' as const,
            partial_json: existing.arguments,
          },
        }
        existing.emittedArgumentsLength = existing.arguments.length
      }
    }

    return existing
  }

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
          finish_reason?: string | null
        }>)[0]?.delta
        const finishReason = (chunk.choices as Array<{
          finish_reason?: string | null
        }>)[0]?.finish_reason

        if (finishReason) {
          finalStopReason = stopReasonFromFinishReason(finishReason)
        }

        // Handle text content
        if (delta?.content) {
          const decodedContent = decodeStreamingText(delta.content, textEntityState)
          if (decodedContent) {
            fullContent += decodedContent
            const index = yield* ensureTextBlock()
            yield {
              type: 'content_block_delta',
              index,
              delta: { type: 'text_delta', text: decodedContent },
            }
          }
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const currentToolCall = yield* ensureToolBlock(
              toolCall.index,
              toolCall.id,
              toolCall.function?.name,
            )

            if (toolCall.function?.arguments) {
              const decodedArguments = decodeStreamingJsonFragment(
                toolCall.function.arguments,
                currentToolCall.pendingArgumentEntity,
              )
              currentToolCall.arguments += decodedArguments
              if (currentToolCall.started) {
                const partialJson = currentToolCall.arguments.slice(
                  currentToolCall.emittedArgumentsLength,
                )
                if (!partialJson) continue
                currentToolCall.emittedArgumentsLength =
                  currentToolCall.arguments.length
                yield {
                  type: 'content_block_delta',
                  index: currentToolCall.contentIndex,
                  delta: {
                    type: 'input_json_delta',
                    partial_json: partialJson,
                  },
                }
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

  const flushedText = flushStreamingText(textEntityState)
  if (flushedText) {
    fullContent += flushedText
    const index = yield* ensureTextBlock()
    yield {
      type: 'content_block_delta',
      index,
      delta: { type: 'text_delta', text: flushedText },
    }
  }

  for (const toolCall of toolCalls.values()) {
    const flushedArguments = flushStreamingJsonFragment(
      toolCall.pendingArgumentEntity,
    )
    if (!flushedArguments) continue
    toolCall.arguments += flushedArguments
    if (toolCall.started) {
      const partialJson = toolCall.arguments.slice(
        toolCall.emittedArgumentsLength,
      )
      if (partialJson) {
        toolCall.emittedArgumentsLength = toolCall.arguments.length
        yield {
          type: 'content_block_delta',
          index: toolCall.contentIndex,
          delta: {
            type: 'input_json_delta',
            partial_json: partialJson,
          },
        }
      }
    }
  }

  if (textBlockIndex !== null) {
    yield { type: 'content_block_stop', index: textBlockIndex }
  }

  for (const toolCall of [...toolCalls.values()].sort(
    (a, b) => a.contentIndex - b.contentIndex,
  )) {
    if (toolCall.started) {
      yield { type: 'content_block_stop', index: toolCall.contentIndex }
    }
  }

  // Signal message delta
  yield {
    type: 'message_delta',
    delta: {
      stop_reason:
        finalStopReason === 'end_turn' && toolCalls.size > 0
          ? 'tool_use'
          : finalStopReason,
    },
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
  for (const toolCall of [...toolCalls.values()].sort(
    (a, b) => a.contentIndex - b.contentIndex,
  )) {
    if (!toolCall.name) continue
    content.push({
      type: 'tool_use',
      id: toolCall.id,
      name: toolCall.name,
      input: parseToolArguments(toolCall.arguments),
    })
  }

  return {
    id: `${providerId}-${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content,
    model,
    stop_reason:
      finalStopReason === 'end_turn' && toolCalls.size > 0
        ? 'tool_use'
        : finalStopReason,
    usage: {
      input_tokens: inputTokens || Math.ceil(fullContent.length / 4),
      output_tokens: outputTokens || Math.ceil(fullContent.length / 4),
    },
  }
}

/**
 * API client that wraps an OpenAI-compatible API
 * to provide an Anthropic SDK-compatible interface
 */
export class OpenAICompatibleClient {
  private apiKey: string
  private baseURL: string
  private defaultHeaders: Record<string, string>
  private defaultModel: string
  private providerName: string
  private providerId: string

  constructor(config: OpenAICompatibleConfig) {
    this.apiKey = config.apiKey
    this.baseURL = config.baseURL ?? NVIDIA_BASE_URL
    this.defaultHeaders = config.defaultHeaders ?? {}
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL
    this.providerName = config.providerName ?? 'OpenAI-compatible'
    this.providerId = this.providerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  }

  get messages() {
    return this.beta.messages
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
            const providerModel = getProviderModel(
              params.model,
              this.defaultModel,
            )
            const openaiTools = convertToolsToOpenAI(params.tools)

            const requestBody: Record<string, unknown> = {
              model: providerModel,
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
              ...this.defaultHeaders,
              ...(options?.headers ?? {}),
              'Content-Type': 'application/json',
              Accept: params.stream ? 'text/event-stream' : 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
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
                `${this.providerName} API error (${response.status}): ${errorText}`,
              )
            }

            const responseClone = response.clone()

            // Handle streaming
            if (params.stream) {
              const generator = createStreamingResponse(
                response,
                providerModel,
                this.providerId,
              )

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
            const messageResponse = convertOpenAIResponseToAnthropic(
              data,
              providerModel,
            )

            return { data: messageResponse, rawResponse: responseClone }
          })()

          const dataPromise = operationPromise.then((r) => r.data)

          ;(dataPromise as any).withResponse = async () => {
            const { data, rawResponse } = await operationPromise
            return {
              data,
              response: rawResponse,
              request_id: `${this.providerId}-${Date.now()}`,
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
export function createNVIDIAClient(
  config: NVIDIAConfig,
): OpenAICompatibleClient {
  return new OpenAICompatibleClient({
    ...config,
    baseURL: config.baseURL ?? NVIDIA_BASE_URL,
    defaultModel: config.defaultModel ?? DEFAULT_MODEL,
    providerName: config.providerName ?? 'NVIDIA',
  })
}

export function createDoublewordClient(
  config: OpenAICompatibleConfig,
): OpenAICompatibleClient {
  return new OpenAICompatibleClient({
    ...config,
    baseURL: config.baseURL ?? DOUBLEWORD_BASE_URL,
    defaultModel: config.defaultModel ?? DOUBLEWORD_DEFAULT_MODEL,
    providerName: config.providerName ?? 'Doubleword',
  })
}
