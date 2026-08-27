import { useRef, useState } from 'react'
import { FileSpreadsheet, UploadCloud, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  file: File | null
  onFileChange: (file: File | null) => void
  accept?: string
  /** Extensões aceitas, mostradas ao usuário. */
  hint?: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Área de upload com arrastar-e-soltar e clique.
 * O input nativo continua presente e acessível pelo teclado; o visual é só
 * uma camada por cima dele.
 */
export function FileDropzone({
  file,
  onFileChange,
  accept = '.csv',
  hint = 'Arquivo .csv exportado da planilha'
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-sunken px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
          <FileSpreadsheet className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] font-medium text-foreground">{file.name}</p>
          <p className="text-2xs text-muted-foreground">{formatSize(file.size)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            onFileChange(null)
            if (inputRef.current) inputRef.current.value = ''
          }}
          aria-label="Remover arquivo"
        >
          <X />
        </Button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const dropped = event.dataTransfer.files?.[0]
        if (dropped) onFileChange(dropped)
      }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors',
        dragging ? 'border-brand bg-brand-soft' : 'border-border bg-surface-sunken hover:border-border-strong'
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UploadCloud className="size-5" />
      </span>
      <p className="text-[0.8125rem] font-medium text-foreground">
        Arraste o arquivo aqui ou clique para escolher
      </p>
      <p className="text-2xs text-muted-foreground">{hint}</p>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label="Escolher arquivo CSV"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </div>
  )
}
