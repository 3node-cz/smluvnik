'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context'
import { updateProfile } from '@/lib/actions/profile'
import { deleteAccount } from '@/lib/actions/profile'
import {
  Save,
  User,
  Bell,
  Clock,
  Trash2,
  Lock,
  Shield,
  QrCode,
  AlertTriangle as AlertTriangleIcon,
  CheckCircle as CheckCircleIcon,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { AddonSection } from '@/components/settings/addon-section'

export function SettingsForm() {
  const router = useRouter()
  const { user, profile } = useApp()

  const [fullName, setFullName] = useState(profile.full_name || '')
  const [notificationEmail, setNotificationEmail] = useState(
    profile.notification_email || user.email || ''
  )
  const [defaultDays, setDefaultDays] = useState(profile.default_notification_days || 45)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSent, setPasswordSent] = useState(false)

  // 2FA
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaStep, setMfaStep] = useState<'idle' | 'setup' | 'verify' | 'disable'>('idle')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [mfaSuccess, setMfaSuccess] = useState('')

  useEffect(() => {
    checkMfa()
  }, [])

  const checkMfa = async () => {
    const supabase = createClient()
    const { data } = await supabase.auth.mfa.listFactors()
    if (data?.totp && data.totp.length > 0) {
      const verified = data.totp.find((f) => f.status === 'verified')
      if (verified) {
        setMfaEnabled(true)
        setFactorId(verified.id)
      }
    }
  }

  const handleEnableMfa = async () => {
    setMfaLoading(true)
    setMfaError('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Smluvník',
      })
      if (error) throw error
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setFactorId(data.id)
      setMfaStep('setup')
    } catch (err: unknown) {
      setMfaError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleVerifyMfa = async () => {
    setMfaLoading(true)
    setMfaError('')
    try {
      const supabase = createClient()
      const challenge = await supabase.auth.mfa.challenge({ factorId })
      if (challenge.error) throw challenge.error
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: totpCode,
      })
      if (error) throw error
      setMfaEnabled(true)
      setMfaStep('idle')
      setTotpCode('')
      setMfaSuccess('Dvoufaktorové ověření bylo úspěšně zapnuto.')
      setTimeout(() => setMfaSuccess(''), 4000)
    } catch {
      setMfaError('Nesprávný kód. Zkuste znovu.')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleDisableMfa = async () => {
    setMfaLoading(true)
    setMfaError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) throw error
      setMfaEnabled(false)
      setFactorId('')
      setMfaStep('idle')
      setTotpCode('')
      setMfaSuccess('Dvoufaktorové ověření bylo vypnuto.')
      setTimeout(() => setMfaSuccess(''), 4000)
    } catch (err: unknown) {
      setMfaError(err instanceof Error ? err.message : 'Nastala chyba')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateProfile({
        full_name: fullName,
        notification_email: notificationEmail,
        default_notification_days: defaultDays,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setPasswordLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo: `${window.location.origin}/callback?type=recovery`,
      })
      setPasswordSent(true)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await deleteAccount()
      router.push('/login')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Nastavení</h2>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Profil */}
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" /> Profil
            </h3>
            <div>
              <Label className="mb-1.5">Celé jméno</Label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jan Novák"
              />
            </div>
            <div>
              <Label className="mb-1.5">Přihlašovací email</Label>
              <Input type="email" value={user.email || ''} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground mt-1">
                Přihlašovací email nelze změnit zde
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upozornění */}
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-600" /> Upozornění
            </h3>
            <div>
              <Label className="mb-1.5">Email pro upozornění na expirace</Label>
              <Input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="vas@email.cz"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Na tento email budete dostávat upozornění před expirací smluv
              </p>
            </div>
            <div>
              <Label className="mb-1.5">Výchozí doba upozornění (dny před expirací)</Label>
              <Input
                type="number"
                value={defaultDays}
                onChange={(e) => setDefaultDays(parseInt(e.target.value) || 45)}
                min={1}
                max={365}
              />
            </div>
          </CardContent>
        </Card>

        {/* Heslo */}
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-600" /> Heslo
            </h3>
            <p className="text-sm text-muted-foreground">
              Zašleme vám email s odkazem pro změnu hesla.
            </p>
            {passwordSent ? (
              <p className="text-sm text-teal-600 font-medium">
                Email odeslán &ndash; zkontrolujte schránku
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handlePasswordReset}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    Odesílám...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Změnit heslo
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Jak fungují emailové upozornění */}
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" /> Jak fungují emailové upozornění
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                Upozornění jsou odesílána automaticky pomocí Supabase Edge Functions (cron job)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                Každá smlouva může mít vlastní email a dobu upozornění
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                Výchozí je {defaultDays} dní před expirací
              </li>
            </ul>
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white">
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Ukládám...
            </>
          ) : saved ? (
            'Uloženo'
          ) : (
            <>
              <Save className="w-4 h-4" /> Uložit nastavení
            </>
          )}
        </Button>
      </form>

      {/* Doplňkové služby */}
      <AddonSection />

      {/* 2FA sekce */}
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600" /> Dvoufaktorové ověření (2FA)
            {mfaEnabled && (
              <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                Zapnuto
              </span>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Zvyšte bezpečnost svého účtu pomocí autentizační aplikace (Google Authenticator, Apple
            Passwords apod.).
          </p>

          {mfaError && (
            <Alert variant="destructive">
              <AlertTriangleIcon className="w-4 h-4" />
              <AlertDescription>{mfaError}</AlertDescription>
            </Alert>
          )}
          {mfaSuccess && (
            <Alert>
              <CheckCircleIcon className="w-4 h-4 text-teal-600" />
              <AlertDescription className="text-teal-700">{mfaSuccess}</AlertDescription>
            </Alert>
          )}

          {mfaStep === 'idle' && !mfaEnabled && (
            <Button variant="outline" onClick={handleEnableMfa} disabled={mfaLoading}>
              {mfaLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  Načítám...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" /> Zapnout 2FA
                </>
              )}
            </Button>
          )}

          {mfaStep === 'setup' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Naskenujte QR kód v autentizační aplikaci:
              </p>
              {qrCode && (
                <div className="flex justify-center">
                  <img
                    src={qrCode}
                    alt="QR kód pro 2FA"
                    className="w-48 h-48 border border-border rounded-xl p-2"
                  />
                </div>
              )}
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Nebo zadejte kód manuálně:</p>
                <p className="text-sm font-mono text-foreground break-all">{secret}</p>
              </div>
              <div>
                <Label className="mb-1.5">Zadejte 6místný kód z aplikace</Label>
                <Input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleVerifyMfa}
                  disabled={mfaLoading || totpCode.length !== 6}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {mfaLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Ověřuji...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" /> Ověřit a zapnout
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMfaStep('idle')
                    setTotpCode('')
                    setMfaError('')
                  }}
                >
                  Zrušit
                </Button>
              </div>
            </div>
          )}

          {mfaStep === 'idle' && mfaEnabled && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setMfaStep('disable')}
            >
              <Shield className="w-4 h-4" /> Vypnout 2FA
            </Button>
          )}

          {mfaStep === 'disable' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-red-700">
                Opravdu chcete vypnout 2FA? Váš účet bude méně chráněný.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={handleDisableMfa}
                  disabled={mfaLoading}
                >
                  {mfaLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Vypínám...
                    </>
                  ) : (
                    'Ano, vypnout 2FA'
                  )}
                </Button>
                <Button variant="outline" onClick={() => setMfaStep('idle')}>
                  Zrušit
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smazat účet */}
      <Card className="border-2 border-red-100">
        <CardContent className="space-y-4">
          <h3 className="font-semibold text-red-700 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Smazat účet
          </h3>
          <p className="text-sm text-muted-foreground">
            Trvale smaže váš účet, všechny smlouvy a přílohy. Tuto akci nelze vrátit zpět.
          </p>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" /> Smazat účet
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Opravdu chcete smazat účet?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tato akce je nevratná. Budou smazány všechny vaše smlouvy, přílohy a data účtu.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Mažu...
                    </>
                  ) : (
                    'Ano, smazat účet'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
