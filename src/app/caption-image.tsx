'use client'

import { useState } from 'react'

export function CaptionImage({ src }: { src: string }) {
  const [url, setUrl] = useState(src)
  const [open, setOpen] = useState(false)
  const fallback = url.includes('/images/') ? url.replace(/\/images\/(.+)$/, '/$1') : null

  return (
    <>
      <button type="button" className="w-full" onClick={() => setOpen(true)} aria-label="Expand image">
        <img
          src={url}
          alt=""
          className="aspect-video w-full bg-gray-100 object-cover dark:bg-gray-800"
          referrerPolicy="no-referrer"
          data-img-src={url}
          onError={() => {
            if (fallback && fallback !== url) setUrl(fallback)
          }}
        />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <img
            src={url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded object-contain"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
