import { useEffect, useCallback, useRef } from 'react';
import { Pipeline } from '../../../types/Pipeline';
import { logIfEnabled, LogContext, debouncedLog } from '../../../utils/loggerOptimized';

export interface EventListenerProps {
  viewMode: 'list' | 'create' | 'edit' | 'view';
  selectedPipeline: Pipeline | null;
  onRefreshLeads: () => Promise<void>;
  onRefreshPipelines?: () => Promise<void>;
  listenerKey?: string; // Para evitar duplicação de listeners
}

export interface EventListenerReturn {
  // Utility functions
  isListenerRegistered: (key: string) => boolean;
  registerListener: (key: string) => void;
  unregisterListener: (key: string) => void;
}

// ✅ LOGGER GLOBAL - Sistema centralizado otimizado com feature flags

export const useEventListener = ({
  viewMode,
  selectedPipeline,
  onRefreshLeads,
  onRefreshPipelines,
  listenerKey = 'modernAdminPipelineManager'
}: EventListenerProps): EventListenerReturn => {

  // ✅ REF ESTÁVEL - Para manter valores atualizados sem recriar handlers
  const stableRef = useRef({
    viewMode,
    selectedPipeline,
    onRefreshLeads,
    onRefreshPipelines
  });

  // Atualizar ref sempre que props mudarem
  stableRef.current = {
    viewMode,
    selectedPipeline,
    onRefreshLeads,
    onRefreshPipelines
  };

  // Utility functions para gerenciar listeners - AGORA ESTÁVEIS
  const isListenerRegistered = useCallback((key: string): boolean => {
    return !!(window as any)[`${key}_registered`];
  }, []);

  const registerListener = useCallback((key: string) => {
    (window as any)[`${key}_registered`] = true;
  }, []);

  const unregisterListener = useCallback((key: string) => {
    delete (window as any)[`${key}_registered`];
  }, []);

  // ✅ HANDLERS ESTÁVEIS - Usam stableRef, nunca são recriados
  const handleLeadDataUpdated = useCallback((event: CustomEvent) => {
    const { leadMasterId, pipelineLeadsUpdated, timestamp } = event.detail;
    const { viewMode, selectedPipeline, onRefreshLeads } = stableRef.current;
    
    // Log throttleado usando sistema global otimizado
    debouncedLog('event-leadDataUpdated', 'debug', 
      'Evento leadDataUpdated recebido', LogContext.EVENT_MANAGER, 
      { pipelineId: selectedPipeline?.id?.substring(0, 8) + '...', viewMode }, 3000);
    
    // Só fazer refresh se estamos na visualização do pipeline
    if (viewMode === 'view' && selectedPipeline?.id) {
      debouncedLog('event-refresh-leads', 'debug', 
        'Fazendo refresh automático dos leads', LogContext.EVENT_MANAGER, {}, 2000);
      
      // Fazer refresh com delay para garantir que a sincronização terminou
      setTimeout(() => {
        onRefreshLeads();
      }, 300);
    }
  }, []); // ✅ SEM DEPENDÊNCIAS - Handler estável

  const handleLeadCreated = useCallback((event: CustomEvent) => {
    const { pipelineId, leadData, timestamp } = event.detail;
    const { viewMode, selectedPipeline, onRefreshLeads } = stableRef.current;
    
    debouncedLog('event-leadCreated', 'debug', 
      'Evento leadCreated recebido', LogContext.EVENT_MANAGER, 
      { pipelineId: pipelineId?.substring(0, 8) + '...' }, 2000);
    
    // Só fazer refresh se estamos visualizando a mesma pipeline
    if (viewMode === 'view' && selectedPipeline?.id === pipelineId) {
      debouncedLog('event-lead-created-refresh', 'debug', 
        'Lead criado na pipeline atual, fazendo refresh', LogContext.EVENT_MANAGER, {}, 1000);
      
      setTimeout(() => {
        onRefreshLeads();
      }, 500);
    }
  }, []); // ✅ SEM DEPENDÊNCIAS

  const handlePipelineUpdated = useCallback((event: CustomEvent) => {
    const { pipelineId, action, timestamp } = event.detail;
    const { viewMode, onRefreshPipelines } = stableRef.current;
    
    debouncedLog('event-pipelineUpdated', 'debug', 
      'Evento pipelineUpdated recebido', LogContext.EVENT_MANAGER, 
      { pipelineId: pipelineId?.substring(0, 8) + '...', action }, 3000);
    
    // Fazer refresh das pipelines se disponível
    if (onRefreshPipelines) {
      debouncedLog('event-pipeline-refresh', 'debug', 
        'Fazendo refresh das pipelines', LogContext.EVENT_MANAGER, {}, 1000);
      
      setTimeout(() => {
        onRefreshPipelines();
      }, 200);
    }
  }, []); // ✅ SEM DEPENDÊNCIAS

  const handleLeadStageChanged = useCallback((event: CustomEvent) => {
    const { leadId, fromStage, toStage, pipelineId, timestamp } = event.detail;
    const { viewMode, selectedPipeline, onRefreshLeads } = stableRef.current;
    
    debouncedLog('event-leadStageChanged', 'debug', 
      'Evento leadStageChanged recebido', LogContext.EVENT_MANAGER, 
      { leadId: leadId?.substring(0, 8) + '...', fromStage, toStage }, 1000);
    
    // Refresh se estamos na pipeline afetada
    if (viewMode === 'view' && selectedPipeline?.id === pipelineId) {
      debouncedLog('event-stage-change-refresh', 'debug', 
        'Lead mudou de etapa na pipeline atual, fazendo refresh', LogContext.EVENT_MANAGER, {}, 1000);
      
      setTimeout(() => {
        onRefreshLeads();
      }, 200);
    }
  }, []); // ✅ SEM DEPENDÊNCIAS

  // ✅ REGISTRAR LISTENERS - Agora com dependências estáveis
  useEffect(() => {
    // Verificar se já existe listener registrado
    if (isListenerRegistered(listenerKey)) {
      debouncedLog(`listener-already-${listenerKey}`, 'debug', 
        'Listeners já registrados', LogContext.EVENT_MANAGER, { listenerKey }, 5000);
      return;
    }

    debouncedLog(`listener-register-${listenerKey}`, 'debug', 
      'Registrando listeners globais', LogContext.EVENT_MANAGER, { listenerKey }, 5000);

    // Registrar que este listener está ativo
    registerListener(listenerKey);

    // Adicionar event listeners - USANDO HANDLERS ESTÁVEIS
    window.addEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);
    window.addEventListener('leadCreated', handleLeadCreated as EventListener);
    window.addEventListener('pipelineUpdated', handlePipelineUpdated as EventListener);
    window.addEventListener('leadStageChanged', handleLeadStageChanged as EventListener);

    // Cleanup function
    return () => {
      debouncedLog(`listener-cleanup-${listenerKey}`, 'debug', 
        'Removendo listeners globais', LogContext.EVENT_MANAGER, { listenerKey }, 3000);
      
      // Remover listeners
      window.removeEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);
      window.removeEventListener('leadCreated', handleLeadCreated as EventListener);
      window.removeEventListener('pipelineUpdated', handlePipelineUpdated as EventListener);
      window.removeEventListener('leadStageChanged', handleLeadStageChanged as EventListener);
      
      // Desregistrar listener
      unregisterListener(listenerKey);
    };
    // ✅ APENAS LISTENERKEY - Handlers são estáveis, não causam re-render
  }, [listenerKey]);

  return {
    isListenerRegistered,
    registerListener,
    unregisterListener
  };
};

// Componente wrapper para usar o hook
export interface EventListenerComponentProps extends EventListenerProps {
  children?: React.ReactNode;
}

export const EventListener: React.FC<EventListenerComponentProps> = ({ 
  children, 
  ...props 
}) => {
  useEventListener(props);
  return <>{children}</>;
};

export default useEventListener; 