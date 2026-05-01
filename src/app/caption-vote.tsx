'use client'

import { useState } from 'react'
import { submitVote } from './actions'

type Props = {
  captionId: string
  voteTotal: number
  onVoted?: () => void
  onSaved?: () => void
}

export function CaptionVote({ captionId, voteTotal, onVoted, onSaved }: Props) {
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
    <span className="flex items-center gap-3">
      <span className="min-w-16 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Score {voteTotal}
      </span>
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={pending}
        className="rounded border border-green-400 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-700 dark:bg-green-950/50 dark:text-green-300 dark:hover:bg-green-900/50"
        aria-label="Upvote"
      >
        👍 Upvote
      </button>
      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={pending}
        className="rounded border border-red-400 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/50"
        aria-label="Downvote"
      >
        👎 Downvote
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}
