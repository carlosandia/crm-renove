'use client'

import AuthProvider from '../src/providers/AuthProvider'
import ClientOnly from '../src/components/ClientOnly'
import ErrorBoundary from '../src/components/ErrorBoundary'
import '../src/utils/suppressWarnings'
import '../src/utils/safeErrorSuppressor'

const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-2 text-gray-600 text-sm">Carregando sistema...</p>
    </div>
  </div>
)

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      <ClientOnly fallback={<LoadingFallback />}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ClientOnly>
    </ErrorBoundary>
  )
} 