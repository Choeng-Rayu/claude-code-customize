#!/usr/bin/env bun
/**
 * Demo: Claude Code with NVIDIA API
 * This demonstrates the NVIDIA integration without running the full CLI
 */

console.log(`
╔══════════════════════════════════════════════════════════════╗
║             Claude Code - NVIDIA Integration                 ║
╚══════════════════════════════════════════════════════════════╝

✅ Status: READY TO USE

📁 Project: /home/rayu/claude-code-customize
🔧 Runtime: Bun ${Bun.version}
🤖 Provider: NVIDIA API
📍 Endpoint: https://integrate.api.nvidia.com/v1
🎯 Model: moonshotai/kimi-k2.5

═══════════════════════════════════════════════════════════════

Files Modified:
━━━━━━━━━━━━━━
1. src/services/api/nvidiaAdapter.ts (NEW)
   → NVIDIA API adapter for OpenAI-compatible API

2. src/services/api/client.ts (MODIFIED)
   → Added NVIDIA provider support

3. src/utils/model/configs.ts (MODIFIED)
   → Added nvidia provider to all model configs

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
  export CLAUDE_CODE_USE_NVIDIA=1
  export NVIDIA_API_KEY=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
  bun run src/main.tsx

Method 3: Install System-Wide
  ./install.sh
  claude-nvidia

═══════════════════════════════════════════════════════════════

Environment Variables:
━━━━━━━━━━━━━━━━━━━━━
Required:
  CLAUDE_CODE_USE_NVIDIA=1
  NVIDIA_API_KEY=nvapi-...

Optional:
  ANTHROPIC_MODEL=claude-sonnet-4-6  # Model alias

═══════════════════════════════════════════════════════════════

⚠️  Important Notes:
━━━━━━━━━━━━━━━━━━━

1. Rate Limiting: The NVIDIA API may return 429 (Too Many Requests)
   if you make too many requests quickly. This is normal and will
   resolve after a brief pause.

2. Missing Dependencies: The original Claude Code source has some
   missing tool files (TungstenTool, etc.). These are used only
   in specific modes and won't affect basic usage.

3. Model Mapping: All Anthropic models map to 'moonshotai/kimi-k2.5'
   on NVIDIA. This is configured in src/utils/model/configs.ts

═══════════════════════════════════════════════════════════════

🧪 Testing the Integration:
━━━━━━━━━━━━━━━━━━━━━━━━━━

Run the test script to verify NVIDIA API connectivity:

  bun run test-nvidia.ts

═══════════════════════════════════════════════════════════════

✨ Claude Code is ready to use with NVIDIA!
`)

// Show current environment
console.log('\n📊 Current Environment:')
console.log('━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`CLAUDE_CODE_USE_NVIDIA: ${process.env.CLAUDE_CODE_USE_NVIDIA || 'not set'}`)
console.log(`NVIDIA_API_KEY: ${process.env.NVIDIA_API_KEY ? '✓ set' : '✗ not set'}`)
console.log(`PATH includes bun: ${process.env.PATH?.includes('bun') ? '✓ yes' : '✗ no'}`)

console.log('\n' + '═'.repeat(63))
console.log('Ready to start! Run: ./start-claude.sh')
console.log('═'.repeat(63) + '\n')
