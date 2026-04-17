'use server'

import { createClient } from '@/lib/supabase/server'

export async function addSupplierNote(provider: string, note: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (!provider.trim() || provider.length > 200) throw new Error('Neplatný název dodavatele.')
  if (!note.trim() || note.length > 2000) throw new Error('Poznámka musí mít 1–2000 znaků.')

  const { error } = await supabase.from('supplier_notes').insert({
    user_id: user.id,
    provider,
    note,
  })

  if (error) throw error
}

export async function deleteSupplierNote(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('supplier_notes').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw error
}
