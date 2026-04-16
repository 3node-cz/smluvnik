'use server'

import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return supabase
}

export async function adminUpdateProfile(userId: string, data: {
  plan?: string
  role?: string
  custom_contract_limit?: number | null
  custom_storage_mb?: number | null
  notes?: string | null
  ai_until?: string | null
  addon_ai?: boolean
  addon_storage_contracts?: boolean
  subscription_type?: string | null
  subscription_expires_at?: string | null
}) {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
  if (error) throw error
}

export async function adminSaveSettings(entries: { key: string; value: string }[]) {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('app_settings')
    .upsert(entries)
  if (error) throw error
}
