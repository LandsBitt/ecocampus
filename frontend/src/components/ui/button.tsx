import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:translate-y-px',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0'
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-foreground shadow-xs hover:bg-brand-strong',
        default: 'bg-brand text-brand-foreground shadow-xs hover:bg-brand-strong',
        secondary:
          'border border-border bg-surface text-foreground shadow-xs hover:border-border-strong hover:bg-muted',
        outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        subtle: 'bg-muted text-foreground hover:bg-secondary',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        'destructive-ghost': 'text-destructive hover:bg-destructive-soft hover:text-destructive',
        link: 'h-auto p-0 text-brand underline-offset-4 hover:underline'
      },
      size: {
        xs: 'h-7 rounded-sm px-2 text-2xs [&_svg]:size-3.5',
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        md: 'h-9 px-3.5 text-sm [&_svg]:size-4',
        lg: 'h-11 px-6 text-sm [&_svg]:size-4',
        icon: 'h-9 w-9 [&_svg]:size-4',
        'icon-sm': 'h-8 w-8 [&_svg]:size-4'
      }
    },
    defaultVariants: { variant: 'default', size: 'md' }
  }
)

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Mostra spinner e bloqueia o clique sem alterar o layout do botão. */
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      )
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
