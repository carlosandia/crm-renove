
import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import KanbanColumn from './Pipeline/KanbanColumn';
import LeadCard from './Pipeline/LeadCard';
import LeadModal from './Pipeline/LeadModal';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
}

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  temperature_score: number;
  max_days_allowed: number;
  color: string;
  is_system_stage?: boolean;
}

interface Lead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  custom_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  status?: 'active' | 'won' | 'lost';
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  pipeline_stages?: PipelineStage[];
  pipeline_custom_fields?: CustomField[];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PipelineViewModule: React.FC = () => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [leadFormData, setLeadFormData] = useState<Record<string, any>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  // ============================================
  // EFEITOS E CARREGAMENTO DE DADOS
  // ============================================

  useEffect(() => {
    if (user && user.role === 'member') {
      loadMemberPipelines();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPipeline) {
      loadLeads(selectedPipeline.id);
    }
  }, [selectedPipeline]);

  const loadMemberPipelines = async () => {
    try {
      logger.info('🔍 Carregando pipelines do membro:', user?.id);
      
      // Buscar pipelines onde o usuário é membro
      const { data: pipelineMembers, error: membersError } = await supabase
        .from('pipeline_members')
        .select('pipeline_id')
        .eq('member_id', user?.id);

      if (membersError) {
        throw membersError;
      }

      if (!pipelineMembers || pipelineMembers.length === 0) {
        logger.info('📋 Nenhuma pipeline atribuída ao membro');
        // Usar dados mock para demonstração
        const mockPipeline: Pipeline = {
          id: 'mock-pipeline-1',
          name: 'Pipeline de Vendas Demo',
          description: 'Pipeline de demonstração com campos customizados',
          tenant_id: user?.tenant_id || 'mock',
          created_by: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          pipeline_stages: [
            {
              id: 'stage-1',
              name: 'Qualificação',
              order_index: 1,
              temperature_score: 30,
              max_days_allowed: 5,
              color: '#F59E0B'
            },
            {
              id: 'stage-2',
              name: 'Proposta',
              order_index: 2,
              temperature_score: 60,
              max_days_allowed: 10,
              color: '#8B5CF6'
            },
            {
              id: 'stage-3',
              name: 'Negociação',
              order_index: 3,
              temperature_score: 80,
              max_days_allowed: 7,
              color: '#F97316'
            }
          ],
          pipeline_custom_fields: [
            {
              id: 'field-1',
              field_name: 'nome_cliente',
              field_label: 'Nome do Cliente',
              field_type: 'text',
              is_required: true,
              field_order: 1,
              placeholder: 'Digite o nome completo do cliente'
            },
            {
              id: 'field-2',
              field_name: 'email_cliente',
              field_label: 'Email do Cliente',
              field_type: 'email',
              is_required: true,
              field_order: 2,
              placeholder: 'cliente@exemplo.com'
            },
            {
              id: 'field-3',
              field_name: 'telefone_cliente',
              field_label: 'Telefone do Cliente',
              field_type: 'phone',
              is_required: false,
              field_order: 3,
              placeholder: '(11) 99999-9999'
            },
            {
              id: 'field-4',
              field_name: 'valor_proposta',
              field_label: 'Valor da Proposta',
              field_type: 'number',
              is_required: false,
              field_order: 4,
              placeholder: '0.00'
            },
            {
              id: 'field-5',
              field_name: 'observacoes',
              field_label: 'Observações',
              field_type: 'textarea',
              is_required: false,
              field_order: 5,
              placeholder: 'Observações sobre o lead...'
            }
          ]
        };
        
        setPipelines([mockPipeline]);
        setSelectedPipeline(mockPipeline);
        setLoading(false);
        return;
      }

      const pipelineIds = pipelineMembers.map(pm => pm.pipeline_id);

      // Buscar dados das pipelines
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .in('id', pipelineIds)
        .eq('tenant_id', user?.tenant_id);

      if (pipelinesError) {
        throw pipelinesError;
      }

      // Para cada pipeline, buscar etapas e campos customizados
      const enrichedPipelines = await Promise.all(
        (pipelinesData || []).map(async (pipeline) => {
          // Buscar etapas
          const { data: stages } = await supabase
            .from('pipeline_stages')
            .select('*')
            .eq('pipeline_id', pipeline.id)
            .order('order_index', { ascending: true });

          // Buscar campos customizados
          const { data: customFields } = await supabase
            .from('pipeline_custom_fields')
            .select('*')
            .eq('pipeline_id', pipeline.id)
            .order('field_order', { ascending: true });

          return {
            ...pipeline,
            pipeline_stages: stages || [],
            pipeline_custom_fields: customFields || []
          };
        })
      );

      logger.info('📊 Pipelines carregadas:', enrichedPipelines.length);
      
      // Se não houver pipelines, usar dados mock para demonstração
      if (enrichedPipelines.length === 0) {
        logger.info('📋 Usando dados mock para demonstração');
        const mockPipeline: Pipeline = {
          id: 'mock-pipeline-1',
          name: 'Pipeline de Vendas Demo',
          description: 'Pipeline de demonstração com campos customizados',
          tenant_id: user?.tenant_id || 'mock',
          created_by: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          pipeline_stages: [
            {
              id: 'stage-1',
              name: 'Qualificação',
              order_index: 1,
              temperature_score: 30,
              max_days_allowed: 5,
              color: '#F59E0B'
            },
            {
              id: 'stage-2',
              name: 'Proposta',
              order_index: 2,
              temperature_score: 60,
              max_days_allowed: 10,
              color: '#8B5CF6'
            },
            {
              id: 'stage-3',
              name: 'Negociação',
              order_index: 3,
              temperature_score: 80,
              max_days_allowed: 7,
              color: '#F97316'
            }
          ],
          pipeline_custom_fields: [
            {
              id: 'field-1',
              field_name: 'nome_cliente',
              field_label: 'Nome do Cliente',
              field_type: 'text',
              is_required: true,
              field_order: 1,
              placeholder: 'Digite o nome completo do cliente'
            },
            {
              id: 'field-2',
              field_name: 'email_cliente',
              field_label: 'Email do Cliente',
              field_type: 'email',
              is_required: true,
              field_order: 2,
              placeholder: 'cliente@exemplo.com'
            },
            {
              id: 'field-3',
              field_name: 'telefone_cliente',
              field_label: 'Telefone do Cliente',
              field_type: 'phone',
              is_required: false,
              field_order: 3,
              placeholder: '(11) 99999-9999'
            },
            {
              id: 'field-4',
              field_name: 'valor_proposta',
              field_label: 'Valor da Proposta',
              field_type: 'number',
              is_required: false,
              field_order: 4,
              placeholder: '0.00'
            },
            {
              id: 'field-5',
              field_name: 'observacoes',
              field_label: 'Observações',
              field_type: 'textarea',
              is_required: false,
              field_order: 5,
              placeholder: 'Observações sobre o lead...'
            }
          ]
        };
        
        setPipelines([mockPipeline]);
        setSelectedPipeline(mockPipeline);
        logger.info('✅ Pipeline mock selecionada:', mockPipeline.name);
      } else {
        setPipelines(enrichedPipelines);
        
        // Selecionar primeira pipeline automaticamente
        if (enrichedPipelines.length > 0) {
          setSelectedPipeline(enrichedPipelines[0]);
          logger.info('✅ Pipeline selecionada:', enrichedPipelines[0].name);
        }
      }
    } catch (error) {
      logger.error('❌ Erro ao carregar pipelines:', error);
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async (pipelineId: string) => {
    try {
      logger.info('📋 Carregando leads da pipeline:', pipelineId);
      
      // Buscar leads reais do Supabase
      const { data: leadsData, error } = await supabase
        .from('pipeline_leads')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      logger.info('✅ Leads carregados:', leadsData?.length || 0);
      
      // Mapear os dados para a interface Lead
      const mappedLeads: Lead[] = (leadsData || []).map(lead => ({
        id: lead.id,
        pipeline_id: lead.pipeline_id,
        stage_id: lead.stage_id,
        custom_data: lead.lead_data || {},
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        status: 'active'
      }));
      
      setLeads(mappedLeads);
    } catch (error) {
      logger.error('❌ Erro ao carregar leads:', error);
      setLeads([]);
    }
  };

  // ============================================
  // DRAG AND DROP HANDLERS
  // ============================================

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = leads.find(l => l.id === active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStageId = over.id as string;
    
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage_id === newStageId) return;

    try {
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('pipeline_leads')
        .update({ 
          stage_id: newStageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      // Atualizar estado local
      setLeads(prev => prev.map(l => 
        l.id === leadId 
          ? { ...l, stage_id: newStageId, updated_at: new Date().toISOString() }
          : l
      ));

      logger.info('✅ Lead movido com sucesso');
    } catch (error) {
      logger.error('❌ Erro ao mover lead:', error);
      alert('Erro ao mover lead. Tente novamente.');
    }
  };

  // ============================================
  // OUTRAS FUNÇÕES
  // ============================================

  const handleAddLead = (stageId: string) => {
    setSelectedStageId(stageId);
    setLeadFormData({});
    setShowAddLeadModal(true);
  };

  const handleCreateLead = async () => {
    try {
      if (!selectedPipeline || !selectedStageId) {
        alert('❌ Erro: Pipeline ou etapa não selecionada');
        return;
      }

      // Validar campos obrigatórios
      const requiredFields = (selectedPipeline.pipeline_custom_fields || [])
        .filter(field => field.is_required);
      
      const missingFields = requiredFields.filter(field => 
        !leadFormData[field.field_name] || 
        leadFormData[field.field_name].toString().trim() === ''
      );

      if (missingFields.length > 0) {
        const missingFieldNames = missingFields.map(f => f.field_label).join(', ');
        alert(`❌ Por favor, preencha os campos obrigatórios: ${missingFieldNames}`);
        return;
      }

      // Validar formato de email se houver campo de email
      const emailFields = (selectedPipeline.pipeline_custom_fields || [])
        .filter(field => field.field_type === 'email');
      
      for (const emailField of emailFields) {
        const emailValue = leadFormData[emailField.field_name];
        if (emailValue && emailValue.trim() !== '') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailValue)) {
            alert(`❌ O campo ${emailField.field_label} deve conter um email válido`);
            return;
          }
        }
      }

      logger.info('📝 Criando novo lead...');

      // Criar lead no Supabase - SEMPRE na etapa "Novo Lead"
      const { data: newLead, error } = await supabase
        .from('pipeline_leads')
        .insert([{
          pipeline_id: selectedPipeline.id,
          stage_id: 'system-new-lead', // Sempre criar na etapa "Novo Lead"
          lead_data: leadFormData, // Usar lead_data ao invés de custom_data
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info('✅ Lead criado com sucesso:', newLead.id);
      
      // Mapear o novo lead para a interface
      const mappedNewLead: Lead = {
        id: newLead.id,
        pipeline_id: newLead.pipeline_id,
        stage_id: newLead.stage_id,
        custom_data: newLead.lead_data || {},
        created_at: newLead.created_at,
        updated_at: newLead.updated_at,
        status: 'active'
      };
      
      // Atualizar lista de leads
      setLeads(prev => [mappedNewLead, ...prev]);
      
      // Limpar formulário e fechar modal
      setLeadFormData({});
      setShowAddLeadModal(false);
      setSelectedStageId('');
      
      alert('✅ Lead criado com sucesso!');
    } catch (error) {
      logger.error('❌ Erro ao criar lead:', error);
      alert('❌ Erro ao criar lead. Tente novamente.');
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setLeadFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const getLeadsByStage = (stageId: string) => {
    if (stageId === 'system-new-lead') {
      return leads.filter(lead => lead.stage_id === 'system-new-lead');
    } else if (stageId === 'system-won') {
      return leads.filter(lead => 
        lead.stage_id === 'system-won' ||
        lead.custom_data?._system_status === 'won' || 
        lead.custom_data?._system_stage === 'system-won'
      );
    } else if (stageId === 'system-lost') {
      return leads.filter(lead => 
        lead.stage_id === 'system-lost' ||
        lead.custom_data?._system_status === 'lost' || 
        lead.custom_data?._system_stage === 'system-lost'
      );
    } else {
      return leads.filter(lead => 
        lead.stage_id === stageId && 
        !lead.custom_data?._system_status && 
        !lead.stage_id.startsWith('system-')
      );
    }
  };

  const getSystemStages = (): PipelineStage[] => {
    return [
      {
        id: 'system-new-lead',
        name: 'Novo Lead',
        order_index: -1,
        temperature_score: 10,
        max_days_allowed: 7,
        color: '#3B82F6',
        is_system_stage: true
      },
      {
        id: 'system-won',
        name: 'Ganho',
        order_index: 9999,
        temperature_score: 100,
        max_days_allowed: 0,
        color: '#10B981',
        is_system_stage: true
      },
      {
        id: 'system-lost',
        name: 'Perdido',
        order_index: 10000,
        temperature_score: 0,
        max_days_allowed: 0,
        color: '#EF4444',
        is_system_stage: true
      }
    ];
  };

  const getAllStages = (): PipelineStage[] => {
    const systemStages = getSystemStages();
    const regularStages = (selectedPipeline?.pipeline_stages || [])
      .sort((a, b) => a.order_index - b.order_index);
    
    const newLeadStage = systemStages.find(s => s.id === 'system-new-lead')!;
    const wonStage = systemStages.find(s => s.id === 'system-won')!;
    const lostStage = systemStages.find(s => s.id === 'system-lost')!;
    
    return [newLeadStage, ...regularStages, wonStage, lostStage];
  };

  // ============================================
  // VERIFICAÇÕES DE ACESSO
  // ============================================

  if (!user || user.role !== 'member') {
    return (
      <div className="modern-card p-8 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h3>
        <p className="text-gray-600">Apenas vendedores podem acessar esta seção.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="modern-card p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando suas pipelines...</p>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="modern-card p-8 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma Pipeline Atribuída</h3>
        <p className="text-gray-600 mb-4">Você ainda não foi atribuído a nenhuma pipeline de vendas.</p>
        <p className="text-gray-500">Entre em contato com seu administrador para ser adicionado a uma pipeline.</p>
      </div>
    );
  }

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="modern-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center space-x-2">
              <span>🎯</span>
              <span>Minhas Pipelines</span>
            </h1>
            <p className="text-gray-600 mt-1">Gerencie seus leads através do kanban</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">Pipeline Ativa:</label>
            <select 
              value={selectedPipeline?.id || ''} 
              onChange={(e) => {
                const pipeline = pipelines.find(p => p.id === e.target.value);
                setSelectedPipeline(pipeline || null);
              }}
              className="modern-select min-w-[200px]"
            >
              {pipelines.map(pipeline => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedPipeline && (
        <>
          {/* Pipeline Info */}
          <div className="modern-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{selectedPipeline.name}</h2>
            <p className="text-gray-600">{selectedPipeline.description || 'Sem descrição'}</p>
          </div>

          {/* Kanban Board */}
          <div className="modern-card p-6">
            <DndContext
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-6 overflow-x-auto pb-4 modern-scrollbar">
                {getAllStages().map((stage) => (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    leads={getLeadsByStage(stage.id)}
                    customFields={selectedPipeline.pipeline_custom_fields || []}
                    onAddLead={handleAddLead}
                  />
                ))}
              </div>
              
              <DragOverlay>
                {activeLead ? (
                  <LeadCard 
                    lead={activeLead} 
                    customFields={selectedPipeline.pipeline_custom_fields || []}
                    isDragging
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          {(selectedPipeline.pipeline_stages || []).length === 0 && (
            <div className="modern-card p-8 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Pipeline sem etapas</h3>
              <p className="text-gray-600">Esta pipeline ainda não possui etapas configuradas.</p>
              <p className="text-gray-500">Entre em contato com seu administrador para configurar as etapas.</p>
            </div>
          )}
        </>
      )}

      {/* Modal de Adicionar Lead */}
      {showAddLeadModal && selectedPipeline && (
        <LeadModal
          isOpen={showAddLeadModal}
          onClose={() => setShowAddLeadModal(false)}
          pipeline={selectedPipeline}
          formData={leadFormData}
          onFieldChange={handleFieldChange}
          onSubmit={handleCreateLead}
        />
      )}
    </div>
  );
};

export default PipelineViewModule;
