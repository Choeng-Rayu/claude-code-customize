#!/bin/bash
# Claude Code Launcher with NVIDIA API

# Add Bun to PATH if not already there
export PATH="$HOME/.bun/bin:$PATH"

# Set NVIDIA configuration
export CLAUDE_CODE_USE_NVIDIA=1
export NVIDIA_API_KEY="${NVIDIA_API_KEY:-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}"

# Optional: Set default model
# export ANTHROPIC_MODEL="claude-sonnet-4-6"

# Change to project directory
cd "$(dirname "$0")"

# Start Claude Code
echo "🚀 Starting Claude Code with NVIDIA API..."
bun run src/entrypoints/cli.tsx "$@"
