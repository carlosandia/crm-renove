
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { Pipeline, Lead, PipelineStage, CustomField } from '../types/Pipeline';

export const usePipelineData = () => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);

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

  const handleCreateLead = async (stageId: string, formData: Record<string, any>) => {
    if (!selectedPipeline) return;

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      pipeline_id: selectedPipeline.id,
      stage_id: stageId || 'stage-1',
      custom_data: formData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active'
    };
    
    setLeads(prev => [newLead, ...prev]);
  };

  const updateLeadStage = (leadId: string, newStageId: string) => {
    setLeads(prev => prev.map(l => 
      l.id === leadId 
        ? { ...l, stage_id: newStageId, updated_at: new Date().toISOString() }
        : l
    ));
  };

  return {
    pipelines,
    selectedPipeline,
    setSelectedPipeline,
    loading,
    leads,
    handleCreateLead,
    updateLeadStage
  };
};
