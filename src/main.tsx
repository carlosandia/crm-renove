import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import App from './App'
import { useAuth } from './providers/AuthProvider'
import './index.css'

// ✅ OTIMIZAÇÃO: Importar controles de log para desenvolvimento
if (import.meta.env.DEV) {
  import('./utils/logger-controls');
}

console.log('🚀 Main.tsx carregado - renderizando App completo com React Router v7 Future Flags')

// 🔧 CORREÇÃO: Tratamento de erros de dynamic imports (baseado na documentação do Vite)
window.addEventListener('vite:preloadError', (event) => {
  console.error('🚨 Vite preload error:', event.payload);
  // Prevenir que o erro seja lançado e tentar recarregar a página
  event.preventDefault();
  console.log('🔄 Recarregando página devido a erro de preload...');
  window.location.reload();
})

// 🚀 OTIMIZAÇÃO: Lazy loading com tratamento de erro
const AppDashboard = lazy(() => import('./components/AppDashboard').catch(() => ({ default: () => <div>Erro ao carregar Dashboard</div> })))
const PublicFormRoute = lazy(() => import('./components/FormBuilder/PublicFormRoute').catch(() => ({ default: () => <div>Erro ao carregar Formulário</div> })))
const GoogleCalendarCallback = lazy(() => import('./components/GoogleCalendarCallback').catch(() => ({ default: () => <div>Erro ao carregar Google Calendar</div> })))
const AccountActivation = lazy(() => import('./components/AccountActivation').catch(() => ({ default: () => <div>Erro ao carregar Ativação</div> })))
const ModernLoginForm = lazy(() => import('./components/auth/ModernLoginForm')
  .then(module => ({ default: module.ModernLoginForm }))
  .catch(() => ({ default: () => <div>Erro ao carregar Login</div> })))

// ✅ CORREÇÃO: Loading mais rápido e menos intrusivo
const LoadingFallback = React.memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-2 text-sm text-gray-500">Iniciando...</p>
    </div>
  </div>
))

// 🔧 CORREÇÃO: Componente wrapper para rotas protegidas (simplificado)
const ProtectedDashboard = React.memo(() => {
  const { user, loading } = useAuth()
  
  console.log('🔍 [ProtectedDashboard] Estado:', { loading, user: user?.email || 'null' })
  
  if (loading) {
    return <LoadingFallback />
  }
  
  if (!user) {
    // Redirecionar para login usando React Router
    return <Navigate to="/login" replace />
  }
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppDashboard />
    </Suspense>
  )
})

// 🔧 CORREÇÃO: Componente wrapper para login (simplificado)
const LoginWrapper = React.memo(() => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingFallback />
  }
  
  if (user) {
    // Redirecionar para dashboard usando React Router
    return <Navigate to="/" replace />
  }
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ModernLoginForm />
    </Suspense>
  )
})

// 🔧 CORREÇÃO: React Router v6 com Future Flag para v7 preparação
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "form/:slug",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <PublicFormRoute />
          </Suspense>
        )
      },
      {
        path: "auth/google/callback",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <GoogleCalendarCallback />
          </Suspense>
        )
      },
      {
        path: "activate",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AccountActivation />
          </Suspense>
        )
      },
      {
        path: "login",
        element: <LoginWrapper />
      },
      {
        path: "",
        element: <ProtectedDashboard />
      },
      {
        path: "*",
        loader: () => {
          // Redirecionamento usando loader (sem Navigate)
          return Response.redirect('/', 302)
        },
        element: <LoadingFallback />
      }
    ]
  }
], {
  // ✅ CORREÇÃO: Future flags compatíveis com React Router v6.30.1
  future: {
    v7_relativeSplatPath: true,         // Novo comportamento de splat paths relativos
    v7_fetcherPersist: true,            // Persiste fetchers através de navegação
    v7_normalizeFormMethod: true,       // Normaliza form methods (GET/POST)
    v7_skipActionErrorRevalidation: true  // Skip revalidation em action errors (4xx/5xx)
  }
})

// Renderizar a aplicação completa
const root = document.getElementById('root')
if (root) {
  console.log('✅ Elemento root encontrado')
  ReactDOM.createRoot(root).render(
    <RouterProvider 
      router={router}
    />
  )
} else {
  console.error('❌ Elemento root não encontrado')
}
