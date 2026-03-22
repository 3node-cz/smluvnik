import type { Metadata } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })
const dmSans = DM_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'Smluvnik – Správa smluv a dokumentů online | DMS pro domácnost',
  description: 'Mějte přehled o všech svých smlouvách. Upozornění před vypršením, AI čtení dokumentů, přehled výdajů.',
  keywords: 'správa smluv, evidence smluv, DMS, DMS pro domácnost',
  authors: [{ name: 'Smluvník' }],
  openGraph: {
    type: 'website',
    url: 'https://smluvnik.cz',
    title: 'Smluvník – Správa smluv a dokumentů online',
    locale: 'cs_CZ',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${inter.variable} ${dmSans.variable}`}>
      <body className="font-sans bg-navy-50 text-navy-900 antialiased">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
