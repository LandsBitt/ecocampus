import type { ReactNode } from 'react'
import { AppHeader } from './AppHeader'

interface PageLayoutProps {
  title: string
  description?: string
  rightSlot?: ReactNode
  children: ReactNode
}

export function PageLayout({ title, description, rightSlot, children }: PageLayoutProps) {
  return (
    <>
      <AppHeader title={title} description={description} rightSlot={rightSlot} />
      <main className="flex-1 px-6 pb-12 pt-6">
        <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
      </main>
    </>
  )
}
