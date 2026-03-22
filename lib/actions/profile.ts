'use server'

import { createClient } from '@/lib/supabase/server'

export async function updateProfile(data: {
  full_name: string
  notification_email: string
  default_notification_days: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    ...data,
  })

  if (error) throw error
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Delete all storage files (contracts + additional documents)
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, file_path')
    .eq('user_id', user.id)

  if (contracts && contracts.length > 0) {
    const contractIds = contracts.map(c => c.id)
    const { data: docs } = await supabase
      .from('contract_documents')
      .select('file_path')
      .in('contract_id', contractIds)

    const filePaths = [
      ...contracts.filter(c => c.file_path).map(c => c.file_path!),
      ...(docs?.map(d => d.file_path) || []),
    ]

    if (filePaths.length > 0) {
      await supabase.storage.from('contracts').remove(filePaths)
    }
  }

  await supabase.from('contracts').delete().eq('user_id', user.id)
  await supabase.from('profiles').delete().eq('id', user.id)
  await supabase.auth.signOut()
}
