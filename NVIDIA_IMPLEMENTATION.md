# NVIDIA API Integration for Claude Code

This document describes the implementation of NVIDIA API support in Claude Code.

## Overview

The NVIDIA API integration allows Claude Code to use NVIDIA's OpenAI-compatible API endpoint (`https://integrate.api.nvidia.com/v1`) instead of Anthropic's API. This is useful for:

- Running Claude Code with NVIDIA's AI models (e.g., `moonshotai/kimi-k2.5`)
- Using NVIDIA's inference infrastructure
- Testing with alternative model providers

## Files Modified

### 1. `src/services/api/nvidiaAdapter.ts` (NEW)
A new adapter that wraps NVIDIA's OpenAI-compatible API to provide an Anthropic SDK-compatible interface.

**Key features:**
- Converts Anthropic SDK calls to OpenAI-compatible format
- Handles streaming responses (Server-Sent Events)
- Maps Anthropic model names to NVIDIA model names
- Returns responses in Anthropic-compatible format

### 2. `src/services/api/client.ts` (MODIFIED)
Added NVIDIA provider handling in the `getAnthropicClient` function:

```typescript
if (isEnvTruthy(process.env.CLAUDE_CODE_USE_NVIDIA)) {
  const { createNVIDIAClient } = await import('./nvidiaAdapter.js')
  const nvidiaApiKey = process.env.NVIDIA_API_KEY
  if (!nvidiaApiKey) {
    throw new Error('NVIDIA_API_KEY environment variable is required when using CLAUDE_CODE_USE_NVIDIA')
  }
  const nvidiaArgs = {
    apiKey: nvidiaApiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
    defaultHeaders: ARGS.defaultHeaders,
  }
  return createNVIDIAClient(nvidiaArgs) as unknown as Anthropic
}
```

### 3. `src/utils/model/configs.ts` (MODIFIED)
Added `nvidia` provider to all model configurations. All models map to `moonshotai/kimi-k2.5` on NVIDIA:

```typescript
export const CLAUDE_OPUS_4_6_CONFIG = {
  firstParty: 'claude-opus-4-6',
  bedrock: 'us.anthropic.claude-opus-4-6-v1',
  vertex: 'claude-opus-4-6',
  foundry: 'claude-opus-4-6',
  nvidia: 'moonshotai/kimi-k2.5',
} as const satisfies ModelConfig
```

### 4. `src/utils/model/modelStrings.ts` (MODIFIED)
Added helper function `getNvidiaModelName()` to map Anthropic model names to NVIDIA model names.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CLAUDE_CODE_USE_NVIDIA` | Set to `1` to enable NVIDIA API | Yes |
| `NVIDIA_API_KEY` | Your NVIDIA API key (e.g., `nvapi-...`) | Yes |

## Usage

To run Claude Code with NVIDIA API:

```bash
# Set environment variables
export CLAUDE_CODE_USE_NVIDIA=1
export NVIDIA_API_KEY=nvapi-your-api-key

# Run Claude Code
bun run src/main.tsx
```

## Model Mapping

All Anthropic model names are mapped to NVIDIA's `moonshotai/kimi-k2.5` model:

| Anthropic Model | NVIDIA Model |
|-----------------|--------------|
| claude-opus-4-6 | moonshotai/kimi-k2.5 |
| claude-sonnet-4-6 | moonshotai/kimi-k2.5 |
| claude-sonnet-4-5 | moonshotai/kimi-k2.5 |
| claude-haiku-4-5 | moonshotai/kimi-k2.5 |
| etc. | moonshotai/kimi-k2.5 |

## Technical Details

### API Compatibility

NVIDIA's API uses OpenAI-compatible format:
- **Endpoint**: `https://integrate.api.nvidia.com/v1/chat/completions`
- **Format**: OpenAI chat completions
- **Authentication**: Bearer token in Authorization header
- **Streaming**: Server-Sent Events (SSE)

### Adapter Architecture

The NVIDIA adapter (`nvidiaAdapter.ts`) implements:

1. **Message conversion**: Anthropic's `MessageParam[]` → OpenAI's messages format
2. **System prompt handling**: Extracts system message and includes it as first message
3. **Response streaming**: Parses SSE stream and converts to Anthropic-compatible events
4. **Usage tracking**: Maps OpenAI usage fields to Anthropic format

### Key Types

```typescript
interface MessageCreateParams {
  model: string
  messages: MessageParam[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stream?: boolean
  system?: string
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
```

## Limitations

1. **Tool Calling**: Not yet implemented. NVIDIA's tool calling format differs from Anthropic's.
2. **Thinking/Reasoning**: Basic support only. Extended thinking blocks are converted to text.
3. **Image Support**: Not implemented. Multimodal content is extracted to text only.
4. **Cache Control**: Not supported by NVIDIA API.

## Future Enhancements

- Add tool calling support
- Implement proper thinking/reasoning block handling
- Add image/multimodal support
- Support for multiple NVIDIA models (not just kimi-k2.5)
- Model capability detection

## Testing

To test the NVIDIA integration:

```bash
# Run the test script
export CLAUDE_CODE_USE_NVIDIA=1
export NVIDIA_API_KEY=your-api-key
bun run src/services/api/nvidiaAdapter.test.ts
```

Or run the full CLI:

```bash
export CLAUDE_CODE_USE_NVIDIA=1
export NVIDIA_API_KEY=your-api-key
bun run src/main.tsx
```

## Troubleshooting

### Error: "NVIDIA_API_KEY environment variable is required"
Make sure you've set the `NVIDIA_API_KEY` environment variable.

### Error: "NVIDIA API error (401): Unauthorized"
Your API key may be invalid or expired. Check your NVIDIA API key.

### Error: "NVIDIA API error (404): Not Found"
The model may not be available on your NVIDIA account.

### Streaming not working
Ensure your network supports Server-Sent Events (SSE). Some corporate proxies may block SSE.

## References

- [NVIDIA API Documentation](https://docs.api.nvidia.com/nim/reference)
- [NVIDIA Model Catalog](https://build.nvidia.com/models)
- [Anthropic SDK Documentation](https://docs.anthropic.com/claude/reference/)
