import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { base64, mimeType, userId } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!base64 || !mimeType) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not configured' }, { status: 500 })
  }

  const prompt = `Jsi expert na analýzu smluv. Analyzuj přiložený dokument a extrahuj údaje do JSON.

OBECNÁ PRAVIDLA:
1. Vrať POUZE validní JSON, žádný text před ani po, žádné markdown bloky
2. Pokud údaj nenajdeš, použij null
3. Čísla bez mezer a jednotek (např. 1500 ne "1 500 Kč")
4. Datumy vždy ve formátu YYYY-MM-DD

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

MĚSÍČNÍ PLATBA (monthly_payment):
- Energie a plyn: výše zálohy uvedená ve smlouvě
- Pojištění: roční pojistné děleno 12
- Hypotéka a leasing: výše měsíční splátky
- Nájem: výše měsíčního nájmu
- Internet, TV, mobil: výše měsíčního paušálu

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
- fixed_fee = null

Vrať tento JSON:
{
  "provider": "název dodavatele/poskytovatele",
  "contract_number": "číslo smlouvy nebo null",
  "category": "kategorie dle seznamu výše",
  "monthly_payment": číslo nebo null,
  "unit_price_low": číslo nebo null,
  "fixed_fee": číslo nebo null,
  "valid_from": "YYYY-MM-DD nebo null",
  "valid_until": "YYYY-MM-DD nebo null",
  "contact_phone": "telefon dodavatele nebo null",
  "contact_email": "email dodavatele nebo null",
  "notes": "tarif, produkt a další důležité info nebo null"
}

VRAŤ POUZE JSON. Žádný text, žádné vysvětlení, žádné markdown.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0,
            topP: 1,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!response.ok) {
      const err = await response.text()
      // Logovat neúspěch
      await supabase.from('ai_usage_log').insert({
        user_id: userId,
        success: false,
        error_message: `HTTP ${response.status}: ${err.substring(0, 200)}`
      })
      return NextResponse.json({ error: err }, { status: response.status })
    }

    const data = await response.json()

    const parts = data.candidates?.[0]?.content?.parts || []
    const textPart = parts.find((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
    const text = textPart?.text || parts[parts.length - 1]?.text || '{}'

    const clean = text.replace(/```json\n?|```\n?/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : clean

    try {
      const parsed = JSON.parse(jsonStr)
      // Logovat úspěch
      await supabase.from('ai_usage_log').insert({
        user_id: userId,
        success: true
      })
      return NextResponse.json(parsed)
    } catch {
      await supabase.from('ai_usage_log').insert({
        user_id: userId,
        success: false,
        error_message: 'Nevalidní JSON od AI'
      })
      return NextResponse.json(
        { error: 'AI vrátila nevalidní JSON: ' + jsonStr.substring(0, 200) },
        { status: 500 }
      )
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await supabase.from('ai_usage_log').insert({
      user_id: userId,
      success: false,
      error_message: msg
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
