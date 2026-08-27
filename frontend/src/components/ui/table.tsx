import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Envelope com scroll horizontal próprio — a página nunca rola na horizontal. */
const TableWrap = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('w-full overflow-x-auto overscroll-x-contain', className)}
      {...props}
    />
  )
)
TableWrap.displayName = 'TableWrap'

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <TableWrap>
      <table
        ref={ref}
        className={cn('w-full caption-bottom border-collapse text-sm', className)}
        {...props}
      />
    </TableWrap>
  )
)
Table.displayName = 'Table'

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('bg-surface-sunken', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
))
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t border-border bg-surface-sunken font-medium', className)}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-border transition-colors last:border-0 hover:bg-muted/50 data-[state=selected]:bg-accent',
        className
      )}
      {...props}
    />
  )
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-10 whitespace-nowrap border-b border-border px-4 text-left align-middle text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground',
      className
    )}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

/** Cabeçalho clicável para ordenação, com indicador de direção. */
interface SortableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  active?: boolean
  direction?: 'asc' | 'desc'
  onSort?: () => void
  align?: 'left' | 'right'
}

const SortableHead = React.forwardRef<HTMLTableCellElement, SortableHeadProps>(
  ({ className, children, active, direction = 'asc', onSort, align = 'left', ...props }, ref) => {
    const Icon = !active ? ChevronsUpDown : direction === 'asc' ? ArrowUp : ArrowDown
    return (
      <TableHead ref={ref} className={cn('p-0', className)} aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'} {...props}>
        <button
          type="button"
          onClick={onSort}
          className={cn(
            'group flex h-10 w-full items-center gap-1.5 px-4 text-2xs font-semibold uppercase tracking-[0.08em] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            align === 'right' && 'justify-end',
            active ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {children}
          <Icon
            className={cn(
              'size-3 transition-opacity',
              active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
            )}
          />
        </button>
      </TableHead>
    )
  }
)
SortableHead.displayName = 'SortableHead'

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn('px-4 py-3 align-middle', className)} {...props} />
))
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn('mt-3 text-xs text-muted-foreground', className)} {...props} />
))
TableCaption.displayName = 'TableCaption'

export {
  Table,
  TableWrap,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  SortableHead,
  TableCell,
  TableCaption
}
