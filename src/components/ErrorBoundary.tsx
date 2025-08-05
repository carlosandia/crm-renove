import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  // ✅ CORREÇÃO PROBLEMA #13: Props mais robustas para error boundary
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  errorId?: string // Identificador para debugging
  retryable?: boolean // Se permite retry
}

interface State {
  hasError: boolean
  error?: Error
  errorId?: string
  retryCount: number
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false, 
      retryCount: 0 
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // ✅ CORREÇÃO PROBLEMA #13: Error boundary mais robusta
    const ignoredErrors = [
      'Hydration',
      'Extra attributes from the server',
      'chrome-extension',
      'The message port closed before a response was received',
      'ChunkLoadError', // Erros de lazy loading
      'Loading chunk'
    ]

    const shouldIgnore = ignoredErrors.some(pattern => 
      error.message?.includes(pattern) || error.stack?.includes(pattern)
    )

    if (shouldIgnore) {
      return { hasError: false }
    }

    // ✅ Gerar ID único para o erro para debugging
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return { 
      hasError: true, 
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ✅ CORREÇÃO PROBLEMA #13: Logging estruturado e callback customizado
    const ignoredErrors = [
      'Hydration',
      'Extra attributes from the server', 
      'chrome-extension',
      'The message port closed before a response was received',
      'ChunkLoadError',
      'Loading chunk'
    ]

    const shouldIgnore = ignoredErrors.some(pattern => 
      error.message?.includes(pattern) || error.stack?.includes(pattern)
    )

    if (!shouldIgnore) {
      // ✅ Log estruturado com contexto
      console.error('🚨 ErrorBoundary:', {
        errorId: this.state.errorId,
        componentId: this.props.errorId,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
        timestamp: new Date().toISOString()
      })

      // ✅ Callback customizado se fornecido
      this.props.onError?.(error, errorInfo)
    }
  }

  // ✅ CORREÇÃO PROBLEMA #13: Método retry para error boundaries
  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorId: undefined,
      retryCount: prevState.retryCount + 1
    }))
  }

  render() {
    if (this.state.hasError) {
      // ✅ CORREÇÃO PROBLEMA #13: Fallback mais robusto e informativo
      return this.props.fallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Algo deu errado
            </h2>
            
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'Ocorreu um erro inesperado.'}
            </p>
            
            {/* ✅ Informações de debug em desenvolvimento */}
            {import.meta.env.DEV && this.state.errorId && (
              <div className="bg-gray-100 p-3 rounded text-xs text-gray-700 mb-4">
                <strong>Debug ID:</strong> {this.state.errorId}<br />
                {this.props.errorId && <><strong>Component:</strong> {this.props.errorId}<br /></>}
                <strong>Tentativas:</strong> {this.state.retryCount}
              </div>
            )}
            
            <div className="space-y-2">
              {/* ✅ Botão retry se habilitado */}
              {this.props.retryable !== false && this.state.retryCount < 3 && (
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Tentar Novamente ({3 - this.state.retryCount} tentativas restantes)
                </button>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Recarregar Página
              </button>
              
              <button
                onClick={() => window.history.back()}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary 