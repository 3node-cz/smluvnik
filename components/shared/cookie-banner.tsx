'use client'

import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import Link from 'next/link'

type Consent = 'accepted' | 'rejected' | null

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('cookie_consent') as Consent
    if (stored) {
      setConsent(stored)
    } else {
      // Small delay so banner doesn't flash on first render
      const t = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(t)
    }
  }, [])

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    setConsent('accepted')
    setVisible(false)
  }

  const reject = () => {
    localStorage.setItem('cookie_consent', 'rejected')
    setConsent('rejected')
    setVisible(false)
  }

  return (
    <>
      {/* Vercel Analytics — načte se jen při souhlasu */}
      {consent === 'accepted' && <Analytics />}

      {/* Cookie lišta */}
      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-navy-900 text-white shadow-2xl">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-sm text-navy-200 flex-1">
              Používáme analytické cookies pro sledování návštěvnosti (Vercel Analytics).
              Vaše data jsou anonymizována a zůstávají v EU.{' '}
              <Link href="/privacy" className="underline hover:text-white">
                Více informací
              </Link>
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={reject}
                className="px-4 py-2 text-sm rounded-lg border border-navy-500 text-navy-300 hover:bg-navy-800 transition-colors"
              >
                Odmítnout
              </button>
              <button
                onClick={accept}
                className="px-4 py-2 text-sm rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium transition-colors"
              >
                Souhlasím
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
