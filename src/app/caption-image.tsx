'use client'

import { useState } from 'react'

export function CaptionImage({ src }: { src: string }) {
  const [url, setUrl] = useState(src)
  const fallback = url.includes('/images/') ? url.replace(/\/images\/(.+)$/, '/$1') : null

  return (
    <img
      src={url}
      alt=""
      className="w-full aspect-video object-cover bg-gray-100"
      referrerPolicy="no-referrer"
      data-img-src={url}
      onError={() => {
        if (fallback && fallback !== url) setUrl(fallback)
      }}
    />
  )
}
