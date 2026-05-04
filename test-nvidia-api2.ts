const apiKey = process.env.NVIDIA_API_KEY
if (!apiKey) {
  console.error('NVIDIA_API_KEY is required')
  process.exit(1)
}
const url = 'https://integrate.api.nvidia.com/v1/chat/completions'

const body = {
  model: 'moonshotai/kimi-k2.6',
  messages: [{ role: 'user', content: 'Say hello' }],
  max_tokens: 100,
  stream: false,
}

console.error('Testing NVIDIA API with 10s timeout...')

const controller = new AbortController()
setTimeout(() => controller.abort(), 10000)

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })

  console.error('Status:', response.status)
  const text = await response.text()
  console.error('Response:', text.substring(0, 1000))
} catch (e) {
  console.error('Error:', e instanceof Error ? e.message : String(e))
}
