/**
 * Cached Microcompact - Internal feature for prompt caching
 * This is a stub for the ant-only feature
 */

// Cache edit types
export interface CacheEditsBlock {
  type: 'cached_microcompact_edits'
  edits: CacheEdit[]
}

export interface CacheEdit {
  type: 'insert' | 'delete' | 'replace'
  index: number
  content?: string
  length?: number
}

export interface PinnedCacheEdits {
  id: string
  block: CacheEditsBlock
}

// Cached MC State
export interface CachedMCState {
  edits: CacheEdit[]
  pinned: Map<string, CacheEditsBlock>
}

// Create cached MC state
export function createCachedMCState(): CachedMCState {
  return {
    edits: [],
    pinned: new Map(),
  }
}

// Insert cache edit
export function insertCacheEdit(
  state: CachedMCState,
  index: number,
  content: string,
): void {
  state.edits.push({
    type: 'insert',
    index,
    content,
  })
}

// Delete cache edit
export function deleteCacheEdit(
  state: CachedMCState,
  index: number,
  length: number,
): void {
  state.edits.push({
    type: 'delete',
    index,
    length,
  })
}

// Replace cache edit
export function replaceCacheEdit(
  state: CachedMCState,
  index: number,
  length: number,
  content: string,
): void {
  state.edits.push({
    type: 'replace',
    index,
    length,
    content,
  })
}

// Pin cache edits
export function pinCacheEdits(
  state: CachedMCState,
  id: string,
  block: CacheEditsBlock,
): void {
  state.pinned.set(id, block)
}

// Unpin cache edits
export function unpinCacheEdits(state: CachedMCState, id: string): void {
  state.pinned.delete(id)
}

// Get pinned cache edits
export function getPinnedCacheEdits(state: CachedMCState): PinnedCacheEdits[] {
  return Array.from(state.pinned.entries()).map(([id, block]) => ({
    id,
    block,
  }))
}

// Clear cache edits
export function clearCacheEdits(state: CachedMCState): void {
  state.edits = []
}

// Apply cache edits to content
export function applyCacheEdits(content: string, edits: CacheEdit[]): string {
  let result = content
  // Sort edits by index in reverse order to apply from end to start
  const sortedEdits = [...edits].sort((a, b) => b.index - a.index)

  for (const edit of sortedEdits) {
    switch (edit.type) {
      case 'insert':
        if (edit.content) {
          result = result.slice(0, edit.index) + edit.content + result.slice(edit.index)
        }
        break
      case 'delete':
        if (edit.length) {
          result = result.slice(0, edit.index) + result.slice(edit.index + edit.length)
        }
        break
      case 'replace':
        if (edit.length && edit.content !== undefined) {
          result = result.slice(0, edit.index) + edit.content + result.slice(edit.index + edit.length)
        }
        break
    }
  }

  return result
}

// Default export
export default {
  createCachedMCState,
  insertCacheEdit,
  deleteCacheEdit,
  replaceCacheEdit,
  pinCacheEdits,
  unpinCacheEdits,
  getPinnedCacheEdits,
  clearCacheEdits,
  applyCacheEdits,
}
