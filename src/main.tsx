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

// ✅ CORREÇÃO: Log apenas em desenvolvimento
if (import.meta.env.DEV) {
  console.log('🚀 Main.tsx carregado - renderizando App completo com React Router v7 Future Flags');
}

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
const OAuthCallback = lazy(() => import('./components/auth/OAuthCallback').catch(() => ({ default: () => <div>Erro ao carregar OAuth</div> })))
const AccountActivation = lazy(() => import('./components/AccountActivation').catch(() => ({ default: () => <div>Erro ao carregar Ativação</div> })))
const ModernLoginForm = lazy(() => import('./components/auth/ModernLoginForm')
  .then(module => ({ default: module.ModernLoginForm }))
  .catch(() => ({ default: () => <div>Erro ao carregar Login</div> })))

// ✅ CORREÇÃO: Loading removido em desenvolvimento, minimal em produção
const LoadingFallback = React.memo(() => {
  // Em desenvolvimento: sem loading intrusivo
  if (import.meta.env.DEV) {
    return null;
  }
  
  // Em produção: loading minimal e rápido
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white shadow-lg rounded-lg p-3 flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-700">Carregando...</span>
      </div>
    </div>
  );
})

// 🔧 CORREÇÃO: Componente wrapper para rotas protegidas (simplificado)
const ProtectedDashboard = React.memo(() => {
  const { user, loading } = useAuth()
  
  // ✅ CORREÇÃO: Log apenas em desenvolvimento e com throttling
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      const logData = { loading, user: user?.email || 'null' };
      console.log('🔍 [ProtectedDashboard] Estado:', logData);
    }
  }, [loading, user?.email])
  
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

// 🔧 CORREÇÃO: React Router v7 Future Flags para transição suave
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
        path: "oauth/callback",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <OAuthCallback />
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
        element: <Navigate to="/" replace />
      }
    ]
  }
])

// Renderizar a aplicação completa
const root = document.getElementById('root')
if (root) {
  if (import.meta.env.DEV) {
    console.log('✅ Elemento root encontrado');
  }
  ReactDOM.createRoot(root).render(
    <RouterProvider 
      router={router}
      future={{
        v7_startTransition: true
      }}
    />
  )
} else {
  console.error('❌ Elemento root não encontrado')
}
