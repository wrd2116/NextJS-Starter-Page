'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  isAllowedImageType,
  generatePresignedUrl,
  uploadToPresignedUrl,
  registerImageUrl,
  generateCaptions,
} from '@/lib/pipeline-api'

type CaptionRecord = { id?: string; text?: string; caption?: string; [k: string]: unknown }

export function UploadCaption() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [captions, setCaptions] = useState<CaptionRecord[]>([])
  const [step, setStep] = useState<string>('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) {
      setFile(null)
      setPreviewUrl(null)
      return
    }
    if (!isAllowedImageType(f.type)) {
      setErrorMessage(
        `Unsupported type: ${f.type}. Use JPEG, PNG, WebP, GIF, or HEIC.`
      )
      setFile(null)
      setPreviewUrl(null)
      return
    }
    setErrorMessage(null)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setStatus('idle')
    setCaptions([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setErrorMessage('Not logged in. Please sign in and try again.')
      setStatus('error')
      return
    }

    const token = session.access_token
    setStatus('uploading')
    setErrorMessage(null)

    try {
      setStep('Getting upload URL…')
      const { presignedUrl, cdnUrl } = await generatePresignedUrl(token, file.type)

      setStep('Uploading image…')
      await uploadToPresignedUrl(presignedUrl, file)

      setStep('Registering image…')
      const { imageId } = await registerImageUrl(token, cdnUrl, false)

      setStep('Generating captions…')
      const result = await generateCaptions(token, imageId)

      setCaptions((Array.isArray(result) ? result : [result]) as CaptionRecord[])
      setStatus('done')
      setStep('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
      setStep('')
    }
  }

  function textOf(c: CaptionRecord): string {
    const keys = [
      'text',
      'caption',
      'caption_text',
      'generated_caption',
      'content',
      'body',
      'description',
      'label',
      'name',
      'title',
    ]
    for (const k of keys) {
      const v = c[k]
      if (v != null && String(v).trim() !== '') return String(v)
    }
    // Nested: e.g. { caption: { text: "..." } }
    const nested = c.caption ?? c.text
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const obj = nested as Record<string, unknown>
      for (const k of keys) {
        const v = obj[k]
        if (v != null && String(v).trim() !== '') return String(v)
      }
    }
    // Any string value in the object (skip id-like keys)
    for (const [k, v] of Object.entries(c)) {
      if (v != null && typeof v === 'string' && v.trim() !== '') {
        const lower = k.toLowerCase()
        if (!lower.endsWith('_id') && lower !== 'id') return v
      }
    }
    return '—'
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">Upload image & get captions</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Your selected image stays visible below while captions are generating.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="upload-image" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Choose image (JPEG, PNG, WebP, GIF, HEIC)
          </label>
          <input
            id="upload-image"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-gray-900 file:px-5 file:py-3 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-700 dark:text-gray-400 dark:file:bg-gray-100 dark:file:text-gray-900"
          />
        </div>

        {previewUrl && (
          <div className="mt-2">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-48 rounded border border-gray-200 object-contain dark:border-gray-700"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!file || status === 'uploading'}
          className="inline-flex items-center justify-center gap-2 rounded bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {status === 'uploading' ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-gray-900 dark:border-t-transparent" />
          ) : null}
          {status === 'uploading' ? step || 'Uploading…' : 'Upload & generate captions'}
        </button>
      </form>

      {errorMessage && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}

      {status === 'done' && captions.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
          <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Generated captions</h3>
          <ul className="space-y-2">
            {captions.map((c, i) => (
              <li key={c.id ?? i} className="text-sm text-gray-800 dark:text-gray-200">
                {textOf(c)}
              </li>
            ))}
          </ul>
          {captions.every((c) => textOf(c) === '—') && (
            <details className="mt-4">
              <summary className="text-xs text-gray-500 cursor-pointer">
                Response shape (no caption text found in expected keys)
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 text-xs overflow-auto max-h-48">
                {JSON.stringify(captions[0], null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
