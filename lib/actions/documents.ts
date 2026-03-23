'use server'

import { createClient } from '@/lib/supabase/server'

export async function deleteDocument(docId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify ownership and get file path from DB — never trust client-supplied paths
  const { data: doc } = await supabase
    .from('contract_documents')
    .select('file_path')
    .eq('id', docId)
    .eq('user_id', user.id)
    .single()

  if (!doc) throw new Error('Document not found')

  await supabase.storage.from('contracts').remove([doc.file_path])
  const { error } = await supabase
    .from('contract_documents')
    .delete()
    .eq('id', docId)
    .eq('user_id', user.id)
  if (error) throw error
}
