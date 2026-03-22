'use server'

import { createClient } from '@/lib/supabase/server'
import type { Contract } from '@/lib/types/database'

export async function addContract(contractData: Partial<Contract>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const cleaned = Object.fromEntries(
    Object.entries(contractData).map(([k, v]) => [k, v === '' ? null : v])
  )

  const { error } = await supabase
    .from('contracts')
    .insert([{ ...cleaned, user_id: user.id }])

  if (error) throw error
}

export async function updateContract(id: string, contractData: Partial<Contract>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('contracts')
    .update(contractData)
    .eq('id', id)

  if (error) throw error
}

export async function deleteContract(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get contract + additional document file paths
  const { data: contract } = await supabase
    .from('contracts')
    .select('file_path')
    .eq('id', id)
    .single()

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
  const { error } = await supabase.from('contracts').delete().eq('id', id)
  if (error) throw error
}
