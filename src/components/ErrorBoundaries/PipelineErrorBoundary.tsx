/**
 * ============================================
 * 🔧 PIPELINE ERROR BOUNDARY
 * ============================================
 * 
 * Error boundary especializado para módulo de pipeline.
 * Inclui recovery strategies específicas e logging contextual.
 */

import React from 'react';
import { Activity, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { BaseErrorBoundary, BaseErrorBoundaryProps, ErrorFallbackProps } from './BaseErrorBoundary';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';

// ============================================
// PIPELINE ERROR FALLBACK
// ============================================

const PipelineErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  retryCount,
  onRetry,
  onReset,
  onReportBug,
  showErrorDetails
}) => {
  // AIDEV-NOTE: Análise específica de erros de pipeline
  const errorType = getPipelineErrorType(error);
  const { icon: ErrorIcon, title, description, suggestions } = getErrorDisplayInfo(errorType);

  return (
    <div className="min-h-[500px] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-orange-200 bg-orange-50">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <ErrorIcon className="w-8 h-8 text-orange-600" />
          </div>
          
          <h2 className="text-xl font-semibold text-orange-900">
            {title}
          </h2>
          
          <p className="text-sm text-orange-700 mt-2">
            {description}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Sugestões específicas do erro */}
          <div className="bg-orange-100 p-4 rounded-lg">
            <h3 className="font-medium text-orange-900 mb-2">Possíveis soluções:</h3>
            <ul className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-orange-800 flex items-start">
                  <span className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 mr-2 flex-shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          {/* Ações de recovery */}
          <div className="flex flex-col gap-2">
            <Button 
              onClick={onRetry}
              variant="default"
              className="w-full"
              disabled={retryCount >= 3}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar Pipeline {retryCount > 0 && `(${retryCount}/3)`}
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => window.location.href = '/pipelines'}
                variant="outline"
                className="w-full"
              >
                <Activity className="w-4 h-4 mr-2" />
                Lista de Pipelines
              </Button>
              
              <Button 
                onClick={onReportBug}
                variant="outline"
                className="w-full"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Reportar Problema
              </Button>
            </div>
          </div>

          {/* Detalhes técnicos (se habilitado) */}
          {showErrorDetails && error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-orange-800">
                Detalhes Técnicos
              </summary>
              <div className="mt-2 p-3 bg-orange-100 rounded-md">
                <p className="text-xs font-mono text-orange-800 break-all">
                  <strong>Erro:</strong> {error.message}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  <strong>ID:</strong> {errorId}
                </p>
                <p className="text-xs text-orange-600">
                  <strong>Tipo:</strong> {errorType}
                </p>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// ERROR TYPE ANALYSIS
// ============================================

type PipelineErrorType = 
  | 'database_connection'
  | 'permission_denied' 
  | 'data_validation'
  | 'network_timeout'
  | 'component_render'
  | 'drag_drop_error'
  | 'unknown';

function getPipelineErrorType(error: Error | null): PipelineErrorType {
  if (!error) return 'unknown';

  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';

  // AIDEV-NOTE: Análise de padrões específicos de erro de pipeline
  if (message.includes('network') || message.includes('fetch')) {
    return 'network_timeout';
  }
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return 'permission_denied';
  }
  
  if (message.includes('validation') || message.includes('schema')) {
    return 'data_validation';
  }
  
  if (message.includes('database') || message.includes('supabase')) {
    return 'database_connection';
  }
  
  if (stack.includes('dnd-kit') || message.includes('drag')) {
    return 'drag_drop_error';
  }
  
  if (stack.includes('react') || message.includes('render')) {
    return 'component_render';
  }

  return 'unknown';
}

