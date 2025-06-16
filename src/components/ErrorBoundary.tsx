'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Verificar se é um erro que deve ser ignorado
    const ignoredErrors = [
      'Hydration',
      'Extra attributes from the server',
      'chrome-extension',
      'The message port closed before a response was received'
    ]

    const shouldIgnore = ignoredErrors.some(pattern => 
      error.message?.includes(pattern) || error.stack?.includes(pattern)
    )

    if (shouldIgnore) {
      // Não mostrar erro para problemas de hidratação
      return { hasError: false }
    }

    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log apenas erros importantes
    const ignoredErrors = [
      'Hydration',
      'Extra attributes from the server',
      'chrome-extension',
      'The message port closed before a response was received'
    ]

    const shouldIgnore = ignoredErrors.some(pattern => 
      error.message?.includes(pattern) || error.stack?.includes(pattern)
    )

    if (!shouldIgnore) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Algo deu errado
            </h2>
            <p className="text-gray-600 mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary 