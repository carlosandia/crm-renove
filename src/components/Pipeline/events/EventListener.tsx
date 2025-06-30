import { useEffect, useCallback } from 'react';
import { Pipeline } from '../../../types/Pipeline';

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

export const useEventListener = ({
  viewMode,
  selectedPipeline,
  onRefreshLeads,
  onRefreshPipelines,
  listenerKey = 'modernAdminPipelineManager'
}: EventListenerProps): EventListenerReturn => {

  // Utility functions para gerenciar listeners
  const isListenerRegistered = useCallback((key: string): boolean => {
    return !!(window as any)[`${key}_registered`];
  }, []);

  const registerListener = useCallback((key: string) => {
    (window as any)[`${key}_registered`] = true;
  }, []);

  const unregisterListener = useCallback((key: string) => {
    delete (window as any)[`${key}_registered`];
  }, []);

  // Event handler para atualização de dados de leads
  const handleLeadDataUpdated = useCallback((event: CustomEvent) => {
    const { leadMasterId, pipelineLeadsUpdated, timestamp } = event.detail;
    
    console.log('📡 [EventListener] Evento leadDataUpdated recebido:', {
      leadMasterId: leadMasterId?.substring(0, 8) + '...',
      pipelineLeadsCount: pipelineLeadsUpdated?.length || 0,
      timestamp,
      selectedPipelineId: selectedPipeline?.id,
      viewMode
    });
    
    // Só fazer refresh se estamos na visualização do pipeline
    if (viewMode === 'view' && selectedPipeline?.id) {
      console.log('🔄 [EventListener] Fazendo refresh automático dos leads...');
      
      // Fazer refresh com delay para garantir que a sincronização terminou
      setTimeout(() => {
        onRefreshLeads();
      }, 300); // 300ms de delay
    } else {
      console.log('⚠️ [EventListener] Não está na visualização do pipeline, ignorando refresh');
    }
  }, [viewMode, selectedPipeline?.id, onRefreshLeads]);

  // Event handler para criação de leads
  const handleLeadCreated = useCallback((event: CustomEvent) => {
    const { pipelineId, leadData, timestamp } = event.detail;
    
    console.log('📡 [EventListener] Evento leadCreated recebido:', {
      pipelineId,
      leadName: leadData?.custom_data?.nome_lead || 'Lead',
      timestamp,
      selectedPipelineId: selectedPipeline?.id,
      viewMode
    });
    
    // Só fazer refresh se estamos visualizando a mesma pipeline
    if (viewMode === 'view' && selectedPipeline?.id === pipelineId) {
      console.log('🔄 [EventListener] Lead criado na pipeline atual, fazendo refresh...');
      
      setTimeout(() => {
        onRefreshLeads();
      }, 500); // 500ms de delay para criação
    }
  }, [viewMode, selectedPipeline?.id, onRefreshLeads]);

  // Event handler para atualização de pipelines
  const handlePipelineUpdated = useCallback((event: CustomEvent) => {
    const { pipelineId, action, timestamp } = event.detail;
    
    console.log('📡 [EventListener] Evento pipelineUpdated recebido:', {
      pipelineId,
      action,
      timestamp,
      currentViewMode: viewMode
    });
    
    // Fazer refresh das pipelines se disponível
    if (onRefreshPipelines) {
      console.log('🔄 [EventListener] Fazendo refresh das pipelines...');
      
      setTimeout(() => {
        onRefreshPipelines();
      }, 200);
    }
  }, [viewMode, onRefreshPipelines]);

  // Event handler para mudanças de etapa
  const handleLeadStageChanged = useCallback((event: CustomEvent) => {
    const { leadId, fromStage, toStage, pipelineId, timestamp } = event.detail;
    
    console.log('📡 [EventListener] Evento leadStageChanged recebido:', {
      leadId: leadId?.substring(0, 8) + '...',
      fromStage,
      toStage,
      pipelineId,
      timestamp,
      selectedPipelineId: selectedPipeline?.id
    });
    
    // Refresh se estamos na pipeline afetada
    if (viewMode === 'view' && selectedPipeline?.id === pipelineId) {
      console.log('🔄 [EventListener] Lead mudou de etapa na pipeline atual, fazendo refresh...');
      
      setTimeout(() => {
        onRefreshLeads();
      }, 200);
    }
  }, [viewMode, selectedPipeline?.id, onRefreshLeads]);

  // Registrar listeners globais
  useEffect(() => {
    // Verificar se já existe listener registrado
    if (isListenerRegistered(listenerKey)) {
      console.log('👂 [EventListener] Listeners já registrados, pulando...', listenerKey);
      return;
    }

    console.log('👂 [EventListener] Registrando listeners globais...', listenerKey);

    // Registrar que este listener está ativo
    registerListener(listenerKey);

    // Adicionar event listeners
    window.addEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);
    window.addEventListener('leadCreated', handleLeadCreated as EventListener);
    window.addEventListener('pipelineUpdated', handlePipelineUpdated as EventListener);
    window.addEventListener('leadStageChanged', handleLeadStageChanged as EventListener);

    // Cleanup function
    return () => {
      console.log('🧹 [EventListener] Removendo listeners globais...', listenerKey);
      
      // Remover listeners
      window.removeEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);
      window.removeEventListener('leadCreated', handleLeadCreated as EventListener);
      window.removeEventListener('pipelineUpdated', handlePipelineUpdated as EventListener);
      window.removeEventListener('leadStageChanged', handleLeadStageChanged as EventListener);
      
      // Desregistrar listener
      unregisterListener(listenerKey);
    };
  }, [
    listenerKey,
    handleLeadDataUpdated,
    handleLeadCreated,
    handlePipelineUpdated,
    handleLeadStageChanged,
    isListenerRegistered,
    registerListener,
    unregisterListener
  ]);

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