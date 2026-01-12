import { formatCurrency, formatMonth } from '../lib/formatters'

export default function LancamentosTable({ items, isSuper, showActions = true, onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <table className="w-full text-sm">
        <thead className="bg-white/10 text-xs uppercase tracking-[0.18em] text-slate/70">
          <tr>
            <th className="px-5 py-4 text-left">Mês</th>
            {isSuper && <th className="px-5 py-4 text-left">Campus</th>}
            <th className="px-5 py-4 text-left">Tipo</th>
            <th className="px-5 py-4 text-left">Valor</th>
            {isSuper && showActions && <th className="px-5 py-4 text-left">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={isSuper && showActions ? 5 : isSuper ? 4 : 3}
                className="px-5 py-6 text-slate/60"
              >
                Nenhum lançamento encontrado.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-t border-white/10">
                <td className="px-5 py-4">{formatMonth(item.mesReferencia)}</td>
                {isSuper && <td className="px-5 py-4">Campus {item.campusId}</td>}
                <td className="px-5 py-4 capitalize">{item.tipo}</td>
                <td className="px-5 py-4">{formatCurrency(item.valor)}</td>
                {isSuper && showActions && (
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
