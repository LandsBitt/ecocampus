import {
  Building2,
  ClipboardList,
  FileUp,
  LayoutDashboard,
  LifeBuoy,
  Trophy,
  UserCircle2,
  UsersRound,
  type LucideIcon
} from 'lucide-react'

import type { Role } from './types'

export interface NavItem {
  to: string
  label: string
  /** Frase curta usada no cabeçalho da página e na paleta de comandos. */
  description: string
  icon: LucideIcon
  roles?: Role[]
  group: 'analise' | 'dados' | 'conta'
}

/**
 * Fonte única da navegação. Sidebar, paleta de comandos e cabeçalho de
 * página leem daqui — adicionar uma rota em um lugar só a faz aparecer
 * nos três, já com o filtro de papel aplicado.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Visão geral',
    description: 'Consumo do mês, tendência e o que mudou',
    icon: LayoutDashboard,
    group: 'analise'
  },
  {
    to: '/relatorios',
    label: 'Relatórios',
    description: 'Ranking e comparação entre os campi',
    icon: Trophy,
    roles: ['super'],
    group: 'analise'
  },
  {
    to: '/lancamentos',
    label: 'Lançamentos',
    description: 'Registro mensal de água e energia',
    icon: ClipboardList,
    group: 'dados'
  },
  {
    to: '/importar',
    label: 'Importar planilha',
    description: 'Carregar as faturas do mês de uma vez',
    icon: FileUp,
    roles: ['super'],
    group: 'dados'
  },
  {
    to: '/campi',
    label: 'Campi',
    description: 'População e área usadas na comparação justa',
    icon: Building2,
    roles: ['super'],
    group: 'dados'
  },
  {
    to: '/usuarios',
    label: 'Usuários',
    description: 'Quem acessa o sistema e o que cada um vê',
    icon: UsersRound,
    roles: ['super'],
    group: 'dados'
  },
  {
    to: '/ajuda',
    label: 'Como funciona',
    description: 'Glossário e explicação dos indicadores',
    icon: LifeBuoy,
    group: 'conta'
  },
  {
    to: '/perfil',
    label: 'Perfil',
    description: 'Dados da conta e senha',
    icon: UserCircle2,
    group: 'conta'
  }
]

export const GROUP_LABELS: Record<NavItem['group'], string> = {
  analise: 'Análise',
  dados: 'Dados',
  conta: 'Conta'
}

export function visibleNav(role: Role | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)))
}

export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.to === pathname)
}
