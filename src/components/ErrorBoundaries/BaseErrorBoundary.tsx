/**
 * ============================================
 * 🔧 ERROR BOUNDARY BASE
 * ============================================
 * 
 * Error boundary base para capturar erros React e exibir UI de fallback.
 * Implementa logging estruturado e recovery strategies.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';

// ============================================
// TYPES E INTERFACES
// ============================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  category?: string; // ✅ CORREÇÃO - Adicionar category ao state
}

interface BaseErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  maxRetries?: number;
  showErrorDetails?: boolean;
  category: string; // Para logs estruturados
  resetOnPropsChange?: boolean;
  resetKeys?: unknown[];
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  onRetry: () => void;
  onReset: () => void;
  onReportBug: () => void;
  category: string;
  showErrorDetails: boolean;
}

// ============================================
// DEFAULT ERROR FALLBACK COMPONENT
// ============================================

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  onRetry,
  onReset,
  onReportBug,
  category,
  showErrorDetails
}) => {
  const isRepeatedError = retryCount > 2;
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-red-200 bg-red-50">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-xl font-semibold text-red-900">
            Ops! Algo deu errado
          </h2>
          
          <p className="text-sm text-red-700 mt-2">
            {isRepeatedError 
              ? 'Erro persistente detectado. Tente recarregar a página.' 
              : 'Ocorreu um erro inesperado neste módulo.'
            }
          </p>
          
          {showErrorDetails && error && (
            <div className="mt-4 p-3 bg-red-100 rounded-md text-left">
              <p className="text-xs font-mono text-red-800 break-all">
                <strong>Erro:</strong> {error.message}
              </p>
              <p className="text-xs text-red-600 mt-1">
                <strong>ID:</strong> {errorId}
              </p>
              <p className="text-xs text-red-600">
                <strong>Categoria:</strong> {category}
              </p>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2">
            {!isRepeatedError ? (
              <Button 
                onClick={onRetry}
                variant="default"
                className="w-full"
                disabled={retryCount >= 3}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente {retryCount > 0 && `(${retryCount}/3)`}
              </Button>
            ) : (
              <Button 
                onClick={onReset}
                variant="default"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Recarregar Página
              </Button>
            )}
            
            <Button 
              onClick={onReportBug}
              variant="outline"
              className="w-full"
            >
              <Bug className="w-4 h-4 mr-2" />
              Reportar Problema
            </Button>
          </div>
          
          <p className="text-xs text-center text-red-600 mt-4">
            Se o problema persistir, entre em contato com o suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// BASE ERROR BOUNDARY CLASS
// ============================================

export class BaseErrorBoundary extends Component<BaseErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: BaseErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      category: props.category
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // AIDEV-NOTE: Gerar ID único para rastreamento do erro
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, category } = this.props;
    const { errorId } = this.state;

    // AIDEV-NOTE: Log estruturado para monitoramento
    const errorDetails = {
      errorId,
      category,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error(`🚨 [ErrorBoundary:${category}] Error caught:`, errorDetails);

    // Callback customizado para logging externo
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    // Enviar para serviço de monitoramento (ex: Sentry)
    this.reportToMonitoringService(errorDetails);

    this.setState({
      errorInfo,
      retryCount: 0
    });
  }

  componentDidUpdate(prevProps: BaseErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset automático quando props mudam (se habilitado)
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.handleReset();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportToMonitoringService = (errorDetails: any) => {
    // AIDEV-NOTE: Integração com serviço de monitoramento
    try {
      // Placeholder para Sentry, LogRocket, etc.
      if (window.Sentry?.captureException) {
        window.Sentry.captureException(errorDetails.error, {
          tags: {
            category: errorDetails.category,
            errorId: errorDetails.errorId
          },
          extra: errorDetails
        });
      }

      // Enviar para endpoint interno se necessário
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorDetails)
        }).catch(() => {
          // Falha silenciosa no reporting
        });
      }
    } catch (reportingError) {
      console.warn('Failed to report error to monitoring service:', reportingError);
    }
  };

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      console.log(`🔄 [ErrorBoundary] Tentativa ${retryCount + 1}/${maxRetries}`);
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });
    }
  };

  private handleReset = () => {
    console.log('🔄 [ErrorBoundary] Reset completo');
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    });
  };

  private handlePageReset = () => {
    // Reset mais agressivo - recarrega a página
    window.location.reload();
  };

  private handleReportBug = () => {
    const { error, errorId, category } = this.state;
    
    // AIDEV-NOTE: Abrir modal de report ou redirecionar para suporte
    const reportData = {
      errorId,
      category,
      message: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // Placeholder para sistema de report
    console.log('🐛 [ErrorBoundary] Bug report:', reportData);
    
    // Poderia abrir modal ou redirecionar para sistema de tickets
    alert(`ID do Erro: ${errorId}\n\nEste ID pode ser usado pelo suporte para investigar o problema.`);
  };

  render() {
    const { hasError, error, errorInfo, errorId, retryCount } = this.state;
    const { children, fallbackComponent: FallbackComponent, showErrorDetails = false, category } = this.props;

    if (hasError) {
      const ErrorComponent = FallbackComponent || DefaultErrorFallback;
      
      return (
        <ErrorComponent
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          retryCount={retryCount}
          onRetry={this.handleRetry}
          onReset={this.handlePageReset}
          onReportBug={this.handleReportBug}
          category={category}
          showErrorDetails={showErrorDetails}
        />
      );
    }

    return children;
  }
}

// ============================================
// EXPORT TYPES
// ============================================

export type { BaseErrorBoundaryProps, ErrorFallbackProps };
export { DefaultErrorFallback };