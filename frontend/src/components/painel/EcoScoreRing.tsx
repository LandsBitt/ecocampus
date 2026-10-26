import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'

import { Numero } from './Numero'
import { styleForScore } from '@/lib/ecoScore'

/**
 * Anel do Eco Score: o arco enche até a nota com a cor do semáforo
 * (verde Ecológico, amarelo Na média, vermelho Crítico). Sem nota, o anel
 * fica vazio e o centro mostra um traço, nunca zero.
 */
export function EcoScoreRing({ score, tamanho = 248 }: { score: number | null; tamanho?: number }) {
  const reduzir = useReducedMotion()
  const gradiente = useId()
  const espessura = Math.round(tamanho * 0.072)
  const raio = (tamanho - espessura) / 2 - 2
  const volta = 2 * Math.PI * raio
  const tom = score === null ? null : styleForScore(score).tone
  const cor = tom ? `hsl(var(--${tom}))` : 'transparent'
  const alvo = score === null ? volta : volta * (1 - Math.max(0, Math.min(100, score)) / 100)

  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden>
        <defs>
          <linearGradient id={gradiente} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={cor} />
            <stop offset="100%" stopColor={cor} stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke="hsl(var(--surface-raised))"
          strokeWidth={espessura}
        />
        {score !== null && (
          <motion.circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={raio}
            fill="none"
            stroke={`url(#${gradiente})`}
            strokeWidth={espessura}
            strokeLinecap="round"
            strokeDasharray={volta}
            transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
            initial={reduzir ? false : { strokeDashoffset: volta }}
            animate={{ strokeDashoffset: alvo }}
            transition={{ duration: 1.6, ease: [0.32, 0.72, 0, 1] }}
            style={{ filter: `drop-shadow(0 0 14px hsl(var(--${tom}) / 0.35))` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <Numero valor={score} casas={1} className="text-[clamp(3rem,6vw,4.75rem)]" />
          <div className="mt-1.5 text-sm text-subtle">de 100</div>
        </div>
      </div>
    </div>
  )
}
