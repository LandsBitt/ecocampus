import { formatCurrency } from '../lib/formatters'

const cardBase =
  'rounded-2xl border border-white/10 bg-white/5 p-5 shadow-card transition hover:-translate-y-1'

export default function SummaryCards({ summary }) {
  const cards = [
    { label: 'Água mês', value: summary?.agua || 0, accent: 'text-cyan' },
    { label: 'Luz mês', value: summary?.luz || 0, accent: 'text-aqua' },
    { label: 'Total mês', value: summary?.total || 0, accent: 'text-pearl' },
    {
      label: 'Total geral universidade',
      value: summary?.totalGeral || 0,
      accent: 'text-ember'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`${cardBase} animate-rise`}
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate/60">{card.label}</p>
          <p className={`mt-4 text-2xl font-display ${card.accent}`}>
            {formatCurrency(card.value)}
          </p>
        </div>
      ))}
    </div>
  )
}
