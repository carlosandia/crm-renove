import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useAuth } from '../contexts/AuthContext';
import { usePipelineData } from '../hooks/usePipelineData';
import { usePipelineMetrics } from '../hooks/usePipelineMetrics';
import PipelineAccessControl from './Pipeline/PipelineAccessControl';
import PipelineViewHeader from './Pipeline/PipelineViewHeader';
import PipelineKanbanBoard from './Pipeline/PipelineKanbanBoard';
import LeadModal from './Pipeline/LeadModal';
import { Pipeline } from '../types/Pipeline';
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
    updateLeadStage 
  } = usePipelineData();
  
  // Estados locais
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [activeLead, setActiveLead] = useState<any>(null);
  const [leadFormData, setLeadFormData] = useState<Record<string, any>>({});

  // Calcular métricas usando o hook
  const metrics = usePipelineMetrics(
    leads,
    selectedPipeline?.pipeline_stages || [],
    selectedPipeline?.id
  );

  // Função para obter todas as etapas da pipeline selecionada
  const getAllStages = () => {
    if (!selectedPipeline?.pipeline_stages) return [];
    return selectedPipeline.pipeline_stages.sort((a, b) => a.order_index - b.order_index);
  };

  // Handlers para drag and drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = leads.find(l => l.id === active.id);
    setActiveLead(lead);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveLead(null);
      return;
    }

    const leadId = active.id as string;
    const newStageId = over.id as string;

    // Usar setLeads para atualizar com moved_at
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return {
          ...lead,
          stage_id: newStageId,
          moved_at: new Date().toISOString(), // Registrar quando foi movido
          updated_at: new Date().toISOString()
        };
      }
      return lead;
    }));
    
    setActiveLead(null);

    // Aqui você faria a chamada para a API para salvar a mudança
    console.log(`Lead ${leadId} movido para etapa ${newStageId}`);
  };

  // Handlers para adicionar lead
  const handleAddLead = (stageId?: string) => {
    setLeadFormData({});
    setShowAddLeadModal(true);
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setLeadFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleCreateLeadSubmit = () => {
    if (!selectedPipeline) return;

    // Criar novo lead
    const newLead = {
      id: `lead-${Date.now()}`,
      pipeline_id: selectedPipeline.id,
      stage_id: selectedPipeline.pipeline_stages?.[0]?.id || 'stage-1', // Primeira etapa
      custom_data: leadFormData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      moved_at: new Date().toISOString(), // Data de entrada na primeira etapa
      status: 'active'
    };

    setLeads(prev => [...prev, newLead]);
    setShowAddLeadModal(false);
    setLeadFormData({});

    // Aqui você faria a chamada para a API para salvar o lead
    console.log('Novo lead criado:', newLead);
  };

  // Handler para trocar pipeline - corrigido para aceitar Pipeline | null
  const handlePipelineChange = (pipeline: Pipeline | null) => {
    setSelectedPipeline(pipeline);
  };

  // Handler para atualizar lead
  const handleUpdateLead = (leadId: string, updatedData: any) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return {
          ...lead,
          ...updatedData,
          updated_at: new Date().toISOString()
        };
      }
      return lead;
    }));
  };

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
          onAddLead={() => handleAddLead()}
          totalLeads={metrics.totalLeads}
          totalRevenue={metrics.totalRevenue}
          closedDeals={metrics.closedDeals}
          conversionRate={metrics.conversionRate}
          averageCycleTime={metrics.averageCycleTimeFormatted}
          loading={metrics.loading}
        />

        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <PipelineKanbanBoard
            stages={getAllStages()}
            leads={leads}
            customFields={selectedPipeline?.pipeline_custom_fields || []}
            activeLead={activeLead}
            onAddLead={handleAddLead}
            onUpdateLead={handleUpdateLead}
            stageMetrics={metrics.stageMetrics}
          />
        </DndContext>

        {/* Modal de Adicionar Lead */}
        {showAddLeadModal && selectedPipeline && (
          <LeadModal
            isOpen={showAddLeadModal}
            onClose={() => setShowAddLeadModal(false)}
            pipeline={selectedPipeline}
            formData={leadFormData}
            onFieldChange={handleFieldChange}
            onSubmit={handleCreateLeadSubmit}
          />
        )}
      </div>
    </PipelineAccessControl>
  );
};

export default PipelineViewModule; 