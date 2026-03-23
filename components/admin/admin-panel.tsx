'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Users, Shield, RefreshCw, FileText, HardDrive, Sparkles,
  CheckCircle, XCircle, Settings, Save,
  Edit2, Mail, Package, Activity, AlertTriangle, Loader2,
} from 'lucide-react'

// ── Types ──

interface UserRow {
  id: string
  email: string
  full_name?: string
  plan: string
  role: string
  created_at: string
  contract_count: number
  storage_used: number
  ai_until?: string | null
  custom_contract_limit?: number | null
  custom_storage_mb?: number | null
  notes?: string | null
  addon_ai?: boolean
  addon_storage_contracts?: boolean
  subscription_type?: string | null
  subscription_expires_at?: string | null
}

interface AiStats {
  total_calls: number
  successful_calls: number
  failed_calls: number
  calls_today: number
}

interface AppSettingsState {
  free_storage_mb: string
  free_contracts_limit: string
  pro_contracts_limit: string
  ai_enabled: string
  registration_enabled: string
  resend_api_key?: string
}

interface ResendStats {
  sent_today: number
  sent_month: number
  daily_limit: number
  monthly_limit: number
}

// ── Helpers ──

function formatSize(bytes: number) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// ── Component ──

export function AdminPanel() {
  const router = useRouter()
  const { profile } = useApp()
  const supabase = createClient()

  const [users, setUsers] = useState<UserRow[]>([])
  const [aiStats, setAiStats] = useState<AiStats | null>(null)
  const [settings, setSettings] = useState<AppSettingsState>({
    free_storage_mb: '15',
    free_contracts_limit: '5',
    pro_contracts_limit: '15',
    ai_enabled: 'true',
    registration_enabled: 'true',
  })
  const [resendStats, setResendStats] = useState<ResendStats | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at_desc')
  const [search, setSearch] = useState('')

  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [editData, setEditData] = useState<Partial<UserRow>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editSaved, setEditSaved] = useState(false)
  const [aiDays, setAiDays] = useState<string>('7')

  // Guard: if not admin, don't render
  if (profile.role !== 'admin') return null

  const loadResendStats = async () => {
    setResendLoading(true)
    try {
      const res = await fetch('/api/admin/resend-stats')
      if (res.ok) {
        const data = await res.json()
        const emails = data.data || []
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const sentToday = emails.filter((e: { created_at: string }) =>
          new Date(e.created_at) >= todayStart
        ).length
        const sentMonth = emails.filter((e: { created_at: string }) =>
          new Date(e.created_at) >= monthStart
        ).length

        setResendStats({
          sent_today: sentToday,
          sent_month: sentMonth,
          daily_limit: 100,
          monthly_limit: 3000,
        })
      }
    } catch (e) {
      console.error('Resend stats error:', e)
    } finally {
      setResendLoading(false)
    }
  }

  const loadData = async () => {
    setLoading(true)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!profiles) { setLoading(false); return }

    const { data: contractCounts } = await supabase.rpc('get_contract_counts')
    const { data: storageData } = await supabase.rpc('get_storage_usage')
    const { data: aiData } = await supabase.rpc('get_ai_usage_stats')
    const { data: settingsData } = await supabase.from('app_settings').select('*')

    const countMap: Record<string, number> = {}
    contractCounts?.forEach((c: { user_id: string; count: number }) => {
      countMap[c.user_id] = Number(c.count)
    })

    const storageMap: Record<string, number> = {}
    storageData?.forEach((s: { user_id: string; total_size: number }) => {
      storageMap[s.user_id] = Number(s.total_size)
    })

    setUsers(profiles.map((p: UserRow) => ({
      ...p,
      contract_count: countMap[p.id] || 0,
      storage_used: storageMap[p.id] || 0,
    })))

    if (aiData?.[0]) setAiStats(aiData[0])

    if (settingsData) {
      const map: Record<string, string> = {}
      settingsData.forEach((s: { key: string; value: string }) => { map[s.key] = s.value })
      setSettings(prev => ({ ...prev, ...map }))
      if (map.resend_api_key) {
        loadResendStats()
      }
    }

    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (user: UserRow) => {
    setEditingUser(user)
    setEditData({
      plan: user.plan,
      role: user.role,
      custom_contract_limit: user.custom_contract_limit,
      custom_storage_mb: user.custom_storage_mb,
      notes: user.notes,
      ai_until: user.ai_until,
      addon_ai: user.addon_ai,
      addon_storage_contracts: user.addon_storage_contracts,
      subscription_type: user.subscription_type,
      subscription_expires_at: user.subscription_expires_at,
    })
    setAiDays('7')
    setEditSaved(false)
  }

  const closeEdit = () => {
    setEditingUser(null)
    setEditData({})
  }

  const saveEdit = async () => {
    if (!editingUser) return
    setEditSaving(true)
    await supabase.from('profiles').update({
      plan: editData.plan,
      role: editData.role,
      custom_contract_limit: editData.custom_contract_limit || null,
      custom_storage_mb: editData.custom_storage_mb || null,
      notes: editData.notes || null,
      ai_until: editData.ai_until || null,
      addon_ai: editData.addon_ai ?? false,
      addon_storage_contracts: editData.addon_storage_contracts ?? false,
      subscription_type: editData.subscription_type || null,
      subscription_expires_at: editData.subscription_expires_at || null,
    }).eq('id', editingUser.id)

    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editData } : u))
    setEditSaving(false)
    setEditSaved(true)
    router.refresh()
    setTimeout(() => { setEditSaved(false); closeEdit() }, 1200)
  }

  const grantAi = (days: number) => {
    setEditData(prev => ({ ...prev, ai_until: addDays(days) }))
  }

  const revokeAi = () => {
    setEditData(prev => ({ ...prev, ai_until: null }))
  }

  const saveAllSettings = async () => {
    setSettingsSaving(true)
    await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        supabase.from('app_settings').upsert({ key, value })
      )
    )
    setSettingsSaving(false)
    setSettingsSaved(true)
    router.refresh()
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const filteredAndSorted = useMemo(() => {
    let result = [...users]
    if (filterPlan !== 'all') result = result.filter(u => (u.plan || 'free') === filterPlan)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(u =>
        u.email.toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'created_at_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'created_at_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'contracts_desc': return b.contract_count - a.contract_count
        case 'contracts_asc': return a.contract_count - b.contract_count
        case 'storage_desc': return b.storage_used - a.storage_used
        case 'storage_asc': return a.storage_used - b.storage_used
        case 'email_asc': return a.email.localeCompare(b.email)
        default: return 0
      }
    })
    return result
  }, [users, filterPlan, sortBy, search])

  // Statistiky
  const totalUsers = users.length
  const freeUsers = users.filter(u => !u.plan || u.plan === 'free').length
  const proUsers = users.filter(u => u.plan === 'pro').length
  const businessUsers = users.filter(u => u.plan === 'business').length
  const totalContracts = users.reduce((sum, u) => sum + u.contract_count, 0)
  const totalStorage = users.reduce((sum, u) => sum + u.storage_used, 0)
  const newThisWeek = users.filter(u => {
    const d = new Date(u.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return d > weekAgo
  }).length

  const planColor = (plan: string) => {
    if (plan === 'pro') return 'bg-teal-100 text-teal-700'
    if (plan === 'business') return 'bg-navy-800 text-white'
    return 'bg-navy-100 text-navy-500'
  }

  const planLabel = (plan: string) => {
    if (plan === 'pro') return 'Pro'
    if (plan === 'business') return 'Business'
    return 'Free'
  }

  const contractLimit = (user: UserRow) => {
    if (user.custom_contract_limit) return String(user.custom_contract_limit)
    if (user.plan === 'pro') return settings.pro_contracts_limit
    if (user.plan === 'business') return '\u221E'
    return settings.free_contracts_limit
  }

  const storageLimit = (user: UserRow) => {
    if (user.custom_storage_mb) return user.custom_storage_mb * 1024 * 1024
    if (user.plan === 'pro' || user.plan === 'business') return null
    return parseInt(settings.free_storage_mb) * 1024 * 1024
  }

  const aiSuccessRate = aiStats && aiStats.total_calls > 0
    ? Math.round((aiStats.successful_calls / aiStats.total_calls) * 100)
    : null

  const aiUntilActive = editData.ai_until && new Date(editData.ai_until) > new Date()

  return (
    <div className="space-y-8">

      {/* ── Edit user dialog ── */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) closeEdit() }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editace uživatele</DialogTitle>
            <DialogDescription>{editingUser?.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Plan & role */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Plán</label>
                <NativeSelect
                  value={editData.plan || 'free'}
                  onChange={e => setEditData(prev => ({ ...prev, plan: e.target.value }))}
                  className="w-full"
                >
                  <NativeSelectOption value="free">Free / Start</NativeSelectOption>
                  <NativeSelectOption value="pro">Pro / Jistota</NativeSelectOption>
                  <NativeSelectOption value="business">Business</NativeSelectOption>
                </NativeSelect>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Role</label>
                <NativeSelect
                  value={editData.role || 'user'}
                  onChange={e => setEditData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full"
                >
                  <NativeSelectOption value="user">User</NativeSelectOption>
                  <NativeSelectOption value="admin">Admin</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>

            {/* Subscription type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Typ předplatného</label>
                <NativeSelect
                  value={editData.subscription_type || 'monthly'}
                  onChange={e => setEditData(prev => ({ ...prev, subscription_type: e.target.value }))}
                  className="w-full"
                >
                  <NativeSelectOption value="monthly">Měsíční</NativeSelectOption>
                  <NativeSelectOption value="yearly">Roční</NativeSelectOption>
                </NativeSelect>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Vyprší</label>
                <Input
                  type="date"
                  value={editData.subscription_expires_at ? new Date(editData.subscription_expires_at).toISOString().split('T')[0] : ''}
                  onChange={e => setEditData(prev => ({ ...prev, subscription_expires_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                />
              </div>
            </div>

            {/* Add-on services */}
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Doplňkové služby (50 Kč/kus)</p>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  <span className="text-sm">AI čtení dokumentů</span>
                </div>
                <Switch
                  checked={editData.addon_ai ?? false}
                  onCheckedChange={(checked: boolean) => setEditData(prev => ({ ...prev, addon_ai: checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-teal-500" />
                  <span className="text-sm">+5 smluv & +35 MB úložiště</span>
                </div>
                <Switch
                  checked={editData.addon_storage_contracts ?? false}
                  onCheckedChange={(checked: boolean) => setEditData(prev => ({ ...prev, addon_storage_contracts: checked }))}
                />
              </div>
            </div>

            {/* Individual limits */}
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Individuální limity (přepíší globální)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Max smluv</label>
                  <Input
                    type="number"
                    placeholder={editingUser ? `výchozí: ${contractLimit(editingUser)}` : ''}
                    value={editData.custom_contract_limit || ''}
                    onChange={e => setEditData(prev => ({ ...prev, custom_contract_limit: e.target.value ? parseInt(e.target.value) : null }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Úložiště (MB)</label>
                  <Input
                    type="number"
                    placeholder={`výchozí: ${settings.free_storage_mb}`}
                    value={editData.custom_storage_mb || ''}
                    onChange={e => setEditData(prev => ({ ...prev, custom_storage_mb: e.target.value ? parseInt(e.target.value) : null }))}
                  />
                </div>
              </div>
            </div>

            {/* AI access */}
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI čtení — časový přístup (pro Free uživatele)</p>
              {aiUntilActive ? (
                <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-teal-700">Aktivní do</p>
                    <p className="text-xs text-teal-600">{new Date(editData.ai_until!).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <Button variant="destructive" size="xs" onClick={revokeAi}>Odebrat</Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">AI časový přístup není aktivní</p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm">Přidat AI na</span>
                <Input
                  type="number"
                  value={aiDays}
                  onChange={e => setAiDays(e.target.value)}
                  className="w-16 text-center"
                  min={1}
                />
                <span className="text-sm">dní</span>
                <Button size="sm" onClick={() => grantAi(parseInt(aiDays) || 7)}>Aktivovat</Button>
              </div>
              <div className="flex gap-2">
                {[7, 14, 30].map(d => (
                  <Button key={d} variant="outline" size="xs" onClick={() => { setAiDays(String(d)); grantAi(d) }}>
                    {d} dní
                  </Button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1 block">Interní poznámka</label>
              <textarea
                value={editData.notes || ''}
                onChange={e => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full h-8 min-h-[5rem] rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                rows={3}
                placeholder="Poznámky k uživateli (vidí jen admin)..."
              />
            </div>

            {/* User stats */}
            {editingUser && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-lg font-bold">{editingUser.contract_count}</p>
                  <p className="text-xs text-muted-foreground">Smluv</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-lg font-bold">{formatSize(editingUser.storage_used)}</p>
                  <p className="text-xs text-muted-foreground">Úložiště</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-lg font-bold">{new Date(editingUser.created_at).toLocaleDateString('cs-CZ')}</p>
                  <p className="text-xs text-muted-foreground">Registrace</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>Zrušit</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaved ? <><CheckCircle className="w-4 h-4" /> Uloženo</> : editSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Ukládám...</> : <><Save className="w-4 h-4" /> Uložit</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold">Admin panel</h1>
            <p className="text-xs text-muted-foreground">Přehled uživatelů, systému a limitů</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="w-4 h-4" /> Obnovit
        </Button>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-navy-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">Uživatelů celkem</p>
              <p className="text-xs text-muted-foreground mt-0.5">Free: {freeUsers} · Pro: {proUsers} · Biz: {businessUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{newThisWeek}</p>
              <p className="text-xs text-muted-foreground">Nových tento týden</p>
              <p className="text-xs text-muted-foreground mt-0.5">za posledních 7 dní</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalContracts}</p>
              <p className="text-xs text-muted-foreground">Smluv celkem</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatSize(totalStorage)}</p>
              <p className="text-xs text-muted-foreground">Úložiště celkem</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── System overview: Resend + AI ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Resend emails */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-500" />
              Resend — emaily
              {resendLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resendStats ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Dnes</span>
                  <span className="font-bold">{resendStats.sent_today} / {resendStats.daily_limit}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${resendStats.sent_today / resendStats.daily_limit > 0.8 ? 'bg-orange-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, (resendStats.sent_today / resendStats.daily_limit) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-muted-foreground">Tento měsíc</span>
                  <span className="font-bold">{resendStats.sent_month} / {resendStats.monthly_limit}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${resendStats.sent_month / resendStats.monthly_limit > 0.8 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, (resendStats.sent_month / resendStats.monthly_limit) * 100)}%` }}
                  />
                </div>
                {resendStats.sent_month / resendStats.monthly_limit > 0.7 && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                    <p className="text-xs text-orange-700">Blížíte se měsíčnímu limitu. Zvažte upgrade na placený plán Resend.</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{settings.resend_api_key ? 'Načítám...' : 'API klíč není nastaven v app_settings'}</p>
            )}
          </CardContent>
        </Card>

        {/* AI stats */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-500" />
              Gemini AI
              <Badge variant="secondary" className="ml-auto">1000 req/min</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiStats ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">{aiStats.total_calls}</p>
                    <p className="text-xs text-muted-foreground">Celkem</p>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-teal-700">{aiStats.calls_today}</p>
                    <p className="text-xs text-muted-foreground">Dnes</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <p className="text-xl font-bold text-green-700">{aiStats.successful_calls}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Úspěšných</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <XCircle className="w-3 h-3 text-red-400" />
                      <p className="text-xl font-bold text-red-600">{aiStats.failed_calls}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Chyb</p>
                  </div>
                </div>
                {aiSuccessRate !== null && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Úspěšnost</span>
                      <span>{aiSuccessRate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${aiSuccessRate >= 80 ? 'bg-teal-500' : aiSuccessRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${aiSuccessRate}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : <p className="text-sm text-muted-foreground">Zatím žádná data</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── App settings ── */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            Nastavení aplikace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Limity plánů</h3>
              <div>
                <label className="text-sm font-medium">Free/Start — úložiště (MB)</label>
                <Input
                  type="number"
                  value={settings.free_storage_mb}
                  onChange={e => setSettings(prev => ({ ...prev, free_storage_mb: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Free/Start — max smluv</label>
                <Input
                  type="number"
                  value={settings.free_contracts_limit}
                  onChange={e => setSettings(prev => ({ ...prev, free_contracts_limit: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Pro/Jistota — max smluv</label>
                <Input
                  type="number"
                  value={settings.pro_contracts_limit}
                  onChange={e => setSettings(prev => ({ ...prev, pro_contracts_limit: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Funkce</h3>
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div>
                  <p className="text-sm font-medium">AI čtení dokumentů</p>
                  <p className="text-xs text-muted-foreground">Globálně zapnout/vypnout Gemini AI</p>
                </div>
                <Switch
                  checked={settings.ai_enabled === 'true'}
                  onCheckedChange={(checked: boolean) => setSettings(prev => ({ ...prev, ai_enabled: checked ? 'true' : 'false' }))}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div>
                  <p className="text-sm font-medium">Nové registrace</p>
                  <p className="text-xs text-muted-foreground">Povolit/zakázat registraci nových uživatelů</p>
                </div>
                <Switch
                  checked={settings.registration_enabled === 'true'}
                  onCheckedChange={(checked: boolean) => setSettings(prev => ({ ...prev, registration_enabled: checked ? 'true' : 'false' }))}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={saveAllSettings} disabled={settingsSaving}>
              {settingsSaved ? <><CheckCircle className="w-4 h-4" /> Uloženo</> : settingsSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Ukládám...</> : <><Save className="w-4 h-4" /> Uložit nastavení</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── User table ── */}
      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold">{filteredAndSorted.length} z {users.length} uživatelů</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            <Input
              type="text"
              placeholder="Hledat email nebo jméno..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[180px]"
            />
            <NativeSelect value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
              <NativeSelectOption value="all">Všechny plány</NativeSelectOption>
              <NativeSelectOption value="free">Free / Start</NativeSelectOption>
              <NativeSelectOption value="pro">Pro / Jistota</NativeSelectOption>
              <NativeSelectOption value="business">Business</NativeSelectOption>
            </NativeSelect>
            <NativeSelect value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <NativeSelectOption value="created_at_desc">Registrace (nejnovější)</NativeSelectOption>
              <NativeSelectOption value="created_at_asc">Registrace (nejstarší)</NativeSelectOption>
              <NativeSelectOption value="contracts_desc">Smlouvy (nejvíce)</NativeSelectOption>
              <NativeSelectOption value="contracts_asc">Smlouvy (nejméně)</NativeSelectOption>
              <NativeSelectOption value="storage_desc">Úložiště (nejvíce)</NativeSelectOption>
              <NativeSelectOption value="storage_asc">Úložiště (nejméně)</NativeSelectOption>
              <NativeSelectOption value="email_asc">Email (A-Z)</NativeSelectOption>
            </NativeSelect>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Načítám...</div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Žádní uživatelé neodpovídají filtru</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Email</th>
                    <th className="text-left px-4 py-3 font-semibold">Plán</th>
                    <th className="text-left px-4 py-3 font-semibold">Předpl.</th>
                    <th className="text-left px-4 py-3 font-semibold">Doplňky</th>
                    <th className="text-left px-4 py-3 font-semibold">Smlouvy</th>
                    <th className="text-left px-4 py-3 font-semibold">Úložiště</th>
                    <th className="text-left px-4 py-3 font-semibold">AI</th>
                    <th className="text-left px-4 py-3 font-semibold">Registrace</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map(user => {
                    const limit = storageLimit(user)
                    const storagePercent = limit ? Math.min(100, Math.round((user.storage_used / limit) * 100)) : null
                    const aiActive = user.ai_until && new Date(user.ai_until) > new Date()
                    const isYearly = user.subscription_type === 'yearly'
                    return (
                      <tr key={user.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs">{user.email}</p>
                          {user.full_name && <p className="text-muted-foreground text-xs">{user.full_name}</p>}
                          {user.notes && <p className="text-orange-500 text-xs mt-0.5 truncate max-w-[160px]">{user.notes}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColor(user.plan)}`}>
                            {planLabel(user.plan)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isYearly
                            ? <Badge variant="secondary">Roční</Badge>
                            : <span className="text-xs text-muted-foreground">Měs.</span>
                          }
                          {user.subscription_expires_at && (
                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(user.subscription_expires_at).toLocaleDateString('cs-CZ')}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {user.addon_ai && <Badge variant="secondary">AI</Badge>}
                            {user.addon_storage_contracts && <Badge variant="secondary">+5/35</Badge>}
                            {!user.addon_ai && !user.addon_storage_contracts && <span className="text-xs text-muted-foreground">&mdash;</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">{user.contract_count}</span>
                          <span className="text-muted-foreground text-xs ml-1">/ {contractLimit(user)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 min-w-[100px]">
                            <span className={`text-xs font-medium ${storagePercent && storagePercent >= 90 ? 'text-orange-500' : ''}`}>
                              {formatSize(user.storage_used)}
                              {limit && <span className="text-muted-foreground font-normal"> / {user.custom_storage_mb || settings.free_storage_mb}MB</span>}
                              {!limit && <span className="text-muted-foreground font-normal"> / \u221E</span>}
                            </span>
                            {storagePercent !== null && (
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${storagePercent >= 90 ? 'bg-orange-500' : 'bg-teal-500'}`}
                                  style={{ width: `${storagePercent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {aiActive
                            ? <Badge variant="secondary">do {new Date(user.ai_until!).toLocaleDateString('cs-CZ')}</Badge>
                            : <span className="text-xs text-muted-foreground">&mdash;</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(user.created_at).toLocaleDateString('cs-CZ')}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(user)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
