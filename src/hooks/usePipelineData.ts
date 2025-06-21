import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { Pipeline, Lead, PipelineStage, CustomField } from '../types/Pipeline';
import { supabase } from '../lib/supabase';
import { debugPipelineData } from '../utils/debugPipeline';
import { CRMSyncService, LeadData, OpportunityData } from '../services/crmSyncService';
import { registerStageMove, registerLeadCreation } from '../utils/historyUtils';

// Mock data with proper pipeline structure
const mockPipelines = [
  {
    id: 'pipeline-1',
    name: 'Pipeline de Demonstração',
    description: 'Pipeline de exemplo para demonstração do sistema',
    tenant_id: 'tenant-1',
    created_by: 'carlos@carlos.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
    members: [
      {
        id: 'member-1',
        pipeline_id: 'pipeline-1',
        user_id: 'carlos@carlos.com',
        assigned_at: '2024-01-01T00:00:00Z',
        users: {
          id: 'carlos@carlos.com',
          first_name: 'Carlos',
          last_name: 'Silva',
          email: 'carlos@carlos.com'
        }
      }
    ],
    pipeline_stages: [
      {
        id: 'pipeline-1-novo-lead',
        name: 'Novo Lead',
        order_index: 0,
        color: '#3B82F6',
        temperature_score: 0,
        max_days_allowed: 30,
        is_system_stage: true
      },
      {
        id: 'pipeline-1-contato-inicial',
        name: 'Contato Inicial',
        order_index: 1,
        color: '#F59E0B',
        temperature_score: 25,
        max_days_allowed: 15,
        is_system_stage: false
      },
      {
        id: 'pipeline-1-proposta',
        name: 'Proposta Enviada',
        order_index: 2,
        color: '#8B5CF6',
        temperature_score: 75,
        max_days_allowed: 10,
        is_system_stage: false
      },
      {
        id: 'pipeline-1-ganho',
        name: 'Ganho',
        order_index: 3,
        color: '#10B981',
        temperature_score: 100,
        max_days_allowed: 0,
        is_system_stage: true
      },
      {
        id: 'pipeline-1-perdido',
        name: 'Perdido',
        order_index: 4,
        color: '#EF4444',
        temperature_score: 0,
        max_days_allowed: 0,
        is_system_stage: true
      }
    ],
    pipeline_custom_fields: [
      {
        id: 'field-1',
        field_name: 'nome',
        field_label: 'Nome',
        field_type: 'text' as const,
        is_required: true,
        field_order: 0,
        show_in_card: true
      },
      {
        id: 'field-2',
        field_name: 'email',
        field_label: 'Email',
        field_type: 'email' as const,
        is_required: true,
        field_order: 1,
        show_in_card: false
      },
      {
        id: 'field-3',
        field_name: 'telefone',
        field_label: 'Telefone',
        field_type: 'phone' as const,
        is_required: true,
        field_order: 2,
        show_in_card: false
      },
      {
        id: 'field-4',
        field_name: 'valor',
        field_label: 'Valor',
        field_type: 'number' as const,
        is_required: true,
        field_order: 3,
        show_in_card: true
      },
      {
        id: 'field-5',
        field_name: 'empresa',
        field_label: 'Empresa',
        field_type: 'text' as const,
        is_required: false,
        field_order: 4,
        show_in_card: true
      }
    ]
  },
  {
    id: 'pipeline-2',
    name: 'Marketing Agressivo 2',
    description: 'Pipeline para campanhas de marketing agressivo',
    tenant_id: 'tenant-1',
    created_by: 'felipe@felipe.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
    members: [
      {
        id: 'member-2',
        pipeline_id: 'pipeline-2',
        user_id: 'felipe@felipe.com',
        assigned_at: '2024-01-01T00:00:00Z',
        users: {
          id: 'felipe@felipe.com',
          first_name: 'Felipe',
          last_name: 'Santos',
          email: 'felipe@felipe.com'
        }
      }
    ],
    pipeline_stages: [
      {
        id: 'pipeline-2-novo-lead',
        name: 'Novo Lead',
        order_index: 0,
        color: '#3B82F6',
        temperature_score: 0,
        max_days_allowed: 30,
        is_system_stage: true
      },
      {
        id: 'pipeline-2-qualificacao',
        name: 'Qualificação',
        order_index: 1,
        color: '#F59E0B',
        temperature_score: 25,
        max_days_allowed: 20,
        is_system_stage: false
      },
      {
        id: 'pipeline-2-apresentacao',
        name: 'Apresentação',
        order_index: 2,
        color: '#8B5CF6',
        temperature_score: 50,
        max_days_allowed: 15,
        is_system_stage: false
      },
      {
        id: 'pipeline-2-negociacao',
        name: 'Negociação',
        order_index: 3,
        color: '#06B6D4',
        temperature_score: 75,
        max_days_allowed: 10,
        is_system_stage: false
      },
      {
        id: 'pipeline-2-ganho',
        name: 'Ganho',
        order_index: 4,
        color: '#10B981',
        temperature_score: 100,
        max_days_allowed: 0,
        is_system_stage: true
      },
      {
        id: 'pipeline-2-perdido',
        name: 'Perdido',
        order_index: 5,
        color: '#EF4444',
        temperature_score: 0,
        max_days_allowed: 0,
        is_system_stage: true
      }
    ],
    pipeline_custom_fields: [
      {
        id: 'field-6',
        field_name: 'nome',
        field_label: 'Nome',
        field_type: 'text' as const,
        is_required: true,
        field_order: 0,
        show_in_card: true
      },
      {
        id: 'field-7',
        field_name: 'email',
        field_label: 'Email',
        field_type: 'email' as const,
        is_required: true,
        field_order: 1,
        show_in_card: false
      },
      {
        id: 'field-8',
        field_name: 'telefone',
        field_label: 'Telefone',
        field_type: 'phone' as const,
        is_required: false,
        field_order: 2,
        show_in_card: false
      },
      {
        id: 'field-9',
        field_name: 'valor',
        field_label: 'Valor',
        field_type: 'number' as const,
        is_required: true,
        field_order: 3,
        show_in_card: true
      }
    ]
  },
  {
    id: 'pipeline-3',
    name: 'Teste Debug',
    description: 'Pipeline para testes de debug',
    tenant_id: 'tenant-1',
    created_by: 'carlos@carlos.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
    members: [],
    pipeline_stages: [
      {
        id: 'pipeline-3-novo-lead',
        name: 'Novo Lead',
        order_index: 0,
        color: '#3B82F6',
        temperature_score: 0,
        max_days_allowed: 30,
        is_system_stage: true
      },
      {
        id: 'pipeline-3-ganho',
        name: 'Ganho',
        order_index: 1,
        color: '#10B981',
        temperature_score: 100,
        max_days_allowed: 0,
        is_system_stage: true
      }
    ],
    pipeline_custom_fields: [
      {
        id: 'field-10',
        field_name: 'nome',
        field_label: 'Nome',
        field_type: 'text' as const,
        is_required: true,
        field_order: 0,
        show_in_card: true
      }
    ]
  }
];

