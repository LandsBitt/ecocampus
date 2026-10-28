import { useEffect, useState } from 'react'

import { formatNumber } from '@/lib/formatters'

/**
 * Medidor de água: o líquido sobe até o consumo do mês, numa escala que vai
 * um pouco além do maior mês dos últimos 12; a linha tracejada é a média do
 * período. Acima da linha, o mês gastou mais que o normal.
 */
export function TanqueAgua({
  valor,
  serie,
  className
}: {
  valor: number
  /** Consumo de água (m³) dos últimos meses, para a escala e a média. */
  serie: number[]
  className?: string
}) {
  const comDado = serie.filter((v) => v > 0)
  const maior = Math.max(valor, ...comDado, 1)
  const escala = maior * 1.12
  const media = comDado.length ? comDado.reduce((a, b) => a + b, 0) / comDado.length : null
  const nivel = Math.min(100, (valor / escala) * 100)
  const nivelMedia = media === null ? null : (media / escala) * 100

  // Sobe a partir do fundo na primeira pintura (a transição de altura faz o resto).
  const [altura, setAltura] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setAltura(nivel))
    return () => cancelAnimationFrame(id)
  }, [nivel])

  const rotulo =
    `Medidor: ${formatNumber(valor, 0)} metros cúbicos` +
    (media === null ? '' : `, ${valor > media ? 'acima' : 'abaixo'} da média de ${formatNumber(media, 0)}`)

  return (
    <div
      role="img"
      aria-label={rotulo}
      className={`relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-b from-surface-sunken to-surface ${className ?? ''}`}
    >
      {nivelMedia !== null && (
        <div className="absolute inset-x-0 z-10 border-t border-dashed border-input" style={{ bottom: `${nivelMedia}%` }}>
          <span className="absolute -top-6 right-2.5 rounded-full bg-surface/90 px-2 py-0.5 text-2xs font-semibold text-muted-foreground">
            média · {formatNumber(media, 0)}
          </span>
        </div>
      )}
      <div className="tanque__liquido" style={{ height: `${altura}%` }}>
        <svg className="tanque__onda tanque__onda--fundo" viewBox="0 0 400 22" preserveAspectRatio="none" aria-hidden>
          <path d="M0 11 Q 25 0 50 11 T 100 11 T 150 11 T 200 11 T 250 11 T 300 11 T 350 11 T 400 11 V 22 H 0 Z" />
        </svg>
        <svg className="tanque__onda" viewBox="0 0 400 22" preserveAspectRatio="none" aria-hidden>
          <path d="M0 11 Q 25 22 50 11 T 100 11 T 150 11 T 200 11 T 250 11 T 300 11 T 350 11 T 400 11 V 22 H 0 Z" />
        </svg>
      </div>
    </div>
  )
}
