import { NavLink } from 'react-router-dom'

import { useAuth } from '../providers/AuthProvider'

const navItemBase =
  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition'

export default function Sidebar({ isSuper }) {
  const { signOut } = useAuth()

  return (
    <aside className="hidden h-full w-64 flex-col justify-between border-r border-white/10 bg-navy/80 px-4 py-6 md:flex">
      <div>
        <div className="mb-10 px-3">
          <p className="font-display text-2xl text-pearl">ECOCAMPUS</p>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan/80">Sustentabilidade</p>
        </div>
        <nav className="space-y-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${navItemBase} ${
                isActive ? 'bg-cyan/20 text-pearl shadow-soft' : 'text-slate/80 hover:bg-white/5'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/lancamentos"
            className={({ isActive }) =>
              `${navItemBase} ${
                isActive ? 'bg-cyan/20 text-pearl shadow-soft' : 'text-slate/80 hover:bg-white/5'
              }`
            }
          >
            Lançamentos
          </NavLink>
          {isSuper && (
            <NavLink
              to="/super"
              className={({ isActive }) =>
                `${navItemBase} ${
                  isActive ? 'bg-cyan/20 text-pearl shadow-soft' : 'text-slate/80 hover:bg-white/5'
                }`
              }
            >
              Relatórios
            </NavLink>
          )}
        </nav>
      </div>
      <button
        type="button"
        onClick={signOut}
        className="mx-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate/80 transition hover:bg-white/10"
      >
        Sair
      </button>
    </aside>
  )
}