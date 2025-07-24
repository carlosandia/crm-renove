import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import { useAuth } from './contexts/AuthContext'
import './index.css'

console.log('🚀 Main.tsx carregado - renderizando App completo com React Router v7 Future Flags')

// 🚀 OTIMIZAÇÃO: Lazy loading de componentes pesados
const AppDashboard = lazy(() => import('./components/AppDashboard'))
const PublicFormRoute = lazy(() => import('./components/FormBuilder/PublicFormRoute'))
const GoogleCalendarCallback = lazy(() => import('./components/GoogleCalendarCallback'))
const AccountActivation = lazy(() => import('./components/AccountActivation'))
const ModernLoginForm = lazy(() => import('./components/auth/ModernLoginForm').then(module => ({ default: module.ModernLoginForm })))

// ✅ CORREÇÃO: Loading mais rápido e menos intrusivo
const LoadingFallback = React.memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-2 text-sm text-gray-500">Iniciando...</p>
    </div>
  </div>
))

// 🔧 CORREÇÃO: Componente wrapper para rotas protegidas (sem Navigate)
const ProtectedDashboard = React.memo(() => {
  const { user, loading } = useAuth()
  
  React.useEffect(() => {
    if (!loading && !user) {
      // Usar window.location para redirecionamento sem warnings
      window.location.replace('/login')
    }
  }, [user, loading])
  
  if (loading) {
    return <LoadingFallback />
  }
  
  if (!user) {
    return <LoadingFallback />
  }
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppDashboard />
    </Suspense>
  )
})

// 🔧 CORREÇÃO: Componente wrapper para login com redirecionamento (sem Navigate)
const LoginWrapper = React.memo(() => {
  const { user } = useAuth()
  
  React.useEffect(() => {
    if (user) {
      // Usar window.location para redirecionamento sem warnings
      window.location.replace('/')
    }
  }, [user])
  
  if (user) {
    return <LoadingFallback />
  }
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ModernLoginForm />
    </Suspense>
  )
})

// 🔧 CORREÇÃO: Configurar React Router com Future Flags para v7 e rotas completas
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
  future: {
    // 🚀 OTIMIZAÇÃO: Future flags para React Router v7
    v7_startTransition: true,           // Wrapping state updates em React.startTransition
    v7_relativeSplatPath: true,         // Resolução aprimorada de paths relativos
    v7_fetcherPersist: true,            // Persistência de estado do fetcher
    v7_normalizeFormMethod: true,       // Normalização de métodos de formulário
    v7_partialHydration: true,          // Hidratação parcial em SSR
    v7_skipActionErrorRevalidation: true // Evitar revalidação em erros de ação
  }
})

// Renderizar a aplicação completa
const root = document.getElementById('root')
if (root) {
  console.log('✅ Elemento root encontrado')
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
