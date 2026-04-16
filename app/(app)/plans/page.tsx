'use client'

import { Check, X, Zap, Star, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApp } from '@/lib/context'
import { toast } from 'sonner'

const plans = [
  {
    id: 'free',
    name: 'Start',
    icon: Zap,
    price: '19',
    period: '/měsíc',
    yearlyPrice: '190',
    yearlySaving: '38',
    color: 'ring-navy-200',
    iconBg: 'bg-navy-100',
    iconColor: 'text-navy-600',
    badgeVariant: 'secondary' as const,
    highlight: false,
    visible: true,
    features: [
      '5 smluv',
      '15 MB úložiště',
      'Kategorie smluv',
      'Přehled výdajů',
      'Přehled dodavatelů',
      'Grafické upozornění na expiraci',
    ],
    missing: [
      'AI čtení dokumentů',
      'Emailová upozornění',
      'Export smluv',
    ],
  },
  {
    id: 'pro',
    name: 'Jistota',
    icon: Star,
    price: '99',
    period: '/měsíc',
    yearlyPrice: '990',
    yearlySaving: '198',
    color: 'ring-teal-400',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    badgeVariant: 'default' as const,
    highlight: true,
    visible: true,
    features: [
      'Neomezené smlouvy',
      'Neomezené úložiště',
      'Kategorie smluv',
      'Přehled výdajů',
      'Přehled dodavatelů',
      'Grafické upozornění na expiraci',
      '✨ AI čtení dokumentů',
      '📧 Emailová upozornění před expirací',
      '📤 Export smluv',
    ],
    missing: [],
  },
  {
    id: 'business',
    name: 'Business',
    icon: Building2,
    price: '259',
    period: '/měsíc',
    yearlyPrice: '2 590',
    yearlySaving: '518',
    color: 'ring-navy-700',
    iconBg: 'bg-navy-800',
    iconColor: 'text-white',
    badgeVariant: 'default' as const,
    highlight: false,
    visible: false,
    features: [
      'Neomezené smlouvy',
      'Neomezené úložiště',
      'AI čtení dokumentů',
      'Emailová upozornění',
      'Export smluv',
      'Dedikovaná podpora',
    ],
    missing: [],
  },
]

export default function PlansPage() {
  const { profile } = useApp()
  const currentPlan = profile.plan ?? 'free'
  const isAdmin = profile.role === 'admin'
  const activePlan = isAdmin ? 'pro' : currentPlan
  const visiblePlans = plans.filter(p => p.visible)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-navy-900 font-display">Plány a ceny</h1>
        <p className="text-navy-500 text-sm mt-1">Vyberte plán který vám nejlépe vyhovuje</p>
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-2xl px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🎁</span>
        <div>
          <p className="font-semibold text-teal-800">7 dní zdarma u každého plánu</p>
          <p className="text-sm text-teal-600">Vyzkoušejte bez závazků a bez zadání platební karty.</p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full max-w-3xl mt-4">
          {visiblePlans.map(plan => {
            const Icon = plan.icon
            const isCurrent = activePlan === plan.id
            return (
              <Card
                key={plan.id}
                className={`relative overflow-visible border-2 ${plan.highlight ? 'border-teal-400 shadow-lg shadow-teal-100' : 'border-navy-200'} rounded-2xl p-6`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs px-4 py-1 rounded-full font-semibold whitespace-nowrap">
                    Nejoblíbenější
                  </div>
                )}
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl ${plan.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                    </div>
                    <div>
                      <h2 className="font-bold text-navy-900 text-lg">{plan.name}</h2>
                      <Badge variant={plan.badgeVariant}>{plan.name}</Badge>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-navy-900">{plan.price} Kč</span>
                      <span className="text-navy-400 text-sm">{plan.period}</span>
                    </div>
                    <p className="text-xs text-teal-600 mt-1">nebo {plan.yearlyPrice} Kč/rok — ušetříte {plan.yearlySaving} Kč</p>
                    <p className="text-xs text-navy-400 mt-1">7 dní zdarma, pak se teprve účtuje</p>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-navy-700">
                        <Check className="w-4 h-4 text-teal-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                    {plan.missing.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-navy-300">
                        <X className="w-4 h-4 text-navy-200 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    disabled={isCurrent}
                    variant={plan.highlight ? 'default' : 'secondary'}
                    className="w-full justify-center"
                    onClick={() => !isCurrent && toast.info('Platební brána bude brzy k dispozici. Napište nám na info@smluvnik.cz.')}
                  >
                    {isCurrent ? 'Aktuální plán' : 'Začít zdarma'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