function getErrorDisplayInfo(errorType: PipelineErrorType) {
  const errorMap = {
    database_connection: {
      icon: Database,
      title: 'Problema de Conexão com o Banco',
      description: 'Não foi possível acessar os dados do pipeline.',
      suggestions: [
        'Verifique sua conexão com a internet',
        'Tente recarregar a página',
        'Se o problema persistir, entre em contato com o suporte'
      ]
    },
    permission_denied: {
      icon: AlertTriangle,
      title: 'Acesso Negado',
      description: 'Você não tem permissão para acessar este pipeline.',
      suggestions: [
        'Verifique se você está logado com a conta correta',
        'Entre em contato com o administrador para solicitar acesso',
        'Confirme se este pipeline pertence à sua empresa'
      ]
    },
    data_validation: {
      icon: AlertTriangle,
      title: 'Erro de Validação de Dados',
      description: 'Os dados do pipeline contêm informações inválidas.',
      suggestions: [
        'Alguns dados podem ter sido corrompidos',
        'Tente recarregar para buscar dados atualizados',
        'Entre em contato com o suporte se o problema continuar'
      ]
    },
    network_timeout: {
      icon: RefreshCw,
      title: 'Problema de Conectividade',
      description: 'A conexão com o servidor foi interrompida.',
      suggestions: [
        'Verifique sua conexão com a internet',
        'Aguarde alguns momentos e tente novamente',
        'Se usar VPN, tente desconectá-la temporariamente'
      ]
    },
    drag_drop_error: {
      icon: Activity,
      title: 'Erro no Sistema de Arrastar e Soltar',
      description: 'Houve um problema ao mover os cartões no pipeline.',
      suggestions: [
        'Tente recarregar a página',
        'Use os menus contextuais como alternativa',
        'Limpe o cache do navegador se o problema persistir'
      ]
    },
    component_render: {
      icon: AlertTriangle,
      title: 'Erro de Renderização',
      description: 'Houve um problema ao exibir os componentes do pipeline.',
      suggestions: [
        'Recarregue a página para restaurar a interface',
        'Limpe o cache do navegador',
        'Tente usar outro navegador se o problema continuar'
      ]
    },
    unknown: {
      icon: AlertTriangle,
      title: 'Erro Inesperado no Pipeline',
      description: 'Ocorreu um erro não identificado no módulo de pipeline.',
      suggestions: [
        'Tente recarregar a página',
        'Aguarde alguns minutos e tente novamente',
        'Reporte o problema para investigação'
      ]
    }
  };

  return errorMap[errorType];
}

// ============================================
// PIPELINE ERROR BOUNDARY COMPONENT
// ============================================

interface PipelineErrorBoundaryProps extends Omit<BaseErrorBoundaryProps, 'category' | 'fallbackComponent'> {
  pipelineId?: string;
  pipelineName?: string;
}

const PipelineErrorBoundary: React.FC<PipelineErrorBoundaryProps> = (props) => {
  const handlePipelineError = (error: Error, errorInfo: React.ErrorInfo, errorId: string) => {
    // AIDEV-NOTE: Log específico para erros de pipeline
    const pipelineContext = {
      pipelineId: props.pipelineId,
      pipelineName: props.pipelineName,
      currentUrl: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    console.error('🏗️ [PipelineErrorBoundary] Pipeline-specific error:', {
      errorId,
      error: error.message,
      context: pipelineContext,
      componentStack: errorInfo.componentStack
    });

    // Chamar callback original se fornecido
    if (props.onError) {
      props.onError(error, errorInfo, errorId);
    }

    // Enviar métricas específicas de pipeline
    if (window.gtag) {
      window.gtag('event', 'pipeline_error', {
        error_id: errorId,
        pipeline_id: props.pipelineId,
        error_type: getPipelineErrorType(error),
        custom_map: {
          dimension1: 'pipeline_module'
        }
      });
    }
  };

  return (
    <BaseErrorBoundary
      {...props}
      category="pipeline"
      fallbackComponent={PipelineErrorFallback}
      onError={handlePipelineError}
      resetOnPropsChange={true}
      resetKeys={[props.pipelineId]}
      maxRetries={2}
    />
  );
};

export { PipelineErrorBoundary };
export type { PipelineErrorBoundaryProps };