import { useEffect, useState } from 'react'

import { useTheme } from '@/providers/ThemeProvider'

/**
 * O Recharts escreve as cores como atributos de apresentação no SVG, e
 * `var(--token)` não é resolvido nesse contexto. Por isso lemos os tokens
 * do CSS em tempo de execução e devolvemos strings hsl() concretas,
 * recalculadas sempre que o tema muda.
 */

const TOKENS = [
  'water',
  'energy',
  'eco',
  'brand',
  'foreground',
  'muted-foreground',
  'subtle-foreground',
  'border',
  'surface',
  'popover',
  'success',
  'warning',
  'destructive',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
  'chart-7',
  'chart-8'
] as const

type Token = (typeof TOKENS)[number]
export type ChartColors = Record<Token, string> & { categorical: string[] }

function read(name: string): string {
  if (typeof window === 'undefined') return 'hsl(0 0% 50%)'
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
  return raw ? `hsl(${raw})` : 'hsl(0 0% 50%)'
}

function snapshot(): ChartColors {
  const entries = Object.fromEntries(TOKENS.map((t) => [t, read(t)])) as Record<Token, string>
  return {
    ...entries,
    categorical: [
      entries['chart-1'],
      entries['chart-2'],
      entries['chart-3'],
      entries['chart-4'],
      entries['chart-5'],
      entries['chart-6'],
      entries['chart-7'],
      entries['chart-8']
    ]
  }
}

export function useChartColors(): ChartColors {
  const { resolved } = useTheme()
  const [colors, setColors] = useState<ChartColors>(snapshot)

  useEffect(() => {
    // A classe .dark é aplicada num efeito do ThemeProvider; o rAF garante
    // que a leitura aconteça depois do estilo já ter sido recalculado.
    const frame = requestAnimationFrame(() => setColors(snapshot()))
    return () => cancelAnimationFrame(frame)
  }, [resolved])

  return colors
}

/** Cor de uma medida específica. */
export function medidaColor(colors: ChartColors, tipo: 'agua' | 'luz'): string {
  return tipo === 'agua' ? colors.water : colors.energy
}

/** Estilo compartilhado dos eixos — mantém todos os gráficos coerentes. */
export function axisProps(colors: ChartColors) {
  return {
    stroke: colors.border,
    tick: { fill: colors['subtle-foreground'], fontSize: 11 },
    tickLine: false,
    axisLine: false
  } as const
}
