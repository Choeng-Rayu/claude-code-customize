#!/bin/bash
# Claude Code Launcher with OpenAI-compatible provider support

# Add Bun to PATH if not already there
export PATH="$HOME/.bun/bin:$PATH"

# Load local provider credentials without printing them.
if [ -f "$(dirname "$0")/src/.env" ]; then
  set -a
  . "$(dirname "$0")/src/.env"
  set +a
fi

API_PROVIDER="${API_PROVIDER:-doubleword}"
case "$API_PROVIDER" in
  doubleword)
    unset CLAUDE_CODE_USE_NVIDIA
    export CLAUDE_CODE_USE_DOUBLEWORD=1
    export DOUBLEWORD_API_KEY="${DOUBLEWORD_API_KEY:-${DoubleWord_API_KEY:-}}"
    ;;
  nvidia)
    unset CLAUDE_CODE_USE_DOUBLEWORD
    export CLAUDE_CODE_USE_NVIDIA=1
    ;;
esac

# Optional: Set default model
# export ANTHROPIC_MODEL="claude-sonnet-4-6"

# Change to project directory
cd "$(dirname "$0")"

# Start Claude Code
echo "Starting Claude Code with ${API_PROVIDER} API..."
bun run src/entrypoints/cli.tsx "$@"
