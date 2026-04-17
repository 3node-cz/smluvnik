'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { checkRegistrationEnabled } from '@/lib/actions/admin'
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

type AuthMode = 'login' | 'register' | 'reset' | 'check_email' | 'new_password' | 'mfa_verify'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = (searchParams.get('mode') as AuthMode) || 'login'

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState('')

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    // Pozn: loading se NERESSETUJE v finally — prohlížeč nás přesměruje na Google
    // a po návratu se stránka znovu načte. Reset loading by způsobil černou obrazovku.
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/callback` }
      })
      if (error) {
        setError('Přihlášení přes Google selhalo. Zkuste to znovu.')
        setLoading(false)
      }
      // při úspěchu necháme loading=true — prohlížeč naviguje na Google
    } catch {
      setError('Přihlášení přes Google selhalo. Zkuste to znovu.')
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setError('Váš email ještě nebyl ověřen. Zkontrolujte schránku a klikněte na odkaz.')
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Nesprávný email nebo heslo.')
        } else {
          setError(error.message)
        }
        return
      }
      if (data?.user) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const verified = factors?.totp?.find(f => f.status === 'verified')
        if (verified) {
          setMfaFactorId(verified.id)
          setMode('mfa_verify')
          return
        }
      }
      router.push('/')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (challenge.error) throw challenge.error
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      })
      if (error) {
        setError('Nesprávný kód. Zkuste znovu.')
      } else {
        router.push('/')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Heslo musí mít alespoň 8 znaků.'
    if (!/[A-Z]/.test(pwd)) return 'Heslo musí obsahovat alespoň jedno velké písmeno.'
    if (!/[a-z]/.test(pwd)) return 'Heslo musí obsahovat alespoň jedno malé písmeno.'
    if (!/[0-9]/.test(pwd)) return 'Heslo musí obsahovat alespoň jedno číslo.'
    if (!/[^A-Za-z0-9]/.test(pwd)) return 'Heslo musí obsahovat alespoň jeden speciální znak (např. !@#$%).'
    return null
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!agreed) {
      setError('Pro registraci musíte souhlasit s podmínkami použití a zásadami ochrany osobních údajů.')
      return
    }
    const pwdError = validatePassword(password)
    if (pwdError) {
      setError(pwdError)
      return
    }
    setLoading(true)
    try {
      const registrationOpen = await checkRegistrationEnabled()
      if (!registrationOpen) {
        setError('Registrace je momentálně pozastavena. Zkuste to prosím později.')
        return
      }
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/callback`,
        }
      })
      if (error) {
        setError(error.message)
      } else {
        setMode('check_email')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/callback?type=recovery`,
      })
      if (error) {
        setError(error.message)
      } else {
        setSuccessMsg('Odkaz pro obnovení hesla byl odeslán na váš email.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const pwdError = validatePassword(password)
    if (pwdError) {
      setError(pwdError)
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
      } else {
        setSuccessMsg('Heslo bylo úspěšně změněno. Přihlašte se prosím znovu.')
        setPassword('')
        await supabase.auth.signOut()
        setTimeout(() => {
          setMode('login')
          setSuccessMsg('')
          router.push('/login')
          router.refresh()
        }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'check_email') {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-teal-100 p-4 rounded-full">
            <CheckCircle className="w-12 h-12 text-teal-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-navy-900 mb-3">Zkontrolujte email</h2>
        <p className="text-navy-600 mb-2">Na adresu <strong>{email}</strong> jsme poslali potvrzovací odkaz.</p>
        <p className="text-navy-500 text-sm mb-8">Po kliknutí na odkaz budete automaticky přesměrováni do aplikace.</p>
        <Button
          variant="outline"
          className="w-full justify-center"
          onClick={() => setMode('login')}
        >
          Zpět na přihlášení
        </Button>
      </div>
    )
  }

  if (mode === 'new_password') {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-teal-100 p-4 rounded-full">
            <Lock className="w-10 h-10 text-teal-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-navy-900 mb-1 text-center">Nové heslo</h2>
        <p className="text-navy-500 text-sm mb-6 text-center">Zadejte své nové heslo</p>

        <div className="bg-navy-50 rounded-xl p-3 mb-4 text-xs text-navy-600 space-y-1">
          <p className="font-semibold mb-1">Heslo musí obsahovat:</p>
          <p className={password.length >= 8 ? 'text-teal-600' : ''}>&#10003; alespoň 8 znaků</p>
          <p className={/[A-Z]/.test(password) ? 'text-teal-600' : ''}>&#10003; velké písmeno</p>
          <p className={/[a-z]/.test(password) ? 'text-teal-600' : ''}>&#10003; malé písmeno</p>
          <p className={/[0-9]/.test(password) ? 'text-teal-600' : ''}>&#10003; číslo</p>
          <p className={/[^A-Za-z0-9]/.test(password) ? 'text-teal-600' : ''}>&#10003; speciální znak (!@#$%)</p>
        </div>

        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
        {successMsg && <Alert className="mb-4"><AlertDescription>{successMsg}</AlertDescription></Alert>}

        <form onSubmit={handleNewPassword} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-navy-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nové heslo"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pl-10 pr-10 py-3 h-auto rounded-xl border-navy-200 text-navy-900 placeholder:text-navy-400 focus-visible:ring-teal-500 focus-visible:border-transparent"
              required
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2 text-navy-400 hover:text-navy-700">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <Button type="submit" disabled={loading} className="w-full justify-center py-3 h-auto text-base bg-teal-600 hover:bg-teal-700 text-white rounded-xl disabled:opacity-60">
            {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ukládám...</span> : 'Uložit nové heslo'}
          </Button>
        </form>
      </div>
    )
  }

  if (mode === 'mfa_verify') {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-teal-100 p-4 rounded-full">
            <Shield className="w-10 h-10 text-teal-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-navy-900 mb-1 text-center">Dvoufaktorové ověření</h2>
        <p className="text-navy-500 text-sm mb-6 text-center">Zadejte 6místný kód z vaší autentizační aplikace</p>

        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

        <form onSubmit={handleMfaVerify} className="space-y-4">
          <div className="relative">
            <Shield className="absolute left-3 top-3.5 w-4 h-4 text-navy-400" />
            <Input
              type="text"
              placeholder="000000"
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="pl-10 py-3 h-auto rounded-xl border-navy-200 text-navy-900 placeholder:text-navy-400 focus-visible:ring-teal-500 focus-visible:border-transparent text-center text-2xl tracking-widest"
              maxLength={6}
              required
              autoFocus
            />
          </div>
          <Button type="submit" disabled={loading || mfaCode.length !== 6} className="w-full justify-center py-3 h-auto text-base bg-teal-600 hover:bg-teal-700 text-white rounded-xl disabled:opacity-60">
            {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ověřuji...</span> : 'Ověřit'}
          </Button>
        </form>
        <Button variant="ghost" onClick={() => { setMode('login'); setMfaCode(''); setError('') }} className="w-full text-center text-sm text-navy-400 hover:text-navy-700 mt-4">
          <ArrowLeft className="w-3 h-3 inline mr-1" /> Zpět na přihlášení
        </Button>
      </div>
    )
  }

  return (
    <>
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Podmínky použití</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-navy-600 space-y-4">
            <p><strong>Provozovatel:</strong> Petr Sziliczai, IČO: 73264482, info@smluvnik.cz</p>
            <p>Smluvník je webová aplikace pro evidenci smluv a dokumentů. Registrací souhlasíte s těmito podmínkami.</p>
            <p><strong>Zkušební období:</strong> 7 dní zdarma bez zadání platební karty.</p>
            <p><strong>Vaše povinnosti:</strong> Nahrávejte pouze dokumenty ke kterým máte oprávnění. Nesdílejte přístupové údaje. Nepoužívejte službu k nelegálním účelům.</p>
            <p><strong>Omezení odpovědnosti:</strong> Výsledky AI extrakce jsou orientační – vždy je zkontrolujte. Smluvník neposkytuje právní poradenství a neodpovídá za škody vzniklé promeškáním termínů nebo na základě rozhodnutí učiněných dle informací v aplikaci.</p>
            <p><strong>Ukončení účtu:</strong> Kdykoli v nastavení. Data smazána do 30 dní.</p>
            <p><strong>Změny podmínek:</strong> O změnách vás informujeme e-mailem minimálně 14 dní předem.</p>
            <p><strong>Rozhodné právo:</strong> Česká republika.</p>
            <p className="text-xs text-navy-400">Platné od 16. 4. 2026 · <a href="/terms" target="_blank" className="underline hover:text-teal-600">Celé znění</a></p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTerms(false)} className="w-full bg-teal-600 hover:bg-teal-700 text-white">Zavřít</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zásady ochrany osobních údajů</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-navy-600 space-y-4">
            <p><strong>Správce:</strong> Petr Sziliczai, IČO: 73264482, info@smluvnik.cz</p>
            <p><strong>Co zpracováváme:</strong> E-mail, jméno, data smluv které zadáte, provozní logy.</p>
            <p><strong>Proč:</strong> Provoz služby, zasílání upozornění na expirace.</p>
            <p><strong>Příjemci:</strong> Supabase (databáze, EU), Vercel (hosting), Resend (emaily), Google Vertex AI (AI extrakce, EU).</p>
            <p><strong>Doba uchovávání:</strong> Po dobu trvání účtu. Po zrušení účtu smazáno do 30 dní.</p>
            <p><strong>Vaše práva:</strong> Přístup, oprava, výmaz, přenositelnost. Žádosti na info@smluvnik.cz, odpovíme do 30 dní.</p>
            <p><strong>Cookies:</strong> Pouze technické cookies nezbytné pro přihlášení.</p>
            <p><strong>Stížnosti:</strong> Úřad pro ochranu osobních údajů (uoou.cz).</p>
            <p className="text-xs text-navy-400">Platné od 16. 4. 2026 · <a href="/privacy" target="_blank" className="underline hover:text-teal-600">Celé znění</a></p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPrivacy(false)} className="w-full bg-teal-600 hover:bg-teal-700 text-white">Zavřít</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {mode !== 'login' ? (
          <Button variant="ghost" onClick={() => { setMode('login'); setError(''); setSuccessMsg('') }} className="flex items-center gap-1 text-navy-500 text-sm mb-6 hover:text-navy-800 px-0">
            <ArrowLeft className="w-4 h-4" /> Zpět
          </Button>
        ) : (
          <a href="/" className="flex items-center gap-1 text-navy-400 hover:text-navy-700 text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Zpět na Smluvník
          </a>
        )}

        <h2 className="text-2xl font-bold text-navy-900 mb-1">
          {mode === 'login' ? 'Přihlášení' : mode === 'register' ? 'Registrace' : 'Obnovení hesla'}
        </h2>
        <p className="text-navy-500 text-sm mb-6">
          {mode === 'login' ? 'Vítejte zpět ve Smluvníku' : mode === 'register' ? 'Vytvořte si účet zdarma' : 'Zadejte email pro obnovení hesla'}
        </p>

        {mode === 'register' && (
          <div className="bg-navy-50 rounded-xl p-3 mb-4 text-xs text-navy-600 space-y-1">
            <p className="font-semibold mb-1">Heslo musí obsahovat:</p>
            <p className={password.length >= 8 ? 'text-teal-600' : ''}>&#10003; alespoň 8 znaků</p>
            <p className={/[A-Z]/.test(password) ? 'text-teal-600' : ''}>&#10003; velké písmeno</p>
            <p className={/[a-z]/.test(password) ? 'text-teal-600' : ''}>&#10003; malé písmeno</p>
            <p className={/[0-9]/.test(password) ? 'text-teal-600' : ''}>&#10003; číslo</p>
            <p className={/[^A-Za-z0-9]/.test(password) ? 'text-teal-600' : ''}>&#10003; speciální znak (!@#$%)</p>
          </div>
        )}

        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
        {successMsg && <Alert className="mb-4"><AlertDescription>{successMsg}</AlertDescription></Alert>}

        <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset} className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-4 h-4 text-navy-400" />
              <Input
                type="text"
                placeholder="Celé jméno"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="pl-10 pr-4 py-3 h-auto rounded-xl border-navy-200 text-navy-900 placeholder:text-navy-400 focus-visible:ring-teal-500 focus-visible:border-transparent"
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-navy-400" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="pl-10 pr-4 py-3 h-auto rounded-xl border-navy-200 text-navy-900 placeholder:text-navy-400 focus-visible:ring-teal-500 focus-visible:border-transparent"
              required
            />
          </div>
          {mode !== 'reset' && (
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-navy-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Heslo"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10 pr-10 py-3 h-auto rounded-xl border-navy-200 text-navy-900 placeholder:text-navy-400 focus-visible:ring-teal-500 focus-visible:border-transparent"
                required
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2 text-navy-400 hover:text-navy-700">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          )}
          {mode === 'login' && (
            <div className="text-right">
              <Button type="button" variant="link" onClick={() => { setMode('reset'); setError('') }} className="text-teal-600 text-sm h-auto p-0">
                Zapomněli jste heslo?
              </Button>
            </div>
          )}

          {mode === 'register' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked as boolean)}
                className="mt-0.5"
              />
              <span className="text-xs text-navy-600 leading-relaxed">
                Souhlasím s{' '}
                <button type="button" onClick={() => setShowTerms(true)} className="text-teal-600 hover:underline font-medium">podmínkami použití</button>
                {' '}a{' '}
                <button type="button" onClick={() => setShowPrivacy(true)} className="text-teal-600 hover:underline font-medium">zásadami ochrany osobních údajů</button>
              </span>
            </label>
          )}

          <Button
            type="submit"
            disabled={loading || (mode === 'register' && !agreed)}
            className="w-full justify-center py-3 h-auto text-base bg-teal-600 hover:bg-teal-700 text-white rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Načítání...</span>
            ) : mode === 'login' ? 'Přihlásit se' : mode === 'register' ? 'Zaregistrovat se' : 'Odeslat odkaz'}
          </Button>
        </form>

        {mode === 'login' && (
          <div className="mt-4">
            <div className="relative flex items-center justify-center mb-4">
              <div className="border-t border-navy-200 w-full"></div>
              <span className="bg-white px-3 text-xs text-navy-400 absolute">nebo</span>
            </div>
            <Button type="button" variant="outline" className="w-full flex items-center justify-center gap-3 rounded-xl py-3 h-auto text-sm text-navy-700" onClick={handleGoogleLogin} disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-navy-300 border-t-navy-700 rounded-full animate-spin" />
                  Přesměrování na Google...
                </span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Přihlásit se přes Google
                </>
              )}
            </Button>
          </div>
        )}

        {mode === 'login' && (
          <p className="text-center text-sm text-navy-500 mt-6">
            Nemáte účet?{' '}
            <Button variant="link" onClick={() => { setMode('register'); setError('') }} className="text-teal-600 font-semibold h-auto p-0">Zaregistrujte se</Button>
          </p>
        )}

        <div className="mt-8 pt-6 border-t border-navy-100 flex justify-center gap-4 text-xs text-navy-400">
          <a href="/terms" target="_blank" className="hover:text-teal-600 hover:underline transition-colors">Obchodní podmínky</a>
          <a href="/privacy" target="_blank" className="hover:text-teal-600 hover:underline transition-colors">Ochrana osobních údajů</a>
        </div>
      </div>
    </>
  )
}
