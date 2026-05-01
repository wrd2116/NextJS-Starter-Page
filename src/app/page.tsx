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

  const { data: votedRows } = await supabase.from('caption_votes').select('caption_id').eq('profile_id', user.id)
  const votedIds = votedRows?.map((r: { caption_id: string }) => r.caption_id) ?? []

  let captionQuery = supabase.from(CAPTIONS_TABLE).select('*').limit(CAPTIONS_BATCH)
  if (votedIds.length > 0) {
    captionQuery = captionQuery.not('id', 'in', `(${votedIds.join(',')})`)
  }
  const { data: captions } = await captionQuery

  const captionList = captions ?? []
  const captionIds = captionList.map((c: Record<string, unknown>) => String(c.id))
  const { data: voteRows } = captionIds.length
    ? await supabase.from('caption_votes').select('caption_id,vote_value').in('caption_id', captionIds)
    : { data: [] }
  const voteTotalByCaptionId: Record<string, number> = {}
  for (const row of voteRows ?? []) {
    const r = row as { caption_id: string; vote_value: number | null }
    const id = String(r.caption_id)
    voteTotalByCaptionId[id] = (voteTotalByCaptionId[id] ?? 0) + (r.vote_value ?? 0)
  }

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
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto space-y-10">
        <section className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
          <h1 className="text-xl font-bold">Caption Feed</h1>
          <p className="mt-1 text-sm">
            Upload an image to generate captions, then vote captions up or down. Votes help rank what shows up next.
          </p>
        </section>

        <UploadCaption />

        <section>
          <h2 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-100">Rate captions</h2>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Tap or click the large vote buttons on each card.</p>
          {captionList.length > 0 ? (
            <>
              <CaptionList
                captions={captionList.map((c: Record<string, unknown>) => ({
                  id: String(c.id),
                  text: captionText(c),
                  imgUrl: captionImageUrl(c, imageUrlById),
                  votes: voteTotalByCaptionId[String(c.id)] ?? 0,
                }))}
              />
              <Next50 />
            </>
          ) : (
            <>
              <p className="mb-2 text-gray-500 dark:text-gray-400">No captions to rate right now. Check back later or load more.</p>
              <Next50 />
            </>
          )}
        </section>

        <section>
          <h1 className="mb-2 text-2xl font-bold capitalize text-gray-900 dark:text-gray-100">
            {TABLE_NAME.replace(/_/g, ' ')}
          </h1>
          {error ? (
            <p className="text-red-600 text-sm">
              Could not load table &quot;{TABLE_NAME}&quot;: {error.message}
            </p>
          ) : !rows?.length ? (
            <p className="text-gray-500 dark:text-gray-400">No rows in this table yet.</p>
          ) : (
            <>
              <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
                {rows.length} row{rows.length !== 1 ? 's' : ''} from Supabase
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((row, index) => (
            <article
              key={String((row as Record<string, unknown>).id ?? index)}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
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
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {key}
                    </dt>
                    <dd className="break-words font-medium text-gray-900 dark:text-gray-100">
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
