/**
 * Context Collapse Service
 */

export function collapseContext(context: string, options?: { maxTokens?: number }): string {
  return context
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
