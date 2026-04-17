'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-navy-900 mb-2">Nastala chyba</h2>
      <p className="text-navy-500 mb-6">Zkuste to prosím znovu nebo kontaktujte podporu.{error.digest ? ` (kód: ${error.digest})` : ''}</p>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-navy-800 text-white rounded-xl font-semibold text-sm hover:bg-navy-900 transition"
      >
        Zkusit znovu
      </button>
    </div>
  )
}
