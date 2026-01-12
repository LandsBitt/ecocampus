import { formatCurrency } from '../lib/formatters'

const statusColors = {
  'Ecológico': 'text-emerald-200',
  'Atenção': 'text-amber-200',
  'Crítico': 'text-rose-200'
}

export default function EcoRankingTable({ items }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <table className="w-full text-sm">
        <thead className="bg-white/10 text-xs uppercase tracking-[0.18em] text-slate/70">
          <tr>
            <th className="px-5 py-4 text-left">Campus</th>
            <th className="px-5 py-4 text-left">Total</th>
            <th className="px-5 py-4 text-left">Eco score</th>
            <th className="px-5 py-4 text-left">Classificação</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-6 text-slate/60">
                Sem indicadores disponíveis.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.campusId} className="border-t border-white/10">
                <td className="px-5 py-4">{item.nome}</td>
                <td className="px-5 py-4">{formatCurrency(item.total)}</td>
                <td className="px-5 py-4">{item.ecoScore.toFixed(1)}</td>
                <td className={`px-5 py-4 ${statusColors[item.classificacao] || 'text-slate/70'}`}>
                  {item.classificacao}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}