// Mock leads para demonstração
const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    pipeline_id: 'pipeline-1',
    stage_id: 'pipeline-1-novo-lead',
    custom_data: {
      nome: 'João Silva',
      email: 'joao@exemplo.com',
      telefone: '(11) 99999-9999',
      valor: 5000,
      empresa: 'Empresa ABC'
    },
    status: 'active' as const,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    moved_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'lead-2',
    pipeline_id: 'pipeline-1',
    stage_id: 'pipeline-1-contato-inicial',
    custom_data: {
      nome: 'Maria Santos',
      email: 'maria@exemplo.com',
      telefone: '(11) 88888-8888',
      valor: 8000,
      empresa: 'Empresa XYZ'
    },
    status: 'active' as const,
    created_at: '2024-01-14T14:30:00Z',
    updated_at: '2024-01-16T09:15:00Z',
    moved_at: '2024-01-16T09:15:00Z'
  },
  {
    id: 'lead-3',
    pipeline_id: 'pipeline-2',
    stage_id: 'pipeline-2-novo-lead',
    custom_data: {
      nome: 'Carlos Oliveira',
      email: 'carlos@exemplo.com',
      telefone: '(11) 77777-7777',
      valor: 12000
    },
    status: 'active' as const,
    created_at: '2024-01-13T16:45:00Z',
    updated_at: '2024-01-13T16:45:00Z',
    moved_at: '2024-01-13T16:45:00Z'
  }
];

// Interface do retorno do hook
interface UsePipelineDataReturn {
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  leads: Lead[];
  loading: boolean;
  error: string | null;
  setSelectedPipeline: (pipeline: Pipeline | null) => void;
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  handleCreateLead: (stageId: string, leadData: any) => Promise<Lead | null>;
  updateLeadStage: (leadId: string, stageId: string) => Promise<void>;
  updateLeadData: (leadId: string, data: any) => Promise<void>;
  refreshPipelines: () => Promise<void>;
  refreshLeads: () => Promise<void>;
  // Novos recursos para admin/member
  getUserPipelines: () => Pipeline[];
  getAdminCreatedPipelines: () => Pipeline[];
  getMemberLinkedPipelines: () => Pipeline[];
  linkMemberToPipeline: (memberId: string, pipelineId: string) => Promise<boolean>;
  unlinkMemberFromPipeline: (memberId: string, pipelineId: string) => Promise<boolean>;
  getPipelineMembers: (pipelineId: string) => Promise<any[]>;
}

// Cache simples para performance
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const getFromCache = <T>(key: string): T | null => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = <T>(key: string, data: T, ttl: number = 300000) => { // 5 minutos default
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
};

