import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthProvider from './providers/AuthProvider'
import { ModalProvider } from './contexts/ModalContext'
import LoginForm from './components/LoginForm'
import { Toaster } from './components/ui/toaster'
import SafeErrorBoundary from './components/SafeErrorBoundary'
import { useAuth } from './contexts/AuthContext'
import './App.css'

// 🚀 OTIMIZAÇÃO: Lazy loading de componentes pesados
const AppDashboard = lazy(() => import('./components/AppDashboard'))
const PublicFormRoute = lazy(() => import('./components/FormBuilder/PublicFormRoute'))
const GoogleCalendarCallback = lazy(() => import('./components/GoogleCalendarCallback'))

// 🚀 OTIMIZAÇÃO: Componente de loading otimizado
const LoadingFallback = React.memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Carregando...</p>
    </div>
  </div>
))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  console.log('🔍 ProtectedRoute - Debug:', { user: user?.email, loading })
  
  if (loading) {
    console.log('⏳ Aplicação carregando...')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando sistema...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    console.log('❌ Usuário não autenticado, redirecionando para login')
    return <Navigate to="/login" replace />
  }
  
  console.log('✅ Usuário autenticado:', user.email)
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  
  console.log('🚀 AppRoutes - Renderizando com usuário:', user?.email || 'não logado')
  
  return (
    <SafeErrorBoundary resetKeys={user?.id ? [user.id] : []}>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/form/:slug" element={<PublicFormRoute />} />
          <Route path="/auth/google/callback" element={<GoogleCalendarCallback />} />
          
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <LoginForm />} 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <AppDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </SafeErrorBoundary>
  )
}

function App() {
  console.log('🎯 App component renderizado - VERSÃO COMPLETA CORRIGIDA')
  
  return (
    <SafeErrorBoundary>
      <AuthProvider>
        <ModalProvider>
          <div className="min-h-screen bg-gray-50">
            <AppRoutes />
            <Toaster />
          </div>
        </ModalProvider>
      </AuthProvider>
    </SafeErrorBoundary>
  )
}

export default App
