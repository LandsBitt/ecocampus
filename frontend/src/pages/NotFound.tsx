import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'

import { Brand } from '@/components/layout/Brand'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />

      <div className="relative max-w-md space-y-6 animate-rise">
        <Brand className="justify-center" />

        <div className="space-y-2">
          <p className="font-display text-6xl font-bold leading-none text-muted">404</p>
          <h1 className="font-display text-xl font-semibold text-foreground">
            Esta página não existe
          </h1>
          <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
            O endereço acessado não corresponde a nenhuma tela do sistema. Ele pode ter mudado ou
            você não tem acesso a ele.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft />
            Voltar
          </Button>
          <Button asChild>
            <Link to="/dashboard">
              <Home />
              Ir para a visão geral
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
