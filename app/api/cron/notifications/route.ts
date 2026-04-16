import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CONTRACT_CATEGORIES } from '@/lib/types/database'

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Service role client — bypasses RLS to query all users
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get Resend API key from app_settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'resend_api_key')
      .single()

    if (!settings?.value) {
      return NextResponse.json({ error: 'No Resend API key configured' }, { status: 500 })
    }
    const resendApiKey = settings.value

    // Get "from" email from app_settings (fallback to default)
    const { data: fromSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'resend_from_email')
      .single()
    const fromEmail = fromSetting?.value || 'Smluvník <noreply@smluvnik.cz>'

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch all contracts with valid_until set
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, user_id, provider, category, valid_until, notification_days_before, notification_email, contract_number')
      .not('valid_until', 'is', null)

    if (contractsError) throw contractsError
    if (!contracts?.length) {
      return NextResponse.json({ success: true, notifications_sent: 0 })
    }

    // Batch: collect unique user IDs and fetch all profiles at once
    const userIds = [...new Set(contracts.map(c => c.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, notification_email, full_name')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Milníky upozornění — email se pošle jen přesně v tyto dny před expirací
    const NOTIFICATION_MILESTONES = [45, 14, 3]

    // Batch: fetch existing notification_log for these contracts (all time, not just today)
    const contractIds = contracts.map(c => c.id)
    const { data: existingLogs } = await supabase
      .from('notification_log')
      .select('contract_id, days_before')
      .in('contract_id', contractIds)

    // Map: contract_id -> Set of already sent milestones
    const sentMilestonesMap = new Map<string, Set<number>>()
    for (const log of existingLogs || []) {
      if (!sentMilestonesMap.has(log.contract_id)) {
        sentMilestonesMap.set(log.contract_id, new Set())
      }
      sentMilestonesMap.get(log.contract_id)!.add(log.days_before)
    }

    const categoryMap = new Map(CONTRACT_CATEGORIES.map(c => [c.value, c.label]))
    const notificationsSent: string[] = []
    const errors: string[] = []

    for (const contract of contracts) {
      const expiryDate = new Date(contract.valid_until)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Přeskočit vypršené nebo příliš vzdálené smlouvy
      if (daysUntilExpiry <= 0) continue

      // Zkontrolovat zda dnešní počet dní odpovídá některému milníku
      if (!NOTIFICATION_MILESTONES.includes(daysUntilExpiry)) continue

      // Přeskočit pokud pro tento milník už bylo upozornění odesláno
      const sentMilestones = sentMilestonesMap.get(contract.id)
      if (sentMilestones?.has(daysUntilExpiry)) continue

      const profile = profileMap.get(contract.user_id)
      const sendTo = contract.notification_email || profile?.notification_email || profile?.email
      if (!sendTo) continue

      const catLabel = categoryMap.get(contract.category) || contract.category

      const emailHtml = buildEmailHtml({
        provider: contract.provider,
        category: catLabel,
        contractNumber: contract.contract_number,
        validUntil: contract.valid_until,
        daysUntilExpiry,
      })

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: sendTo,
          subject: daysUntilExpiry === 3
            ? `⚠️ Smlouva „${contract.provider}" vyprší za 3 dny`
            : `Smlouva „${contract.provider}" vyprší za ${daysUntilExpiry} dní`,
          html: emailHtml,
        }),
      })

      if (emailRes.ok) {
        await supabase.from('notification_log').insert({
          contract_id: contract.id,
          user_id: contract.user_id,
          sent_to_email: sendTo,
          days_before: daysUntilExpiry,
        })
        notificationsSent.push(contract.id)
      } else {
        const errBody = await emailRes.text()
        errors.push(`${contract.id}: ${errBody}`)
      }
    }

    return NextResponse.json({
      success: true,
      notifications_sent: notificationsSent.length,
      ids: notificationsSent,
      ...(errors.length > 0 && { errors }),
    })
  } catch (error) {
    console.error('Cron notifications error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmailHtml(params: {
  provider: string
  category: string
  contractNumber: string | null
  validUntil: string
  daysUntilExpiry: number
}) {
  const { provider, category, contractNumber, validUntil, daysUntilExpiry } = params
  const formattedDate = new Date(validUntil).toLocaleDateString('cs-CZ')
  const safeProvider = escapeHtml(provider)
  const safeCategory = escapeHtml(category)
  const safeContractNumber = contractNumber ? escapeHtml(contractNumber) : null

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, 'Segoe UI', sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #102a43, #319795); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 800; }
    .header p { color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .alert-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .alert-box .days { font-size: 36px; font-weight: 800; color: #ea580c; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e8edf2; font-size: 14px; }
    .detail-row .label { color: #627d98; }
    .detail-row .value { color: #102a43; font-weight: 600; }
    .cta { display: inline-block; background: #319795; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; margin-top: 24px; }
    .footer { background: #f0f4f8; padding: 20px 32px; text-align: center; font-size: 12px; color: #627d98; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Smluvník</h1>
      <p>Správa smluv a dokumentů</p>
    </div>
    <div class="body">
      <h2 style="color: #102a43; margin-top: 0;">Upozornění na expiraci smlouvy</h2>
      <p style="color: #486581;">Jedna z vašich smluv brzy vyprší. Doporučujeme zkontrolovat podmínky a případně obnovit smlouvu.</p>

      <div class="alert-box">
        <div class="days">${daysUntilExpiry} ${daysUntilExpiry === 3 ? 'dny' : 'dní'}</div>
        <div style="color: #9a3412; font-size: 14px;">do vypršení smlouvy</div>
      </div>

      <div>
        <div class="detail-row">
          <span class="label">Poskytovatel</span>
          <span class="value">${safeProvider}</span>
        </div>
        <div class="detail-row">
          <span class="label">Kategorie</span>
          <span class="value">${safeCategory}</span>
        </div>
        ${safeContractNumber ? `
        <div class="detail-row">
          <span class="label">Číslo smlouvy</span>
          <span class="value">${safeContractNumber}</span>
        </div>` : ''}
        <div class="detail-row">
          <span class="label">Datum expirace</span>
          <span class="value">${formattedDate}</span>
        </div>
      </div>

      <a href="https://smluvnik.cz" class="cta">
        Zobrazit ve Smluvníku
      </a>
    </div>
    <div class="footer">
      Toto upozornění bylo odesláno automaticky systémem Smluvník.<br>
      Upozornění jsou zasílána 45, 14 a 3 dny před expirací smlouvy.
    </div>
  </div>
</body>
</html>`
}
