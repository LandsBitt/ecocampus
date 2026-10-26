import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const cardVariants = cva('rounded-xl text-card-foreground transition-shadow', {
  variants: {
    variant: {
      /** Padrão do sistema: superfície com borda de 1px e sombra mínima. */
      default: 'border border-border bg-card shadow-md',
      /** Destaque: sombra maior, para painéis principais. */
      raised: 'border border-border bg-card shadow-lg',
      /** Sem peso visual: agrupa conteúdo sem competir com o dado. */
      flat: 'border border-border/70 bg-surface-sunken',
      /** Marca: no máximo uma por tela. */
      brand: 'border border-brand/25 bg-brand-soft'
    },
    interactive: {
      true: 'cursor-pointer hover:border-border-strong hover:shadow-md',
      false: ''
    }
  },
  defaultVariants: { variant: 'default', interactive: false }
})

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, interactive }), className)} {...props} />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { bordered?: boolean }
>(({ className, bordered = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-1 px-6 py-5', bordered && 'border-b border-border', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('font-display text-lg font-semibold leading-tight tracking-[-0.02em]', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm leading-relaxed text-muted-foreground', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 pb-6', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-2 border-t border-border px-6 py-4', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

/** Cabeçalho com título à esquerda e ações à direita — padrão de todos os painéis. */
function CardToolbar({
  title,
  description,
  children,
  className,
  bordered
}: {
  title: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  className?: string
  bordered?: boolean
}) {
  return (
    <CardHeader
      bordered={bordered}
      className={cn('sm:flex-row sm:items-center sm:justify-between sm:gap-4', className)}
    >
      <div className="min-w-0 space-y-1">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </CardHeader>
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardToolbar }
