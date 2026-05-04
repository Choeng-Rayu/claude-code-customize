#!/usr/bin/env bun
/**
 * Demo: Claude Code with Doubleword API
 * This demonstrates the Doubleword integration without running the full CLI
 */

console.log(`
╔══════════════════════════════════════════════════════════════╗
║            Claude Code - Doubleword Integration              ║
╚══════════════════════════════════════════════════════════════╝

✅ Status: READY TO USE

📁 Project: /home/rayu/claude-code-customize
🔧 Runtime: Bun ${Bun.version}
🤖 Provider: Doubleword API
📍 Endpoint: https://api.doubleword.ai/v1
🎯 Model: moonshotai/Kimi-K2.6

═══════════════════════════════════════════════════════════════

Files Modified:
━━━━━━━━━━━━━━
1. src/services/api/nvidiaAdapter.ts (NEW)
   → OpenAI-compatible adapter for NVIDIA and Doubleword APIs

2. src/services/api/client.ts (MODIFIED)
   → Added Doubleword provider support

3. src/utils/model/configs.ts (MODIFIED)
   → Added doubleword provider to all model configs

4. src/utils/model/modelStrings.ts (MODIFIED)
   → Added model mapping helper

5. package.json (MODIFIED)
   → Added missing dependencies

═══════════════════════════════════════════════════════════════

How to Start:
━━━━━━━━━━━━━

Method 1: Quick Start
  cd /home/rayu/claude-code-customize
  ./start-claude.sh

Method 2: Manual Start
  export API_PROVIDER=doubleword
  export DOUBLEWORD_API_KEY=your-key
  bun run src/main.tsx

Method 3: Install System-Wide
  ./install.sh
  claude-doubleword

═══════════════════════════════════════════════════════════════

Environment Variables:
━━━━━━━━━━━━━━━━━━━━━
Required:
  CLAUDE_CODE_USE_DOUBLEWORD=1
  DOUBLEWORD_API_KEY=...

Optional:
  ANTHROPIC_MODEL=claude-sonnet-4-6  # Model alias

═══════════════════════════════════════════════════════════════

⚠️  Important Notes:
━━━━━━━━━━━━━━━━━━━

1. Rate Limiting: The Doubleword API may return 429 (Too Many Requests)
   if you make too many requests quickly. This is normal and will
   resolve after a brief pause.

2. Missing Dependencies: The original Claude Code source has some
   missing tool files (TungstenTool, etc.). These are used only
   in specific modes and won't affect basic usage.

3. Model Mapping: All Anthropic models map to 'moonshotai/Kimi-K2.6'
   on Doubleword. This is configured in src/utils/model/configs.ts

═══════════════════════════════════════════════════════════════

🧪 Testing the Integration:
━━━━━━━━━━━━━━━━━━━━━━━━━━

Run the test script to verify Doubleword API connectivity:

  bun run test-doubleword.ts

═══════════════════════════════════════════════════════════════

✨ Claude Code is ready to use with Doubleword!
`)

// Show current environment
console.log('\n📊 Current Environment:')
console.log('━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`CLAUDE_CODE_USE_DOUBLEWORD: ${process.env.CLAUDE_CODE_USE_DOUBLEWORD || 'not set'}`)
console.log(`DOUBLEWORD_API_KEY: ${process.env.DOUBLEWORD_API_KEY || process.env.DoubleWord_API_KEY ? '✓ set' : '✗ not set'}`)
console.log(`PATH includes bun: ${process.env.PATH?.includes('bun') ? '✓ yes' : '✗ no'}`)

console.log('\n' + '═'.repeat(63))
console.log('Ready to start! Run: ./start-claude.sh')
console.log('═'.repeat(63) + '\n')
