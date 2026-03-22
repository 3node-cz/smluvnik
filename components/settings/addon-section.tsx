'use client'

import { ShoppingCart, Sparkles, Package } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'

export function AddonSection() {
  const { profile } = useApp()

  const isStartYearly =
    (profile.plan === 'free' || profile.plan === 'start') &&
    profile.subscription_type === 'yearly'
  const isStartMonthly =
    (profile.plan === 'free' || profile.plan === 'start') &&
    profile.subscription_type !== 'yearly'

  const addonAi = profile.addon_ai === true
  const addonStorageContracts = profile.addon_storage_contracts === true
  const subscriptionExpires = profile.subscription_expires_at
    ? new Date(profile.subscription_expires_at).toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  if (!isStartYearly && !isStartMonthly) return null

  return (
    <>
      {/* Doplnkove sluzby (rocni Start) */}
      {isStartYearly && (
        <div className="rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 p-6 border-2 border-teal-100 space-y-5">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-teal-600" /> Doplnkove sluzby
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Rozsirte plan Start o premiove funkce. Kazda sluzba stoji jednorazove{' '}
              <strong>50 Kc</strong> a je platna
              {subscriptionExpires ? (
                <>
                  {' '}
                  do konce vaseho tarifu &mdash; <strong>{subscriptionExpires}</strong>.
                </>
              ) : (
                <> po dobu trvani vaseho rocniho tarifu.</>
              )}
            </p>
            <p className="text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mt-2">
              Pokud si dokoupite sluzbu dnes, bude platna do konce aktualniho tarifu &mdash; ne
              cely rok od zakoupeni.
            </p>
          </div>

          {/* Doplnek 1 - AI cteni */}
          <div
            className={`rounded-xl border p-4 flex items-start gap-4 transition-colors ${
              addonAi ? 'bg-teal-50 border-teal-200' : 'bg-background border-border'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                addonAi ? 'bg-teal-100' : 'bg-muted'
              }`}
            >
              <Sparkles className={`w-5 h-5 ${addonAi ? 'text-teal-600' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-foreground text-sm">AI cteni dokumentu</span>
                {addonAi ? (
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                    Aktivni
                  </span>
                ) : (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    50 Kc jednorazove
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nahrajte PDF &mdash; AI automaticky vytahne poskytovatele, datum expirace a vysi
                platby. Zadne rucni opisovani.
              </p>
              {addonAi && subscriptionExpires && (
                <p className="text-xs text-teal-600 mt-1.5 font-medium">
                  Platne do: {subscriptionExpires}
                </p>
              )}
            </div>
            {!addonAi && (
              <Button
                variant="default"
                size="sm"
                className="flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() =>
                  alert(
                    'Platba bude brzy dostupna pres Stripe.\n\nPro okamzitou aktivaci napiste na info@smluvnik.cz'
                  )
                }
              >
                Zakoupit
              </Button>
            )}
          </div>

          {/* Doplnek 2 - +5 smluv + 35 MB */}
          <div
            className={`rounded-xl border p-4 flex items-start gap-4 transition-colors ${
              addonStorageContracts ? 'bg-teal-50 border-teal-200' : 'bg-background border-border'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                addonStorageContracts ? 'bg-teal-100' : 'bg-muted'
              }`}
            >
              <Package
                className={`w-5 h-5 ${
                  addonStorageContracts ? 'text-teal-600' : 'text-muted-foreground'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-foreground text-sm">
                  +5 smluv &amp; +35 MB uloziste
                </span>
                {addonStorageContracts ? (
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                    Aktivni
                  </span>
                ) : (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    50 Kc jednorazove
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Navysi limit smluv z 5 na 10 a uloziste z 15 MB na 50 MB. Idealni pokud
                potrebujete jen trochu vic prostoru.
              </p>
              {addonStorageContracts && subscriptionExpires && (
                <p className="text-xs text-teal-600 mt-1.5 font-medium">
                  Platne do: {subscriptionExpires}
                </p>
              )}
            </div>
            {!addonStorageContracts && (
              <Button
                variant="default"
                size="sm"
                className="flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() =>
                  alert(
                    'Platba bude brzy dostupna pres Stripe.\n\nPro okamzitou aktivaci napiste na info@smluvnik.cz'
                  )
                }
              >
                Zakoupit
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground pt-1">
            Online platba pres Stripe bude brzy k dispozici. Do te doby kontaktujte{' '}
            <strong>info@smluvnik.cz</strong> &mdash; aktivace do 24 hodin.
          </p>
        </div>
      )}

      {/* Info pro mesicni Start - doplnky nedostupne */}
      {isStartMonthly && (
        <div className="rounded-xl bg-muted p-6 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" /> Doplnkove sluzby
          </h3>
          <p className="text-sm text-muted-foreground">
            Doplnkove sluzby (AI cteni a rozsireni limitu) jsou dostupne pouze pri{' '}
            <strong>rocnim predplatnem planu Start</strong>. Prejdete na rocni platbu a odemknete
            moznost dokoupeni za vyhodnou cenu.
          </p>
          <Button variant="outline">Zobrazit rocni plany &rarr;</Button>
        </div>
      )}
    </>
  )
}
