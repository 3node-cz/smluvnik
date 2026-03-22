'use client'

import { TrendingUp, FileText, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import type { Contract } from '@/lib/types/database'

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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <Card key={i} size="sm" className={stat.color}>
            <CardHeader>
              <CardDescription className={stat.color.includes('text-white') ? 'text-navy-300' : ''}>
                {stat.label}
              </CardDescription>
              <CardTitle className={`text-2xl font-bold font-display tabular-nums ${stat.color.includes('text-white') ? 'text-white' : 'text-navy-900'}`}>
                {stat.value}
              </CardTitle>
              <CardAction>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.iconBg}`}>
                  <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}
