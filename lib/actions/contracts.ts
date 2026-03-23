'use server'

import { createClient } from '@/lib/supabase/server'
import type { Contract } from '@/lib/types/database'

// Only these fields can be set by the user
const ALLOWED_FIELDS: (keyof Contract)[] = [
  'category', 'custom_category', 'provider', 'contract_number',
  'monthly_payment', 'payment_frequency', 'unit_price_low', 'unit_price_high', 'fixed_fee',
  'valid_from', 'valid_until', 'notification_days_before', 'notification_email',
  'auto_renewal', 'contact_phone', 'contact_email', 'notes',
  'file_path', 'file_name', 'file_size', 'file_type', 'gemini_extracted',
]

function pickAllowed(data: Partial<Contract>): Partial<Contract> {
  const result: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in data) {
      result[key] = data[key] === '' ? null : data[key]
    }
  }
  return result as Partial<Contract>
}

export async function addContract(contractData: Partial<Contract>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const cleaned = pickAllowed(contractData)

  const { error } = await supabase
    .from('contracts')
    .insert([{ ...cleaned, user_id: user.id }])

  if (error) throw error
}

export async function updateContract(id: string, contractData: Partial<Contract>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const cleaned = pickAllowed(contractData)

  const { error } = await supabase
    .from('contracts')
    .update(cleaned)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function deleteContract(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get contract + additional document file paths (scoped to user)
  const { data: contract } = await supabase
    .from('contracts')
    .select('file_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!contract) throw new Error('Contract not found')

  const { data: docs } = await supabase
    .from('contract_documents')
    .select('file_path')
    .eq('contract_id', id)

  const filePaths = [
    ...(contract?.file_path ? [contract.file_path] : []),
    ...(docs?.map(d => d.file_path) || []),
  ]

  if (filePaths.length > 0) {
    await supabase.storage.from('contracts').remove(filePaths)
  }

  await supabase.from('contract_documents').delete().eq('contract_id', id)
  const { error } = await supabase.from('contracts').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw error
}
