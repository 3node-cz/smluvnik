import { createClient } from '@/lib/supabase/server'
import { SupplierList } from '@/components/suppliers/supplier-list'
import type { Contract } from '@/lib/types/database'

export default async function SuppliersPage() {
  const supabase = await createClient()

  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: notes } = await supabase
    .from('supplier_notes')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <SupplierList
      contracts={(contracts as Contract[]) || []}
      initialNotes={notes || []}
    />
  )
}
