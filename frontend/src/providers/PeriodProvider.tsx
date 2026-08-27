import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react'

import { getCurrentMonth, isValidMonth, shiftMonth } from '@/lib/date'

const STORAGE_KEY = 'ecocampus:mes'

interface PeriodContextValue {
  /** Mês de referência global no formato YYYY-MM. */
  mes: string
  setMes: (mes: string) => void
  /** Avança ou volta um mês. */
  step: (offset: number) => void
  /** Volta para o mês corrente. */
  reset: () => void
  isCurrent: boolean
}

const PeriodContext = createContext<PeriodContextValue | null>(null)

function readStored(): string {
  if (typeof window === 'undefined') return getCurrentMonth()
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isValidMonth(stored) ? stored : getCurrentMonth()
}

/**
 * O mês selecionado é global: trocar o período no Dashboard mantém a
 * escolha ao navegar para Lançamentos ou Relatórios. Sem isso o usuário
 * reajusta o mesmo filtro em cada tela.
 */
export function PeriodProvider({ children }: { children: ReactNode }) {
  const [mes, setMesState] = useState<string>(readStored)

  const setMes = useCallback((next: string) => {
    if (!isValidMonth(next)) return
    setMesState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* modo privado: segue apenas em memória */
    }
  }, [])

  const step = useCallback((offset: number) => setMes(shiftMonth(mes, offset)), [mes, setMes])
  const reset = useCallback(() => setMes(getCurrentMonth()), [setMes])

  const value = useMemo(
    () => ({ mes, setMes, step, reset, isCurrent: mes === getCurrentMonth() }),
    [mes, setMes, step, reset]
  )

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}

export function usePeriod() {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error('usePeriod precisa estar dentro de PeriodProvider')
  return ctx
}
