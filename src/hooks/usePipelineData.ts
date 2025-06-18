import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { Pipeline, Lead, PipelineStage, CustomField } from '../types/Pipeline';
import { supabase } from '../lib/supabase';
import { debugPipelineData } from '../utils/debugPipeline';

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
        console.log('🗄️ Buscando leads do Supabase...');
        
        let query = supabase
          .from('pipeline_leads')
          .select(`
            *,
            pipeline_stages(id, name, color, order_index),
            pipelines(id, name)
          `)
          .eq('pipeline_id', pipelineId);

        // Aplicar filtros baseados no role
        if (user?.role === 'member') {
          // Member vê apenas leads atribuídos a ele
          console.log('👤 Aplicando filtro de member - assigned_to:', user.id);
          query = query.eq('assigned_to', user.id);
        } else if (user?.role === 'admin') {
          // Admin vê todos os leads da pipeline (sem filtro adicional)
          console.log('📊 Admin vê todos os leads da pipeline');
        }
        // Super admin também vê todos os leads (sem filtro adicional)

        const { data, error: leadsError } = await query.order('created_at', { ascending: false });

        if (leadsError) throw leadsError;
        
        leadsData = data || [];
        console.log(`✅ Leads encontrados: ${leadsData.length} (role: ${user?.role})`);

        // Log detalhado para debug
        if (user?.role === 'member' && leadsData.length === 0) {
          console.log('🔍 Debug: Nenhum lead encontrado para member. Verificando se existem leads na pipeline...');
          
          const { data: allLeads } = await supabase
            .from('pipeline_leads')
            .select('id, assigned_to, created_by')
            .eq('pipeline_id', pipelineId);
          
          console.log('📋 Todos os leads da pipeline:', allLeads);
          console.log('🎯 Buscando por assigned_to =', user.id);
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

      setLeads(leadsData);
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

  // Função para criar um novo lead
  const handleCreateLead = useCallback(async (stageId: string, leadData: any): Promise<Lead | null> => {
    if (!selectedPipeline || !user) {
      console.error('❌ Pipeline ou usuário não selecionado');
      return null;
    }

    console.log('🆕 Criando novo lead:', { stageId, leadData, userRole: user.role });

    try {
      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        pipeline_id: selectedPipeline.id,
        stage_id: stageId,
        custom_data: leadData,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        moved_at: new Date().toISOString(),
        // Definir assigned_to baseado no role
        assigned_to: user.role === 'member' ? user.id : undefined, // Member sempre é atribuído a si mesmo
        created_by: user.id
      };

      try {
        // Tentar inserir no Supabase
        const { data, error } = await supabase
          .from('pipeline_leads')
          .insert([{
            pipeline_id: newLead.pipeline_id,
            stage_id: newLead.stage_id,
            custom_data: newLead.custom_data,
            assigned_to: newLead.assigned_to,
            created_by: newLead.created_by
          }])
          .select()
          .single();

        if (error) throw error;

        console.log('✅ Lead criado no Supabase:', data);
        
        // Atualizar estado local
        const createdLead: Lead = {
          ...newLead,
          id: data.id,
          created_at: data.created_at,
          updated_at: data.updated_at
        };

        setLeads(prev => [createdLead, ...prev]);
        
        // Invalidar cache
        cache.delete(leadsCacheKey(selectedPipeline.id));
        
        return createdLead;

      } catch (supabaseError: any) {
        console.warn('⚠️ Erro ao criar no Supabase, usando fallback local:', supabaseError.message);
        
        // Fallback: adicionar apenas localmente
        setLeads(prev => [newLead, ...prev]);
        return newLead;
      }

    } catch (error: any) {
      console.error('❌ Erro ao criar lead:', error);
      setError(error.message || 'Erro ao criar lead');
      return null;
    }
  }, [selectedPipeline, user, leadsCacheKey]);

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
        // Member só pode editar leads atribuídos a ele
        if (leadToUpdate.assigned_to !== user.id && leadToUpdate.created_by !== user.id) {
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
            custom_data: { ...leadToUpdate.custom_data, ...data },
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);

        if (error) throw error;

        console.log('✅ Lead atualizado no Supabase');

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
  }, [user, leads, selectedPipeline, leadsCacheKey]);

  // Função para mover lead para outra etapa (com verificação de permissão)
  const updateLeadStage = useCallback(async (leadId: string, stageId: string): Promise<void> => {
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return;
    }

    console.log('🔄 Movendo lead:', leadId, 'para stage:', stageId, 'userRole:', user.role);

    try {
      // Verificar permissões
      const leadToMove = leads.find(lead => lead.id === leadId);
      if (!leadToMove) {
        throw new Error('Lead não encontrado');
      }

      // Verificação de permissão para mover lead
      if (user.role === 'member') {
        // Member só pode mover leads atribuídos a ele
        if (leadToMove.assigned_to !== user.id && leadToMove.created_by !== user.id) {
          throw new Error('Você não tem permissão para mover este lead');
        }
        console.log('👤 Member autorizado a mover lead');
      } else if (user.role === 'admin') {
        // Admin pode mover qualquer lead
        console.log('📊 Admin autorizado a mover qualquer lead');
      }

      const movedAt = new Date().toISOString();

      try {
        // Tentar atualizar no Supabase
        const { error } = await supabase
          .from('pipeline_leads')
          .update({
            stage_id: stageId,
            moved_at: movedAt,
            updated_at: movedAt
          })
          .eq('id', leadId);

        if (error) throw error;

        console.log('✅ Lead movido no Supabase');

      } catch (supabaseError: any) {
        console.warn('⚠️ Erro ao mover no Supabase, usando fallback local:', supabaseError.message);
      }

      // Atualizar estado local
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { 
              ...lead, 
              stage_id: stageId, 
              moved_at: movedAt,
              updated_at: movedAt
            }
          : lead
      ));

      // Invalidar cache
      if (selectedPipeline) {
        cache.delete(leadsCacheKey(selectedPipeline.id));
      }

    } catch (error: any) {
      console.error('❌ Erro ao mover lead:', error);
      setError(error.message || 'Erro ao mover lead');
      throw error;
    }
  }, [user, leads, selectedPipeline, leadsCacheKey]);

  // Função para refresh manual
  const refreshPipelines = useCallback(async () => {
    console.log('🔄 Refresh manual de pipelines');
    cache.delete(pipelinesCacheKey);
    await fetchPipelines();
  }, [pipelinesCacheKey, fetchPipelines]);

  const refreshLeads = useCallback(async () => {
    if (selectedPipeline?.id) {
      console.log('🔄 Refresh manual de leads para:', selectedPipeline.name);
      cache.delete(leadsCacheKey(selectedPipeline.id));
      await fetchLeads(selectedPipeline.id);
    }
  }, [selectedPipeline?.id, fetchLeads]);

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
