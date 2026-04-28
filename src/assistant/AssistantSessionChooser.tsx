import React from 'react'

interface Props {
  onSelect: (sessionId: string) => void
  onCancel: () => void
}

export function AssistantSessionChooser({ onSelect, onCancel }: Props): React.ReactElement {
  return (
    <div>
      <h1>Choose Assistant Session</h1>
      <p>This is a placeholder for the AssistantSessionChooser.</p>
      <button onClick={() => onSelect('demo-session')}>Select</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}
