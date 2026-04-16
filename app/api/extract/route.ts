import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { GoogleAuth } from 'google-auth-library'

const MAX_BASE64_SIZE = 10 * 1024 * 1024 // ~7.5 MB file (base64 overhead)
const RATE_LIMIT_PER_HOUR = 30

const VALID_CATEGORIES = [
  'energie', 'plyn', 'internet', 'tv', 'mobilni_tarif',
  'pojisteni_auto', 'pojisteni_domacnost', 'pojisteni_zivot', 'pojisteni_zdravi',
  'hypoteka', 'spotrebitelsky_uver', 'leasing', 'najemni', 'prace',
  'sluzby', 'dodavatelska', 'nda', 'kupni', 'darovaci', 'ostatni'
] as const

const responseSchema = {
  type: 'object',
  properties: {
    provider: { type: 'string', nullable: true, description: 'Název dodavatele/poskytovatele' },
    contract_number: { type: 'string', nullable: true, description: 'Číslo smlouvy' },
    category: { type: 'string', enum: [...VALID_CATEGORIES], description: 'Kategorie smlouvy' },
    monthly_payment: { type: 'number', nullable: true, description: 'Částka platby v CZK' },
    payment_frequency: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'], description: 'Frekvence platby' },
    unit_price_low: { type: 'number', nullable: true, description: 'Cena za MWh (energie/plyn)' },
    fixed_fee: { type: 'number', nullable: true, description: 'Stálá platba (energie/plyn)' },
    valid_from: { type: 'string', nullable: true, description: 'Datum začátku ve formátu YYYY-MM-DD' },
    valid_until: { type: 'string', nullable: true, description: 'Datum konce ve formátu YYYY-MM-DD' },
    contact_phone: { type: 'string', nullable: true, description: 'Telefon dodavatele' },
    contact_email: { type: 'string', nullable: true, description: 'Email dodavatele' },
    notes: { type: 'string', nullable: true, description: 'Tarif, produkt a další důležité info' },
  },
  required: ['provider', 'category'],
}

