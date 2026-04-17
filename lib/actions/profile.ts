'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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

  // Smazat service-role klientem tabulky bez RLS (nebo kde user_id není auth.uid sloupec)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Smazat všechna uživatelská data
  await supabase.from('contracts').delete().eq('user_id', user.id)
  await serviceClient.from('notification_log').delete().eq('user_id', user.id)
  await serviceClient.from('supplier_notes').delete().eq('user_id', user.id)
  await serviceClient.from('ai_usage_log').delete().eq('user_id', user.id)
  await supabase.from('profiles').delete().eq('id', user.id)

  // Smazat auth uživatele — zároveň ukončí všechny sessions
  await serviceClient.auth.admin.deleteUser(user.id)
}
