'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    try {
      const supabase = createClient()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/callback` }
      })
    } finally {
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
          setError('V\u00e1\u0161 email je\u0161t\u011b nebyl ov\u011b\u0159en. Zkontrolujte schr\u00e1nku a klikn\u011bte na odkaz.')
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Nespr\u00e1vn\u00fd email nebo heslo.')
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
        setError('Nespr\u00e1vn\u00fd k\u00f3d. Zkuste znovu.')
      } else {
        router.push('/')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Heslo mus\u00ed m\u00edt alespo\u0148 8 znak\u016f.'
    if (!/[A-Z]/.test(pwd)) return 'Heslo mus\u00ed obsahovat alespo\u0148 jedno velk\u00e9 p\u00edsmeno.'
    if (!/[a-z]/.test(pwd)) return 'Heslo mus\u00ed obsahovat alespo\u0148 jedno mal\u00e9 p\u00edsmeno.'
    if (!/[0-9]/.test(pwd)) return 'Heslo mus\u00ed obsahovat alespo\u0148 jedno \u010d\u00edslo.'
    if (!/[^A-Za-z0-9]/.test(pwd)) return 'Heslo mus\u00ed obsahovat alespo\u0148 jeden speci\u00e1ln\u00ed znak (nap\u0159. !@#$%).'
    return null
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!agreed) {
      setError('Pro registraci mus\u00edte souhlasit s podm\u00ednkami pou\u017eit\u00ed a z\u00e1sadami ochrany osobn\u00edch \u00fadaj\u016f.')
      return
    }
    const pwdError = validatePassword(password)
    if (pwdError) {
      setError(pwdError)
      return
    }
    setLoading(true)
    try {
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
        setSuccessMsg('Odkaz pro obnoven\u00ed hesla byl odesl\u00e1n na v\u00e1\u0161 email.')
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
        setSuccessMsg('Heslo bylo \u00fasp\u011b\u0161n\u011b zm\u011bn\u011bno. P\u0159ihla\u0161te se pros\u00edm znovu.')
        await supabase.auth.signOut()
        setTimeout(() => {
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
        <p className="text-navy-600 mb-2">Na adresu <strong>{email}</strong> jsme poslali potvrzovac\u00ed odkaz.</p>
        <p className="text-navy-500 text-sm mb-8">Po kliknut\u00ed na odkaz budete automaticky p\u0159esm\u011brov\u00e1ni do aplikace.</p>
        <Button
          variant="outline"
          className="w-full justify-center"
          onClick={() => setMode('login')}
        >
          Zp\u011bt na p\u0159ihl\u00e1\u0161en\u00ed
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
        <h2 className="text-2xl font-bold text-navy-900 mb-1 text-center">Nov\u00e9 heslo</h2>
        <p className="text-navy-500 text-sm mb-6 text-center">Zadejte sv\u00e9 nov\u00e9 heslo</p>

        <div className="bg-navy-50 rounded-xl p-3 mb-4 text-xs text-navy-600 space-y-1">
          <p className="font-semibold mb-1">Heslo mus\u00ed obsahovat:</p>
          <p className={password.length >= 8 ? 'text-teal-600' : ''}>&#10003; alespo\u0148 8 znak\u016f</p>
          <p className={/[A-Z]/.test(password) ? 'text-teal-600' : ''}>&#10003; velk\u00e9 p\u00edsmeno</p>
          <p className={/[a-z]/.test(password) ? 'text-teal-600' : ''}>&#10003; mal\u00e9 p\u00edsmeno</p>
          <p className={/[0-9]/.test(password) ? 'text-teal-600' : ''}>&#10003; \u010d\u00edslo</p>
          <p className={/[^A-Za-z0-9]/.test(password) ? 'text-teal-600' : ''}>&#10003; speci\u00e1ln\u00ed znak (!@#$%)</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm mb-4">{error}</div>}
        {successMsg && <div className="bg-teal-50 border border-teal-200 text-teal-700 p-3 rounded-xl text-sm mb-4">{successMsg}</div>}

        <form onSubmit={handleNewPassword} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-navy-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nov\u00e9 heslo"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pl-10 pr-10 py-3 h-auto rounded-xl border-navy-200 text-navy-900 placeholder:text-navy-400 focus-visible:ring-teal-500 focus-visible:border-transparent"
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-navy-400 hover:text-navy-700">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button type="submit" disabled={loading} className="w-full justify-center py-3 h-auto text-base bg-teal-600 hover:bg-teal-700 text-white rounded-xl disabled:opacity-60">
            {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ukl\u00e1d\u00e1m...</span> : 'Ulo\u017eit nov\u00e9 heslo'}
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
        <h2 className="text-2xl font-bold text-navy-900 mb-1 text-center">Dvoufaktorov\u00e9 ov\u011b\u0159en\u00ed</h2>
        <p className="text-navy-500 text-sm mb-6 text-center">Zadejte 6m\u00edstn\u00fd k\u00f3d z va\u0161\u00ed autentiza\u010dn\u00ed aplikace</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm mb-4">{error}</div>}

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
            {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ov\u011b\u0159uji...</span> : 'Ov\u011b\u0159it'}
          </Button>
        </form>
        <button onClick={() => { setMode('login'); setMfaCode(''); setError('') }} className="w-full text-center text-sm text-navy-400 hover:text-navy-700 mt-4 transition">
          <ArrowLeft className="w-3 h-3 inline mr-1" /> Zp\u011bt na p\u0159ihl\u00e1\u0161en\u00ed
        </button>
      </div>
    )
  }

  return (
    <>
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Podm\u00ednky pou\u017eit\u00ed</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-navy-600 space-y-4">
            <p><strong>Provozovatel:</strong> Petr Sziliczai, Palack\u00e9ho 508, 739 61 T\u0159inec, I\u010cO: 73264482</p>
            <p>Smluvn\u00edk je webov\u00e1 aplikace pro evidenci smluv a dokument\u016f. Registrac\u00ed souhlas\u00edte s t\u011bmito podm\u00ednkami.</p>
            <p><strong>Zku\u0161ebn\u00ed obdob\u00ed:</strong> Po registraci z\u00edsk\u00e1te pl\u00e1n St\u0159edn\u00ed na 14 dn\u00ed zdarma. Po uplynut\u00ed dojde k omezen\u00ed na pl\u00e1n Z\u00e1klad.</p>
            <p><strong>P\u0159edplatn\u00e9:</strong> Ceny jsou uvedeny na str\u00e1nce Pl\u00e1ny. P\u0159edplatn\u00e9 se automaticky neobnovuje.</p>
            <p><strong>Va\u0161e povinnosti:</strong> Nahr\u00e1vejte pouze dokumenty ke kter\u00fdm m\u00e1te opr\u00e1vn\u011bn\u00ed. Nesd\u00edlejte p\u0159\u00edstupov\u00e9 \u00fadaje. Nepou\u017e\u00edvejte slu\u017ebu k neleg\u00e1ln\u00edm \u00fa\u010del\u016fm.</p>
            <p><strong>Omezen\u00ed odpov\u011bdnosti:</strong> V\u00fdsledky AI extrakce jsou orienta\u010dn\u00ed \u2013 v\u017edy je zkontrolujte. Neodpov\u00edd\u00e1me za \u0161kody zp\u016fsoben\u00e9 nedostupnost\u00ed slu\u017eby.</p>
            <p><strong>Data p\u0159i ukon\u010den\u00ed:</strong> Podm\u00ednky uchov\u00e1v\u00e1n\u00ed dat po ukon\u010den\u00ed p\u0159edplatn\u00e9ho jsou uvedeny v z\u00e1sad\u00e1ch ochrany osobn\u00edch \u00fadaj\u016f.</p>
            <p><strong>Zm\u011bny podm\u00ednek:</strong> O zm\u011bn\u00e1ch v\u00e1s informujeme e-mailem minim\u00e1ln\u011b 14 dn\u00ed p\u0159edem.</p>
            <p><strong>Rozhodn\u00e9 pr\u00e1vo:</strong> \u010cesk\u00e1 republika.</p>
            <p className="text-xs text-navy-400">Platn\u00e9 od 1. b\u0159ezna 2026</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTerms(false)} className="w-full bg-teal-600 hover:bg-teal-700 text-white">Zav\u0159\u00edt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Z\u00e1sady ochrany osobn\u00edch \u00fadaj\u016f</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-navy-600 space-y-4">
            <p><strong>Spr\u00e1vce:</strong> Petr Sziliczai, Palack\u00e9ho 508, 739 61 T\u0159inec, I\u010cO: 73264482, info@smluvnik.cz</p>
            <p><strong>Co zpracov\u00e1v\u00e1me:</strong> E-mail, jm\u00e9no, data smluv kter\u00e9 zad\u00e1te, provozn\u00ed logy. Platebn\u00ed \u00fadaje zpracov\u00e1v\u00e1 v\u00fdhradn\u011b Stripe.</p>
            <p><strong>Pro\u010d:</strong> Provoz slu\u017eby, zas\u00edl\u00e1n\u00ed upozorn\u011bn\u00ed na expirace, informace o p\u0159edplatn\u00e9m.</p>
            <p><strong>P\u0159\u00edjemci:</strong> Supabase (datab\u00e1ze, EU), Vercel (hosting), Resend (emaily), Stripe (platby), Google Gemini (AI extrakce).</p>
            <p><strong>Doba uchov\u00e1v\u00e1n\u00ed:</strong> Po dobu trv\u00e1n\u00ed \u00fa\u010dtu. Po zru\u0161en\u00ed \u00fa\u010dtu smaz\u00e1no do 30 dn\u00ed. \u00da\u010detn\u00ed doklady 5 let dle z\u00e1kona.</p>
            <p><strong>Va\u0161e pr\u00e1va:</strong> P\u0159\u00edstup, oprava, v\u00fdmaz, p\u0159enositelnost, omezen\u00ed zpracov\u00e1n\u00ed. \u017d\u00e1dosti na info@smluvnik.cz, odpov\u00edme do 30 dn\u00ed.</p>
            <p><strong>Cookies:</strong> Pouze technick\u00e9 cookies nezbytn\u00e9 pro p\u0159ihl\u00e1\u0161en\u00ed. \u017d\u00e1dn\u00e9 reklamn\u00ed ani sledovac\u00ed cookies.</p>
            <p><strong>St\u00ed\u017enosti:</strong> \u00da\u0159ad pro ochranu osobn\u00edch \u00fadaj\u016f (uoou.cz).</p>
            <p className="text-xs text-navy-400">Platn\u00e9 od 1. b\u0159ezna 2026</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPrivacy(false)} className="w-full bg-teal-600 hover:bg-teal-700 text-white">Zav\u0159\u00edt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {mode !== 'login' && (
          <button onClick={() => { setMode('login'); setError(''); setSuccessMsg('') }} className="flex items-center gap-1 text-navy-500 text-sm mb-6 hover:text-navy-800 transition">
            <ArrowLeft className="w-4 h-4" /> Zp\u011bt
          </button>
        )}

        <h2 className="text-2xl font-bold text-navy-900 mb-1">
          {mode === 'login' ? 'P\u0159ihl\u00e1\u0161en\u00ed' : mode === 'register' ? 'Registrace' : 'Obnoven\u00ed hesla'}
        </h2>
        <p className="text-navy-500 text-sm mb-6">
          {mode === 'login' ? 'V\u00edtejte zp\u011bt ve Smluvn\u00edku' : mode === 'register' ? 'Vytvo\u0159te si \u00fa\u010det zdarma' : 'Zadejte email pro obnoven\u00ed hesla'}
        </p>

        {mode === 'register' && (
          <div className="bg-navy-50 rounded-xl p-3 mb-4 text-xs text-navy-600 space-y-1">
            <p className="font-semibold mb-1">Heslo mus\u00ed obsahovat:</p>
            <p className={password.length >= 8 ? 'text-teal-600' : ''}>&#10003; alespo\u0148 8 znak\u016f</p>
            <p className={/[A-Z]/.test(password) ? 'text-teal-600' : ''}>&#10003; velk\u00e9 p\u00edsmeno</p>
            <p className={/[a-z]/.test(password) ? 'text-teal-600' : ''}>&#10003; mal\u00e9 p\u00edsmeno</p>
            <p className={/[0-9]/.test(password) ? 'text-teal-600' : ''}>&#10003; \u010d\u00edslo</p>
            <p className={/[^A-Za-z0-9]/.test(password) ? 'text-teal-600' : ''}>&#10003; speci\u00e1ln\u00ed znak (!@#$%)</p>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm mb-4">{error}</div>}
        {successMsg && <div className="bg-teal-50 border border-teal-200 text-teal-700 p-3 rounded-xl text-sm mb-4">{successMsg}</div>}

        <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset} className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-4 h-4 text-navy-400" />
              <Input
                type="text"
                placeholder="Cel\u00e9 jm\u00e9no"
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
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-navy-400 hover:text-navy-700">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}
          {mode === 'login' && (
            <div className="text-right">
              <button type="button" onClick={() => { setMode('reset'); setError('') }} className="text-teal-600 text-sm hover:underline">
                Zapomn\u011bli jste heslo?
              </button>
            </div>
          )}

          {mode === 'register' && (
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="sr-only" />
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${agreed ? 'bg-teal-500 border-teal-500' : 'border-navy-300 group-hover:border-teal-400'}`}>
                  {agreed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
              <span className="text-xs text-navy-600 leading-relaxed">
                Souhlas\u00edm s{' '}
                <button type="button" onClick={() => setShowTerms(true)} className="text-teal-600 hover:underline font-medium">podm\u00ednkami pou\u017eit\u00ed</button>
                {' '}a{' '}
                <button type="button" onClick={() => setShowPrivacy(true)} className="text-teal-600 hover:underline font-medium">z\u00e1sadami ochrany osobn\u00edch \u00fadaj\u016f</button>
              </span>
            </label>
          )}

          <Button
            type="submit"
            disabled={loading || (mode === 'register' && !agreed)}
            className="w-full justify-center py-3 h-auto text-base bg-teal-600 hover:bg-teal-700 text-white rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Na\u010d\u00edt\u00e1n\u00ed...</span>
            ) : mode === 'login' ? 'P\u0159ihl\u00e1sit se' : mode === 'register' ? 'Zaregistrovat se' : 'Odeslat odkaz'}
          </Button>
        </form>

        {mode === 'login' && (
          <div className="mt-4">
            <div className="relative flex items-center justify-center mb-4">
              <div className="border-t border-navy-200 w-full"></div>
              <span className="bg-white px-3 text-xs text-navy-400 absolute">nebo</span>
            </div>
            <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-3 border border-navy-200 rounded-xl py-3 text-sm text-navy-700 hover:bg-navy-50 transition disabled:opacity-60">
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              P\u0159ihl\u00e1sit se p\u0159es Google
            </button>
          </div>
        )}

        {mode === 'login' && (
          <p className="text-center text-sm text-navy-500 mt-6">
            Nem\u00e1te \u00fa\u010det?{' '}
            <button onClick={() => { setMode('register'); setError('') }} className="text-teal-600 font-semibold hover:underline">Zaregistrujte se</button>
          </p>
        )}
      </div>
    </>
  )
}
