import { createClient } from '@/lib/supabase/server'
import { NotificationList } from '@/components/notifications/notification-list'
import type { Contract } from '@/lib/types/database'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .order('valid_until', { ascending: true })

  return <NotificationList contracts={(contracts as Contract[]) || []} />
}
