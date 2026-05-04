#!/bin/bash
# Claude Code Doubleword - Installation Script

set -e

CLAUDE_DIR="/home/rayu/claude-code-customize"
BUN_PATH="$HOME/.bun/bin"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
fi

# Check if DOUBLEWORD_API_KEY is set
if [ -z "$DOUBLEWORD_API_KEY" ] && [ -z "$DoubleWord_API_KEY" ]; then
    echo "Warning: DOUBLEWORD_API_KEY is not set."
    echo "Please set it before running Claude Code:"
    echo "  export DOUBLEWORD_API_KEY=your-key"
fi

# Create wrapper script
cat > /tmp/claude-doubleword << 'WRAPPER_EOF'
#!/bin/bash
# Claude Code Doubleword - Wrapper Script

export PATH="$HOME/.bun/bin:$PATH"
if [ -f /home/rayu/claude-code-customize/src/.env ]; then
    set -a
    . /home/rayu/claude-code-customize/src/.env
    set +a
fi
export API_PROVIDER="${API_PROVIDER:-doubleword}"
export CLAUDE_CODE_USE_DOUBLEWORD=1
export DOUBLEWORD_API_KEY="${DOUBLEWORD_API_KEY:-${DoubleWord_API_KEY:-}}"

# Run Claude Code
cd /home/rayu/claude-code-customize
exec bun run src/main.tsx "$@"
WRAPPER_EOF

# Install to /usr/local/bin
sudo mv /tmp/claude-doubleword /usr/local/bin/claude-doubleword
sudo chmod +x /usr/local/bin/claude-doubleword

echo "Claude Code (Doubleword) installed successfully!"
echo ""
echo "Usage:"
echo "  claude-doubleword                    # Start interactive mode"
echo "  claude-doubleword --help             # Show help"
echo "  claude-doubleword /path/to/project   # Start in project directory"
echo ""
echo "To use with your own Doubleword API key:"
echo "  export DOUBLEWORD_API_KEY=your-key"
echo "  claude-doubleword"
