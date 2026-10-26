/**
 * Indicador de energia: o raio pulsa e um traçado de "eletrocardiograma"
 * corre embaixo. É só a assinatura visual do card; o número e a variação
 * ficam ao lado, em texto.
 */
export function PulsoEnergia({ tamanho = 168 }: { tamanho?: number }) {
  const nucleo = Math.round(tamanho * 0.66)
  return (
    <div className="flex flex-col items-center gap-4" aria-hidden>
      <div className="relative grid place-items-center" style={{ width: tamanho, height: tamanho }}>
        <span className="pulso__anel" />
        <span className="pulso__anel" />
        <span className="pulso__anel" />
        <span
          className="relative grid place-items-center rounded-full text-energy-fill"
          style={{
            width: nucleo,
            height: nucleo,
            background: 'radial-gradient(circle, hsl(var(--energy-fill) / 0.32), transparent 70%)'
          }}
        >
          <svg className="pulso__raio" width={Math.round(tamanho * 0.31)} height={Math.round(tamanho * 0.31)} viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
          </svg>
        </span>
      </div>
      <svg className="tracado h-10 w-full" viewBox="0 0 240 40" preserveAspectRatio="none">
        <path d="M0 20 H70 L80 20 L88 6 L98 34 L108 12 L116 20 H240" />
      </svg>
    </div>
  )
}
