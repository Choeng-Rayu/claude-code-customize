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

console.error('Testing NVIDIA API...')
console.error('URL:', url)

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  console.error('Status:', response.status)
  const text = await response.text()
  console.error('Response:', text.substring(0, 500))
} catch (e) {
  console.error('Error:', e)
}
