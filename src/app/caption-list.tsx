'use client'

import { useState } from 'react'
import { CaptionImage } from './caption-image'
import { CaptionVote } from './caption-vote'

type CaptionItem = { id: string; text: string; imgUrl: string | null; votes: number }

export function CaptionList({ captions }: { captions: CaptionItem[] }) {
  const [list, setList] = useState(captions)
  const [showSaved, setShowSaved] = useState(false)

  function removeCaption(captionId: string) {
    setList((prev) => prev.filter((c) => String(c.id) !== String(captionId)))
  }

  if (list.length === 0) return null

  return (
    <>
      {showSaved && (
        <p className="mb-3 text-sm text-green-600 font-medium">Vote saved</p>
      )}
      <ul className="space-y-6">
        {list.map((c) => (
          <li
            key={String(c.id)}
            className="overflow-hidden rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            {c.imgUrl && <CaptionImage src={c.imgUrl} />}
            <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <span className="text-gray-800 dark:text-gray-100">{c.text}</span>
              <CaptionVote
                captionId={String(c.id)}
                voteTotal={c.votes}
                onVoted={() => removeCaption(c.id)}
                onSaved={() => {
                  setShowSaved(true)
                  setTimeout(() => setShowSaved(false), 2000)
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
