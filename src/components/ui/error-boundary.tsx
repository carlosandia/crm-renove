import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from './card';
import { Button } from './button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log do erro
    console.error('🚨 ErrorBoundary: Erro capturado:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Callback customizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Se um fallback customizado foi fornecido, use-o
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de erro padrão
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-lg w-full text-center p-8">
            <div className="space-y-6">
              {/* Ícone de erro */}
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              {/* Título e descrição */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Ops! Algo deu errado
                </h3>
                <p className="text-muted-foreground text-sm">
                  Encontramos um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver.
                </p>
              </div>

              {/* Detalhes do erro (apenas em desenvolvimento) */}
              {this.props.showDetails && this.state.error && (
                <div className="text-left bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Detalhes técnicos:</span>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground space-y-1">
                    <div className="break-all">
                      <strong>Erro:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium">
                          Stack trace
                        </summary>
                        <pre className="mt-1 text-xs whitespace-pre-wrap break-all">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleReset} className="w-full sm:w-auto">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleReload}
                  className="w-full sm:w-auto"
                >
                  Recarregar Página
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={this.handleGoHome}
                  className="w-full sm:w-auto"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Ir para Início
                </Button>
              </div>

              {/* Informação de suporte */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  💡 Se o problema persistir, entre em contato com o suporte técnico
                </p>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook para usar ErrorBoundary em componentes funcionais
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.error('🚨 useErrorHandler: Erro capturado:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError };
};

// Componente de erro simples para uso rápido
export const ErrorState: React.FC<{
  error?: Error;
  onRetry?: () => void;
  onReset?: () => void;
}> = ({ error, onRetry, onReset }) => {
  return (
    <Card className="text-center py-8 px-6">
      <div className="mx-auto max-w-md space-y-4">
        <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Erro ao carregar dados
          </h3>
          <p className="text-muted-foreground text-sm">
            {error?.message || 'Não foi possível carregar os dados. Tente novamente.'}
          </p>
        </div>
        
        <div className="flex gap-2 justify-center">
          {onRetry && (
            <Button onClick={onRetry} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
          {onReset && (
            <Button variant="outline" onClick={onReset} size="sm">
              Resetar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}; 