import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  resetKeys?: Array<string | number>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  errorId?: string
}

class SafeErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Lista de erros que devem ser ignorados
    const ignoredErrors = [
      'Hydration',
      'Extra attributes from the server',
      'chrome-extension',
      'The message port closed before a response was received',
      'ResizeObserver loop limit exceeded',
      'Non-passive event listener',
      'Loading chunk',
      'ChunkLoadError',
      'Script error',
      'Network request failed',
      'Rendered more hooks than during the previous render',
      'Cannot update a component while rendering a different component',
      'Warning: Each child in a list should have a unique',
      'Warning: Failed prop type',
      'Warning: componentWillReceiveProps has been renamed',
      'Warning: componentWillMount has been renamed'
    ]

    const shouldIgnore = ignoredErrors.some(pattern => 
      error.message?.toLowerCase().includes(pattern.toLowerCase()) || 
      error.stack?.toLowerCase().includes(pattern.toLowerCase())
    )

    if (shouldIgnore) {
      if (import.meta.env.DEV) {
        console.warn('🔕 Erro ignorado pelo SafeErrorBoundary:', error.message)
      }
      return { hasError: false }
    }

    // Gerar ID único para evitar loops
    const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    console.error('🚨 SafeErrorBoundary capturou erro:', error)
    return { hasError: true, error, errorId }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Evitar loops de componentDidCatch
    if (this.state.hasError) {
      return
    }

    // Chamar callback de erro se fornecido
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo)
      } catch (callbackError) {
        console.error('🚨 Erro no callback onError:', callbackError)
      }
    }

    // Salvar informações do erro
    this.setState({ errorInfo })

    // Log detalhado apenas em desenvolvimento
    if (import.meta.env.DEV) {
      console.group('🚨 Detalhes do Erro - SafeErrorBoundary')
      console.error('Erro:', error)
      console.error('Stack:', error.stack)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }

    // Auto-reset após 3 segundos (apenas em desenvolvimento)
    if (import.meta.env.DEV && !this.resetTimeoutId) {
      this.resetTimeoutId = window.setTimeout(() => {
        console.log('🔄 Auto-reset do SafeErrorBoundary')
        this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined })
        this.resetTimeoutId = null
      }, 3000)
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { resetKeys } = this.props
    const { hasError } = this.state

    // Reset se as resetKeys mudaram
    if (hasError && resetKeys && prevProps.resetKeys !== resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => 
        prevProps.resetKeys?.[index] !== key
      )

      if (hasResetKeyChanged) {
        console.log('🔄 Reset por mudança de resetKeys')
        this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined })
      }
    }

    // Evitar loops de erro
    if (prevState.errorId !== this.state.errorId && this.state.hasError) {
      console.log('🔄 Novo erro detectado, resetando timeout')
      if (this.resetTimeoutId) {
        clearTimeout(this.resetTimeoutId)
        this.resetTimeoutId = null
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }
  }

  private handleRetry = () => {
    console.log('🔄 Tentativa manual de reset')
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined })
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }
  }

  private handleReload = () => {
    console.log('🔄 Recarregando página')
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Usar fallback customizado se fornecido
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Fallback padrão
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Ops! Algo deu errado
            </h2>
            
            <p className="text-gray-600 mb-6">
              Ocorreu um erro inesperado. Você pode tentar novamente ou recarregar a página.
            </p>

            {/* Mostrar detalhes do erro apenas em desenvolvimento */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left bg-gray-50 rounded-lg p-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                  Detalhes do erro (desenvolvimento)
                </summary>
                <div className="mt-2 text-xs text-gray-600 font-mono">
                  <div className="mb-2">
                    <strong>Mensagem:</strong> {this.state.error.message}
                  </div>
                  <div className="mb-2">
                    <strong>Error ID:</strong> {this.state.errorId}
                  </div>
                  {this.state.error.stack && (
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1 bg-white p-2 rounded border text-xs max-h-32 overflow-y-auto">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tentar Novamente
              </button>
              
              <button
                onClick={this.handleReload}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Recarregar Página
              </button>
            </div>

            {/* Auto-reset info apenas em desenvolvimento */}
            {import.meta.env.DEV && (
              <p className="mt-4 text-xs text-gray-500">
                🔄 Auto-reset em 3 segundos (modo desenvolvimento)
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default SafeErrorBoundary 