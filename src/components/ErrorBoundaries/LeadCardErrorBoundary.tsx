// =====================================================================================
// COMPONENT: LeadCardErrorBoundary
// Autor: Claude (Arquiteto Sênior)
// Data: 2025-01-25
// Descrição: Error boundary específico para cards de leads com fallback otimizado
// AIDEV-NOTE: Previne quebra da pipeline inteira quando um card tem erro
// =====================================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Eye } from 'lucide-react';

export interface LeadCardErrorBoundaryProps {
  children: ReactNode;
  leadId: string;
  leadName?: string;
  fallbackMode?: 'minimal' | 'detailed';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

// AIDEV-NOTE: Alias para compatibilidade interna
type Props = LeadCardErrorBoundaryProps;

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class LeadCardErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error para monitoramento
    console.error('LeadCard Error Boundary:', {
      leadId: this.props.leadId,
      error: error.message,
      componentStack: errorInfo.componentStack
    });

    // Callback personalizado
    this.props.onError?.(error, errorInfo);

    // Auto-retry após 5 segundos (máximo 2 tentativas)
    if (this.state.retryCount < 2) {
      this.retryTimeout = setTimeout(() => {
        this.handleRetry();
      }, 5000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      const { fallbackMode = 'minimal', leadId, leadName } = this.props;
      const { error, retryCount } = this.state;

      // Fallback minimal - apenas contorno do card
      if (fallbackMode === 'minimal') {
        return (
          <div className="w-full h-32 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-700 font-medium">Erro no card</p>
              <p className="text-xs text-red-600">Lead: {leadName || leadId.slice(0, 8)}</p>
              
              {retryCount < 2 && (
                <button
                  onClick={this.handleRetry}
                  className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium transition-colors"
                >
                  <RefreshCw className="h-3 w-3 inline mr-1" />
                  Tentar novamente
                </button>
              )}
            </div>
          </div>
        );
      }

      // Fallback detalhado - com informações de debug
      return (
        <div className="w-full bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-800 mb-1">
                Erro no Card do Lead
              </h3>
              
              <div className="space-y-2 text-xs text-red-700">
                <p>
                  <span className="font-medium">Lead ID:</span> {leadId}
                </p>
                {leadName && (
                  <p>
                    <span className="font-medium">Nome:</span> {leadName}
                  </p>
                )}
                <p>
                  <span className="font-medium">Erro:</span> {error?.message || 'Erro desconhecido'}
                </p>
                <p>
                  <span className="font-medium">Tentativas:</span> {retryCount}/2
                </p>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {retryCount < 2 ? (
                  <button
                    onClick={this.handleRetry}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium transition-colors"
                  >
                    <RefreshCw className="h-3 w-3 inline mr-1" />
                    Tentar novamente ({2 - retryCount} restantes)
                  </button>
                ) : (
                  <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    Máximo de tentativas atingido
                  </div>
                )}
                
                <button
                  onClick={() => {
                    console.log('LeadCard Error Details:', {
                      leadId,
                      error: this.state.error,
                      errorInfo: this.state.errorInfo
                    });
                  }}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium transition-colors"
                  title="Ver detalhes no console"
                >
                  <Eye className="h-3 w-3 inline mr-1" />
                  Debug
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ===================================
// HOOK AUXILIAR PARA MONITORAMENTO
// ===================================

export const useLeadCardErrorMonitoring = () => {
  const [errorStats, setErrorStats] = React.useState({
    totalErrors: 0,
    leadsWithErrors: new Set<string>(),
    lastError: null as { leadId: string; error: string; timestamp: Date } | null
  });

  const reportError = React.useCallback((leadId: string, error: Error) => {
    setErrorStats(prev => ({
      totalErrors: prev.totalErrors + 1,
      leadsWithErrors: new Set([...prev.leadsWithErrors, leadId]),
      lastError: {
        leadId,
        error: error.message,
        timestamp: new Date()
      }
    }));
  }, []);

  const clearErrorStats = React.useCallback(() => {
    setErrorStats({
      totalErrors: 0,
      leadsWithErrors: new Set(),
      lastError: null
    });
  }, []);

  return {
    errorStats: {
      ...errorStats,
      leadsWithErrors: Array.from(errorStats.leadsWithErrors)
    },
    reportError,
    clearErrorStats
  };
};

export default LeadCardErrorBoundary;