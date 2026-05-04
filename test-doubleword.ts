#!/usr/bin/env bun
/**
 * Simple smoke test for Doubleword API integration.
 */

const apiKey = process.env.DOUBLEWORD_API_KEY || process.env.DoubleWord_API_KEY
if (!apiKey) {
  console.error('DOUBLEWORD_API_KEY is required')
  process.exit(1)
}

const url = `${process.env.DOUBLEWORD_BASE_URL ?? 'https://api.doubleword.ai/v1'}/chat/completions`
const body = {
  model: 'moonshotai/Kimi-K2.6',
  messages: [{ role: 'user', content: 'Say hello in one short sentence.' }],
  max_tokens: 100,
  stream: false,
}

console.error('Testing Doubleword API...')
console.error('URL:', url)
console.error('Model:', body.model)

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  console.error('Status:', response.status)
  const text = await response.text()
  console.error('Response:', text.substring(0, 500))
  if (!response.ok) process.exit(1)
} catch (e) {
  console.error('Error:', e instanceof Error ? e.message : String(e))
  process.exit(1)
}
