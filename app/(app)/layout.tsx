import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppProvider } from '@/lib/context'
import { Sidebar } from '@/components/shared/sidebar'
import type { Contract } from '@/lib/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: settingsData } = await supabase.from('app_settings').select('*')
  const appSettings: Record<string, string> = {}
  settingsData?.forEach((s: { key: string; value: string }) => {
    appSettings[s.key] = s.value
  })

  const { data: contracts } = await supabase
    .from('contracts')
    .select('valid_until,notification_days_before')

  const typedContracts = (contracts as Pick<Contract, 'valid_until' | 'notification_days_before'>[]) || []
  const expiring = typedContracts.filter(c => {
    if (!c.valid_until) return false
    const days = Math.ceil((new Date(c.valid_until).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= (c.notification_days_before || 45)
  })
  const expired = typedContracts.filter(c => c.valid_until && new Date(c.valid_until) < new Date())
  const alertCount = expiring.length + expired.length

  return (
    <AppProvider value={{ user, profile, appSettings, alertCount }}>
      <div className="min-h-screen bg-navy-50 flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </AppProvider>
  )
}
