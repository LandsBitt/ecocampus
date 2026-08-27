import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'

import { cn } from '@/lib/utils'

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { hint?: React.ReactNode }
>(({ className, children, hint, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'flex items-center gap-1.5 text-[0.8125rem] font-medium text-foreground peer-disabled:opacity-70',
      className
    )}
    {...props}
  >
    {children}
    {hint}
  </LabelPrimitive.Root>
))
Label.displayName = LabelPrimitive.Root.displayName

/** Campo de formulário completo: rótulo, controle, texto de ajuda e erro. */
function Field({
  label,
  htmlFor,
  hint,
  help,
  error,
  children,
  className
}: {
  label?: React.ReactNode
  htmlFor?: string
  hint?: React.ReactNode
  help?: React.ReactNode
  error?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} hint={hint}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : help ? (
        <p className="text-xs leading-relaxed text-subtle">{help}</p>
      ) : null}
    </div>
  )
}

export { Label, Field }
