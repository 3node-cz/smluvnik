'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteDocument(docId: string, filePath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.storage.from('contracts').remove([filePath])
  const { error } = await supabase.from('contract_documents').delete().eq('id', docId)
  if (error) throw error
}
