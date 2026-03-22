import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppProvider } from '@/lib/context'
import { Sidebar } from '@/components/shared/sidebar'

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

  return (
    <AppProvider value={{ user, profile, appSettings }}>
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
