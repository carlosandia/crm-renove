import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePipelineData } from '../hooks/usePipelineData';
import { useArrayState } from '../hooks/useArrayState';
import { Pipeline } from '../types/Pipeline';
import { User } from '../types/User';

// ================================================================================
// COMPONENTES REFATORADOS - TAREFA 2
// ================================================================================
import { useModalManager } from './Pipeline/managers/ModalManager';
import { useLeadManager } from './Pipeline/managers/LeadManager';
import { useEventListener } from './Pipeline/events/EventListener';
import PipelineListView from './Pipeline/views/PipelineListView';
import PipelineFormView from './Pipeline/views/PipelineFormView';
import PipelineKanbanView from './Pipeline/views/PipelineKanbanView';

// ================================================================================
// COMPONENTES EXISTENTES MANTIDOS
// ================================================================================
import EmailComposeModal from './Leads/EmailComposeModal';
import StepLeadModal from './Pipeline/StepLeadModal';
import LeadEditModal from './Pipeline/LeadEditModal';
import LeadDetailsModal from './Pipeline/LeadDetailsModal';

// ================================================================================
// COMPONENTES UI
// ================================================================================
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

interface ModernAdminPipelineManagerRefactoredProps {
  className?: string;
}

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const ModernAdminPipelineManagerRefactored: React.FC<ModernAdminPipelineManagerRefactoredProps> = ({ 
  className 
}) => {
  const { user } = useAuth();
  const {
    pipelines,
    selectedPipeline,
    leads,
    loading,
    error,
    setSelectedPipeline,
    handleCreateLead,
    updateLeadStage,
    updateLeadData,
    refreshPipelines,
    refreshLeads,
    getAdminCreatedPipelines,
    linkMemberToPipeline,
    unlinkMemberFromPipeline,
    getPipelineMembers
  } = usePipelineData();

  // ================================================================================
  // ESTADOS PRINCIPAIS
  // ================================================================================
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [viewingPipeline, setViewingPipeline] = useState<Pipeline | null>(null);
  
  // Estados para filtros
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('');

  // Estados para arrays usando useArrayState
  const membersState = useArrayState<User>([]);

  // ================================================================================
  // HOOKS DOS COMPONENTES REFATORADOS
  // ================================================================================
  const modalManager = useModalManager();
  
  const leadManager = useLeadManager({
    initialLeads: leads,
    viewingPipeline,
    onCreateLead: async (stageId: string, leadData: any) => {
      await handleCreateLead(stageId, leadData);
    },
    onUpdateLeadData: updateLeadData,
    onDeleteLead: async (leadId: string) => {
      // Implementar lógica de delete
      console.log('Deletando lead:', leadId);
    },
    onTransferLead: async (leadId: string, newOwnerId: string) => {
      // Implementar lógica de transfer
      console.log('Transferindo lead:', leadId, 'para:', newOwnerId);
    },
    onRefreshLeads: refreshLeads
  });

  useEventListener({
    viewMode,
    selectedPipeline,
    onRefreshLeads: refreshLeads,
    onRefreshPipelines: refreshPipelines,
    listenerKey: 'modernAdminPipelineManagerRefactored'
  });

  // ================================================================================
  // LÓGICA DE PIPELINES DO ADMIN
  // ================================================================================
  const adminPipelines = useMemo(() => {
    console.log('🔍 [ModernAdminPipelineManagerRefactored] Recalculando adminPipelines:', {
      loading,
      pipelinesLength: pipelines?.length || 0,
      userRole: user?.role,
      userEmail: user?.email,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });

    if (loading) {
      console.log('⏳ [ModernAdminPipelineManagerRefactored] Aguardando carregamento...');
      return [];
    }

    if (!pipelines) {
      console.log('⚠️ [ModernAdminPipelineManagerRefactored] Pipelines ainda não carregadas');
      return [];
    }

    if (!user?.role || (user.role !== 'admin' && user.role !== 'super_admin')) {
      console.log('⚠️ [ModernAdminPipelineManagerRefactored] Usuário não é admin:', user?.role);
      return [];
    }

    let result: Pipeline[] = [];
    
    if (user.role === 'super_admin') {
      result = pipelines.filter(p => p.tenant_id === user.tenant_id);
      console.log('👑 [ModernAdminPipelineManagerRefactored] Super admin - todas as pipelines do tenant:', {
        total: pipelines.length,
        filtered: result.length,
        tenantId: user.tenant_id
      });
    } else if (user.role === 'admin') {
      result = pipelines.filter(p => {
        const createdByAdmin = p.created_by === user.email || p.created_by === user.id;
        return p.tenant_id === user.tenant_id && createdByAdmin;
      });
      console.log('🔑 [ModernAdminPipelineManagerRefactored] Admin - pipelines próprias:', {
        total: pipelines.length,
        filtered: result.length,
        tenantId: user.tenant_id,
        adminId: user.id
      });
    }

    return result;
  }, [pipelines, loading, user]);

  // ================================================================================
  // HANDLERS PRINCIPAIS
  // ================================================================================
  const handleCreatePipeline = useCallback(() => {
    setEditingPipeline(null);
    setViewMode('create');
  }, []);

  const handleEditPipeline = useCallback((pipeline: Pipeline) => {
    setEditingPipeline(pipeline);
    setViewMode('edit');
  }, []);

  const handleViewPipeline = useCallback((pipeline: Pipeline) => {
    setViewingPipeline(pipeline);
    setSelectedPipeline(pipeline);
    setViewMode('view');
  }, [setSelectedPipeline]);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setEditingPipeline(null);
    setViewingPipeline(null);
    setSelectedPipeline(null);
  }, [setSelectedPipeline]);

  const handlePipelineSubmit = useCallback(async (data: any) => {
    try {
      console.log('📝 [ModernAdminPipelineManagerRefactored] Salvando pipeline:', data);
      
      // Implementar lógica de save
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular API call
      
      console.log('✅ [ModernAdminPipelineManagerRefactored] Pipeline salva com sucesso');
      
      // Voltar para lista e refresh
      setViewMode('list');
      setEditingPipeline(null);
      await refreshPipelines();
      
    } catch (error) {
      console.error('❌ [ModernAdminPipelineManagerRefactored] Erro ao salvar pipeline:', error);
      throw error;
    }
  }, [refreshPipelines]);

  const handleAddLead = useCallback(() => {
    if (!viewingPipeline) return;
    modalManager.openAddLeadModal();
  }, [viewingPipeline, modalManager]);

  const handleEditLead = useCallback((lead: any) => {
    modalManager.openEditLeadModal(lead, lead.custom_data || {});
  }, [modalManager]);

  const handleSaveLead = useCallback(async (leadData: any) => {
    try {
      if (modalManager.modalData) {
        // Editar lead existente
        await leadManager.handleEditLead(modalManager.modalData.id, leadData);
      } else {
        // Criar novo lead
        await leadManager.handleCreateLead(leadData);
      }
      
      // Fechar modais
      modalManager.closeAddLeadModal();
      modalManager.closeEditLeadModal();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      alert('Erro ao salvar lead: ' + (error as Error).message);
    }
  }, [modalManager, leadManager]);

  // ================================================================================
  // RENDERIZAÇÃO DOS MODOS
  // ================================================================================
  const renderContent = () => {
    switch (viewMode) {
      case 'create':
      case 'edit':
        return (
          <PipelineFormView
            editingPipeline={editingPipeline}
            availableMembers={membersState.items}
            onSubmit={handlePipelineSubmit}
            onCancel={handleBackToList}
            isEdit={viewMode === 'edit'}
          />
        );

      case 'view':
        if (!viewingPipeline) return null;
        return (
          <PipelineKanbanView
            viewingPipeline={viewingPipeline}
            leads={leadManager.localLeads}
            availableMembers={membersState.items}
            searchFilter={searchFilter}
            selectedMemberFilter={selectedMemberFilter}
            onBackToList={handleBackToList}
            onEditPipeline={handleEditPipeline}
            onAddLead={handleAddLead}
            onEditLead={handleEditLead}
            onLeadMove={updateLeadStage}
            onRefreshLeads={refreshLeads}
          />
        );

      default:
        return (
          <PipelineListView
            adminPipelines={adminPipelines}
            availableMembers={membersState.items}
            loading={loading}
            onCreatePipeline={handleCreatePipeline}
            onEditPipeline={handleEditPipeline}
            onViewPipeline={handleViewPipeline}
          />
        );
    }
  };

  // ================================================================================
  // RENDER PRINCIPAL
  // ================================================================================
  return (
    <div className={className}>
      {renderContent()}

      {/* Modais existentes mantidos - com correções de props conforme interfaces */}
      {modalManager.isAddLeadModalOpen && viewingPipeline && (
        <StepLeadModal
          isOpen={true}
          onClose={modalManager.closeAddLeadModal}
          onSubmit={handleSaveLead}
          pipeline={viewingPipeline}
        />
      )}

      {modalManager.isEditLeadModalOpen && modalManager.modalData && (
        <LeadEditModal
          isOpen={true}
          onClose={modalManager.closeEditLeadModal}
          onSave={handleSaveLead}
          lead={modalManager.modalData}
          customFields={viewingPipeline?.pipeline_custom_fields || []}
        />
      )}

      {modalManager.isDealDetailsModalOpen && modalManager.modalData && (
        <LeadDetailsModal
          lead={modalManager.modalData}
          isOpen={true}
          onClose={modalManager.closeDealDetailsModal}
          customFields={viewingPipeline?.pipeline_custom_fields || []}
        />
      )}

      {modalManager.isEmailModalOpen && modalManager.modalData && (
        <EmailComposeModal
          isOpen={true}
          onClose={modalManager.closeEmailModal}
          lead={modalManager.modalData}
        />
      )}

      {modalManager.isDeleteConfirmModalOpen && modalManager.modalData && (
        <Dialog open={true} onOpenChange={() => modalManager.closeDeleteConfirmModal()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={modalManager.closeDeleteConfirmModal}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  await leadManager.handleDeleteLead(modalManager.modalData!.id);
                  modalManager.closeDeleteConfirmModal();
                }}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ModernAdminPipelineManagerRefactored; 