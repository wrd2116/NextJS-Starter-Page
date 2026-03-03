'use client'

import { useRouter } from 'next/navigation'

export function Next50() {
  const router = useRouter()
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => router.refresh()}
        className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:bg-gray-800"
      >
        Next 50
      </button>
    </div>
  )
}
