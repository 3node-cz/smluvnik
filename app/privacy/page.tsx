import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zásady ochrany osobních údajů – Smluvník',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-navy-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-8 md:p-12">

        <Link href="/" className="text-sm text-teal-600 hover:underline mb-6 inline-block">
          ← Zpět na Smluvník
        </Link>

        <h1 className="text-3xl font-bold text-navy-900 mb-2">Zásady ochrany osobních údajů</h1>
        <p className="text-navy-400 text-sm mb-8">Platné od 1. 5. 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">1. Správce osobních údajů</h2>
          <p className="text-navy-700 leading-relaxed">
            Správcem osobních údajů je Petr Sziliczai, IČO: 73264482, provozovatel služby Smluvník
            dostupné na adrese <strong>smluvnik.cz</strong>.<br />
            Kontakt pro věci ochrany osobních údajů: <a href="mailto:info@smluvnik.cz" className="text-teal-600 hover:underline">info@smluvnik.cz</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">2. Jaké údaje zpracováváme</h2>
          <ul className="list-disc list-inside text-navy-700 space-y-2 leading-relaxed">
            <li><strong>Registrační údaje:</strong> jméno, e-mailová adresa</li>
            <li><strong>Obsah smluv:</strong> dokumenty a data, která do aplikace vložíte (název poskytovatele, datum, částky apod.)</li>
            <li><strong>Technické údaje:</strong> IP adresa, typ prohlížeče, časy přihlášení</li>
            <li><strong>Údaje o využívání:</strong> anonymizované statistiky návštěvnosti (Vercel Analytics)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">3. Účel zpracování</h2>
          <ul className="list-disc list-inside text-navy-700 space-y-2 leading-relaxed">
            <li>Poskytování a provoz služby Smluvník</li>
            <li>Zasílání upozornění na blížící se vypršení smluv</li>
            <li>Zpracování dokumentů pomocí AI extrakce</li>
            <li>Zlepšování kvality a bezpečnosti služby</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">4. Právní základ zpracování</h2>
          <p className="text-navy-700 leading-relaxed">
            Zpracování je nezbytné pro plnění smlouvy (čl. 6 odst. 1 písm. b GDPR) — tedy pro
            poskytování služby, o kterou jste požádali registrací. Statistiky návštěvnosti zpracováváme
            na základě oprávněného zájmu (čl. 6 odst. 1 písm. f GDPR).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">5. Kde jsou data uložena</h2>
          <p className="text-navy-700 leading-relaxed mb-3">
            Veškerá data jsou uložena výhradně na serverech v Evropské unii:
          </p>
          <ul className="list-disc list-inside text-navy-700 space-y-2">
            <li><strong>Supabase</strong> (databáze a soubory) — EU region</li>
            <li><strong>Google Vertex AI</strong> (AI extrakce dokumentů) — region europe-west4 (Nizozemí)</li>
            <li><strong>Vercel</strong> (hosting) — EU edge</li>
          </ul>
          <p className="text-navy-700 leading-relaxed mt-3">
            Dokumenty nahrané k AI extrakci jsou zpracovány jednorázově a nejsou používány pro trénink modelů.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">6. Jak dlouho data uchováváme</h2>
          <p className="text-navy-700 leading-relaxed">
            Vaše data uchováváme po celou dobu trvání vašeho účtu. Po zrušení účtu jsou veškerá
            osobní data smazána do 30 dní.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">7. Vaše práva</h2>
          <ul className="list-disc list-inside text-navy-700 space-y-2 leading-relaxed">
            <li><strong>Právo na přístup</strong> — můžete požádat o přehled dat, která o vás zpracováváme</li>
            <li><strong>Právo na opravu</strong> — můžete opravit nepřesné údaje přímo v nastavení účtu</li>
            <li><strong>Právo na výmaz</strong> — můžete požádat o smazání účtu a všech dat</li>
            <li><strong>Právo na přenositelnost</strong> — můžete požádat o export svých dat</li>
            <li><strong>Právo vznést námitku</strong> — proti zpracování na základě oprávněného zájmu</li>
          </ul>
          <p className="text-navy-700 mt-3">
            Žádosti zasílejte na <a href="mailto:info@smluvnik.cz" className="text-teal-600 hover:underline">info@smluvnik.cz</a>.
            Odpovíme do 30 dní. Máte také právo podat stížnost u{' '}
            <a href="https://www.uoou.cz" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
              Úřadu pro ochranu osobních údajů (uoou.cz)
            </a>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">8. Cookies</h2>
          <p className="text-navy-700 leading-relaxed">
            Aplikace používá technické cookies nezbytné pro přihlášení a provoz. Dále používáme
            anonymizovanou analytiku (Vercel Analytics) pro sledování návštěvnosti bez identifikace
            konkrétních uživatelů.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy-900 mb-3">9. Změny zásad</h2>
          <p className="text-navy-700 leading-relaxed">
            O podstatných změnách vás budeme informovat e-mailem. Aktuální verze je vždy dostupná
            na této stránce.
          </p>
        </section>

      </div>
    </div>
  )
}
