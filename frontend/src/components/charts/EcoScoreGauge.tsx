import { ECO_CONFIG, styleForScore, toneFill } from '@/lib/ecoScore'
import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface EcoScoreGaugeProps {
  /** `null` = sem nota (sem dados, sem cadastro ou fora do ranking): o arco fica vazio. */
  score: number | null
  size?: number
  className?: string
  /** Mostra as marcas de 40 e 70 que separam as três faixas. */
  showThresholds?: boolean
}

const START = -210 // graus: início do arco (à esquerda, abaixo da horizontal)
const SWEEP = 240 // abertura total do arco

function polar(cx: number, cy: number, radius: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, radius: number, from: number, to: number) {
  const start = polar(cx, cy, radius, from)
  const end = polar(cx, cy, radius, to)
  const large = Math.abs(to - from) > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`
}

/**
 * Medidor do Eco Score. Um arco comunica "posição numa escala" muito melhor
 * que um número solto: dá para ver de relance se a nota está perto do topo
 * ou do fundo, sem precisar saber o intervalo de cor.
 */
export function EcoScoreGauge({
  score,
  size = 160,
  className,
  showThresholds = true
}: EcoScoreGaugeProps) {
  const semNota = score === null
  const clamped = semNota ? 0 : Math.max(0, Math.min(100, score))
  const style = semNota ? null : styleForScore(clamped)
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 12
  const stroke = size < 120 ? 8 : 10
  const end = START + (clamped / 100) * SWEEP

  return (
    <div className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <path
          d={arcPath(cx, cy, radius, START, START + SWEEP)}
          className="stroke-muted"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
        {style && (
          <path
            d={arcPath(cx, cy, radius, START, end)}
            className={toneFill[style.tone].stroke}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
          />
        )}
        {showThresholds &&
          [ECO_CONFIG.attentionThreshold, ECO_CONFIG.ecoThreshold].map((threshold) => {
            const angle = START + (threshold / 100) * SWEEP
            const inner = polar(cx, cy, radius - stroke / 2 - 1, angle)
            const outer = polar(cx, cy, radius + stroke / 2 + 1, angle)
            return (
              <line
                key={threshold}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                className="stroke-background"
                strokeWidth={2}
              />
            )
          })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'font-display font-semibold leading-none tabular-nums',
            size < 120 ? 'text-xl' : 'text-3xl',
            style ? style.text : 'text-subtle'
          )}
        >
          {semNota ? '—' : formatNumber(clamped, 1)}
        </span>
        <span className="mt-1 text-2xs text-subtle">{semNota ? 'sem nota' : 'de 100'}</span>
      </div>
    </div>
  )
}

/** Barra horizontal de score — versão compacta para linhas de tabela. */
export function EcoScoreBar({ score, className }: { score: number | null; className?: string }) {
  if (score === null) {
    return (
      <div className={cn('flex items-center gap-2.5', className)}>
        <div className="h-1.5 w-full min-w-16 rounded-full bg-muted" />
        <span className="w-9 shrink-0 text-right text-[0.8125rem] tabular-nums text-subtle">—</span>
      </div>
    )
  }

  const clamped = Math.max(0, Math.min(100, score))
  const style = styleForScore(clamped)

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', toneFill[style.tone].bg)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-[0.8125rem] font-semibold tabular-nums">
        {formatNumber(clamped, 1)}
      </span>
    </div>
  )
}
