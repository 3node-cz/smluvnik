'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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

/** Veřejná akce — ověří flag registrací bez auth */
export async function checkRegistrationEnabled(): Promise<boolean> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await serviceClient
    .from('app_settings')
    .select('value')
    .eq('key', 'registration_enabled')
    .single()
  return data?.value !== 'false'
}

const VALID_PLANS = ['free', 'pro', 'business'] as const
const VALID_ROLES = ['user', 'admin'] as const

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
  // Allowlist pro plan a role
  if (data.plan !== undefined && !VALID_PLANS.includes(data.plan as typeof VALID_PLANS[number])) {
    throw new Error(`Neplatný plán: ${data.plan}`)
  }
  if (data.role !== undefined && !VALID_ROLES.includes(data.role as typeof VALID_ROLES[number])) {
    throw new Error(`Neplatná role: ${data.role}`)
  }

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
