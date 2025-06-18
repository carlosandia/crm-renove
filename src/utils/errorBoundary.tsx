import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to external service (could be Sentry, LogRocket, etc.)
    this.logErrorToService(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys && resetKeys.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Here you would typically log to an external service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId
    };

    // For now, just log to console
    console.error('Error Report:', errorReport);
    
    // You could send to an error tracking service:
    // errorTrackingService.captureException(error, { extra: errorReport });
  };

  getErrorType = (error: Error): string => {
    if (error.message.includes('Pipeline')) return 'Pipeline Error';
    if (error.message.includes('Network')) return 'Network Error';
    if (error.message.includes('Permission')) return 'Permission Error';
    if (error.name === 'ChunkLoadError') return 'Loading Error';
    return 'Application Error';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = this.getErrorType(this.state.error!);
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Oops! Algo deu errado
            </h1>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Encontramos um problema inesperado
              </p>
              <p className="text-sm text-gray-500 bg-gray-100 rounded-lg px-3 py-2">
                <strong>Tipo:</strong> {errorType}
              </p>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    Detalhes técnicos
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-40">
                    <p><strong>Error:</strong> {this.state.error?.message}</p>
                    <p className="mt-2"><strong>Stack:</strong></p>
                    <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
                  </div>
                </details>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={this.resetErrorBoundary}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Voltar ao Início
              </button>

              <button
                onClick={() => {
                  const subject = encodeURIComponent(`Erro na aplicação - ${errorType}`);
                  const body = encodeURIComponent(`
Detalhes do erro:
- Tipo: ${errorType}
- ID: ${this.state.errorId}
- URL: ${window.location.href}
- Mensagem: ${this.state.error?.message}
- Data/Hora: ${new Date().toLocaleString()}

Por favor, descreva o que você estava fazendo quando o erro ocorreu:

                  `);
                  window.open(`mailto:suporte@crm.com?subject=${subject}&body=${body}`);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Bug className="w-4 h-4" />
                Reportar Problema
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Specialized error boundaries for different contexts
export const PipelineErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('Pipeline Error:', error, errorInfo);
    }}
    fallback={
      <div className="p-8 text-center bg-white rounded-lg border border-red-200">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Erro no Pipeline
        </h3>
        <p className="text-gray-600 mb-4">
          Não foi possível carregar os dados do pipeline.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Recarregar Página
        </button>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary; 