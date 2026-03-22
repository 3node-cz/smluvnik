'use client'

import { AlertTriangle, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Contract } from '@/lib/types/database'
import { CONTRACT_CATEGORIES } from '@/lib/types/database'

interface NotificationListProps {
  contracts: Contract[]
  onContractClick?: (contract: Contract) => void
}

export function NotificationList({ contracts, onContractClick }: NotificationListProps) {
  const now = new Date()

  const getContractStatus = (c: Contract) => {
    if (!c.valid_until) return 'no-date'
    const days = Math.ceil((new Date(c.valid_until).getTime() - now.getTime()) / 86400000)
    if (days < 0) return 'expired'
    if (days <= (c.notification_days_before || 45)) return 'expiring'
    return 'ok'
  }

  const expired = contracts.filter(c => getContractStatus(c) === 'expired')
  const expiring = contracts.filter(c => getContractStatus(c) === 'expiring')
  const ok = contracts.filter(c => getContractStatus(c) === 'ok')

  const getDaysText = (c: Contract) => {
    if (!c.valid_until) return ''
    const days = Math.ceil((new Date(c.valid_until).getTime() - now.getTime()) / 86400000)
    if (days < 0) return `Vypršela před ${Math.abs(days)} dny`
    if (days === 0) return 'Vyprší dnes!'
    if (days === 1) return 'Vyprší zítra'
    return `Vyprší za ${days} dní`
  }

  const ContractRow = ({ c, status }: { c: Contract; status: string }) => {
    const catDef = CONTRACT_CATEGORIES.find(x => x.value === c.category)
    return (
      <div
        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${
          status === 'expired' ? 'bg-red-50 border-red-200' :
          status === 'expiring' ? 'bg-orange-50 border-orange-200' :
          'bg-white border-navy-100'
        }`}
        onClick={() => onContractClick?.(c)}
      >
        <span className="text-2xl">{catDef?.icon || '📄'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy-900 text-sm">{c.provider}</p>
          <p className="text-xs text-navy-500">{catDef?.label}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {c.valid_until && (
            <>
              <p className={`text-xs font-semibold ${status === 'expired' ? 'text-red-600' : status === 'expiring' ? 'text-orange-600' : 'text-green-600'}`}>
                {getDaysText(c)}
              </p>
              <p className="text-xs text-navy-400 flex items-center gap-1 justify-end mt-0.5">
                <Calendar className="w-3 h-3" />
                {new Date(c.valid_until).toLocaleDateString('cs-CZ')}
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-navy-900">Upozornění</h2>
        <Badge variant="secondary">
          {expired.length + expiring.length} vyžaduje pozornost
        </Badge>
      </div>

      {expired.length === 0 && expiring.length === 0 && (
        <Card className="rounded-2xl text-center py-16 px-4">
          <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-navy-900 mb-1">Vše v pořádku</h3>
          <p className="text-navy-500 text-sm">Žádné smlouvy nevyžadují okamžitou pozornost</p>
        </Card>
      )}

      {expired.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-navy-800 text-sm">Vypršelé smlouvy ({expired.length})</h3>
          </div>
          {expired.map(c => <ContractRow key={c.id} c={c} status="expired" />)}
        </div>
      )}

      {expiring.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-navy-800 text-sm">Blíží se expirace ({expiring.length})</h3>
          </div>
          {expiring.map(c => <ContractRow key={c.id} c={c} status="expiring" />)}
        </div>
      )}

      {ok.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold text-navy-800 text-sm">Aktivní smlouvy ({ok.length})</h3>
          </div>
          {ok.map(c => <ContractRow key={c.id} c={c} status="ok" />)}
        </div>
      )}
    </div>
  )
}
