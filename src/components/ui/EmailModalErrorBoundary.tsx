import React from 'react';
import { AlertCircle } from 'lucide-react';
import { logger } from '../../utils/logger';

interface EmailModalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface EmailModalErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
}

class EmailModalErrorBoundary extends React.Component<
  EmailModalErrorBoundaryProps,
  EmailModalErrorBoundaryState
> {
  constructor(props: EmailModalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): EmailModalErrorBoundaryState {
    // Atualiza o state para que a próxima renderização mostre a UI de fallback
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log do erro usando nosso sistema de logging
    logger.error('EmailModal Error Boundary capturou um erro:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      context: 'EmailComposeModal'
    });

    // Callback opcional para o componente pai
    if (this.props.onError) {
      this.props.onError(error);
    }

    // Previne o erro de propagação para componentes pais (evita fechamento de modais)
    console.error('🚫 [EmailModalErrorBoundary] Erro interceptado:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">
            Erro no Modal de E-mail
          </h3>
          <p className="text-sm text-red-700 text-center mb-4">
            {this.props.fallbackMessage || 
             'Ocorreu um erro ao carregar o modal de e-mail. Tente novamente.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EmailModalErrorBoundary;