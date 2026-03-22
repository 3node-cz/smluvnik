'use client'

import Link from 'next/link'
import { Check, X, FileText, Bell, Zap, FolderOpen, AlertTriangle, Search } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

const plans = [
  {
    id: 'free',
    name: 'Start',
    price: '19 Kč',
    period: '/měsíc',
    yearly: '190 Kč/rok — ušetříte 38 Kč',
    highlight: false,
    features: [
      { text: '5 smluv', ok: true },
      { text: '15 MB úložiště', ok: true },
      { text: 'Kategorie smluv', ok: true },
      { text: 'Přehled výdajů', ok: true },
      { text: 'Přehled dodavatelů', ok: true },
      { text: 'Grafické upozornění na expiraci', ok: true },
      { text: '✨ AI čtení dokumentů', ok: false },
      { text: '📧 Emailová upozornění', ok: false },
      { text: '📤 Export smluv', ok: false },
    ],
  },
  {
    id: 'pro',
    name: 'Jistota',
    price: '99 Kč',
    period: '/měsíc',
    highlight: true,
    yearly: '990 Kč/rok — ušetříte 198 Kč',
    features: [
      { text: 'Neomezené smlouvy', ok: true },
      { text: 'Neomezené úložiště', ok: true },
      { text: 'Kategorie smluv', ok: true },
      { text: 'Přehled výdajů', ok: true },
      { text: 'Přehled dodavatelů', ok: true },
      { text: 'Grafické upozornění na expiraci', ok: true },
      { text: '✨ AI čtení dokumentů', ok: true },
      { text: '📧 Emailová upozornění před expirací', ok: true },
      { text: '📤 Export smluv', ok: true },
    ],
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      <header className="bg-white border-b border-navy-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-navy-900 text-xl">Smluvník</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-navy-600 text-sm hover:text-navy-900 transition">
            Přihlásit se
          </Link>
          <Link href="/login" className={buttonVariants()}>
            Začít zdarma
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-navy-900 to-navy-800 text-white py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block bg-teal-500/20 text-teal-300 text-sm px-4 py-1 rounded-full mb-6 font-medium">
            Správa smluv s AI
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Víte kdy vám vyprší<br />smlouva s dodavatelem?
          </h1>
          <p className="text-navy-300 text-xl max-w-xl mx-auto mb-10">
            Většina lidí ne. A pak přijde automatické prodloužení za nevýhodných podmínek. Smluvník Vás včas upozorní..
          </p>
          <Link href="/login" className="inline-flex items-center justify-center bg-teal-500 hover:bg-teal-400 text-white font-bold px-10 py-4 rounded-xl text-lg transition">
            Začít zdarma — bez kreditní karty
          </Link>
        </div>
      </section>

      <section className="py-20 px-4 bg-navy-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-navy-900 text-center mb-4">Poznáváte se?</h2>
          <p className="text-navy-500 text-center mb-12">Takhle to vypadá bez Smluvníku</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: FolderOpen, title: 'Smlouvy všude', desc: 'V emailu, v šuplíku, v cloudu, na USB... Najít konkrétní smlouvu trvá hodiny.' },
              { icon: AlertTriangle, title: 'Propásnuté termíny', desc: 'Automatické prodloužení smlouvy za horších podmínek, protože jste zapomněli včas vypovědět.' },
              { icon: Search, title: 'Co jsem vlastně podepsal?', desc: 'Nevíte kolik platíte celkem za všechny služby. Peníze odchází a vy nevíte za co.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 border-2 border-red-100">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="font-bold text-navy-900 mb-2">{item.title}</h3>
                <p className="text-navy-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-navy-900 text-center mb-4">Smluvník to řeší za vás</h2>
          <p className="text-navy-500 text-center mb-12">Tři kroky a máte přehled</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: FileText, step: '1', title: 'Nahrajte smlouvu', desc: 'Vyfotit nebo nahrát PDF. AI přečte dokument a vyplní všechny údaje automaticky.' },
              { icon: Zap, step: '2', title: 'AI to zpracuje', desc: 'Smluvník vytáhne datum konce, výši platby, dodavatele a všechny důležité informace.' },
              { icon: Bell, step: '3', title: 'Dostanete upozornění', desc: 'Před koncem smlouvy vám přijde email. Včas. Takže máte čas reagovat.' },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
                  <item.icon className="w-8 h-8 text-teal-600" />
                  <span className="absolute -top-2 -right-2 bg-teal-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{item.step}</span>
                </div>
                <h3 className="font-bold text-navy-900 mb-2">{item.title}</h3>
                <p className="text-navy-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-teal-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Přestaňte se bát propásnutých termínů</h2>
        <p className="text-teal-100 mb-8 text-lg">Začněte zdarma. Bez kreditní karty. Za 2 minuty.</p>
        <Link href="/login" className="inline-flex items-center justify-center bg-white text-teal-700 font-bold px-10 py-4 rounded-xl text-lg hover:bg-teal-50 transition">
          Začít zdarma
        </Link>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-navy-900 text-center mb-2">Vyberte svůj plán</h2>
          <p className="text-navy-500 text-center mb-6">Začněte zdarma, upgradujte kdykoliv</p>

          <div className="bg-teal-50 border border-teal-200 rounded-2xl px-6 py-4 flex items-center gap-3 mb-10 max-w-2xl mx-auto">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="font-semibold text-teal-800">14 dní zdarma u každého plánu</p>
              <p className="text-sm text-teal-600">Vyzkoušejte bez závazků a bez zadání platební karty.</p>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
              {plans.map(plan => (
                <div key={plan.id} className={`bg-white rounded-2xl border-2 p-6 shadow-sm ${plan.highlight ? 'border-teal-400 shadow-lg relative' : 'border-navy-200'}`}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs px-4 py-1 rounded-full font-semibold">
                      Nejoblíbenější
                    </div>
                  )}
                  <h3 className="font-bold text-navy-900 text-lg mb-2">{plan.name}</h3>
                  <div className="mb-1">
                    <span className="text-3xl font-bold text-navy-900">{plan.price}</span>
                    <span className="text-navy-400 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-xs text-teal-600 mb-1">{plan.yearly}</p>
                  <p className="text-xs text-navy-400 mb-6">14 dní zdarma, pak se teprve účtuje</p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map(f => (
                      <li key={f.text} className={`flex items-center gap-2 text-sm ${f.ok ? 'text-navy-700' : 'text-navy-300'}`}>
                        {f.ok ? <Check className="w-4 h-4 text-teal-500 flex-shrink-0" /> : <X className="w-4 h-4 text-navy-200 flex-shrink-0" />}
                        {f.text}
                      </li>
                    ))}
                  </ul>
                  <Link href="/login" className={buttonVariants({ variant: plan.highlight ? 'default' : 'outline', className: `w-full justify-center ${plan.highlight ? 'bg-teal-500 hover:bg-teal-400 text-white' : ''}` })}>
                    Začít zdarma
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-navy-900 text-navy-400 text-sm text-center py-8">
        © 2026 Smluvník. Všechna práva vyhrazena.
      </footer>

    </div>
  )
}
