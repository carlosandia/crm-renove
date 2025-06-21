import React, { useState, useCallback, useMemo } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { useAuth } from '../contexts/AuthContext';
import { useModalContext } from '../contexts/ModalContext';
import { usePipelineData } from '../hooks/usePipelineData';
import { usePipelineMetrics } from '../hooks/usePipelineMetrics';
import PipelineViewHeader from './Pipeline/PipelineViewHeader';
import PipelineKanbanBoard from './Pipeline/PipelineKanbanBoard';
import LeadModal from './Pipeline/LeadModal';
import LeadEditModal from './Pipeline/LeadEditModal';
import PipelineAccessControl from './Pipeline/PipelineAccessControl';
import { Pipeline, Lead } from '../types/Pipeline';

const PipelineViewModule: React.FC = () => {
  const { user } = useAuth();
  const modalContext = useModalContext();
  const {
    pipelines,
    selectedPipeline,
    leads,
    loading,
    error,
    setSelectedPipeline,
    setLeads,
    handleCreateLead,
    updateLeadStage,
    updateLeadData,
    refreshPipelines,
    refreshLeads,
    getUserPipelines,
    getAdminCreatedPipelines,
    getMemberLinkedPipelines,
    linkMemberToPipeline,
    unlinkMemberFromPipeline,
    getPipelineMembers
  } = usePipelineData();

  // Estados locais
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadFormData, setLeadFormData] = useState<Record<string, any>>({});

  // Estados para filtros
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('');
  const [showOnlyMyPipelines, setShowOnlyMyPipelines] = useState(true);
  const [availableVendors, setAvailableVendors] = useState<any[]>([]);

  // Obter pipelines baseado no role e filtros
  const getFilteredPipelines = useMemo(() => {
    let filtered = pipelines;

    // Filtro por "Minhas Pipelines" apenas para admin
    if (user?.role === 'admin' && showOnlyMyPipelines) {
      filtered = filtered.filter(pipeline => 
        pipeline.created_by === user.id || pipeline.created_by === user.email
      );
    }

    return filtered;
  }, [pipelines, user, showOnlyMyPipelines]);

  // Atualizar vendedores disponíveis quando pipeline selecionada muda
  React.useEffect(() => {
    const updateAvailableVendors = async () => {
      if (selectedPipeline && user?.role === 'admin') {
        const members = await getPipelineMembers(selectedPipeline.id);
        const vendors = members
          .map(member => member.users)
          .filter(Boolean)
          .filter(vendor => vendor.is_active);
        setAvailableVendors(vendors);
      } else {
        setAvailableVendors([]);
      }
    };

    updateAvailableVendors();
  }, [selectedPipeline, user?.role, getPipelineMembers]);

  // Aplicar filtros aos leads
  const filteredLeads = useMemo(() => {
    let filtered = leads;

    // Filtro de busca
    if (searchFilter.trim()) {
      const searchTerm = searchFilter.toLowerCase();
      filtered = filtered.filter(lead => {
        const customData = lead.custom_data || {};
        const searchableFields = [
          customData.nome_oportunidade,
          customData.nome_lead,
          customData.nome_contato,
          customData.email,
          customData.telefone,
          customData.empresa,
          customData.descricao
        ];
        
        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchTerm)
        );
      });
    }

    // Filtro por status
    if (statusFilter && statusFilter !== 'Todos os Status') {
      filtered = filtered.filter(lead => {
        const status = lead.status || 'ativo';
        return status === statusFilter.toLowerCase();
      });
    }

    // Filtro por vendedor (apenas para admin)
    if (selectedVendorFilter && user?.role === 'admin') {
      // TODO: Implementar filtro por vendedor quando tivermos o campo assigned_to
      // filtered = filtered.filter(lead => 
      //   lead.assigned_to === selectedVendorFilter
      // );
    }

    return filtered;
  }, [leads, searchFilter, statusFilter, selectedVendorFilter, user?.role]);

  // Calcular métricas usando leads filtrados
  const pipelineMetrics = usePipelineMetrics(
    filteredLeads,
    selectedPipeline?.pipeline_stages || [],
    selectedPipeline?.id
  );

  // Memoizar função para obter todas as etapas da pipeline selecionada
  const getAllStages = useMemo(() => {
    if (!selectedPipeline?.pipeline_stages) {
      console.log('⚠️ Pipeline selecionada sem etapas:', selectedPipeline?.name);
      return [];
    }
    
    const stages = selectedPipeline.pipeline_stages.sort((a, b) => a.order_index - b.order_index);
    console.log('🎯 Etapas da pipeline processadas:', {
      pipelineName: selectedPipeline.name,
      stagesCount: stages.length,
      stages: stages.map(s => ({ name: s.name, order: s.order_index, color: s.color }))
    });
    
    return stages;
  }, [selectedPipeline?.pipeline_stages]);

  // Handler para drag and drop - OTIMIZADO
  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Se não foi dropado em lugar válido
    if (!destination) {
      return;
    }

    // Se foi dropado no mesmo lugar
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const leadId = draggableId;
    const newStageId = destination.droppableId;

    console.log('🚀 DRAG OTIMIZADO - Movendo lead:', {
      leadId: leadId.substring(0, 8) + '...',
      from: source.droppableId,
      to: newStageId
    });

    // 🎯 OPTIMISTIC UPDATE - Atualizar UI IMEDIATAMENTE
    const leadToMove = leads.find(lead => lead.id === leadId);
    if (leadToMove) {
      const movedAt = new Date().toISOString();
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { 
              ...lead, 
              stage_id: newStageId, 
              moved_at: movedAt,
              updated_at: movedAt
            }
          : lead
      ));
      
      console.log('⚡ UI atualizada instantaneamente via optimistic update');
    }

    // 🔄 BACKGROUND UPDATE - Sincronizar com backend sem bloquear UI
    updateLeadStage(leadId, newStageId)
      .then(() => {
        console.log('✅ Backend sincronizado com sucesso');
      })
      .catch((error) => {
        console.error('❌ Erro no backend - revertendo UI:', error);
        
        // Reverter optimistic update em caso de erro
        if (leadToMove) {
          setLeads(prev => prev.map(lead => 
            lead.id === leadId 
              ? { 
                  ...lead, 
                  stage_id: leadToMove.stage_id, 
                  moved_at: leadToMove.moved_at,
                  updated_at: leadToMove.updated_at
                }
              : lead
          ));
        }
        
        alert('Erro ao mover lead: ' + error.message);
      });
  }, [updateLeadStage, leads]);

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

  // Handler para criar lead
  const handleCreateLeadSubmit = useCallback(async () => {
    if (!selectedPipeline) return;

    console.log('🚀 INICIANDO CRIAÇÃO DE OPORTUNIDADE:', {
      pipeline: selectedPipeline.name,
      formData: leadFormData,
      firstStage: selectedPipeline.pipeline_stages?.[0]
    });

    try {
      const newLead = await handleCreateLead(
        selectedPipeline.pipeline_stages?.[0]?.id || 'stage-1',
        leadFormData
      );
      
      if (newLead) {
        console.log('✅ OPORTUNIDADE CRIADA COM SUCESSO:', {
          id: newLead.id,
          stage_id: newLead.stage_id,
          pipeline_id: newLead.pipeline_id,
          custom_data: newLead.custom_data
        });

        // FECHAR MODAL IMEDIATAMENTE
        setShowAddLeadModal(false);
        setLeadFormData({});
        
        // MOSTRAR NOTIFICAÇÃO DE SUCESSO
        const hasSyncData = leadFormData.nome_lead && leadFormData.email;
        if (hasSyncData) {
          alert(`✅ Oportunidade criada com sucesso!\n\n🔄 Lead sincronizado automaticamente:\n• Pipeline: ${newLead.pipeline_id}\n• Stage: ${newLead.stage_id}\n• ID: ${newLead.id}\n\n📋 Verifique o módulo Leads para acompanhamento.`);
        } else {
          alert(`✅ Oportunidade criada com sucesso!\n\n📋 ID: ${newLead.id}\n• Pipeline: ${newLead.pipeline_id}\n• Stage: ${newLead.stage_id}\n\n🎯 O card deve aparecer na primeira coluna "Novos Leads"`);
        }

        // REFRESH INTELIGENTE SEM RELOAD DA PÁGINA
        console.log('🔄 Executando refresh inteligente...');
        
        // 1. Forçar refresh dos leads IMEDIATAMENTE
        if (selectedPipeline?.id) {
          console.log('🔄 Primeiro refresh...');
          await refreshLeads();
          
          // 2. Forçar atualização do estado local também
          setLeads(prevLeads => {
            // Verificar se o lead já existe no estado
            const existingLead = prevLeads.find(l => l.id === newLead.id);
            if (!existingLead) {
              console.log('➕ Adicionando lead ao estado local:', newLead.id);
              return [...prevLeads, newLead];
            }
            console.log('✅ Lead já existe no estado local');
            return prevLeads;
          });
        }
        
        // 3. Segundo refresh após delay para garantir sincronização
        setTimeout(async () => {
          console.log('🔄 Segundo refresh para garantir sincronização...');
          if (selectedPipeline?.id) {
            await refreshLeads();
            console.log('✅ Refresh duplo concluído - interface deve estar atualizada');
          }
        }, 1500);

      } else {
        console.error('❌ Lead não foi criado (retornou null)');
        alert('❌ Erro: Lead não foi criado. Verifique o console para detalhes.');
      }
    } catch (error) {
      console.error('❌ Erro ao criar lead:', error);
      alert('❌ Erro ao criar oportunidade. Tente novamente.');
    }
  }, [selectedPipeline, handleCreateLead, leadFormData, refreshLeads]);

  // Handler para trocar pipeline
  const handlePipelineChange = useCallback((pipeline: Pipeline | null) => {
    setSelectedPipeline(pipeline);
    // Limpar filtros ao trocar pipeline
    setSearchFilter('');
    setStatusFilter('');
    setSelectedVendorFilter('');
  }, [setSelectedPipeline]);

  // Handler para atualizar lead
  const handleUpdateLead = useCallback(async (leadId: string, updatedData: any) => {
    try {
      console.log('🔄 PipelineViewModule: handleUpdateLead executado', { leadId, updatedData });
      await updateLeadData(leadId, updatedData);
      console.log('✅ PipelineViewModule: Lead atualizado no backend:', leadId, updatedData);
      
      // Atualizar estado local dos leads de forma mais específica
      setLeads(prevLeads => {
        const updatedLeads = prevLeads.map(lead => {
          if (lead.id === leadId) {
            const updatedLead = { 
              ...lead, 
              ...updatedData, 
              updated_at: new Date().toISOString() 
            };
            console.log('🔄 PipelineViewModule: Lead atualizado no estado local:', updatedLead);
            return updatedLead;
          }
          return lead;
        });
        return updatedLeads;
      });
    } catch (error) {
      console.error('❌ PipelineViewModule: Erro ao atualizar lead:', error);
    }
  }, [updateLeadData]);

  // Conectar o handler de atualização ao ModalContext
  React.useEffect(() => {
    modalContext.setExternalUpdateHandler(handleUpdateLead);
  }, [modalContext, handleUpdateLead]);

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

  // Handlers para filtros
  const handleSearchChange = useCallback((search: string) => {
    setSearchFilter(search);
  }, []);

  const handleStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
  }, []);

  const handleVendorFilter = useCallback((vendorId: string) => {
    setSelectedVendorFilter(vendorId);
  }, []);

  const handleToggleMyPipelines = useCallback(() => {
    setShowOnlyMyPipelines(prev => !prev);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchFilter('');
    setStatusFilter('');
    setSelectedVendorFilter('');
  }, []);

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
    console.log('⏳ PipelineViewModule - Ainda carregando...');
    return (
      <div className="pipeline-loading">
        <div className="spinner"></div>
        <p>Carregando pipeline...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <PipelineAccessControl userRole={undefined} loading={false}>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Acesso Negado
          </h3>
          <p className="text-gray-600">
            Você precisa estar logado para acessar esta página.
          </p>
        </div>
      </PipelineAccessControl>
    );
  }

  if (pipelines.length === 0) {
    return (
      <PipelineAccessControl userRole={user?.role} loading={loading}>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhuma Pipeline Encontrada
          </h3>
          <p className="text-gray-600 mb-4">
            {user?.role === 'admin' 
              ? 'Você pode criar uma nova pipeline no módulo "Criador de pipeline".'
              : 'Entre em contato com seu administrador para obter acesso às pipelines.'
            }
          </p>
        </div>
      </PipelineAccessControl>
    );
  }

  console.log('✅ PipelineViewModule - Renderizando componente principal');

  return (
    <PipelineAccessControl userRole={user?.role} loading={loading}>
      <div className="pipeline-view-container">
        <PipelineViewHeader
          pipelines={getFilteredPipelines}
          selectedPipeline={selectedPipeline}
          onPipelineChange={handlePipelineChange}
          onAddLead={handleAddLead}
          totalLeads={pipelineMetrics.totalLeads}
          totalRevenue={pipelineMetrics.totalRevenue}
          closedDeals={pipelineMetrics.closedDeals}
          conversionRate={pipelineMetrics.conversionRate}
          averageCycleTime={pipelineMetrics.averageCycleTimeFormatted}
          loading={pipelineMetrics.loading}
          // Props para filtros
          showOnlyMyPipelines={showOnlyMyPipelines}
          selectedVendorFilter={selectedVendorFilter}
          searchFilter={searchFilter}
          statusFilter={statusFilter}
          availableVendors={availableVendors}
          onToggleMyPipelines={user?.role === 'admin' ? handleToggleMyPipelines : undefined}
          onVendorFilterChange={handleVendorFilter}
          onSearchFilterChange={handleSearchChange}
          onStatusFilterChange={handleStatusFilter}
          onClearFilters={handleClearFilters}
          userRole={user?.role}
        />

        {selectedPipeline && getAllStages.length > 0 ? (
          <PipelineKanbanBoard
            stages={getAllStages}
            leads={filteredLeads}
            customFields={selectedPipeline?.pipeline_custom_fields || []}
            onAddLead={handleAddLead}
            onUpdateLead={handleUpdateLead}
            onEditLead={handleEditLead}
            onDragEnd={handleDragEnd}
            stageMetrics={pipelineMetrics.stageMetrics}
          />
        ) : selectedPipeline ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 m-4">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                Pipeline sem Estágios
              </h3>
              <p className="text-yellow-700">
                A pipeline "{selectedPipeline.name}" não possui estágios configurados.
              </p>
              <div className="mt-4 text-sm text-yellow-600">
                <p>Estágios disponíveis: {selectedPipeline.pipeline_stages?.length || 0}</p>
                <p>Campos personalizados: {selectedPipeline.pipeline_custom_fields?.length || 0}</p>
              </div>
            </div>
          </div>
        ) : null}

        {!selectedPipeline && getFilteredPipelines.length > 0 && (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Selecione uma Pipeline
              </h3>
              <p className="text-gray-600 mb-4">
                Escolha uma pipeline nos filtros acima para visualizar os leads.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-700">
                  <strong>Pipelines disponíveis:</strong> {getFilteredPipelines.length}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Adicionar Lead */}
        {showAddLeadModal && selectedPipeline && user && (
          <LeadModal
            isOpen={showAddLeadModal}
            onClose={handleCloseAddModal}
            pipeline={selectedPipeline}
            formData={leadFormData}
            onFieldChange={handleFieldChange}
            onSubmit={handleCreateLeadSubmit}
            currentUser={user}
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