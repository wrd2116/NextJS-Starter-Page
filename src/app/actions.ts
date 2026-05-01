'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function submitVote(captionId: string, vote: 1 | -1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in' }

  const { error } = await supabase
    .from('caption_votes')
    .insert({
      caption_id: captionId,
      profile_id: user.id,
      vote_value: vote,
      created_by_user_id: user.id,
      modified_by_user_id: user.id,
      created_datetime_utc: new Date().toISOString().replace('T', ' ').replace('Z', '+00'),
      modified_datetime_utc: new Date().toISOString().replace('T', ' ').replace('Z', '+00'),
    })

  if (!error) revalidatePath('/')
  return { error: error?.message }
}
