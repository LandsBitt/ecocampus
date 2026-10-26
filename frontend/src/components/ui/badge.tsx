import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border font-semibold leading-none [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-border bg-muted text-muted-foreground',
        brand: 'border-brand/25 bg-brand-soft text-brand',
        outline: 'border-border bg-transparent text-muted-foreground',
        success: 'border-success/25 bg-success-soft text-success',
        warning: 'border-warning/25 bg-warning-soft text-warning',
        destructive: 'border-destructive/25 bg-destructive-soft text-destructive',
        water: 'border-water/25 bg-water-soft text-water',
        energy: 'border-energy/25 bg-energy-soft text-energy',
        eco: 'border-eco/25 bg-eco-soft text-eco',
        secondary: 'border-border bg-secondary text-secondary-foreground'
      },
      size: {
        sm: 'px-2 py-1 text-2xs',
        md: 'px-2.5 py-1.5 text-xs'
      }
    },
    defaultVariants: { variant: 'default', size: 'md' }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** Encaminha a ref porque é usado como gatilho de tooltip (Radix `asChild`). */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
)
Badge.displayName = 'Badge'

/** Ponto de status colorido — herda a cor do texto do elemento pai. */
function Dot({ className }: { className?: string }) {
  return <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full bg-current', className)} />
}

export { Badge, badgeVariants, Dot }
