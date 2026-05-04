#!/usr/bin/env bun
/**
 * Simple test script for NVIDIA API integration
 */

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY
if (!NVIDIA_API_KEY) {
  console.error('NVIDIA_API_KEY is required')
  process.exit(1)
}

interface MessageParam {
  role: 'user' | 'assistant'
  content: string
}

async function testNvidiaAPI() {
  console.log('🧪 Testing NVIDIA API integration...\n')

  const messages: MessageParam[] = [
    { role: 'user', content: 'Hello! Can you help me write a simple Python function to calculate fibonacci numbers?' }
  ]

  const requestBody = {
    model: 'moonshotai/kimi-k2.6',
    messages: messages,
    max_tokens: 1024,
    temperature: 1.0,
    top_p: 1.0,
    stream: true,
  }

  console.log('📤 Sending request to NVIDIA API...')
  console.log('URL: https://integrate.api.nvidia.com/v1/chat/completions')
  console.log('Model:', requestBody.model)
  console.log('Message:', messages[0].content)
  console.log('')

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Error: NVIDIA API returned ${response.status}`)
      console.error('Response:', errorText)
      process.exit(1)
    }

    console.log('✅ Connected! Streaming response:\n')
    console.log('=' .repeat(50))

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

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
          const chunk = JSON.parse(data)
          const content = chunk.choices?.[0]?.delta?.content
          if (content) {
            process.stdout.write(content)
            fullContent += content
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('\n✅ Test completed successfully!')
    console.log(`Total characters received: ${fullContent.length}`)

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

testNvidiaAPI()
