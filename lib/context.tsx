'use client'

import { createContext, useContext } from 'react'
import type { Profile } from '@/lib/types/database'
import type { User } from '@supabase/supabase-js'

interface AppContext {
  user: User
  profile: Profile
  appSettings: Record<string, string>
  alertCount?: number
}

const AppContext = createContext<AppContext | null>(null)

export function AppProvider({ children, value }: { children: React.ReactNode; value: AppContext }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
