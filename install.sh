#!/bin/bash
# Claude Code NVIDIA - Installation Script

set -e

CLAUDE_DIR="/home/rayu/claude-code-customize"
BUN_PATH="$HOME/.bun/bin"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
fi

# Check if NVIDIA_API_KEY is set
if [ -z "$NVIDIA_API_KEY" ]; then
    echo "⚠️  Warning: NVIDIA_API_KEY is not set."
    echo "Please set it before running Claude Code:"
    echo "  export NVIDIA_API_KEY=nvapi-your-key"
fi

# Create wrapper script
cat > /tmp/claude-nvidia << 'WRAPPER_EOF'
#!/bin/bash
# Claude Code NVIDIA - Wrapper Script

export PATH="$HOME/.bun/bin:$PATH"
export CLAUDE_CODE_USE_NVIDIA=1

# Use environment variable or default key
if [ -z "$NVIDIA_API_KEY" ]; then
    export NVIDIA_API_KEY="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"
fi

# Run Claude Code
cd /home/rayu/claude-code-customize
exec bun run src/main.tsx "$@"
WRAPPER_EOF

# Install to /usr/local/bin
sudo mv /tmp/claude-nvidia /usr/local/bin/claude-nvidia
sudo chmod +x /usr/local/bin/claude-nvidia

echo "✅ Claude Code (NVIDIA) installed successfully!"
echo ""
echo "Usage:"
echo "  claude-nvidia                    # Start interactive mode"
echo "  claude-nvidia --help             # Show help"
echo "  claude-nvidia /path/to/project   # Start in project directory"
echo ""
echo "To use with your own NVIDIA API key:"
echo "  export NVIDIA_API_KEY=nvapi-your-key"
echo "  claude-nvidia"
