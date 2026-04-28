/**
 * Generated core types for SDK
 * This is a stub for the auto-generated types
 */

export type SDKMessage = {
  type: string
  content: unknown
}

export type SDKControlRequest = {
  type: 'control'
  action: string
}

export type SDKResultSuccess = {
  success: true
  data: unknown
}

export type SDKResultError = {
  success: false
  error: string
}

export type SDKResult = SDKResultSuccess | SDKResultError
