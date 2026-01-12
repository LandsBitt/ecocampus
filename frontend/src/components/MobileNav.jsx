import { NavLink } from 'react-router-dom'

export default function MobileNav({ isSuper, onSignOut }) {
  const base = 'flex-1 rounded-xl px-3 py-2 text-center text-xs font-medium'
  const linkClass = (isActive) =>
    `${base} ${isActive ? 'bg-cyan/20 text-pearl' : 'text-slate/70'}`

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-navy/80 p-2 backdrop-blur">
        <NavLink to="/dashboard" className={({ isActive }) => linkClass(isActive)}>
          Dashboard
        </NavLink>
        <NavLink to="/lancamentos" className={({ isActive }) => linkClass(isActive)}>
          Lançamentos
        </NavLink>
        {isSuper ? (
          <NavLink to="/super" className={({ isActive }) => linkClass(isActive)}>
            Relatórios
          </NavLink>
        ) : (
          <div className="flex items-center justify-center text-[10px] text-slate/40">Admin</div>
        )}
        <button type="button" className={`${base} text-ember`} onClick={onSignOut}>
          Sair
        </button>
      </div>
    </div>
  )
}