/**
 * Staging caption pipeline API: presigned upload → register image → generate captions.
 * Base URL: https://api.almostcrackd.ai
 */

const API_BASE = process.env.NEXT_PUBLIC_PIPELINE_API_URL ?? 'https://api.almostcrackd.ai'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
] as const

export function isAllowedImageType(type: string): boolean {
  return ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/** Step 1: Get presigned URL for upload */
export async function generatePresignedUrl(
  token: string,
  contentType: string
): Promise<{ presignedUrl: string; cdnUrl: string }> {
  const res = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ contentType }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Presigned URL failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  return { presignedUrl: data.presignedUrl, cdnUrl: data.cdnUrl }
}

/** Step 2: Upload file to presigned URL (PUT to S3) */
export async function uploadToPresignedUrl(
  presignedUrl: string,
  file: File
): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed: ${res.status} ${text}`)
  }
}

/** Step 3: Register image URL with pipeline */
export async function registerImageUrl(
  token: string,
  imageUrl: string,
  isCommonUse = false
): Promise<{ imageId: string }> {
  const res = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ imageUrl, isCommonUse }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Register image failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  return { imageId: data.imageId }
}

/** Step 4: Generate captions for the registered image */
export async function generateCaptions(
  token: string,
  imageId: string
): Promise<unknown[]> {
  const res = await fetch(`${API_BASE}/pipeline/generate-captions`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ imageId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Generate captions failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data : [data]
}
