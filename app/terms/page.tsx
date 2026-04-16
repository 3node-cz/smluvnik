import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Obchodní podmínky – Smluvník',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-navy-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-8 md:p-12">

        <Link href="/" className="text-sm text-teal-600 hover:underline mb-6 inline-block">
          ← Zpět na Smluvník
        </Link>

        <h1 className="text-3xl font-bold text-navy-900 mb-2">Obchodní podmínky</h1>
        <p className="text-navy-400 text-sm mb-8">Platné od 1. 5. 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">1. Provozovatel a kontakt</h2>
          <p className="text-navy-700 leading-relaxed">
            Provozovatelem služby Smluvník dostupné na adrese <strong>smluvnik.cz</strong> je:<br />
            <strong>Petr Sziliczai</strong>, IČO: 73264482<br />
            Kontakt: <a href="mailto:info@smluvnik.cz" className="text-teal-600 hover:underline">info@smluvnik.cz</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">2. Popis služby</h2>
          <p className="text-navy-700 leading-relaxed">
            Smluvník je webová aplikace umožňující evidenci smluv a dokumentů, sledování termínů
            platnosti, správu dodavatelů a automatickou extrakci dat z dokumentů pomocí umělé
            inteligence. Služba slouží výhradně jako organizační nástroj a <strong>neposkytuje
            právní, finanční ani jiné odborné poradenství</strong>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">3. Registrace a uživatelský účet</h2>
          <ul className="list-disc list-inside text-navy-700 space-y-2 leading-relaxed">
            <li>Registrací potvrzujete, že vám bylo dovršeno 18 let a že jste způsobilí k právním úkonům.</li>
            <li>Při registraci jste povinni uvádět pravdivé a aktuální údaje.</li>
            <li>Jste odpovědni za bezpečnost svých přihlašovacích údajů a za veškeré aktivity provedené pod vaším účtem.</li>
            <li>V případě podezření na neoprávněný přístup nás neprodleně kontaktujte na <a href="mailto:info@smluvnik.cz" className="text-teal-600 hover:underline">info@smluvnik.cz</a>.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">4. Plány a zkušební období</h2>
          <ul className="list-disc list-inside text-navy-700 space-y-2 leading-relaxed">
            <li>Služba je v současné době poskytována zdarma v rámci beta testování.</li>
            <li>Placené plány budou zavedeny v budoucnu; o jejich spuštění budete informováni e-mailem s předstihem nejméně 30 dní.</li>
            <li>Zkušební období u placených plánů trvá 7 dní zdarma bez nutnosti zadání platební karty.</li>
            <li>Provozovatel si vyhrazuje právo změnit rozsah bezplatného plánu. O podstatných změnách budou uživatelé informováni e-mailem.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">5. Pravidla používání</h2>
          <p className="text-navy-700 leading-relaxed mb-3">Při používání služby je zakázáno zejména:</p>
          <ul className="list-disc list-inside text-navy-700 space-y-2 leading-relaxed">
            <li>Nahrávat obsah, který je v rozporu s platným právem České republiky nebo EU.</li>
            <li>Pokoušet se o neoprávněný přístup k účtům jiných uživatelů nebo k infrastruktuře služby.</li>
            <li>Automatizovaně přistupovat ke službě způsobem, který by nadměrně zatěžoval servery.</li>
            <li>Sdílet přihlašovací údaje s třetími osobami.</li>
            <li>Používat službu ke komerčním účelům nad rámec vlastní správy smluv (v případě business plánů viz popis plánu).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">6. Obsah a vlastnictví dat</h2>
          <ul className="list-disc list-inside text-navy-700 space-y-2 leading-relaxed">
            <li>Veškerý obsah, který do služby nahrajete (smlouvy, dokumenty, poznámky), zůstává vaším vlastnictvím.</li>
            <li>Provozovatel nezpracovává vaše dokumenty pro jiné účely než pro poskytování služby.</li>
            <li>Dokumenty nahrané k AI extrakci jsou zpracovány jednorázově a nejsou používány pro trénink modelů umělé inteligence.</li>
            <li>Udělujete provozovateli omezenou licenci k uložení a zobrazení vašeho obsahu výhradně za účelem poskytování služby.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">7. Dostupnost služby</h2>
          <p className="text-navy-700 leading-relaxed">
            Provozovatel vynakládá přiměřené úsilí k zajištění dostupnosti služby, avšak
            <strong> nezaručuje nepřetržitou dostupnost</strong>, zejména z důvodu plánované
            údržby, technických problémů nebo okolností vyšší moci. V době beta testování
            může docházet k výpadkům nebo změnám funkcionality bez předchozího upozornění.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">8. Omezení odpovědnosti</h2>
          <div className="text-navy-700 leading-relaxed space-y-3">
            <p>
              Smluvník je organizační nástroj. <strong>Provozovatel nenese žádnou odpovědnost</strong> za:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Škody vzniklé v důsledku promeškání termínů nebo lhůt plynoucích ze smluv.</li>
              <li>Nesprávně extrahovaná data z dokumentů — výstupy AI extrakce jsou orientační a uživatel je povinen je ověřit.</li>
              <li>Ztrátu dat způsobenou okolnostmi mimo kontrolu provozovatele (výpadek třetích stran, vyšší moc).</li>
              <li>Právní nebo finanční důsledky plynoucí ze smluv spravovaných v aplikaci.</li>
              <li>Rozhodnutí učiněná na základě informací zobrazených v aplikaci.</li>
            </ul>
            <p>
              Celková odpovědnost provozovatele vůči uživateli je v každém případě omezena
              na výši poplatků zaplacených uživatelem za posledních 12 měsíců, nejméně však
              na 0 Kč v případě bezplatného využívání služby.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">9. Ukončení účtu</h2>
          <ul className="list-disc list-inside text-navy-700 space-y-2 leading-relaxed">
            <li>Svůj účet můžete kdykoliv zrušit v nastavení aplikace nebo zasláním žádosti na <a href="mailto:info@smluvnik.cz" className="text-teal-600 hover:underline">info@smluvnik.cz</a>.</li>
            <li>Po zrušení účtu budou veškerá data smazána do 30 dní.</li>
            <li>Provozovatel je oprávněn pozastavit nebo zrušit účet při závažném nebo opakovaném porušení těchto podmínek, a to bez nároku na náhradu.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">10. Změny podmínek</h2>
          <p className="text-navy-700 leading-relaxed">
            Provozovatel si vyhrazuje právo tyto podmínky změnit. O podstatných změnách budou
            uživatelé informováni e-mailem nejméně <strong>14 dní předem</strong>. Pokračováním
            v používání služby po nabytí účinnosti změn uživatel vyjadřuje souhlas s novými podmínkami.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-navy-900 mb-3">11. Rozhodné právo a řešení sporů</h2>
          <p className="text-navy-700 leading-relaxed">
            Tyto podmínky se řídí právním řádem České republiky. Případné spory budou řešeny
            přednostně mimosoudní cestou. Spotřebitelé mají právo obrátit se na Českou obchodní
            inspekci (<a href="https://www.coi.cz" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">coi.cz</a>) nebo využít platformu pro online řešení sporů
            (<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">ec.europa.eu/consumers/odr</a>).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy-900 mb-3">12. Kontakt</h2>
          <p className="text-navy-700 leading-relaxed">
            Dotazy k těmto podmínkám zasílejte na{' '}
            <a href="mailto:info@smluvnik.cz" className="text-teal-600 hover:underline">info@smluvnik.cz</a>.
          </p>
        </section>

      </div>
    </div>
  )
}
