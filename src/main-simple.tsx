import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthProvider from './providers/AuthProvider'
import { ModernLoginForm } from './components/auth/ModernLoginForm'
import './index.css'

console.log('🚀 Main-simple.tsx carregado - versão simplificada para debug')

// Componente simples para testar
const SimpleApp: React.FC = () => {
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    console.log('🔍 [SimpleApp] Estado:', { loading, user: user?.email })
  }, [loading, user])

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md">
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h1 className="text-2xl font-bold text-center mb-6">
                🧪 Teste Simples
              </h1>
              <ModernLoginForm />
            </div>
          </div>
        </div>
      </div>
    </AuthProvider>
  )
}

// Renderizar
const root = document.getElementById('root')
if (root) {
  console.log('✅ Elemento root encontrado - renderizando versão simples')
  ReactDOM.createRoot(root).render(<SimpleApp />)
} else {
  console.error('❌ Elemento root não encontrado')
}