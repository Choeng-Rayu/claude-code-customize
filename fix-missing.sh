#!/bin/bash
# Script to fix all missing dependencies in Claude Code

cd /home/rayu/claude-code-customize

echo "Creating stub files for missing tools..."

# Create missing tool stubs
mkdir -p src/tools/WorkflowTool
mkdir -p src/tools/REPLTool
mkdir -p src/tools/SuggestBackgroundPRTool
mkdir -p src/tools/VerifyPlanExecutionTool
mkdir -p src/services/compact
mkdir -p src/cachedMicrocompact
mkdir -p src/entrypoints/sdk
mkdir -p src/commands/assistant
mkdir -p src/commands/agents-platform
mkdir -p src/utils/claudeInChrome

# WorkflowTool constants
cat > src/tools/WorkflowTool/constants.ts << 'EOF'
export const WORKFLOW_CONSTANTS = {}
EOF

# REPLTool
cat > src/tools/REPLTool/REPLTool.ts << 'EOF'
export const REPLTool = null
EOF

# SuggestBackgroundPRTool
cat > src/tools/SuggestBackgroundPRTool/SuggestBackgroundPRTool.ts << 'EOF'
export const SuggestBackgroundPRTool = null
EOF

# VerifyPlanExecutionTool
cat > src/tools/VerifyPlanExecutionTool/VerifyPlanExecutionTool.ts << 'EOF'
export const VerifyPlanExecutionTool = null
EOF

# snipProjection
cat > src/services/compact/snipProjection.ts << 'EOF'
export function snipProjection(text: string, options?: any): string {
  return text
}
EOF

# cachedMicrocompact
cat > src/cachedMicrocompact/index.ts << 'EOF'
export function getCachedMicrocompact(): any {
  return null
}
EOF

# runtimeTypes
cat > src/entrypoints/sdk/runtimeTypes.ts << 'EOF'
export type RuntimeTypes = any
EOF

# protectedNamespace
cat > src/utils/protectedNamespace.ts << 'EOF'
export const PROTECTED_NAMESPACES: string[] = []
EOF

# commands/assistant/assistant
cat > src/commands/assistant/assistant.ts << 'EOF'
export function assistantCommand(): void {
  console.log('Assistant command not available')
}
EOF

# commands/agents-platform/index
cat > src/commands/agents-platform/index.ts << 'EOF'
export function agentsPlatform(): void {
  console.log('Agents platform not available')
}
EOF

echo "✅ Stub files created!"
echo ""
echo "Now installing remaining npm packages..."

export PATH="$HOME/.bun/bin:$PATH"

# Install remaining packages
bun install

echo "✅ Done! Try running: ./start-claude.sh"