export async function POST(request: NextRequest) {
  // Authenticate via server cookies — never trust client-supplied userId
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = user.id

  // Service role client for ai_usage_log (bypasses RLS)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { base64, mimeType } = await request.json()

  if (!base64 || !mimeType) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 })
  }

  // Body size limit
  if (base64.length > MAX_BASE64_SIZE) {
    return NextResponse.json({ error: 'File too large (max ~7.5 MB)' }, { status: 413 })
  }

  // Rate limiting via ai_usage_log
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await serviceClient
    .from('ai_usage_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)

  if (count && count >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json({ error: 'Příliš mnoho požadavků. Zkuste to za chvíli.' }, { status: 429 })
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT
  const location = process.env.VERTEX_LOCATION ?? 'europe-west4'
  if (!projectId) {
    return NextResponse.json({ error: 'GOOGLE_CLOUD_PROJECT not configured' }, { status: 500 })
  }

  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
    ...(credentialsJson ? { credentials: JSON.parse(credentialsJson) } : {}),
  })
  const accessToken = await auth.getAccessToken()
  if (!accessToken) {
    return NextResponse.json({ error: 'Failed to obtain Google access token' }, { status: 500 })
  }

  const prompt = `Jsi expert na analýzu smluv. Analyzuj přiložený dokument a extrahuj údaje.

OBECNÁ PRAVIDLA:
1. Pokud údaj nenajdeš, použij null
2. Čísla bez mezer a jednotek (např. 1500 ne "1 500 Kč")
3. Datumy vždy ve formátu YYYY-MM-DD

POSKYTOVATEL:
- Název firmy která poskytuje službu (dodavatel, pojišťovna, banka, operátor...)
- NIKDY ne jméno zákazníka

KONTAKTNÍ ÚDAJE:
- Telefon a email DODAVATELE/POSKYTOVATELE (zákaznická linka, infolinka, kontakt firmy)
- NIKDY ne telefon ani email zákazníka nebo podepsané osoby

VÝPOČET DATUMU KONCE (valid_until):
- Pokud je datum konce přímo uvedeno → použij ho
- Pokud je uveden datum začátku + délka v měsících → přičti měsíce k datu začátku
- Pokud je uveden datum začátku + "na X roků" → přičti roky k datu začátku
- Příklad: začátek 2025-05-21 + 36 měsíců = valid_until 2028-05-21
- Smlouva na dobu neurčitou → valid_until = null

KATEGORIE - vyber JEDNU:
- energie = elektřina
- plyn = zemní plyn
- internet = internet, WiFi, optika
- tv = televize, kabelová TV, satelit, streaming
- mobilni_tarif = mobilní telefon, SIM, volání, data
- pojisteni_auto = pojištění vozidla, povinné ručení, havarijní
- pojisteni_domacnost = pojištění bytu, domu, domácnosti
- pojisteni_zivot = životní pojištění
- pojisteni_zdravi = zdravotní nebo nemocenské pojištění
- hypoteka = hypoteční úvěr
- spotrebitelsky_uver = půjčka, spotřebitelský úvěr
- leasing = finanční nebo operativní leasing
- najemni = nájem bytu nebo domu
- prace = pracovní smlouva, DPČ, DPP
- sluzby = smlouva o dílo, servis, poskytování služeb
- dodavatelska = dodavatelská nebo odběratelská smlouva
- nda = smlouva o mlčenlivosti
- kupni = kupní smlouva
- darovaci = darovací smlouva
- ostatni = vše ostatní

PLATBA (monthly_payment + payment_frequency):
- monthly_payment = částka jedné platby TAK JAK JE UVEDENA ve smlouvě (nepřepočítávej!)
- payment_frequency = jak často se platí:
  - monthly = měsíčně (zálohy, paušály, splátky, nájem)
  - quarterly = čtvrtletně
  - yearly = ročně (roční pojistné, roční předplatné)
- Pokud frekvence není jasná, použij "monthly" jako výchozí

SPECIÁLNĚ PRO ELEKTŘINU (kategorie energie):
- unit_price_low = OBCHODNÍ cena za MWh S DPH
- fixed_fee = OBCHODNÍ stálá platba S DPH
- Do notes zapiš: distribuční sazbu, produkt
- IGNORUJ distribuční část ceny

SPECIÁLNĚ PRO PLYN (kategorie plyn):
- unit_price_low = OBCHODNÍ cena za MWh nebo m³ S DPH
- fixed_fee = OBCHODNÍ stálá platba S DPH
- Do notes zapiš: distribuční sazbu a produkt
- IGNORUJ distribuční část ceny

PRO OSTATNÍ KATEGORIE:
- unit_price_low = null
- fixed_fee = null`

  try {
    const response = await fetch(
      `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema,
          }
        })
      }
    )

    if (!response.ok) {
      const err = await response.text()
      await serviceClient.from('ai_usage_log').insert({
        user_id: userId,
        success: false,
        error_message: `HTTP ${response.status}: ${err.substring(0, 200)}`
      })
      return NextResponse.json({ error: 'Chyba při zpracování dokumentu' }, { status: 502 })
    }

    const data = await response.json()

    const parts = data.candidates?.[0]?.content?.parts || []
    const textPart = parts.find((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
    const text = textPart?.text || parts[parts.length - 1]?.text || '{}'

    try {
      const parsed = JSON.parse(text)

      // Validate category
      if (parsed.category && !VALID_CATEGORIES.includes(parsed.category)) {
        parsed.category = 'ostatni'
      }

      // Validate payment frequency
      const validFrequencies = ['monthly', 'quarterly', 'yearly']
      if (parsed.payment_frequency && !validFrequencies.includes(parsed.payment_frequency)) {
        parsed.payment_frequency = 'monthly'
      }

      // Validate date formats
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (parsed.valid_from && !dateRegex.test(parsed.valid_from)) {
        parsed.valid_from = null
      }
      if (parsed.valid_until && !dateRegex.test(parsed.valid_until)) {
        parsed.valid_until = null
      }

      // Ensure numeric fields are numbers
      for (const field of ['monthly_payment', 'unit_price_low', 'fixed_fee'] as const) {
        if (parsed[field] !== null && parsed[field] !== undefined) {
          const num = Number(parsed[field])
          parsed[field] = isNaN(num) ? null : num
        }
      }

      await serviceClient.from('ai_usage_log').insert({
        user_id: userId,
        success: true
      })
      return NextResponse.json(parsed)
    } catch {
      await serviceClient.from('ai_usage_log').insert({
        user_id: userId,
        success: false,
        error_message: 'Nevalidní JSON od AI'
      })
      return NextResponse.json(
        { error: 'AI vrátila nevalidní JSON: ' + text.substring(0, 200) },
        { status: 500 }
      )
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await serviceClient.from('ai_usage_log').insert({
      user_id: userId,
      success: false,
      error_message: msg
    })
    return NextResponse.json({ error: 'Chyba při zpracování dokumentu' }, { status: 500 })
  }
}
