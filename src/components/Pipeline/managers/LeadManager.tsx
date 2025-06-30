import { useCallback, useState } from 'react';
import { Lead, Pipeline } from '../../../types/Pipeline';
import { useArrayState } from '../../../hooks/useArrayState';

export interface LeadManagerProps {
  initialLeads: Lead[];
  viewingPipeline: Pipeline | null;
  onCreateLead: (stageId: string, leadData: any) => Promise<Lead | null | void>;
  onUpdateLeadData: (leadId: string, leadData: any) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
  onTransferLead: (leadId: string, newOwnerId: string) => Promise<void>;
  onRefreshLeads: () => Promise<void>;
}

export interface LeadManagerReturn {
  // Estado dos leads
  localLeads: Lead[];
  selectedLeadForDetails: Lead | null;
  
  // CRUD operations
  handleCreateLead: (leadData: any) => Promise<void>;
  handleEditLead: (leadId: string, leadData: any) => Promise<void>;
  handleDeleteLead: (leadId: string) => Promise<void>;
  handleTransferLead: (leadId: string, newOwnerId: string) => Promise<void>;
  
  // Lead selection
  setSelectedLeadForDetails: (lead: Lead | null) => void;
  
  // Utility functions
  getDaysInStage: (lead: Lead) => number;
  
  // Local state management
  updateLocalLead: (leadId: string, updates: Partial<Lead>) => void;
  removeLocalLead: (leadId: string) => void;
  addLocalLead: (lead: Lead) => void;
  setLocalLeads: (leads: Lead[]) => void;
}

export const useLeadManager = ({
  initialLeads,
  viewingPipeline,
  onCreateLead,
  onUpdateLeadData,
  onDeleteLead,
  onTransferLead,
  onRefreshLeads
}: LeadManagerProps): LeadManagerReturn => {
  
  // Estado local dos leads usando useArrayState
  const leadsState = useArrayState<Lead>(initialLeads);
  
  // Estado para lead selecionado
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);

  // Sincronizar leads locais com props
  const setLocalLeads = useCallback((leads: Lead[]) => {
    leadsState.replaceAll(leads);
  }, [leadsState]);

  // Atualizar local leads quando props mudam
  const updateLocalLead = useCallback((leadId: string, updates: Partial<Lead>) => {
    leadsState.updateItem(
      (lead) => lead.id === leadId,
      updates
    );
  }, [leadsState]);

  // Remover lead local
  const removeLocalLead = useCallback((leadId: string) => {
    leadsState.removeItem((lead) => lead.id === leadId);
  }, [leadsState]);

  // Adicionar lead local
  const addLocalLead = useCallback((lead: Lead) => {
    leadsState.addItem(lead);
  }, [leadsState]);

  // Criar nova oportunidade
  const handleCreateLead = useCallback(async (leadData: any) => {
    if (!viewingPipeline?.pipeline_stages) {
      throw new Error('Pipeline não possui etapas configuradas');
    }
    
    console.log('🆕 [LeadManager] Criando novo lead:', leadData);
    
    // Encontrar a primeira etapa (geralmente "Novos leads")
    const firstStage = viewingPipeline.pipeline_stages
      .sort((a, b) => a.order_index - b.order_index)[0];
    
    if (!firstStage) {
      throw new Error('Nenhuma etapa encontrada na pipeline');
    }
    
    try {
      await onCreateLead(firstStage.id, leadData);
      console.log('✅ [LeadManager] Lead criado com sucesso');
      
      // Refresh para sincronizar
      await onRefreshLeads();
    } catch (error) {
      console.error('❌ [LeadManager] Erro ao criar lead:', error);
      throw error;
    }
  }, [viewingPipeline, onCreateLead, onRefreshLeads]);

  // Editar lead existente
  const handleEditLead = useCallback(async (leadId: string, leadData: any) => {
    console.log('✏️ [LeadManager] Editando lead:', { leadId, leadData });
    
    try {
      await onUpdateLeadData(leadId, leadData);
      console.log('✅ [LeadManager] Lead editado com sucesso');
      
      // Atualizar lead local para feedback imediato
      updateLocalLead(leadId, { custom_data: leadData });
      
      // Refresh para garantir sincronização
      await onRefreshLeads();
    } catch (error) {
      console.error('❌ [LeadManager] Erro ao editar lead:', error);
      throw error;
    }
  }, [onUpdateLeadData, onRefreshLeads, updateLocalLead]);

  // Deletar lead
  const handleDeleteLead = useCallback(async (leadId: string) => {
    console.log('🗑️ [LeadManager] Deletando lead:', leadId);
    
    try {
      await onDeleteLead(leadId);
      console.log('✅ [LeadManager] Lead deletado com sucesso');
      
      // Remover localmente para feedback imediato
      removeLocalLead(leadId);
      
      // Refresh para garantir sincronização
      await onRefreshLeads();
    } catch (error) {
      console.error('❌ [LeadManager] Erro ao deletar lead:', error);
      throw error;
    }
  }, [onDeleteLead, onRefreshLeads, removeLocalLead]);

  // Transferir lead para outro vendedor
  const handleTransferLead = useCallback(async (leadId: string, newOwnerId: string) => {
    console.log('🔄 [LeadManager] Transferindo lead:', { leadId, newOwnerId });
    
    try {
      await onTransferLead(leadId, newOwnerId);
      console.log('✅ [LeadManager] Lead transferido com sucesso');
      
      // Refresh para sincronizar
      await onRefreshLeads();
    } catch (error) {
      console.error('❌ [LeadManager] Erro ao transferir lead:', error);
      throw error;
    }
  }, [onTransferLead, onRefreshLeads]);

  // Calcular dias na etapa atual
  const getDaysInStage = useCallback((lead: Lead): number => {
    if (!lead.moved_at) return 0;
    
    const movedDate = new Date(lead.moved_at);
    const currentDate = new Date();
    const timeDiff = currentDate.getTime() - movedDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return Math.max(0, daysDiff);
  }, []);

  return {
    localLeads: leadsState.items,
    selectedLeadForDetails,
    handleCreateLead,
    handleEditLead,
    handleDeleteLead,
    handleTransferLead,
    setSelectedLeadForDetails,
    getDaysInStage,
    updateLocalLead,
    removeLocalLead,
    addLocalLead,
    setLocalLeads
  };
};

// Componente wrapper opcional
export interface LeadManagerComponentProps extends LeadManagerProps {
  children: (leadManager: LeadManagerReturn) => React.ReactNode;
}

export const LeadManager: React.FC<LeadManagerComponentProps> = ({ 
  children, 
  ...props 
}) => {
  const leadManager = useLeadManager(props);
  return <>{children(leadManager)}</>;
};

export default useLeadManager; 