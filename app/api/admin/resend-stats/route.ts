import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'resend_api_key').single()
  if (!settings?.value) return NextResponse.json({ error: 'No Resend API key configured' }, { status: 500 })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      headers: { Authorization: `Bearer ${settings.value}` },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch Resend stats' }, { status: 500 })
  }
}
