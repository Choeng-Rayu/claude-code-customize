(globalThis as any).MACRO = { VERSION: '9.9.9' }
process.env.CLAUDE_CODE_USE_NVIDIA = '1'
process.env.NVIDIA_API_KEY = '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'

console.error('Testing API client creation...')
console.error('CLAUDE_CODE_USE_NVIDIA:', process.env.CLAUDE_CODE_USE_NVIDIA)
console.error('NVIDIA_API_KEY set:', !!process.env.NVIDIA_API_KEY)

try {
  const { getAnthropicClient } = await import('./src/services/api/client.js')
  const client = await getAnthropicClient({ apiKey: 'dummy' })
  console.error('Client created:', client.constructor.name)
  console.error('Has beta.messages:', !!client.beta?.messages)
  console.error('Has messages:', !!client.messages)
} catch (e) {
  console.error('Error:', e)
}

setTimeout(() => process.exit(0), 1000)
