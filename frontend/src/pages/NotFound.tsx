import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-6xl font-bold text-muted-foreground/30">404</p>
      <h1 className="font-display text-2xl font-semibold">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        O endereço acessado não existe ou foi movido. Volte para o painel principal.
      </p>
      <Button asChild>
        <Link to="/dashboard">
          <Home className="h-4 w-4" />
          Voltar ao dashboard
        </Link>
      </Button>
    </div>
  )
}
