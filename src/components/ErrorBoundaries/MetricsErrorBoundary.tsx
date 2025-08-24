/**
 * METRICS ERROR BOUNDARY
 * Error boundary específico para componentes de métricas que usam TanStack Query
 * 
 * Implementa padrões da documentação oficial do TanStack Query para tratamento de erros
 */

import React, { Component, ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ============================================================================
// INTERFACES
// ============================================================================

interface MetricsErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  className?: string;
}

interface MetricsErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

// ============================================================================
// COMPONENTE DE FALLBACK
// ============================================================================

interface MetricsErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  className?: string;
}

const MetricsErrorFallback: React.FC<MetricsErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  className
}) => {
  const isNetworkError = error.message.includes('Network Error') || 
                         error.message.includes('ERR_NETWORK') ||
                         error.message.includes('ERR_CONNECTION_REFUSED') ||
                         error.message.includes('404');

  const getErrorMessage = () => {
    if (isNetworkError) {
      return 'Não foi possível conectar com o servidor. Verifique sua conexão.';
    }
    if (error.message.includes('404')) {
      return 'Endpoints de métricas não encontrados. Os dados serão carregados quando disponíveis.';
    }
    return 'Ocorreu um erro ao carregar as métricas.';
  };

  const getErrorAction = () => {
    if (isNetworkError) {
      return 'Verificar conexão';
    }
    if (error.message.includes('404')) {
      return 'Aguardar servidor';
    }
    return 'Tentar novamente';
  };

  return (
    <div className={cn(
      "p-6 border border-red-200 bg-red-50 rounded-lg space-y-4",
      className
    )}>
      {/* Header com ícone e título */}
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-red-800">
            Erro nas Métricas
          </h3>
          <p className="text-sm text-red-600 mt-1">
            {getErrorMessage()}
          </p>
        </div>
      </div>

      {/* Detalhes técnicos (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-red-100 border border-red-200 rounded-md p-3">
          <h4 className="text-sm font-medium text-red-800 mb-1">
            Detalhes técnicos:
          </h4>
          <code className="text-xs text-red-700 break-all">
            {error.message}
          </code>
        </div>
      )}

      {/* Ações disponíveis */}
      <div className="flex items-center space-x-3">
        <Button
          size="sm"
          variant="outline"
          onClick={resetErrorBoundary}
          className="flex items-center space-x-2 border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{getErrorAction()}</span>
        </Button>

        {/* Informações adicionais para casos específicos */}
        {error.message.includes('404') && (
          <div className="flex items-center text-sm text-red-600">
            <BarChart3 className="w-4 h-4 mr-1" />
            <span>Endpoints em configuração</span>
          </div>
        )}
      </div>

      {/* Placeholder visual para manter layout */}
      <div className="mt-6 p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h4 className="text-lg font-medium text-gray-700 mb-2">
            Métricas Temporariamente Indisponíveis
          </h4>
          <p className="text-sm text-gray-500">
            Os dados de métricas serão exibidos assim que a conexão for restabelecida.
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ERROR BOUNDARY CLASS
// ============================================================================

class MetricsErrorBoundary extends Component<MetricsErrorBoundaryProps, MetricsErrorBoundaryState> {
  constructor(props: MetricsErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<MetricsErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log do erro para debugging
    console.error('🚨 [MetricsErrorBoundary] Error caught:', error);
    console.error('🚨 [MetricsErrorBoundary] Error info:', errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Callback opcional para notificação do erro
    this.props.onReset?.();
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, className } = this.props;

    if (hasError && error) {
      // Usar fallback customizado se fornecido
      if (fallback) {
        return fallback;
      }

      // Usar fallback padrão
      return (
        <MetricsErrorFallback
          error={error}
          resetErrorBoundary={this.resetErrorBoundary}
          className={className}
        />
      );
    }

    return children;
  }
}

// ============================================================================
// COMPONENTE COM TANSTACK QUERY INTEGRATION
// ============================================================================

interface MetricsErrorBoundaryWithQueryProps extends MetricsErrorBoundaryProps {
  resetKeys?: any[];
}

/**
 * Versão integrada com TanStack Query que reseta queries em caso de erro
 * Seguindo padrões da documentação oficial do TanStack Query
 */
export const MetricsErrorBoundaryWithQuery: React.FC<MetricsErrorBoundaryWithQueryProps> = ({
  children,
  resetKeys = [],
  ...props
}) => {
  return (
    <QueryErrorResetBoundary resetKeys={resetKeys}>
      {({ reset }) => (
        <MetricsErrorBoundary
          {...props}
          onReset={() => {
            // Reset das queries TanStack Query
            reset();
            // Callback customizado se fornecido
            props.onReset?.();
          }}
        >
          {children}
        </MetricsErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default MetricsErrorBoundary;
export { MetricsErrorFallback };
export type { MetricsErrorBoundaryProps, MetricsErrorFallbackProps };