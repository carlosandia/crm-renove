'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppDashboard from '../../src/components/AppDashboard'

export default function AppPage() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Verificar se há usuário logado
    const storedUser = localStorage.getItem('crm_user')
    if (!storedUser) {
      router.push('/')
    }
  }, [router])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="crm-app">
      <AppDashboard />
    </div>
  )
} 