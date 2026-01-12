export function FullScreenLoading({ label = 'Carregando...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-pearl font-display text-lg">
      <span className="animate-pulse">{label}</span>
    </div>
  )
}

export function InlineMessage({ title, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-slate">
      <p className="font-display text-lg text-pearl">{title}</p>
      <p className="text-sm text-slate/70">{description}</p>
    </div>
  )
}