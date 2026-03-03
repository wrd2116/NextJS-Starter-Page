'use client'

import { useState } from 'react'
import { submitVote } from './actions'

type Props = { captionId: string; onVoted?: () => void; onSaved?: () => void }

export function CaptionVote({ captionId, onVoted, onSaved }: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVote(vote: 1 | -1) {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const result = await submitVote(captionId, vote)
      if (result.error) {
        setError(result.error)
      } else {
        onVoted?.()
        onSaved?.()
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={pending}
        className="px-2 py-0.5 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Upvote"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={pending}
        className="px-2 py-0.5 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Downvote"
      >
        ↓
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}
