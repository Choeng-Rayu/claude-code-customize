/**
 * Full stub for @ant/claude-for-chrome-mcp
 * This replaces the internal Anthropic package
 */

// Logger type
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

// Permission mode
export type PermissionMode = 'ask' | 'auto' | 'reject'

// ClaudeForChromeContext
export interface ClaudeForChromeContext {
  getSocketPaths: () => string[]
  getSecureSocketPath: () => string | null
  logForDebugging: (message: string) => void
  isEnvTruthy: (value: string | undefined) => boolean
  logEvent: (event: string, metadata?: Record<string, unknown>) => void
  extensionDownloadUrl: string
  bugReportUrl: string
}

// Tool definition
export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

// Browser tool
export interface BrowserTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

// Browser tools list
export const BROWSER_TOOLS: BrowserTool[] = [
  {
    name: 'browser_navigate',
    description: 'Navigate to a URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
      },
      required: ['url'],
    },
  },
  {
    name: 'browser_click',
    description: 'Click an element on the page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'browser_type',
    description: 'Type text into an input',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the page',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_get_html',
    description: 'Get the HTML of the page',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_get_text',
    description: 'Get the text content of the page',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_scroll',
    description: 'Scroll the page',
    inputSchema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down'] },
        amount: { type: 'number' },
      },
      required: ['direction'],
    },
  },
  {
    name: 'browser_find',
    description: 'Find text on the page',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
      },
      required: ['text'],
    },
  },
  {
    name: 'browser_go_back',
    description: 'Go back in browser history',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_go_forward',
    description: 'Go forward in browser history',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_refresh',
    description: 'Refresh the page',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_get_console_logs',
    description: 'Get browser console logs',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_clear_console_logs',
    description: 'Clear browser console logs',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'tabs_context_mcp',
    description: 'Get information about browser tabs',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

// MCP Server interface
export interface ClaudeForChromeMcpServer {
  connect: (transport: unknown) => Promise<void>
  disconnect: () => Promise<void>
}

// Create MCP server function
export function createClaudeForChromeMcpServer(
  context: ClaudeForChromeContext,
): ClaudeForChromeMcpServer {
  // Return a stub server
  return {
    connect: async () => {
      console.log('Chrome MCP server stub connected')
    },
    disconnect: async () => {
      console.log('Chrome MCP server stub disconnected')
    },
  }
}

// Create Chrome context
export function createChromeContext(env: Record<string, string>): ClaudeForChromeContext {
  return {
    getSocketPaths: () => [],
    getSecureSocketPath: () => null,
    logForDebugging: (message: string) => console.log('[Chrome]', message),
    isEnvTruthy: (value: string | undefined) => value === '1' || value === 'true',
    logEvent: (event: string, metadata?: Record<string, unknown>) => {
      console.log('[Chrome Event]', event, metadata)
    },
    extensionDownloadUrl: 'https://claude.ai/chrome',
    bugReportUrl: 'https://github.com/anthropics/claude-code/issues',
  }
}

// Default export
export default {
  BROWSER_TOOLS,
  createClaudeForChromeMcpServer,
  createChromeContext,
}
