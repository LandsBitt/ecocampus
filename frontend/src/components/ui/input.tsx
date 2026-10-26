import * as React from 'react'

import { cn } from '@/lib/utils'

export const inputBase =
  'w-full rounded-md border border-input bg-surface-sunken text-[0.9375rem] text-foreground transition-[border-color,box-shadow] placeholder:text-subtle focus-visible:outline-none focus-visible:border-ring focus-visible:shadow-focus disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60'

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
          'h-11 px-4 py-2',
          'file:mr-3 file:-ml-3 file:h-full file:cursor-pointer file:border-0 file:border-r file:border-border file:bg-muted file:px-3 file:text-xs file:font-medium file:text-foreground',
          icon && 'pl-10',
          suffix && 'pr-14',
          invalid &&
            'border-destructive focus-visible:border-destructive',
          className
        )}
        {...props}
      />
    )

    if (!icon && !suffix) return field

    return (
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle [&_svg]:size-4">
            {icon}
          </span>
        )}
        {field}
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
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
  <textarea ref={ref} className={cn(inputBase, 'min-h-24 px-4 py-3', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export { Input, Textarea }
