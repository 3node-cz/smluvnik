import { createClient } from '@/lib/supabase/server'
import { NotificationsPageClient } from '@/components/notifications/notifications-page-client'
import type { Contract } from '@/lib/types/database'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .order('valid_until', { ascending: true })

  return <NotificationsPageClient contracts={(contracts as Contract[]) || []} />
}
