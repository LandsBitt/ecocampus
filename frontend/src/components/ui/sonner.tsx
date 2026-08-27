import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTheme } from '@/providers/ThemeProvider'

const Toaster = (props: ToasterProps) => {
  const { resolved } = useTheme()

  return (
    <Sonner
      theme={resolved}
      className="toaster group"
      position="bottom-right"
      offset={16}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:rounded-lg group-[.toaster]:border-border group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:shadow-lg',
          title: 'group-[.toast]:text-[0.8125rem] group-[.toast]:font-medium',
          description: 'group-[.toast]:text-xs group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-brand group-[.toast]:text-brand-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success: 'group-[.toaster]:text-success',
          error: 'group-[.toaster]:text-destructive',
          warning: 'group-[.toaster]:text-warning'
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
export { toast } from 'sonner'
