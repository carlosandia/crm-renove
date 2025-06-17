import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Plus, TrendingUp, DollarSign, CheckCircle, Users, Search, Filter, Settings } from 'lucide-react';
import KanbanColumn from './Pipeline/KanbanColumn';
import LeadCard from './Pipeline/LeadCard';
import LeadModal from './Pipeline/LeadModal';
import './PipelineViewModule.css';

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
      
      const mockPipeline: Pipeline = {
        id: 'mock-pipeline-1',
        name: 'Pipeline de Vendas',
        description: 'Pipeline principal de vendas',
        tenant_id: user?.tenant_id || 'mock',
        created_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pipeline_stages: [
          {
            id: 'stage-1',
            name: 'Novos Leads',
            order_index: 1,
            temperature_score: 25,
            max_days_allowed: 3,
            color: '#3B82F6'
          },
          {
            id: 'stage-2',
            name: 'Qualificados',
            order_index: 2,
            temperature_score: 50,
            max_days_allowed: 7,
            color: '#10B981'
          },
          {
            id: 'stage-3',
            name: 'Propostas',
            order_index: 3,
            temperature_score: 75,
            max_days_allowed: 10,
            color: '#F59E0B'
          },
          {
            id: 'stage-4',
            name: 'Negociação',
            order_index: 4,
            temperature_score: 90,
            max_days_allowed: 15,
            color: '#EF4444'
          },
          {
            id: 'stage-5',
            name: 'Ganhos',
            order_index: 5,
            temperature_score: 100,
            max_days_allowed: 0,
            color: '#8B5CF6'
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
            placeholder: 'Digite o nome completo'
          },
          {
            id: 'field-2',
            field_name: 'email_cliente',
            field_label: 'Email',
            field_type: 'email',
            is_required: true,
            field_order: 2,
            placeholder: 'email@exemplo.com'
          },
          {
            id: 'field-3',
            field_name: 'telefone_cliente',
            field_label: 'Telefone',
            field_type: 'phone',
            is_required: false,
            field_order: 3,
            placeholder: '(11) 99999-9999'
          },
          {
            id: 'field-4',
            field_name: 'valor_proposta',
            field_label: 'Valor',
            field_type: 'number',
            is_required: false,
            field_order: 4,
            placeholder: '0.00'
          }
        ]
      };
      
      setPipelines([mockPipeline]);
      setSelectedPipeline(mockPipeline);
      
      // Criar um lead de exemplo
      const exampleLead: Lead = {
        id: 'lead-example-1',
        pipeline_id: mockPipeline.id,
        stage_id: 'stage-1',
        custom_data: {
          nome_cliente: 'Carlos Mendes',
          email_cliente: 'carlos@exemplo.com',
          telefone_cliente: '(11) 99999-9999',
          valor_proposta: '6200'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      };
      
      setLeads([exampleLead]);
    } catch (error) {
      logger.error('❌ Erro ao carregar pipelines:', error);
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async (pipelineId: string) => {
    // Mock implementation for demonstration
  };

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

    setLeads(prev => prev.map(l => 
      l.id === leadId 
        ? { ...l, stage_id: newStageId, updated_at: new Date().toISOString() }
        : l
    ));

    logger.info('✅ Lead movido com sucesso');
  };

  const handleAddLead = (stageId?: string) => {
    setSelectedStageId(stageId || 'stage-1');
    setLeadFormData({});
    setShowAddLeadModal(true);
  };

  const handleCreateLead = async () => {
    if (!selectedPipeline) return;

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      pipeline_id: selectedPipeline.id,
      stage_id: selectedStageId || 'stage-1',
      custom_data: leadFormData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active'
    };
    
    setLeads(prev => [newLead, ...prev]);
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

  const getLeadsByStage = (stageId: string) => {
    return leads.filter(lead => lead.stage_id === stageId);
  };

  const getAllStages = (): PipelineStage[] => {
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

  // ============================================
  // VERIFICAÇÕES DE ACESSO
  // ============================================

  if (!user || user.role !== 'member') {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h3>
          <p className="text-gray-600">Apenas vendedores podem acessar esta seção.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando suas pipelines...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="pipeline-view-container">
      {/* Header Interno da Pipeline */}
      <div className="pipeline-internal-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-gray-900">Pipeline de Vendas</h1>
            
            {/* Métricas inline */}
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">Total de Leads:</span>
                <span className="font-semibold text-gray-900">{totalLeads}</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">Receita Total:</span>
                <span className="font-semibold text-gray-900">R$ {totalRevenue.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-purple-500" />
                <span className="text-gray-600">Fechados:</span>
                <span className="font-semibold text-gray-900">R$ 0</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Controles do lado direito */}
            <select 
              value={selectedPipeline?.id || ''} 
              onChange={(e) => {
                const pipeline = pipelines.find(p => p.id === e.target.value);
                setSelectedPipeline(pipeline || null);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pipelines.map(pipeline => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => handleAddLead()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Oportunidade</span>
            </button>
          </div>
        </div>

        {/* Barra de busca e filtros */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar leads por nome, email, telefone..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span>Filtro Personalizado</span>
            </button>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Ativos (Novo → Negociação)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="pipeline-kanban-container">
        <DndContext
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="kanban-board-full">
            {getAllStages().map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={getLeadsByStage(stage.id)}
                customFields={selectedPipeline?.pipeline_custom_fields || []}
                onAddLead={handleAddLead}
              />
            ))}
          </div>
          
          <DragOverlay>
            {activeLead ? (
              <LeadCard 
                lead={activeLead} 
                customFields={selectedPipeline?.pipeline_custom_fields || []}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

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
