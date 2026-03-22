import { createClient } from '@/lib/supabase/server'
import { AppProvider } from '@/lib/context'
import { Sidebar } from '@/components/shared/sidebar'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { LandingPage } from '@/components/landing/landing-page'
import type { Contract } from '@/lib/types/database'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <LandingPage />

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return <LandingPage />

  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false })

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
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-navy-900 font-display">Smlouvy</h1>
                <p className="text-navy-500 text-sm mt-1">{(contracts || []).length} smluv celkem</p>
              </div>
              <DashboardStats contracts={(contracts as Contract[]) || []} />
              {/* ContractList will be added in Task 7 */}
              {(contracts || []).length === 0 && (
                <div className="bg-white rounded-2xl border border-navy-100 p-6 text-center py-20">
                  <h3 className="text-xl font-bold text-navy-900 mb-2">Zatím žádné smlouvy</h3>
                  <p className="text-navy-500 mb-8">Přidejte svou první smlouvu a začněte mít přehled</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AppProvider>
  )
}
