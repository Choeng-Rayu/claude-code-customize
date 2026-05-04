(globalThis as any).MACRO = { VERSION: '9.9.9' }
process.env.API_PROVIDER ??= 'doubleword'
process.env.CLAUDE_CODE_USE_DOUBLEWORD ??= '1'
process.env.DOUBLEWORD_API_KEY ??= process.env.DoubleWord_API_KEY

console.error('Testing API client creation...')
console.error('API_PROVIDER:', process.env.API_PROVIDER)
console.error('DOUBLEWORD_API_KEY set:', !!process.env.DOUBLEWORD_API_KEY)

try {
  const { getAnthropicClient } = await import('./src/services/api/client.js')
  const client = await getAnthropicClient({ apiKey: 'dummy', maxRetries: 0 })
  console.error('Client created:', client.constructor.name)
  console.error('Has beta.messages:', !!client.beta?.messages)
  console.error('Has messages:', !!client.messages)
} catch (e) {
  console.error('Error:', e)
}

setTimeout(() => process.exit(0), 1000)
