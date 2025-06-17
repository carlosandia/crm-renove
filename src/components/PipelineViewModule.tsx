import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useAuth } from '../contexts/AuthContext';
import { usePipelineData } from '../hooks/usePipelineData';
import { usePipelineMetrics } from '../hooks/usePipelineMetrics';
import PipelineAccessControl from './Pipeline/PipelineAccessControl';
import PipelineViewHeader from './Pipeline/PipelineViewHeader';
import PipelineKanbanBoard from './Pipeline/PipelineKanbanBoard';
import LeadModal from './Pipeline/LeadModal';
import LeadEditModal from './Pipeline/LeadEditModal';
import { Pipeline, Lead } from '../types/Pipeline';
import './PipelineViewModule.css';

const PipelineViewModule: React.FC = () => {
  const { user } = useAuth();
  const { 
    pipelines, 
    selectedPipeline, 
    leads, 
    loading, 
    setSelectedPipeline, 
    setLeads,
    handleCreateLead,
    updateLeadStage,
    updateLeadData
  } = usePipelineData();
  
  // Estados locais
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadFormData, setLeadFormData] = useState<Record<string, any>>({});

  // Calcular métricas usando o hook
  const metrics = usePipelineMetrics(
    leads,
    selectedPipeline?.pipeline_stages || [],
    selectedPipeline?.id
  );

  // Memoizar função para obter todas as etapas da pipeline selecionada
  const getAllStages = useMemo(() => {
    if (!selectedPipeline?.pipeline_stages) return [];
    return selectedPipeline.pipeline_stages.sort((a, b) => a.order_index - b.order_index);
  }, [selectedPipeline?.pipeline_stages]);

  // Handlers para drag and drop
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const lead = leads.find(l => l.id === active.id);
    setActiveLead(lead || null);
  }, [leads]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveLead(null);
      return;
    }

    const leadId = active.id as string;
    const newStageId = over.id as string;

    // Usar a função do hook para atualizar com moved_at
    updateLeadStage(leadId, newStageId);
    setActiveLead(null);
  }, [updateLeadStage]);

  // Handlers para adicionar lead
  const handleAddLead = useCallback((stageId?: string) => {
    setLeadFormData({});
    setShowAddLeadModal(true);
  }, []);

  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setLeadFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  }, []);

  const handleCreateLeadSubmit = useCallback(async () => {
    if (!selectedPipeline) return;

    try {
      const newLead = await handleCreateLead(
        selectedPipeline.pipeline_stages?.[0]?.id || 'stage-1',
        leadFormData
      );
      
      if (newLead) {
        setShowAddLeadModal(false);
        setLeadFormData({});
        console.log('Novo lead criado e salvo:', newLead);
      }
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      alert('Erro ao criar lead. Tente novamente.');
    }
  }, [selectedPipeline, handleCreateLead, leadFormData]);

  // Handler para trocar pipeline
  const handlePipelineChange = useCallback((pipeline: Pipeline | null) => {
    setSelectedPipeline(pipeline);
  }, [setSelectedPipeline]);

  // Handler para atualizar lead
  const handleUpdateLead = useCallback(async (leadId: string, updatedData: any) => {
    try {
      await updateLeadData(leadId, updatedData);
      console.log('Lead atualizado:', leadId, updatedData);
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
    }
  }, [updateLeadData]);

  // Handler para editar lead
  const handleEditLead = useCallback((lead: Lead) => {
    setEditingLead(lead);
    setShowEditModal(true);
  }, []);

  // Handler para salvar edições do lead
  const handleSaveLeadEdit = useCallback(async (updatedData: any) => {
    if (!editingLead) return;
    
    try {
      await updateLeadData(editingLead.id, updatedData);
      setShowEditModal(false);
      setEditingLead(null);
    } catch (error) {
      console.error('Erro ao salvar edições do lead:', error);
    }
  }, [editingLead, updateLeadData]);

  // Handler para fechar modal de adicionar lead
  const handleCloseAddModal = useCallback(() => {
    setShowAddLeadModal(false);
  }, []);

  // Handler para fechar modal de editar lead
  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingLead(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PipelineAccessControl userRole={user?.role} loading={loading}>
      <div className="pipeline-view-container">
        <PipelineViewHeader
          pipelines={pipelines}
          selectedPipeline={selectedPipeline}
          onPipelineChange={handlePipelineChange}
          onAddLead={handleAddLead}
          totalLeads={metrics.totalLeads}
          totalRevenue={metrics.totalRevenue}
          closedDeals={metrics.closedDeals}
          conversionRate={metrics.conversionRate}
          averageCycleTime={metrics.averageCycleTimeFormatted}
          loading={metrics.loading}
        />

        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <PipelineKanbanBoard
            stages={getAllStages}
            leads={leads}
            customFields={selectedPipeline?.pipeline_custom_fields || []}
            activeLead={activeLead}
            onAddLead={handleAddLead}
            onUpdateLead={handleUpdateLead}
            onEditLead={handleEditLead}
            stageMetrics={metrics.stageMetrics}
          />
        </DndContext>

        {/* Modal de Adicionar Lead */}
        {showAddLeadModal && selectedPipeline && (
          <LeadModal
            isOpen={showAddLeadModal}
            onClose={handleCloseAddModal}
            pipeline={selectedPipeline}
            formData={leadFormData}
            onFieldChange={handleFieldChange}
            onSubmit={handleCreateLeadSubmit}
          />
        )}

        {/* Modal de Editar Lead */}
        {showEditModal && editingLead && selectedPipeline && (
          <LeadEditModal
            isOpen={showEditModal}
            onClose={handleCloseEditModal}
            lead={editingLead}
            customFields={selectedPipeline.pipeline_custom_fields || []}
            onSave={handleSaveLeadEdit}
          />
        )}
      </div>
    </PipelineAccessControl>
  );
};

export default PipelineViewModule; 