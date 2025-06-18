import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useAuth } from '../contexts/AuthContext';
import { usePipelineData } from '../hooks/usePipelineData';
import { usePipelineMetrics } from '../hooks/usePipelineMetrics';
import PipelineAccessControl from './Pipeline/PipelineAccessControl';
import PipelineKanbanBoard from './Pipeline/PipelineKanbanBoard';
import PipelineFilters from './Pipeline/PipelineFilters';
import LeadModal from './Pipeline/LeadModal';
import LeadEditModal from './Pipeline/LeadEditModal';
import { Pipeline, Lead } from '../types/Pipeline';
import PipelineViewHeader from './Pipeline/PipelineViewHeader';

const PipelineViewModule: React.FC = () => {
  const { user } = useAuth();
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
    getUserPipelines,
    getAdminCreatedPipelines,
    getMemberLinkedPipelines,
    getPipelineMembers
  } = usePipelineData();
  
  // Debug logging
  React.useEffect(() => {
    if (error) {
      console.log('❌ PipelineViewModule - Erro detectado:', error);
    }
  }, [user, pipelines, selectedPipeline, leads, loading, error]);
  
  // Estados locais
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadFormData, setLeadFormData] = useState<Record<string, any>>({});

  // Estados de filtros
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('');
  const [showOnlyMyPipelines, setShowOnlyMyPipelines] = useState(true);
  const [availableVendors, setAvailableVendors] = useState<any[]>([]);

  // Obter pipelines baseado no role e filtros
  const getFilteredPipelines = useMemo(() => {
    let pipelinesToShow: Pipeline[] = [];

    if (user?.role === 'admin') {
      if (showOnlyMyPipelines) {
        pipelinesToShow = getAdminCreatedPipelines();
      } else {
        // Admin pode ver todas as pipelines do tenant (implementar se necessário)
        pipelinesToShow = pipelines;
      }
    } else if (user?.role === 'member') {
      pipelinesToShow = getMemberLinkedPipelines();
    } else {
      pipelinesToShow = pipelines;
    }

    return pipelinesToShow;
  }, [user?.role, pipelines, showOnlyMyPipelines, getAdminCreatedPipelines, getMemberLinkedPipelines]);

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

  // Filtrar leads baseado nos filtros ativos
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    // Filtro por busca (nome, email, telefone)
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      filtered = filtered.filter(lead => {
        const customData = lead.custom_data || {};
        const searchableFields = [
          customData.Nome || customData.nome || '',
          customData.Email || customData.email || '',
          customData.Telefone || customData.telefone || '',
          customData.Empresa || customData.empresa || ''
        ].join(' ').toLowerCase();
        
        return searchableFields.includes(searchLower);
      });
    }

    // Filtro por status
    if (statusFilter) {
      filtered = filtered.filter(lead => {
        if (statusFilter === 'active') {
          return lead.status === 'active' || (!lead.status && lead.stage_id);
        }
        if (statusFilter === 'won') {
          return lead.status === 'won';
        }
        if (statusFilter === 'lost') {
          return lead.status === 'lost';
        }
        return true;
      });
    }

    // Filtro por vendedor (apenas para admin)
    if (selectedVendorFilter && user?.role === 'admin') {
      // TODO: Implementar campo assigned_to na interface Lead ou usar outro critério
      // Por enquanto, não filtrar por vendedor até implementar corretamente
      // filtered = filtered.filter(lead => 
      //   lead.assigned_to === selectedVendorFilter
      // );
    }

    return filtered;
  }, [leads, searchFilter, statusFilter, selectedVendorFilter, user?.role]);

  // Calcular métricas usando leads filtrados
  const metrics = usePipelineMetrics(
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

  // Debug das pipelines e campos personalizados
  React.useEffect(() => {
    if (selectedPipeline) {
      console.log('🔍 Pipeline selecionada - Debug detalhado:', {
        id: selectedPipeline.id,
        name: selectedPipeline.name,
        created_by: selectedPipeline.created_by,
        stages: {
          count: selectedPipeline.pipeline_stages?.length || 0,
          list: selectedPipeline.pipeline_stages?.map(s => ({
            id: s.id,
            name: s.name,
            order: s.order_index,
            color: s.color
          })) || []
        },
        customFields: {
          count: selectedPipeline.pipeline_custom_fields?.length || 0,
          list: selectedPipeline.pipeline_custom_fields?.map(f => ({
            id: f.id,
            name: f.field_name,
            label: f.field_label,
            type: f.field_type,
            order: f.field_order
          })) || []
        },
        userRole: user?.role,
        userEmail: user?.email
      });
    }
  }, [selectedPipeline, user]);

  // Handlers para drag and drop
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const lead = filteredLeads.find(l => l.id === active.id);
    setActiveLead(lead || null);
  }, [filteredLeads]);

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
    // Limpar filtros ao trocar pipeline
    setSearchFilter('');
    setStatusFilter('');
    setSelectedVendorFilter('');
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

  if (error) {
    console.log('❌ PipelineViewModule - Erro detectado:', error);
    return (
      <div className="pipeline-error">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-red-600 mb-2">
            Erro ao Carregar Pipeline
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  console.log('🔍 PipelineViewModule - Verificando condições de renderização:', {
    userRole: user?.role,
    filteredPipelinesCount: getFilteredPipelines.length,
    isMember: user?.role === 'member',
    hasSelectedPipeline: !!selectedPipeline,
    selectedPipelineName: selectedPipeline?.name
  });

  // Verificação de acesso para members sem pipelines vinculadas
  if (user?.role === 'member' && getFilteredPipelines.length === 0) {
    console.log('👤 Member sem pipelines vinculadas - mostrando mensagem');
    return (
      <PipelineAccessControl userRole={user?.role} loading={loading}>
        <div className="h-screen flex items-center justify-center bg-white">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma Pipeline Vinculada
            </h3>
            <p className="text-gray-600 mb-4">
              Você ainda não foi vinculado a nenhuma pipeline. Entre em contato com seu administrador para obter acesso.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Dica:</strong> O administrador pode vincular você a pipelines específicas no módulo "Criador de pipeline".
              </p>
            </div>
          </div>
        </div>
      </PipelineAccessControl>
    );
  }

  // Se não há pipelines filtradas, mostrar mensagem
  if (getFilteredPipelines.length === 0) {
    console.log('📭 Nenhuma pipeline encontrada após filtros');
    return (
      <PipelineAccessControl userRole={user?.role} loading={loading}>
        <div className="h-screen flex items-center justify-center bg-white">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma Pipeline Disponível
            </h3>
            <p className="text-gray-600 mb-4">
              Não há pipelines disponíveis para visualização no momento.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-700">
                {user?.role === 'admin' 
                  ? 'Você pode criar uma nova pipeline no módulo "Criador de pipeline".'
                  : 'Entre em contato com seu administrador para obter acesso às pipelines.'
                }
              </p>
            </div>
          </div>
        </div>
      </PipelineAccessControl>
    );
  }

  console.log('✅ PipelineViewModule - Renderizando componente principal');

  // Componente de debug para development
  const DebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
        <h4 className="font-bold text-green-800 mb-2">🐛 Debug Information - Menu Pipeline</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p><strong>Usuário:</strong> {user?.email || 'não autenticado'}</p>
            <p><strong>Role:</strong> {user?.role || 'indefinido'}</p>
            <p><strong>User ID:</strong> {user?.id || 'não definido'}</p>
          </div>
          <div>
            <p><strong>Pipelines Totais:</strong> {pipelines.length}</p>
            <p><strong>Pipelines Filtradas:</strong> {getFilteredPipelines.length}</p>
            <p><strong>Pipeline Selecionada:</strong> {selectedPipeline?.name || 'nenhuma'}</p>
            <p><strong>Leads:</strong> {leads.length}</p>
          </div>
          <div>
            <p><strong>Etapas da Pipeline:</strong> {selectedPipeline?.pipeline_stages?.length || 0}</p>
            <p><strong>Campos Personalizados:</strong> {selectedPipeline?.pipeline_custom_fields?.length || 0}</p>
            <p><strong>Criada por:</strong> {selectedPipeline?.created_by || 'n/a'}</p>
          </div>
        </div>
        
        {selectedPipeline && (
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <h5 className="font-semibold text-blue-800 mb-2">Pipeline Atual: {selectedPipeline.name}</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-medium text-blue-700">Etapas ({getAllStages.length}):</p>
                {getAllStages.length > 0 ? (
                  <ul className="ml-2">
                    {getAllStages.map(stage => (
                      <li key={stage.id}>
                        {stage.order_index}. {stage.name} 
                        <span className="text-gray-500">({stage.color})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-red-600">⚠️ Nenhuma etapa encontrada!</p>
                )}
              </div>
              <div>
                <p className="font-medium text-blue-700">Campos ({selectedPipeline.pipeline_custom_fields?.length || 0}):</p>
                {selectedPipeline.pipeline_custom_fields && selectedPipeline.pipeline_custom_fields.length > 0 ? (
                  <ul className="ml-2">
                    {selectedPipeline.pipeline_custom_fields
                      .sort((a, b) => a.field_order - b.field_order)
                      .map(field => (
                      <li key={field.id}>
                        {field.field_order}. {field.field_label} 
                        <span className="text-gray-500">({field.field_type})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-red-600">⚠️ Nenhum campo encontrado!</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Debug específico para Members */}
        {user?.role === 'member' && (
          <div className="mt-4 p-3 bg-purple-50 rounded border border-purple-200">
            <h5 className="font-semibold text-purple-800 mb-2">👤 Debug Member - Vinculação de Pipelines</h5>
            <div className="text-xs space-y-1">
              <p><strong>Email do Member:</strong> {user.email}</p>
              <p><strong>ID do Member:</strong> {user.id}</p>
              <p><strong>Pipelines Vinculadas:</strong> {pipelines.length}</p>
              
              {pipelines.length === 0 && (
                <div className="mt-2 p-2 bg-red-100 rounded text-red-700">
                  <p><strong>⚠️ PROBLEMA:</strong> Nenhuma pipeline vinculada encontrada!</p>
                  <p className="text-xs mt-1">
                    Verifique se o member_id na tabela pipeline_members corresponde ao email ({user.email}) ou ID ({user.id})
                  </p>
                </div>
              )}
              
              {pipelines.length > 0 && (
                <div className="mt-2">
                  <p><strong>Pipelines Encontradas:</strong></p>
                  {pipelines.map(pipeline => (
                    <div key={pipeline.id} className="ml-2 text-xs">
                      • {pipeline.name} (ID: {pipeline.id})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-3 text-xs text-green-700">
          <p><strong>Estado:</strong> Loading: {loading ? 'sim' : 'não'}, Error: {error || 'nenhum'}</p>
          <p><strong>Dados sendo usados:</strong> {pipelines.length > 0 && pipelines[0].id.includes('pipeline-') ? 'MOCK' : 'REAIS'}</p>
          {user?.role === 'member' && (
            <p><strong>Busca realizada por:</strong> Email ({user.email}) e ID ({user.id})</p>
          )}
        </div>
      </div>
    );
  };

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
          <PipelineFilters
            pipelines={getFilteredPipelines}
            selectedPipeline={selectedPipeline}
            onPipelineChange={handlePipelineChange}
            onSearchChange={handleSearchChange}
            onStatusFilter={handleStatusFilter}
            onDateFilter={() => {}} // TODO: Implementar filtro por data
            onAssigneeFilter={() => {}} // Usar onVendorFilter em vez disso
            onSortChange={() => {}} // TODO: Implementar ordenação
            availableVendors={availableVendors}
            selectedVendorFilter={selectedVendorFilter}
            searchFilter={searchFilter}
            statusFilter={statusFilter}
            showOnlyMyPipelines={showOnlyMyPipelines}
            onToggleMyPipelines={user?.role === 'admin' ? handleToggleMyPipelines : undefined}
            onClearFilters={handleClearFilters}
            onVendorFilter={handleVendorFilter}
            userRole={user?.role}
            userId={user?.id}
          />

          {selectedPipeline && getAllStages.length > 0 ? (
            <PipelineKanbanBoard
              stages={getAllStages}
              leads={filteredLeads} // Usar leads filtrados
              customFields={selectedPipeline?.pipeline_custom_fields || []}
              activeLead={activeLead}
              onAddLead={handleAddLead}
              onUpdateLead={handleUpdateLead}
              onEditLead={handleEditLead}
              stageMetrics={metrics.stageMetrics}
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