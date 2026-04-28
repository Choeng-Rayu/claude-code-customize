import { isEnvDefinedFalsy } from '../../utils/envUtils.js'

export type ColorModuleUnavailableReason = 'env' | 'native'

export type SyntaxTheme = unknown

/**
 * Returns a static reason why the color-diff module is unavailable, or null if available.
 * 'env' = disabled via CLAUDE_CODE_SYNTAX_HIGHLIGHT
 * 'native' = native module not available
 */
export function getColorModuleUnavailableReason(): ColorModuleUnavailableReason | null {
  if (isEnvDefinedFalsy(process.env.CLAUDE_CODE_SYNTAX_HIGHLIGHT)) {
    return 'env'
  }
  // Native module is not available in this build
  return 'native'
}

export function expectColorDiff(): unknown | null {
  return null
}

export function expectColorFile(): unknown | null {
  return null
}

export function getSyntaxTheme(_themeName: string): SyntaxTheme | null {
  return null
}
