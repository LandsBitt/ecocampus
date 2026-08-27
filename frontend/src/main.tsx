import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import App from './App'
import './index.css'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/providers/AuthProvider'
import { PeriodProvider } from '@/providers/PeriodProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Elemento raiz não encontrado')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PeriodProvider>
            <BrowserRouter>
              <TooltipProvider delayDuration={200} skipDelayDuration={300}>
                <App />
                <Toaster />
              </TooltipProvider>
            </BrowserRouter>
          </PeriodProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
)
