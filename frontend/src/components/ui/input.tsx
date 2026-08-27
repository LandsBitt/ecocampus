import * as React from 'react'

import { cn } from '@/lib/utils'

export const inputBase =
  'w-full rounded-md border border-border bg-surface text-sm text-foreground shadow-xs transition-colors placeholder:text-subtle focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Ícone renderizado dentro do campo, à esquerda. */
  icon?: React.ReactNode
  /** Texto curto à direita (unidade, atalho). */
  suffix?: React.ReactNode
  invalid?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, suffix, invalid, ...props }, ref) => {
    const field = (
      <input
        type={type}
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          inputBase,
          'h-9 px-3 py-2',
          'file:mr-3 file:-ml-3 file:h-full file:cursor-pointer file:border-0 file:border-r file:border-border file:bg-muted file:px-3 file:text-xs file:font-medium file:text-foreground',
          icon && 'pl-9',
          suffix && 'pr-12',
          invalid &&
            'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25',
          className
        )}
        {...props}
      />
    )

    if (!icon && !suffix) return field

    return (
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle [&_svg]:size-4">
            {icon}
          </span>
        )}
        {field}
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-2xs text-subtle">
            {suffix}
          </span>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputBase, 'min-h-20 px-3 py-2', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export { Input, Textarea }
