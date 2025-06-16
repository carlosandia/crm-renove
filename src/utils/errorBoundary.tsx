import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Atualizar state para mostrar a UI de fallback
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro (apenas erros relevantes, não de extensões)
    const errorMessage = error.message || '';
    const shouldLog = !this.isExtensionError(errorMessage);
    
    if (shouldLog) {
      logger.error('Error Boundary capturou um erro:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  private isExtensionError(message: string): boolean {
    const extensionPatterns = [
      'chrome-extension://',
      'background.js',
      'DelayedMessageSender',
      'FrameDoesNotExistError',
      'Could not establish connection',
      'Receiving end does not exist'
    ];
    
    return extensionPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  public render() {
    if (this.state.hasError) {
      // UI de fallback customizada
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>🚨 Algo deu errado</h2>
            <p>Ocorreu um erro inesperado. A página será recarregada automaticamente.</p>
            <button 
              onClick={() => window.location.reload()}
              className="reload-button"
            >
              Recarregar Página
            </button>
          </div>
          <style>{`
            .error-boundary {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 400px;
              padding: 20px;
            }
            .error-content {
              text-align: center;
              background: #f8f9fa;
              padding: 40px;
              border-radius: 12px;
              border: 1px solid #e9ecef;
              max-width: 500px;
            }
            .error-content h2 {
              color: #dc3545;
              margin-bottom: 16px;
            }
            .error-content p {
              color: #6c757d;
              margin-bottom: 24px;
            }
            .reload-button {
              background: #007bff;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
            }
            .reload-button:hover {
              background: #0056b3;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 