export default function Loading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="h-8 w-48 bg-navy-100 rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-white rounded-2xl border border-navy-100 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
