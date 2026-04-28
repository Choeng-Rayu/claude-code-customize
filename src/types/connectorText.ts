/**
 * Connector Text Types
 * These types are used for connector text blocks in the UI
 */

export type ConnectorTextBlock = {
  type: 'connector'
  text: string
}

export type ConnectorTextDelta = {
  type: 'text_delta'
  text: string
}

export function isConnectorTextBlock(content: unknown): content is ConnectorTextBlock {
  return (
    typeof content === 'object' &&
    content !== null &&
    (content as { type?: string }).type === 'connector' &&
    typeof (content as { text?: string }).text === 'string'
  )
}
