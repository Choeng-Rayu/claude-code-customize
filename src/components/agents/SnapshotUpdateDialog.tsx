import React from 'react'

interface Props {
  onClose: () => void
}

export function SnapshotUpdateDialog({ onClose }: Props): React.ReactElement {
  return (
    <div>
      <h1>Snapshot Update</h1>
      <p>This is a placeholder for the SnapshotUpdateDialog.</p>
      <button onClick={onClose}>Close</button>
    </div>
  )
}
