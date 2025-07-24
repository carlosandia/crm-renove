import React from 'react'
import { Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AuthProvider from './providers/AuthProvider'
import { ModalProvider } from './contexts/ModalContext'
import { Toaster } from './components/ui/toaster'
import SafeErrorBoundary from './components/SafeErrorBoundary'
import { logger } from './utils/logger'
import './App.css'

// Configurar QueryClient com configurações otimizadas
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (substituiu cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
})

function App() {
  logger.system('App component renderizado - VERSÃO COMPLETA CORRIGIDA')
  
  return (
    <SafeErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ModalProvider>
            <div className="min-h-screen bg-gray-50">
              <Outlet />
              <Toaster />
            </div>
          </ModalProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeErrorBoundary>
  )
}

export default App
