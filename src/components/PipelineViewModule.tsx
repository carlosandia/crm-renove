
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePipelineData } from '../hooks/usePipelineData';
import { usePipelineDragDrop } from '../hooks/usePipelineDragDrop';
import PipelineViewHeader from './Pipeline/PipelineViewHeader';
import PipelineKanbanBoard from './Pipeline/PipelineKanbanBoard';
import LeadModal from './Pipeline/LeadModal';
import PipelineAccessControl from './Pipeline/PipelineAccessControl';
import { Pipeline } from '../types/Pipeline';
import './PipelineViewModule.css';

const PipelineViewModule: React.FC = () => {
  const { user } = useAuth();
  const {
    pipelines,
    selectedPipeline,
    setSelectedPipeline,
    loading,
    leads,
    handleCreateLead,
    updateLeadStage
  } = usePipelineData();

  const {
    activeLead,
    handleDragStart,
    handleDragEnd
  } = usePipelineDragDrop(leads, updateLeadStage);

  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [leadFormData, setLeadFormData] = useState<Record<string, any>>({});

  const handleAddLead = (stageId?: string) => {
    setSelectedStageId(stageId || 'stage-1');
    setLeadFormData({});
    setShowAddLeadModal(true);
  };

  const handleCreateLeadSubmit = async () => {
    await handleCreateLead(selectedStageId, leadFormData);
    setLeadFormData({});
    setShowAddLeadModal(false);
    setSelectedStageId('');
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setLeadFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handlePipelineChange = (pipeline: Pipeline | null) => {
    setSelectedPipeline(pipeline);
  };

  const getAllStages = () => {
    return (selectedPipeline?.pipeline_stages || [])
      .sort((a, b) => a.order_index - b.order_index);
  };

  // Calcular métricas
  const totalLeads = leads.length;
  const totalRevenue = leads.reduce((sum, lead) => {
    const value = parseFloat(lead.custom_data?.valor_proposta || '0');
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
  const closedDeals = leads.filter(lead => lead.stage_id === 'stage-5').length;

  return (
    <PipelineAccessControl userRole={user?.role} loading={loading}>
      <div className="pipeline-view-container">
        <PipelineViewHeader
          pipelines={pipelines}
          selectedPipeline={selectedPipeline}
          onPipelineChange={handlePipelineChange}
          onAddLead={() => handleAddLead()}
          totalLeads={totalLeads}
          totalRevenue={totalRevenue}
          closedDeals={closedDeals}
        />

        <PipelineKanbanBoard
          stages={getAllStages()}
          leads={leads}
          customFields={selectedPipeline?.pipeline_custom_fields || []}
          activeLead={activeLead}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onAddLead={handleAddLead}
        />

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
