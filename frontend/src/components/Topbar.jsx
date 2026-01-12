const statusStyles = {
  'Ecológico': 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
  'Atenção': 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  'Crítico': 'bg-rose-500/15 text-rose-200 border-rose-400/30'
}

export default function Topbar({ title, campusLabel, status }) {
  const statusClass = statusStyles[status] || 'bg-white/10 text-slate/80 border-white/10'

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-cyan/70">{title}</p>
        <h1 className="font-display text-2xl text-pearl">{campusLabel}</h1>
      </div>
      <div className={`rounded-full border px-4 py-2 text-xs font-semibold ${statusClass}`}>
        Status ecológico: {status || 'Indisponível'}
      </div>
    </div>
  )
}