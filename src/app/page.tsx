import { createClient } from '@/lib/supabase/server'
import { GatedUI } from './gated-ui'
import { CaptionList } from './caption-list'
import { Next50 } from './next50'
import { UploadCaption } from './upload-caption'

export const dynamic = 'force-dynamic'

const TABLE_NAME = process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'bug_reports'
const CAPTIONS_TABLE = process.env.NEXT_PUBLIC_CAPTIONS_TABLE ?? 'captions'
const CAPTIONS_BATCH = 50
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'images'

function captionImageUrl(c: Record<string, unknown>, imageUrlById?: Record<string, string>): string | null {
  const imageId = c.image_id ?? c.image
  if (imageId && imageUrlById?.[String(imageId)]) return imageUrlById[String(imageId)]
  const keys = ['url', 'image_url', 'img_url', 'storage_url', 'public_url', 'src']
  for (const k of keys) {
    const v = c[k]
    if (v != null && typeof v === 'string' && v.trim().length > 0 && (v.startsWith('http://') || v.startsWith('https://'))) return v
  }
  const raw = imageId
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  const path = s.replace(/^\//, '')
  const customBase = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? process.env.IMAGE_BASE_URL ?? 'https://images.almostcrackd.ai')?.replace(/\/$/, '')
  if (customBase && path) {
    const segment = STORAGE_BUCKET ? `${STORAGE_BUCKET}/` : ''
    return `${customBase}/${segment}${path}`
  }
  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL
  return supabaseBase && path ? `${supabaseBase}/storage/v1/object/public/${STORAGE_BUCKET}/${path}` : null
}

function captionText(c: Record<string, unknown>): string {
  const keys = ['text', 'caption', 'content', 'body', 'description', 'label', 'name', 'title']
  for (const k of keys) {
    const v = c[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return '—'
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <GatedUI />

  const { data: votedRows } = await supabase.from('caption_votes').select('caption_id').eq('user_id', user.id)
  const votedIds = votedRows?.map((r: { caption_id: string }) => r.caption_id) ?? []

  let captionQuery = supabase.from(CAPTIONS_TABLE).select('*').limit(CAPTIONS_BATCH)
  if (votedIds.length > 0) {
    captionQuery = captionQuery.not('id', 'in', `(${votedIds.join(',')})`)
  }
  const { data: captions } = await captionQuery

  const captionList = captions ?? []
  const imageIds = Array.from(new Set(captionList.map((c: Record<string, unknown>) => c.image_id ?? c.image).filter(Boolean))) as string[]
  const { data: imageRows } = imageIds.length > 0
    ? await supabase.from('images').select('id, url').in('id', imageIds)
    : { data: [] }
  const imageUrlById: Record<string, string> = {}
  for (const row of imageRows ?? []) {
    const r = row as { id: string; url: string | null }
    if (r?.url?.startsWith('http')) imageUrlById[r.id] = r.url
  }

  const { data: rows, error } = await supabase.from(TABLE_NAME).select('*')
  const columns = rows?.length ? Object.keys(rows[0] as object) : []

  return (
    <main className="min-h-screen p-8 md:p-16 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-10">
        <UploadCaption />

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Rate captions</h2>
          {captionList.length > 0 ? (
            <>
              <CaptionList
                captions={captionList.map((c: Record<string, unknown>) => ({
                  id: String(c.id),
                  text: captionText(c),
                  imgUrl: captionImageUrl(c, imageUrlById),
                }))}
              />
              <Next50 />
            </>
          ) : (
            <>
              <p className="text-gray-500 mb-2">No captions to rate right now. Check back later or load more.</p>
              <Next50 />
            </>
          )}
        </section>

        <section>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 capitalize">
            {TABLE_NAME.replace(/_/g, ' ')}
          </h1>
          {error ? (
            <p className="text-red-600 text-sm">
              Could not load table &quot;{TABLE_NAME}&quot;: {error.message}
            </p>
          ) : !rows?.length ? (
            <p className="text-gray-500">No rows in this table yet.</p>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-8">
                {rows.length} row{rows.length !== 1 ? 's' : ''} from Supabase
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((row, index) => (
            <article
              key={String((row as Record<string, unknown>).id ?? index)}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              {columns.map((key) => {
                const value = (row as Record<string, unknown>)[key]
                const display =
                  value == null
                    ? '—'
                    : typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value)
                return (
                  <dl key={key} className="mb-3 last:mb-0">
                    <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {key}
                    </dt>
                    <dd className="text-gray-900 font-medium break-words">
                      {display}
                    </dd>
                  </dl>
                )
              })}
            </article>
              ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
