import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-overlay backdrop-blur-[3px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

type ContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>

/**
 * Os diálogos daqui abrem por botões comuns, sem DialogTrigger; nesse caso o Radix
 * fecha e larga o foco no <body>, e quem usa teclado perde o lugar. Guarda quem
 * tinha o foco ao abrir e devolve ao fechar.
 */
export function useDevolverFoco({
  onOpenAutoFocus,
  onCloseAutoFocus
}: Pick<ContentProps, 'onOpenAutoFocus' | 'onCloseAutoFocus'>) {
  const origem = React.useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus(event: Event) {
      origem.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      onOpenAutoFocus?.(event)
    },
    onCloseAutoFocus(event: Event) {
      onCloseAutoFocus?.(event)
      const alvo = origem.current
      if (event.defaultPrevented || !alvo?.isConnected) return
      event.preventDefault()
      alvo.focus()
    }
  }
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ContentProps & { hideClose?: boolean }
>(({ className, children, hideClose, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) => {
  const foco = useDevolverFoco({ onOpenAutoFocus, onCloseAutoFocus })
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        {...foco}
        className={cn(
          'fixed z-50 grid gap-4 border border-border shadow-xl outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          // Celular: gaveta presa embaixo, perto do polegar, que sobe da borda.
          'inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] border-b-0 bg-surface px-5 pb-6 pt-3',
          'max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=open]:duration-300',
          // Telas maiores: janela de vidro no centro.
          'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border-b sm:p-7',
          'sm:glass sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      >
        <span aria-hidden className="mx-auto -mb-1 h-1.5 w-11 rounded-full bg-input sm:hidden" />
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="size-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 pr-8 text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
      // Na gaveta do celular a ação fica presa embaixo, ao alcance do polegar, mesmo com o formulário rolando.
      'max-sm:sticky max-sm:-bottom-6 max-sm:-mx-5 max-sm:-mb-6 max-sm:bg-surface max-sm:px-5 max-sm:pb-6 max-sm:pt-3',
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-display text-2xl font-bold leading-tight tracking-[-0.025em]', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm leading-relaxed text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
}