export const usePipelineData = (): UsePipelineDataReturn => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache keys
  const pipelinesCacheKey = `pipelines_${user?.tenant_id || 'default'}_${user?.role || 'default'}_${user?.id || 'default'}`;
  const leadsCacheKey = (pipelineId: string) => `leads_${pipelineId}`;

  // Estado para controlar drag em progresso
  const [isDragInProgress, setIsDragInProgress] = useState(false);

  // Função helper para garantir que o lead seja criado na primeira etapa
  const ensureLeadInFirstStage = useCallback((lead: Lead, pipeline: Pipeline): Lead => {
    const firstStage = pipeline.pipeline_stages?.[0];
    if (!firstStage) {
      console.warn('⚠️ Pipeline sem primeira etapa definida');
      return lead;
    }

    if (lead.stage_id !== firstStage.id) {
      console.log('🔧 Corrigindo stage_id para primeira etapa:', {
        leadId: lead.id,
        stageOriginal: lead.stage_id,
        primeiraEtapa: firstStage.id,
        primeiraEtapaNome: firstStage.name
      });
      
      return {
        ...lead,
        stage_id: firstStage.id
      };
    }

    console.log('✅ Lead já está na primeira etapa:', {
      leadId: lead.id,
      stageId: lead.stage_id,
      stageName: firstStage.name
    });

    return lead;
  }, []);

  // Função helper para usar dados mock baseado no role
  const getMockPipelinesForUser = useCallback((): Pipeline[] => {
    if (!user) return mockPipelines;

    console.log('🔍 Buscando pipelines mock para usuário:', user.email, 'role:', user.role);

    if (user.role === 'admin') {
      // Admin vê apenas pipelines criadas por ele
      const userPipelines = mockPipelines.filter(p => p.created_by === user.email);
      console.log('📊 Admin pipelines encontradas:', userPipelines.length);
      return userPipelines;
    } else if (user.role === 'member') {
      // Member vê pipelines onde está vinculado
      const memberPipelines = mockPipelines.filter(p => 
        p.members && p.members.some(m => m.user_id === user.email)
      );
      console.log('👤 Member pipelines encontradas:', memberPipelines.length);
      return memberPipelines;
    } else {
      // Super admin vê todas
      console.log('🔐 Super admin - todas as pipelines:', mockPipelines.length);
      return mockPipelines;
    }
  }, [user]);

  // Função para buscar pipelines (com fallback para mock)
  const fetchPipelines = useCallback(async () => {
    if (!user) {
      console.log('❌ Usuário não encontrado, usando dados mock básicos');
      setPipelines(mockPipelines);
      if (mockPipelines.length > 0) {
        setSelectedPipeline(mockPipelines[0]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log('🔄 Iniciando busca de pipelines para:', user.email, 'role:', user.role);

    try {
      // Verificar cache primeiro
      const cachedPipelines = getFromCache<Pipeline[]>(pipelinesCacheKey);
      if (cachedPipelines && cachedPipelines.length > 0) {
        console.log('💾 Pipelines carregadas do cache:', cachedPipelines.length);
        setPipelines(cachedPipelines);
        if (!selectedPipeline && cachedPipelines.length > 0) {
          setSelectedPipeline(cachedPipelines[0]);
        }
        setLoading(false);
        return;
      }

      let pipelinesData: Pipeline[] = [];
      let supabaseSuccess = false;

      // SEMPRE tentar buscar do Supabase primeiro, independente de ter tenant_id
      try {
        console.log('🗄️ Buscando dados reais do Supabase...');
        
        if (user.role === 'admin') {
          // Admin vê pipelines criadas por ele - CORRIGIDO: usar user.email
          console.log('📊 Admin buscando pipelines criadas por:', user.email);
          
          const { data, error: pipelineError } = await supabase
            .from('pipelines')
            .select(`
              *,
              pipeline_stages(*),
              pipeline_custom_fields(*),
              pipeline_members(
                id,
                member_id,
                assigned_at,
                users:member_id(id, first_name, last_name, email, is_active)
              )
            `)
            .eq('created_by', user.email)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          if (pipelineError) {
            console.warn('⚠️ Erro na busca de admin:', pipelineError);
            throw pipelineError;
          }
          
          pipelinesData = data || [];
          console.log('📊 Admin - pipelines encontradas:', pipelinesData.length);
          
          // NOVO: Log detalhado para debug
          if (pipelinesData.length > 0) {
            console.log('🎯 Pipelines REAIS encontradas para admin:');
            pipelinesData.forEach(pipeline => {
              console.log(`  ✅ ${pipeline.name} (ID: ${pipeline.id}, Criada por: ${pipeline.created_by})`);
            });
          } else {
            console.log('❌ Nenhuma pipeline encontrada para admin:', user.email);
            console.log('🔍 Verificando se existem pipelines no banco...');
            
            // Debug adicional: buscar todas as pipelines para ver se existem
            const { data: allPipelines } = await supabase
              .from('pipelines')
              .select('id, name, created_by')
              .eq('is_active', true);
            
            console.log('🗃️ Todas as pipelines no banco:', allPipelines);
          }

        } else if (user.role === 'member') {
          console.log('👤 BUSCA ULTRA SIMPLES para member:', user.email);
          
          // BUSCA DIRETA SEM JOINS COMPLEXOS
          const { data: links, error: linksError } = await supabase
            .from('pipeline_members')
            .select('pipeline_id')
            .eq('member_id', user.id);

          console.log('🔗 Links encontrados:', links);
          console.log('❌ Erro nos links:', linksError);

          if (linksError || !links || links.length === 0) {
            console.log('❌ Nenhum link encontrado');
            pipelinesData = [];
          } else {
            const pipelineIds = links.map(link => link.pipeline_id);
            console.log('📋 IDs das pipelines:', pipelineIds);

            // Buscar pipelines pelos IDs
            const { data: foundPipelines, error: pipelinesError } = await supabase
              .from('pipelines')
              .select('*')
              .in('id', pipelineIds);

            console.log('✅ Pipelines encontradas:', foundPipelines);
            console.log('❌ Erro nas pipelines:', pipelinesError);

            if (pipelinesError || !foundPipelines) {
              pipelinesData = [];
            } else {
              pipelinesData = foundPipelines;

              // Buscar stages e fields separadamente
              for (const pipeline of pipelinesData) {
                const { data: stages } = await supabase
                  .from('pipeline_stages')
                  .select('*')
                  .eq('pipeline_id', pipeline.id)
                  .order('order_index');

                const { data: fields } = await supabase
                  .from('pipeline_custom_fields')
                  .select('*')
                  .eq('pipeline_id', pipeline.id)
                  .order('field_order');

                pipeline.pipeline_stages = stages || [];
                pipeline.pipeline_custom_fields = fields || [];

                console.log(`🎯 Pipeline "${pipeline.name}": ${stages?.length || 0} stages, ${fields?.length || 0} fields`);
              }
            }
          }

        } else if (user.role === 'super_admin') {
          // Super admin vê todas as pipelines do tenant
          const { data, error: pipelineError } = await supabase
            .from('pipelines')
            .select(`
              *,
              pipeline_stages(*),
              pipeline_custom_fields(*),
              pipeline_members(
                id,
                member_id,
                assigned_at,
                users:member_id(id, first_name, last_name, email, is_active)
              )
            `)
            .eq('tenant_id', user.tenant_id || 'default')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          if (pipelineError) throw pipelineError;
          pipelinesData = data || [];
          console.log('🔐 Super admin - pipelines encontradas:', pipelinesData.length);
        }

        supabaseSuccess = true;
        console.log('✅ Dados reais carregados do Supabase:', pipelinesData.length, 'pipelines');

        // Log detalhado das pipelines encontradas
        pipelinesData.forEach(pipeline => {
          console.log(`🎯 Pipeline: ${pipeline.name}`, {
            id: pipeline.id,
            stages: pipeline.pipeline_stages?.length || 0,
            fields: pipeline.pipeline_custom_fields?.length || 0,
            created_by: pipeline.created_by
          });
        });

      } catch (supabaseError: any) {
        console.error('❌ Erro ao buscar do Supabase:', supabaseError);
        supabaseSuccess = false;
      }

      // Se conseguiu dados do Supabase, usar eles
      if (supabaseSuccess && pipelinesData.length > 0) {
        console.log('🎉 Usando dados REAIS do Supabase');
        
        // Processar dados das pipelines
        const processedPipelines = pipelinesData.map(pipeline => ({
          ...pipeline,
          pipeline_stages: (pipeline.pipeline_stages || [])
            .sort((a: any, b: any) => a.order_index - b.order_index),
          pipeline_custom_fields: (pipeline.pipeline_custom_fields || [])
            .sort((a: any, b: any) => a.field_order - b.field_order)
        }));

        console.log('🎯 Pipelines REAIS processadas:', processedPipelines.length);
        
        setPipelines(processedPipelines);
        setCache(pipelinesCacheKey, processedPipelines, 300000);

        // Selecionar primeira pipeline
        if (processedPipelines.length > 0 && !selectedPipeline) {
          console.log('🎪 Selecionando primeira pipeline REAL:', processedPipelines[0].name);
          setSelectedPipeline(processedPipelines[0]);
        }

      } else if (user.role === 'member') {
        // Se é member e não tem pipelines vinculadas, mostrar mensagem apropriada
        console.log('👤 Member sem pipelines vinculadas');
        setPipelines([]);
        setSelectedPipeline(null);
        
      } else {
        // Como último recurso, usar dados mock apenas para demonstração
        console.log('🎭 FALLBACK: Usando dados mock apenas para demonstração');
        const mockData = getMockPipelinesForUser();
        setPipelines(mockData);
        if (mockData.length > 0) {
          setSelectedPipeline(mockData[0]);
        }
      }

    } catch (err: any) {
      console.error('❌ Erro crítico ao buscar pipelines:', err);
      setError(err.message || 'Erro ao carregar pipelines');
      
      // Em caso de erro crítico, tentar fallback
      if (user.role !== 'member') {
        const mockData = getMockPipelinesForUser();
        console.log('🚨 Usando fallback de emergência:', mockData.length, 'pipelines');
        setPipelines(mockData);
        if (mockData.length > 0) {
          setSelectedPipeline(mockData[0]);
        }
      } else {
        setPipelines([]);
        setSelectedPipeline(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, pipelinesCacheKey, selectedPipeline, getMockPipelinesForUser]);

  // Função para normalizar dados do Supabase para o formato esperado pelo frontend
  const normalizeLeadData = useCallback((supabaseLeads: any[]): Lead[] => {
    return supabaseLeads.map(lead => ({
      id: lead.id,
      pipeline_id: lead.pipeline_id,
      stage_id: lead.stage_id,
      custom_data: lead.lead_data || lead.custom_data || {}, // Normalizar lead_data -> custom_data
      status: lead.status || 'active',
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      moved_at: lead.moved_at || lead.created_at,
      assigned_to: lead.assigned_to,
      created_by: lead.created_by,
      source: lead.source
    }));
  }, []);

  // Função para buscar leads de uma pipeline (com fallback para mock)
  const fetchLeads = useCallback(async (pipelineId: string) => {
    if (!pipelineId) return;

    console.log('🔍 Buscando leads para pipeline:', pipelineId, 'user role:', user?.role);

    try {
      const cacheKey = leadsCacheKey(pipelineId);
      const cachedLeads = getFromCache<Lead[]>(cacheKey);
      
      if (cachedLeads) {
        console.log('💾 Leads carregados do cache:', cachedLeads.length);
        setLeads(cachedLeads);
        return;
      }

      let leadsData: Lead[] = [];

      // Tentar buscar do Supabase com filtros por role
      try {
        console.log('🗄️ Buscando leads do Supabase (query simplificada)...');
        
        // QUERY SIMPLIFICADA SEM JOINS PROBLEMÁTICOS
        let query = supabase
          .from('pipeline_leads')
          .select('*')
          .eq('pipeline_id', pipelineId);

        // Aplicar filtros baseados no role
        if (user?.role === 'member') {
          // Member vê leads atribuídos a ele OU criados por ele (usando UUID)
          console.log('👤 Aplicando filtro de member - assigned_to:', user.id, 'created_by:', user.id);
          query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
        } else if (user?.role === 'admin') {
          // Admin vê todos os leads da pipeline (sem filtro adicional)
          console.log('📊 Admin vê todos os leads da pipeline');
        }
        // Super admin também vê todos os leads (sem filtro adicional)

        const { data, error: leadsError } = await query.order('created_at', { ascending: false });

        if (leadsError) throw leadsError;
        
        // Normalizar dados do Supabase para o formato esperado pelo frontend
        const normalizedLeads = (data || []).map((lead: any) => ({
          id: lead.id,
          pipeline_id: lead.pipeline_id,
          stage_id: lead.stage_id,
          custom_data: lead.lead_data || lead.custom_data || {}, // Converter lead_data -> custom_data
          status: lead.status || 'active',
          created_at: lead.created_at,
          updated_at: lead.updated_at,
          moved_at: lead.moved_at || lead.created_at,
          assigned_to: lead.assigned_to,
          created_by: lead.created_by,
          source: lead.source
        }));
        
        leadsData = normalizedLeads;
        console.log(`✅ Leads encontrados e normalizados: ${leadsData.length} (role: ${user?.role})`);
        
        // Log detalhado dos dados normalizados
        if (leadsData.length > 0) {
          console.log('🔍 Exemplo de lead normalizado:', {
            id: leadsData[0].id,
            custom_data: leadsData[0].custom_data,
            stage_id: leadsData[0].stage_id,
            assigned_to: leadsData[0].assigned_to,
            created_by: leadsData[0].created_by
          });
        }

        // Log detalhado para debug
        if (user?.role === 'member' && leadsData.length === 0) {
          console.log('🔍 Debug: Nenhum lead encontrado para member. Verificando se existem leads na pipeline...');
          
          const { data: allLeads } = await supabase
            .from('pipeline_leads')
            .select('id, assigned_to, created_by')
            .eq('pipeline_id', pipelineId);
          
          console.log('📋 Todos os leads da pipeline:', allLeads);
          console.log('🎯 Buscando por assigned_to =', user.id, 'ou created_by =', user.id);
          
          // Verificar se algum lead deveria ter sido encontrado
          const shouldBeVisible = allLeads?.filter(lead => 
            lead.assigned_to === user.id || lead.created_by === user.id
          );
          console.log('🔍 Leads que deveriam ser visíveis:', shouldBeVisible);
        }

      } catch (supabaseError: any) {
        console.warn('⚠️ Erro ao buscar leads do Supabase, usando mock:', supabaseError.message);
        
        // Fallback para dados mock com filtros aplicados
        const mockLeadsForPipeline = mockLeads.filter(lead => lead.pipeline_id === pipelineId);
        
        if (user?.role === 'member') {
          // Para member, simular que alguns leads são atribuídos a ele
          // Em produção, isso viria do campo assigned_to no banco
          leadsData = mockLeadsForPipeline.filter((_, index) => index % 2 === 0); // Simular alguns leads
          console.log('👤 Mock: Leads filtrados para member:', leadsData.length);
        } else {
          // Admin e super_admin veem todos os leads mock
          leadsData = mockLeadsForPipeline;
          console.log('📊 Mock: Todos os leads para admin/super_admin:', leadsData.length);
        }
      }

      // Combinar leads do servidor/mock com leads locais
      setLeads(prevLeads => {
        // Preservar leads locais recém-criados (IDs que começam com 'local-' ou 'lead-')
        const localLeads = prevLeads.filter(lead => 
          lead.id.startsWith('local-') || lead.id.startsWith('lead-')
        );
        
        // Combinar leads do servidor/mock com leads locais, removendo duplicatas
        const serverLeadIds = new Set(leadsData.map(lead => lead.id));
        const uniqueLocalLeads = localLeads.filter(lead => !serverLeadIds.has(lead.id));
        
        const combinedLeads = [...uniqueLocalLeads, ...leadsData];
        
        console.log('🔄 Combinando leads:', {
          servidor: leadsData.length,
          locais: uniqueLocalLeads.length,
          total: combinedLeads.length
        });
        
        return combinedLeads;
      });
      setCache(cacheKey, leadsData, 180000); // Cache por 3 minutos

    } catch (err: any) {
      console.error('❌ Erro ao buscar leads:', err);
      setError(err.message || 'Erro ao carregar leads');
      setLeads([]);
    }
  }, [user, leadsCacheKey]);

  // Atualizar leads quando pipeline selecionada muda
  useEffect(() => {
    if (selectedPipeline?.id) {
      console.log('🔄 Pipeline selecionada mudou:', selectedPipeline.name);
      fetchLeads(selectedPipeline.id);
    } else {
      console.log('🗑️ Nenhuma pipeline selecionada, limpando leads');
      setLeads([]);
    }
  }, [selectedPipeline?.id, fetchLeads]);

  // Carregar pipelines na inicialização
  useEffect(() => {
    console.log('🚀 Inicializando usePipelineData - limpando cache');
    // Limpar cache na inicialização para garantir dados frescos
    cache.clear();
    fetchPipelines();
  }, [fetchPipelines]);

  // Função para criar um novo lead com sincronização automática para o módulo Leads
  const handleCreateLead = useCallback(async (stageId: string, leadData: any): Promise<Lead | null> => {
    if (!selectedPipeline || !user) {
      console.error('❌ Pipeline ou usuário não selecionado');
      return null;
    }

    console.log('🎯 Criando lead + oportunidade (lógica CRM profissional):', { 
      stageId, 
      leadData, 
      userRole: user.role,
      userEmail: user.email,
      userId: user.id,
      pipelineName: selectedPipeline.name,
      pipelineId: selectedPipeline.id
    });

    // VERIFICAR SE PIPELINE TEM STAGES
    console.log('🔍 Verificando pipeline_stages:', {
      pipelineName: selectedPipeline.name,
      hasStages: !!selectedPipeline.pipeline_stages,
      stagesCount: selectedPipeline.pipeline_stages?.length || 0,
      stages: selectedPipeline.pipeline_stages?.map(s => ({
        id: s.id,
        name: s.name,
        order_index: s.order_index,
        is_system_stage: s.is_system_stage
      })) || []
    });

    try {
      // Sempre usar a primeira etapa da pipeline para novos leads
      const firstStage = selectedPipeline.pipeline_stages?.[0];
      const targetStageId = firstStage?.id || stageId;

      console.log('🎯 Determinando etapa alvo:', {
        firstStage: firstStage ? {
          id: firstStage.id,
          name: firstStage.name,
          order_index: firstStage.order_index,
          is_system_stage: firstStage.is_system_stage
        } : 'não encontrada',
        targetStageId,
        originalStageId: stageId,
        totalStages: selectedPipeline.pipeline_stages?.length || 0,
        allStages: selectedPipeline.pipeline_stages?.map(s => ({
          id: s.id,
          name: s.name,
          order_index: s.order_index
        }))
      });

      // VERIFICAÇÃO DE SEGURANÇA: garantir que temos uma stage válida
      if (!targetStageId) {
        console.error('❌ Nenhuma stage válida encontrada!', {
          firstStage,
          stageId,
          pipelineStages: selectedPipeline.pipeline_stages
        });
        throw new Error('Nenhuma etapa válida encontrada para criar o lead');
      }

      console.log('✅ Stage válida confirmada:', targetStageId);

      // Verificar se temos dados suficientes para criar lead master
      const leadInfo: LeadData = {
        nome_lead: leadData.nome_lead,
        first_name: leadData.first_name,
        last_name: leadData.last_name,
        email: leadData.email,
        telefone: leadData.telefone,
        phone: leadData.phone,
        empresa: leadData.empresa,
        company: leadData.company,
        cargo: leadData.cargo,
        job_title: leadData.job_title,
        lead_temperature: leadData.lead_temperature || 'Frio',
        status: leadData.status || 'Novo',
        lead_source: 'Pipeline'
      };

      const opportunityInfo: OpportunityData = {
        nome: leadData.nome,
        nome_oportunidade: leadData.nome_oportunidade || leadData.nome,
        valor: leadData.valor,
        responsavel: leadData.responsavel,
        ...leadData // Incluir todos os campos customizados
      };

      // Verificar se temos dados suficientes para sincronização completa
      const hasSufficientData = CRMSyncService.hasSufficientData(leadInfo);

      console.log('🔍 Verificação de dados suficientes:', {
        hasSufficientData,
        leadInfo,
        opportunityInfo
      });

      if (hasSufficientData) {
        console.log('✅ Dados suficientes - tentando criar lead master + oportunidade');

        try {
          const result = await CRMSyncService.createLeadWithOpportunity(
            leadInfo,
            opportunityInfo,
            selectedPipeline.id,
            targetStageId,
            user.email,
            user.role === 'member' ? user.id : undefined
          );

          if (result.success && result.opportunity) {
            console.log('🎯 CRM Sync bem-sucedido:', result.method);
            
            let createdLead: Lead;
            
            if (result.method === 'crm_sync' && result.opportunity) {
              createdLead = {
                id: result.opportunity.id,
                pipeline_id: result.opportunity.pipeline_id,
                stage_id: result.opportunity.stage_id,
                custom_data: result.opportunity.lead_data,
                status: 'active' as const,
                created_at: result.opportunity.created_at,
                updated_at: result.opportunity.updated_at,
                moved_at: result.opportunity.moved_at,
                assigned_to: result.opportunity.assigned_to,
                created_by: result.opportunity.created_by
              };
            } else if (result.method === 'traditional' && result.opportunity) {
              createdLead = {
                id: result.opportunity.id,
                pipeline_id: result.opportunity.pipeline_id,
                stage_id: result.opportunity.stage_id,
                custom_data: result.opportunity.lead_data,
                status: 'active' as const,
                created_at: result.opportunity.created_at,
                updated_at: result.opportunity.updated_at,
                moved_at: result.opportunity.moved_at,
                assigned_to: result.opportunity.assigned_to,
                created_by: result.opportunity.created_by
              };
            } else if (result.method === 'leads_only' && result.lead) {
              createdLead = {
                id: `local-${Date.now()}`,
                pipeline_id: selectedPipeline.id,
                stage_id: targetStageId,
                custom_data: {
                  ...opportunityInfo,
                  lead_master_id: result.lead.id,
                  lead_name: `${result.lead.first_name} ${result.lead.last_name}`.trim(),
                  lead_email: result.lead.email,
                  metodo_criacao: 'leads_only'
                },
                status: 'active' as const,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                moved_at: new Date().toISOString(),
                assigned_to: user.role === 'member' ? user.id : undefined,
                created_by: user.email
              };
            } else {
              throw new Error('Resultado inválido do CRM Sync');
            }

            // GARANTIR que o lead está na primeira etapa
            createdLead = ensureLeadInFirstStage(createdLead, selectedPipeline);

            // ATUALIZAÇÃO IMEDIATA DO ESTADO
            setLeads(prev => [createdLead, ...prev]);
            cache.delete(leadsCacheKey(selectedPipeline.id));
            
            console.log('✅ Lead criado via CRM Sync e adicionado ao estado');
            
            // FORÇAR REFRESH IMEDIATO
            setTimeout(async () => {
              console.log('🔄 Refresh imediato após CRM Sync...');
              cache.delete(leadsCacheKey(selectedPipeline.id));
              await fetchLeads(selectedPipeline.id);
            }, 100);
            
            return createdLead;
          }
        } catch (crmError: any) {
          console.warn('⚠️ CRM Sync falhou, continuando para método tradicional:', crmError.message);
        }
      } else {
        console.log('ℹ️ Dados insuficientes para CRM sync - usando método tradicional');
      }

      // Método tradicional - SEMPRE executado como fallback
      console.log('📝 Executando método tradicional (garantido)');
      
      // GARANTIR que estamos usando a primeira etapa
      const garantidaPrimeiraEtapa = selectedPipeline.pipeline_stages?.[0]?.id || targetStageId;
      
      console.log('🎯 Criando oportunidade tradicional:', {
        selectedPipeline: selectedPipeline.name,
        garantidaPrimeiraEtapa,
        leadData
      });
      
      // CRIAR LEAD TEMPORÁRIO PRIMEIRO (para feedback imediato)
      const tempLead: Lead = {
        id: `temp-${Date.now()}`,
        pipeline_id: selectedPipeline.id,
        stage_id: garantidaPrimeiraEtapa,
        custom_data: leadData,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        moved_at: new Date().toISOString(),
        assigned_to: user.role === 'member' ? user.id : undefined,
        created_by: user.email
      };

      // ADICIONAR TEMPORARIAMENTE AO ESTADO (feedback visual imediato)
      const tempLeadWithCorrectStage = ensureLeadInFirstStage(tempLead, selectedPipeline);
      setLeads(prev => [tempLeadWithCorrectStage, ...prev]);
      
      console.log('👁️ Lead temporário adicionado para feedback visual imediato');

      try {
        // TENTAR inserir no Supabase
        const { data, error } = await supabase
          .from('pipeline_leads')
          .insert([{
            pipeline_id: selectedPipeline.id,
            stage_id: garantidaPrimeiraEtapa,
            lead_data: leadData,
            assigned_to: user.role === 'member' ? user.id : undefined,
            created_by: user.id // Usar ID do usuário
          }])
          .select()
          .single();

        if (error) {
          console.warn('⚠️ Erro no Supabase:', error.message);
          throw error;
        }

        console.log('✅ Oportunidade criada no Supabase:', data.id);
        
        // CRIAR LEAD DEFINITIVO COM DADOS DO BANCO
        const finalLead: Lead = {
          id: data.id,
          pipeline_id: data.pipeline_id,
          stage_id: data.stage_id,
          custom_data: data.lead_data || leadData,
          status: 'active' as const,
          created_at: data.created_at,
          updated_at: data.updated_at,
          moved_at: data.moved_at || data.created_at,
          assigned_to: data.assigned_to,
          created_by: data.created_by
        };

        // GARANTIR que o lead está na primeira etapa
        const finalLeadWithCorrectStage = ensureLeadInFirstStage(finalLead, selectedPipeline);

        // SUBSTITUIR LEAD TEMPORÁRIO PELO DEFINITIVO
        setLeads(prev => {
          // Remover lead temporário e adicionar lead definitivo
          const withoutTemp = prev.filter(lead => lead.id !== tempLeadWithCorrectStage.id);
          return [finalLeadWithCorrectStage, ...withoutTemp];
        });
        
        // REGISTRAR NO HISTÓRICO
        try {
          console.log('📝 Tentando registrar no histórico...', {
            leadId: finalLeadWithCorrectStage.id.substring(0, 8) + '...',
            oldStage: finalLeadWithCorrectStage.stage_id,
            newStage: garantidaPrimeiraEtapa,
            userId: user.id
          });
          
          await registerStageMove(finalLeadWithCorrectStage.id, finalLeadWithCorrectStage.stage_id, garantidaPrimeiraEtapa, user.id);
          console.log('✅ Histórico de movimentação registrado com sucesso');
        } catch (historyError) {
          console.warn('⚠️ Erro ao registrar histórico:', historyError);
          
          // Tentar inserção direta como fallback
          try {
            console.log('🔄 Tentando inserção direta no histórico...');
            const { data, error } = await supabase
              .from('lead_history')
              .insert([{
                lead_id: finalLeadWithCorrectStage.id,
                action: 'stage_moved',
                description: `Lead movido para nova etapa`,
                user_id: user.id,
                user_name: `${user.first_name} ${user.last_name}`,
                old_values: { stage_id: finalLeadWithCorrectStage.stage_id },
                new_values: { stage_id: garantidaPrimeiraEtapa },
                created_at: new Date().toISOString()
              }])
              .select('id')
              .single();

            if (error) {
              console.error('❌ Erro na inserção direta:', error);
            } else {
              console.log('✅ Histórico registrado via inserção direta:', data.id);
            }
          } catch (directError) {
            console.error('❌ Falha total no registro de histórico:', directError);
          }
        }
        
        // LIMPAR CACHE
        cache.delete(leadsCacheKey(selectedPipeline.id));
        
        console.log('✅ Lead definitivo substituiu o temporário no estado');
        
        // REFRESH ADICIONAL PARA GARANTIR SINCRONIZAÇÃO
        setTimeout(async () => {
          console.log('🔄 Refresh adicional para garantir sincronização...');
          cache.delete(leadsCacheKey(selectedPipeline.id));
          await fetchLeads(selectedPipeline.id);
        }, 200);
        
        return finalLeadWithCorrectStage;

      } catch (supabaseError: any) {
        console.warn('⚠️ Supabase falhou, mantendo lead temporário como definitivo');
        
        // Se falhou no Supabase, manter o lead temporário como definitivo
        // mas atualizar o ID para um formato que não seja "temp-"
        const fallbackLead = {
          ...tempLeadWithCorrectStage,
          id: `local-${Date.now()}`
        };
        
        setLeads(prev => {
          const withoutTemp = prev.filter(lead => lead.id !== tempLeadWithCorrectStage.id);
          return [fallbackLead, ...withoutTemp];
        });
        
        console.log('✅ Lead local criado como fallback:', fallbackLead.id);
        
        return fallbackLead;
      }

    } catch (error: any) {
      console.error('❌ Erro crítico ao criar lead:', error);
      setError(error.message || 'Erro ao criar lead');
      return null;
    }
  }, [selectedPipeline, user, leadsCacheKey, ensureLeadInFirstStage, fetchLeads]);

  // Função para atualizar dados de um lead (com verificação de permissão)
  const updateLeadData = useCallback(async (leadId: string, data: any): Promise<void> => {
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return;
    }

    console.log('📝 Atualizando lead:', leadId, 'data:', data, 'userRole:', user.role);

    try {
      // Verificar permissões
      const leadToUpdate = leads.find(lead => lead.id === leadId);
      if (!leadToUpdate) {
        throw new Error('Lead não encontrado');
      }

      // Verificação de permissão
      if (user.role === 'member') {
        // Member só pode editar leads atribuídos a ele OU criados por ele
        if (leadToUpdate.assigned_to !== user.id && leadToUpdate.created_by !== user.email) {
          throw new Error('Você não tem permissão para editar este lead');
        }
        console.log('👤 Member autorizado a editar lead');
      } else if (user.role === 'admin') {
        // Admin pode editar qualquer lead da pipeline
        console.log('📊 Admin autorizado a editar qualquer lead');
      }

      try {
        // Tentar atualizar no Supabase
        const { error } = await supabase
          .from('pipeline_leads')
          .update({
            lead_data: { ...leadToUpdate.custom_data, ...data },
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);

        if (error) throw error;

        console.log('✅ Lead atualizado no Supabase');

        // Sincronização com leads_master removida temporariamente
        // TODO: Implementar sincronização de atualizações quando necessário
        console.log('ℹ️ Sincronização de atualizações desabilitada temporariamente');

      } catch (supabaseError: any) {
        console.warn('⚠️ Erro ao atualizar no Supabase, usando fallback local:', supabaseError.message);
      }

      // Atualizar estado local
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { 
              ...lead, 
              custom_data: { ...lead.custom_data, ...data },
              updated_at: new Date().toISOString()
            }
          : lead
      ));

      // Invalidar cache
      if (selectedPipeline) {
        cache.delete(leadsCacheKey(selectedPipeline.id));
      }

    } catch (error: any) {
      console.error('❌ Erro ao atualizar lead:', error);
      setError(error.message || 'Erro ao atualizar lead');
      throw error;
    }
  }, [user, leads, selectedPipeline, leadsCacheKey, ensureLeadInFirstStage]);

  // Função para mover lead para outra etapa - OTIMIZADA COM OPERAÇÕES PARALELAS
  const updateLeadStage = useCallback(async (leadId: string, stageId: string): Promise<void> => {
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return;
    }

    // 🚀 DEBOUNCE OTIMIZADO - Reduzido de 500ms para 50ms
    if (isDragInProgress) {
      console.log('⏳ Drag em progresso, aguardando...');
      return;
    }

    setIsDragInProgress(true);

    try {
      // Verificar permissões
      const leadToMove = leads.find(lead => lead.id === leadId);
      if (!leadToMove) {
        throw new Error('Lead não encontrado');
      }

      // Verificação de permissão para mover lead
      if (user.role === 'member') {
        if (leadToMove.assigned_to !== user.id && leadToMove.created_by !== user.email) {
          throw new Error('Você não tem permissão para mover este lead');
        }
      }

      const movedAt = new Date().toISOString();

      // 🔥 OPERAÇÕES PARALELAS - Executar todas simultaneamente
      const updatePromises = [];

      // 1. Update no Supabase
      const supabaseUpdate = supabase
        .from('pipeline_leads')
        .update({
          stage_id: stageId,
          moved_at: movedAt,
          updated_at: movedAt
        })
        .eq('id', leadId);

      updatePromises.push(supabaseUpdate);

      // 2. Registro de histórico (paralelo)
      const historyPromise = (async () => {
        try {
          await registerStageMove(leadId, leadToMove.stage_id, stageId, user.id);
          console.log('✅ Histórico registrado');
        } catch (historyError) {
          // Fallback para inserção direta
          try {
            const brasilTime = new Date().toLocaleString('en-CA', { 
              timeZone: 'America/Sao_Paulo',
              year: 'numeric',
              month: '2-digit', 
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }).replace(', ', 'T') + '-03:00';

            await supabase
              .from('lead_history')
              .insert([{
                lead_id: leadId,
                action: 'stage_moved',
                description: `Lead movido para nova etapa`,
                user_id: user.id,
                old_values: { stage_id: leadToMove.stage_id },
                new_values: { stage_id: stageId },
                created_at: brasilTime
              }]);
            console.log('✅ Histórico registrado via fallback');
          } catch (directError) {
            console.warn('⚠️ Falha no histórico (não crítico):', directError);
          }
        }
      })();

      updatePromises.push(historyPromise);

      // 3. Geração de tarefas (100% assíncrona - não bloqueia)
      const cadencePromise = (async () => {
        try {
          // Chamar API backend para geração assíncrona de tarefas
          const response = await fetch('/api/leads/generate-cadence-tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              leadId,
              stageId,
              leadData: leadToMove
            })
          });

          if (response.ok) {
            console.log('✅ Tarefas de cadência iniciadas em background');
          } else {
            console.warn('⚠️ Erro ao iniciar geração de tarefas (não crítico)');
          }
        } catch (taskError) {
          console.warn('⚠️ Falha na geração de tarefas (não crítico):', taskError);
        }
      })();

      // NÃO adicionar à lista de promises críticas - executar em background
      cadencePromise.catch(() => {}); // Silenciar erros

      // 🚀 AGUARDAR APENAS OPERAÇÕES CRÍTICAS
      const results = await Promise.allSettled(updatePromises);
      
      // Verificar se o update principal falhou
      const supabaseResult = results[0];
      if (supabaseResult.status === 'rejected') {
        console.warn('⚠️ Erro no Supabase:', supabaseResult.reason);
        // Não falhar - optimistic update já foi aplicado
      } else {
        console.log('✅ Lead atualizado no Supabase');
      }

      // Invalidar cache sem await (não crítico)
      if (selectedPipeline) {
        cache.delete(leadsCacheKey(selectedPipeline.id));
      }

      console.log('🎯 Movimentação concluída em modo otimizado');

    } catch (error: any) {
      console.error('❌ Erro crítico ao mover lead:', error);
      throw error; // Permitir que o optimistic update seja revertido
    } finally {
      // 🚀 DEBOUNCE OTIMIZADO - Reduzido de 500ms para 50ms
      setTimeout(() => {
        setIsDragInProgress(false);
      }, 50);
    }
  }, [user, leads, selectedPipeline, leadsCacheKey, isDragInProgress]);

  // Função para refresh manual
  const refreshPipelines = useCallback(async () => {
    cache.delete(pipelinesCacheKey);
    await fetchPipelines();
  }, [pipelinesCacheKey, fetchPipelines]);

  // Função para refresh manual dos leads
  const refreshLeads = useCallback(async () => {
    if (!selectedPipeline?.id) {
      return;
    }
    
    cache.delete(leadsCacheKey(selectedPipeline.id));
    await fetchLeads(selectedPipeline.id);
  }, [selectedPipeline?.id, fetchLeads, leadsCacheKey]);

  // Novos métodos para admin/member management
  const getUserPipelines = useCallback((): Pipeline[] => {
    if (user?.role === 'admin') {
      return pipelines.filter(p => p.created_by === user.id || p.created_by === user.email);
    }
    return pipelines;
  }, [pipelines, user]);

  const getAdminCreatedPipelines = useCallback((): Pipeline[] => {
    if (user?.role !== 'admin') return [];
    return pipelines.filter(p => p.created_by === user.id || p.created_by === user.email);
  }, [pipelines, user]);

  const getMemberLinkedPipelines = useCallback((): Pipeline[] => {
    if (user?.role !== 'member') return [];
    return pipelines;
  }, [pipelines, user]);

  // Função para vincular member a pipeline
  const linkMemberToPipeline = useCallback(async (memberId: string, pipelineId: string): Promise<boolean> => {
    if (user?.role !== 'admin') return false;

    console.log('🔗 Vinculando member à pipeline:', memberId, pipelineId);

    try {
      const { error } = await supabase
        .from('pipeline_members')
        .insert([{
          pipeline_id: pipelineId,
          member_id: memberId,
          assigned_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Invalidar cache para forçar re-fetch
      cache.delete(pipelinesCacheKey);
      await refreshPipelines();

      console.log('✅ Member vinculado com sucesso');
      return true;
    } catch (err: any) {
      console.error('❌ Erro ao vincular member à pipeline:', err);
      setError(err.message || 'Erro ao vincular vendedor');
      return false;
    }
  }, [user, pipelinesCacheKey, refreshPipelines]);

  // Função para desvincular member de pipeline
  const unlinkMemberFromPipeline = useCallback(async (memberId: string, pipelineId: string): Promise<boolean> => {
    if (user?.role !== 'admin') return false;

    console.log('🔓 Desvinculando member da pipeline:', memberId, pipelineId);

    try {
      const { error } = await supabase
        .from('pipeline_members')
        .delete()
        .eq('pipeline_id', pipelineId)
        .eq('member_id', memberId);

      if (error) throw error;

      // Invalidar cache para forçar re-fetch
      cache.delete(pipelinesCacheKey);
      await refreshPipelines();

      console.log('✅ Member desvinculado com sucesso');
      return true;
    } catch (err: any) {
      console.error('❌ Erro ao desvincular member da pipeline:', err);
      setError(err.message || 'Erro ao desvincular vendedor');
      return false;
    }
  }, [user, pipelinesCacheKey, refreshPipelines]);

  // Função para obter members de uma pipeline
  const getPipelineMembers = useCallback(async (pipelineId: string): Promise<any[]> => {
    console.log('👥 Buscando members da pipeline:', pipelineId);

    try {
      const { data, error } = await supabase
        .from('pipeline_members')
        .select(`
          id,
          member_id,
          assigned_at,
          users:member_id(id, first_name, last_name, email, is_active, role)
        `)
        .eq('pipeline_id', pipelineId);

      if (error) throw error;
      console.log('✅ Members encontrados:', (data || []).length);
      return data || [];
    } catch (err: any) {
      console.error('❌ Erro ao buscar members da pipeline:', err);
      return [];
    }
  }, []);

  // Log de debug do estado atual
  useEffect(() => {
    console.log('📊 Estado atual do usePipelineData:', {
      pipelinesCount: pipelines.length,
      selectedPipeline: selectedPipeline?.name || 'nenhuma',
      leadsCount: leads.length,
      loading,
      error,
      userRole: user?.role,
      userEmail: user?.email
    });
  }, [pipelines, selectedPipeline, leads, loading, error, user]);

  // Memoizar valores computados
  const memoizedReturn = useMemo((): UsePipelineDataReturn => ({
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
  }), [
    pipelines,
    selectedPipeline,
    leads,
    loading,
    error,
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
  ]);

  return memoizedReturn;
};
