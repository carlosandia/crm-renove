import React, { Component, ErrorInfo, PropsWithChildren } from 'react';
import { frontendErrorMonitoring } from '../../utils/errorMonitoring';
import { logger } from '../../utils/logger';

// AIDEV-NOTE: Error Boundary integrado com sistema de monitoring seguindo CLAUDE.md
// Captura erros React e envia para sistema de error monitoring

interface ErrorBoundaryState {
  hasError: boolean;
  errorId?: string;
  errorMessage?: string;
}

interface ErrorBoundaryProps {
  fallback?: React.ComponentType<{ errorId?: string; onRetry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: {
    tenantId?: string;
    userId?: string;
    module?: string;
  };
}

class ErrorMonitoringBoundary extends Component<
  PropsWithChildren<ErrorBoundaryProps>,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<ErrorBoundaryProps>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Atualizar state para mostrar fallback UI
    return { 
      hasError: true,
      errorMessage: error.message 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // AIDEV-NOTE: Capturar erro via sistema de monitoring
    const errorId = frontendErrorMonitoring.captureError(error, {
      tenantId: this.props.context?.tenantId,
      userId: this.props.context?.userId,
      operation: 'react_component_error',
      domain: 'react',
      module: this.props.context?.module,
      componentStack: errorInfo.componentStack,
      correlationId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    // Atualizar state com error ID
    this.setState({ errorId });

    // Log estruturado adicional
    logger.error('React Error Boundary triggered', {
      tenantId: this.props.context?.tenantId,
      userId: this.props.context?.userId,
      domain: 'react',
      module: this.props.context?.module,
      correlationId: errorId,
      componentStack: errorInfo.componentStack?.substring(0, 200) // Limitar tamanho
    });

    // Callback customizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      errorId: undefined, 
      errorMessage: undefined 
    });
    
    logger.info('Error boundary retry triggered', {
      tenantId: this.props.context?.tenantId,
      userId: this.props.context?.userId,
      domain: 'react',
      module: this.props.context?.module,
      previousErrorId: this.state.errorId
    });
  };

  render() {
    if (this.state.hasError) {
      // Renderizar fallback UI customizado ou padrão
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            errorId={this.state.errorId} 
            onRetry={this.handleRetry} 
          />
        );
      }

      // Fallback UI padrão
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg 
                  className="h-12 w-12 text-red-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Oops! Algo deu errado
                </h3>
                <div className="mt-2 text-sm text-gray-500">
                  Um erro inesperado ocorreu. Nossa equipe foi notificada automaticamente.
                </div>
              </div>
            </div>
            
            {this.state.errorId && (
              <div className="mb-4 p-3 bg-gray-100 rounded-md">
                <div className="text-xs text-gray-600">
                  ID do erro: <code className="font-mono">{this.state.errorId}</code>
                </div>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Recarregar Página
              </button>
            </div>
            
            {import.meta.env.DEV && this.state.errorMessage && (
              <div className="mt-4 p-3 bg-red-50 rounded-md">
                <div className="text-xs text-red-600">
                  <strong>Debug Info:</strong>
                  <pre className="mt-1 text-xs overflow-auto">
                    {this.state.errorMessage}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorMonitoringBoundary;

// AIDEV-NOTE: HOC para facilitar uso do Error Boundary
export function withErrorMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  context?: ErrorBoundaryProps['context']
) {
  const WithErrorMonitoringComponent = (props: P) => (
    <ErrorMonitoringBoundary context={context}>
      <WrappedComponent {...props} />
    </ErrorMonitoringBoundary>
  );

  WithErrorMonitoringComponent.displayName = 
    `withErrorMonitoring(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorMonitoringComponent;
}

// AIDEV-NOTE: Hook para usar error monitoring em componentes funcionais
export function useErrorMonitoring(context?: ErrorBoundaryProps['context']) {
  const captureError = React.useCallback((error: Error, additionalContext?: any) => {
    return frontendErrorMonitoring.captureError(error, {
      ...context,
      ...additionalContext,
      operation: 'hook_capture',
      domain: 'react'
    });
  }, [context]);

  const captureWarning = React.useCallback((message: string, additionalContext?: any) => {
    return frontendErrorMonitoring.captureWarning(message, {
      ...context,
      ...additionalContext,
      operation: 'hook_warning',
      domain: 'react'
    });
  }, [context]);

  const wrapAsyncOperation = React.useCallback(<T,>(
    operation: () => Promise<T>,
    operationName: string,
    errorMessage?: string
  ): Promise<T> => {
    return frontendErrorMonitoring.wrapAsync(
      operation,
      {
        ...context,
        operation: operationName,
        domain: 'react'
      },
      errorMessage
    );
  }, [context]);

  return {
    captureError,
    captureWarning,
    wrapAsyncOperation
  };
}