'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, Building2, Bell, Settings, CreditCard, Shield, LogOut, Menu, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { DMSLogo } from '@/components/shared/logo'
import { useApp } from '@/lib/context'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/', label: 'Smlouvy', icon: FileText },
  { href: '/suppliers', label: 'Dodavatelé', icon: Building2 },
  { href: '/notifications', label: 'Upozornění', icon: Bell },
  { href: '/settings', label: 'Nastavení', icon: Settings },
  { href: '/plans', label: 'Plány', icon: CreditCard },
]

function planLabel(plan: string) {
  if (plan === 'business') return '💎 Business'
  if (plan === 'pro') return '⭐ Pro'
  return 'Free'
}

function planColor(plan: string) {
  if (plan === 'business') return 'bg-navy-800 text-white'
  if (plan === 'pro') return 'bg-teal-100 text-teal-700'
  return 'bg-navy-100 text-navy-500'
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

export function Sidebar() {
  const { user, profile, alertCount } = useApp()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isAdmin = profile.role === 'admin'

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const allNavItems = isAdmin
    ? [...navItems, { href: '/admin', label: 'Admin', icon: Shield }]
    : navItems

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-navy-100 fixed h-full z-20">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-navy-100">
          <DMSLogo size={36} />
          <div>
            <span className="font-bold text-navy-900 font-display text-lg">Smluvník</span>
            <p className="text-xs text-navy-400">Správa smluv a dokumentů</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full text-left ${active ? 'nav-item-active' : 'nav-item'}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {item.href === '/notifications' && alertCount != null && alertCount > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-navy-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-teal-700 font-bold text-sm">
                {user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-navy-800 truncate">{user.email}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColor(profile.plan)}`}>
                {planLabel(profile.plan)}
              </span>
            </div>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className={`w-full text-left ${isActive(pathname, '/admin') ? 'nav-item-active' : 'nav-item'}`}
            >
              <Shield className="w-4 h-4" /> Admin
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="nav-item w-full text-red-500 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" /> Odhlásit se
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-navy-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <DMSLogo size={28} />
            <span className="font-bold text-navy-900 font-display">Smluvník</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-navy-100 rounded-xl"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 pt-16" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigace</SheetTitle>
          <nav className="p-4 space-y-1">
            {allNavItems.map((item) => {
              const Icon = item.icon
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full text-left ${active ? 'nav-item-active' : 'nav-item'}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.href === '/notifications' && alertCount != null && alertCount > 0 && (
                    <span className="ml-auto bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {alertCount > 9 ? '9+' : alertCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="px-4 pt-4 border-t border-navy-100">
            <button
              onClick={handleSignOut}
              className="nav-item w-full text-red-500 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="w-4 h-4" /> Odhlásit se
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
