'use client'

import { TrendingUp, FileText, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { Contract } from '@/lib/types/database'
import { CONTRACT_CATEGORIES } from '@/lib/types/database'

interface DashboardStatsProps {
  contracts: Contract[]
}

export function DashboardStats({ contracts }: DashboardStatsProps) {
  const now = new Date()
  const totalMonthly = contracts.reduce((sum, c) => sum + (c.monthly_payment || 0), 0)
  const active = contracts.filter(c => !c.valid_until || new Date(c.valid_until) > now)
  const expiring = contracts.filter(c => {
    if (!c.valid_until) return false
    const days = Math.ceil((new Date(c.valid_until).getTime() - now.getTime()) / 86400000)
    return days > 0 && days <= (c.notification_days_before || 45)
  })

  const catCounts: Record<string, number> = {}
  contracts.forEach(c => {
    catCounts[c.category] = (catCounts[c.category] || 0) + 1
  })
  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const stats = [
    {
      label: 'Měsíční náklady',
      value: totalMonthly > 0 ? `${totalMonthly.toLocaleString('cs-CZ')} Kč` : '—',
      icon: TrendingUp,
      color: 'bg-navy-900 text-white',
      iconBg: 'bg-white/10',
      iconColor: 'text-white',
    },
    {
      label: 'Aktivní smlouvy',
      value: active.length,
      icon: FileText,
      color: 'bg-white text-navy-900 border border-navy-100',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      label: 'Blíží se expirace',
      value: expiring.length,
      icon: AlertTriangle,
      color: expiring.length > 0 ? 'bg-orange-50 text-navy-900 border border-orange-200' : 'bg-white text-navy-900 border border-navy-100',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Celkem smluv',
      value: contracts.length,
      icon: CheckCircle,
      color: 'bg-white text-navy-900 border border-navy-100',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card
              key={i}
              className={`rounded-2xl p-5 shadow-sm animate-slide-up-${i + 1} ${stat.color}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${stat.iconBg}`}>
                <Icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
              <p className="text-3xl font-bold font-display mb-1">{stat.value}</p>
              <p className={`text-xs font-medium ${stat.color.includes('navy-900 text-white') ? 'text-navy-300' : 'text-navy-500'}`}>
                {stat.label}
              </p>
            </Card>
          )
        })}
      </div>

      {topCategories.length > 0 && (
        <Card className="rounded-2xl p-6 animate-slide-up-5">
          <h3 className="text-sm font-semibold text-navy-700 mb-4">Rozdělení podle kategorií</h3>
          <div className="space-y-2">
            {topCategories.map(([cat, count]) => {
              const catDef = CONTRACT_CATEGORIES.find(c => c.value === cat)
              const pct = Math.round((count / contracts.length) * 100)
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-base">{catDef?.icon || '📄'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-navy-700">{catDef?.label || cat}</span>
                      <span className="text-navy-400">{count}</span>
                    </div>
                    <div className="h-1.5 bg-navy-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
