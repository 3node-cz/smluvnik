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

  // Validace vstupů
  if (data.full_name.length > 200) throw new Error('Jméno je příliš dlouhé.')
  if (data.notification_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.notification_email)) {
    throw new Error('Neplatný formát e-mailu.')
  }
  if (data.default_notification_days < 1 || data.default_notification_days > 365) {
    throw new Error('Počet dní musí být mezi 1 a 365.')
  }

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

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Smazat soubory ze storage
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

    // Smazat všechna uživatelská data z DB
    await supabase.from('contracts').delete().eq('user_id', user.id)
    await serviceClient.from('notification_log').delete().eq('user_id', user.id)
    await serviceClient.from('supplier_notes').delete().eq('user_id', user.id)
    await serviceClient.from('ai_usage_log').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
  } finally {
    // deleteUser vždy — ukončí session a smaže auth účet
    await serviceClient.auth.admin.deleteUser(user.id)
  }
}
