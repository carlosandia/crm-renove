import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../providers/AuthProvider';
import { Pipeline, PipelineStage, CustomField, PipelineMember } from '../types/Pipeline';
import { Lead } from '../types/Pipeline';
import { retrySupabaseQuery, retryFetchOperation, createRetryLogger } from '../utils/retryUtils';

// ✅ INTERFACE COMPLETA
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
  getUserPipelines: () => Pipeline[];
  getAdminCreatedPipelines: () => Pipeline[];
  getMemberLinkedPipelines: () => Pipeline[];
  linkMemberToPipeline: (memberId: string, pipelineId: string) => Promise<boolean>;
  unlinkMemberFromPipeline: (memberId: string, pipelineId: string) => Promise<boolean>;
  getPipelineMembers: (pipelineId: string) => Promise<PipelineMember[]>;
}

export const usePipelineData = (): UsePipelineDataReturn => {
  const { user, authenticatedFetch } = useAuth();
  
  // Estados principais
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ NOVO: Logger específico para retry
  const retryLogger = useMemo(() => createRetryLogger(`PipelineData-${user?.tenant_id?.substring(0, 8) || 'unknown'}`), [user?.tenant_id]);

  // ✅ SISTEMA DE LOG LEVELS OTIMIZADO
  const logLevel = import.meta.env.VITE_LOG_LEVEL || 'warn';
  const isDev = import.meta.env.DEV;
  
  const logger = {
    debug: (message: string, ...args: any[]) => {
      if (logLevel === 'debug') {
        console.log(`🔍 [UsePipelineData] ${message}`, ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (['debug', 'info'].includes(logLevel)) {
        console.log(`ℹ️ [UsePipelineData] ${message}`, ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (['debug', 'info', 'warn'].includes(logLevel)) {
        console.warn(`⚠️ [UsePipelineData] ${message}`, ...args);
      }
    },
    error: (message: string, ...args: any[]) => {
      console.error(`❌ [UsePipelineData] ${message}`, ...args);
    }
  };

  // ✅ CACHE INTELIGENTE - TEMPORARIAMENTE DESABILITADO PARA DEBUG
  const CACHE_KEY = `pipelines_${user?.tenant_id}`;
  const CACHE_DURATION = 0; // Desabilitado para debug

  const getCachedPipelines = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        if (!isExpired && Array.isArray(data)) {
          logger.debug('Cache válido encontrado:', data.length, 'pipelines');
          return data;
        }
      }
    } catch (error) {
      localStorage.removeItem(CACHE_KEY);
    }
    return null;
  }, [CACHE_KEY, CACHE_DURATION]);

  const setCachedPipelines = useCallback((data: Pipeline[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      logger.debug('Cache atualizado:', data.length, 'pipelines');
    } catch (error) {
      logger.warn('Erro ao salvar cache:', error);
    }
  }, [CACHE_KEY]);

  /**
   * ✅ FUNÇÃO PRINCIPAL DE BUSCA DE PIPELINES
   */
  const fetchPipelines = useCallback(async (): Promise<void> => {
    if (!user) {
      logger.warn('Usuário não autenticado');
      setPipelines([]);
      setLoading(false);
      return;
    }

    // ✅ CACHE TEMPORARIAMENTE DESABILITADO PARA DEBUG
    // const cachedPipelines = getCachedPipelines();
    // if (cachedPipelines) {
    //   setPipelines(cachedPipelines);
    //   setLoading(false);
    //   return;
    // }
    
    // Limpar cache existente apenas em debug mode
    if (logLevel === 'debug') {
      localStorage.removeItem(CACHE_KEY);
      logger.debug('Cache limpo para debug');
    }

    setLoading(true);
    setError(null);
    logger.info('Buscando pipelines da API para:', user.email);

    try {
      // ✅ SEMPRE USAR SUPABASE DIRETO PARA GARANTIR FILTRO CORRETO DE TENANT_ID
      logger.debug('Buscando pipelines via Supabase:', {
        userEmail: user.email,
        userRole: user.role,
        tenantId: user.tenant_id
      });
      
      // ✅ CORREÇÃO: Buscar pipelines usando queries separadas (JOIN não funciona)
      const { data: supabasePipelines, error: supabaseError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });
        
      if (supabaseError) {
        logger.error('Erro no Supabase:', supabaseError);
        throw supabaseError;
      }
      
      // ✅ Para cada pipeline, buscar stages e members separadamente
      const pipelinesData = await Promise.all(
        (supabasePipelines || []).map(async (pipeline) => {
          // Buscar stages da pipeline
          const { data: stages, error: stagesError } = await supabase
            .from('pipeline_stages')
            .select('*')
            .eq('pipeline_id', pipeline.id)
            .order('order_index');
          
          if (stagesError) {
            logger.warn('Erro ao buscar stages:', stagesError);
          }
          
          // ✅ NOVO: Buscar members com retry e fallback
          let members: any[] = [];
          
          // Tentativa 1: Supabase com retry
          const membersResult = await retrySupabaseQuery(
            () => supabase
              .from('pipeline_members')
              .select('*')
              .eq('pipeline_id', pipeline.id),
            {
              maxAttempts: 2,
              baseDelay: 1000,
              onRetry: retryLogger.onRetry
            }
          );

          if (membersResult.success && membersResult.data) {
            members = (membersResult.data || []) as any[];
            
            if (membersResult.attempts > 1) {
              retryLogger.onSuccess(membersResult.attempts, membersResult.totalTime);
            }
          } else {
            // Tentativa 2: Backend API com retry
            logger.warn('Supabase falhou para members, tentando backend:', membersResult.error?.message);
            
            const backendResult = await retryFetchOperation(
              () => fetch(`${import.meta.env.VITE_API_URL}/api/database/pipeline-members/${pipeline.id}?tenant_id=${user.tenant_id}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json'
                }
              }),
              (response) => response.json(),
              {
                maxAttempts: 2,
                baseDelay: 500,
                onRetry: retryLogger.onRetry
              }
            );
            
            if (backendResult.success && backendResult.data?.success) {
              members = backendResult.data.data || [];
              logger.info('Backend fallback para members: SUCESSO', members.length);
            } else {
              logger.warn('Ambos falharam para members, usando array vazio');
              members = [];
            }
          }
          
          // Carregar campos customizados
          const { data: customFields } = await supabase
            .from('pipeline_custom_fields')
            .select('*')
            .eq('pipeline_id', pipeline.id)
            .order('field_order', { ascending: true });

          // Combinar dados
          return {
            ...pipeline,
            stages: stages || [], // ✅ CORREÇÃO: Campo esperado pelo ModernPipelineCreatorRefactored
            pipeline_stages: stages || [], // ✅ COMPATIBILIDADE: Manter para outros componentes
            pipeline_members: members || [],
            pipeline_custom_fields: customFields || [] // ✅ CORREÇÃO: Carregar campos customizados reais
          };
        })
      );
      
      logger.info('Pipelines carregadas:', {
        total: pipelinesData.length,
        pipelines: pipelinesData.map(p => ({
          name: p.name,
          id: p.id.substring(0, 8),
          isActive: p.is_active,
          tenantId: p.tenant_id,
          createdBy: p.created_by,
          stagesCount: p.pipeline_stages?.length || 0,
          customFieldsCount: p.pipeline_custom_fields?.length || 0,
          membersCount: p.pipeline_members?.length || 0,
          hasAllFields: !!(p.id && p.name && p.tenant_id)
        }))
      });
      
      // ✅ VERIFICAÇÃO DE INTEGRIDADE
      const pipelinesWithoutTenant = pipelinesData.filter(p => !p.tenant_id);
      if (pipelinesWithoutTenant.length > 0) {
        logger.error('Pipelines sem tenant_id:', pipelinesWithoutTenant);
      }
      
      // ✅ DEBUG APENAS EM MODO DEBUG
      if (logLevel === 'debug' && pipelinesData.length > 0) {
        logger.debug('Primeira pipeline detalhada:', {
          ...pipelinesData[0],
          tenant_id_type: typeof pipelinesData[0].tenant_id
        });
      }
      
      setPipelines(pipelinesData);
      setCachedPipelines(pipelinesData);

    } catch (fetchError: any) {
      logger.error('Erro ao buscar pipelines:', fetchError);
      setPipelines([]);
      setError('Erro ao carregar pipelines');
    } finally {
      setLoading(false);
    }
  }, [user, authenticatedFetch, getCachedPipelines, setCachedPipelines]);

  /**
   * ✅ BUSCAR LEADS DE UMA PIPELINE VIA API REST (COM SUPABASE AUTH)
   */
  const fetchLeads = useCallback(async (pipelineId?: string): Promise<void> => {
    if (!pipelineId || !user) return;

    logger.debug('fetchLeads chamado:', { pipelineId, userId: user.id });

    try {
      // ✅ Usar API REST para garantir autenticação Supabase
      const response = await authenticatedFetch(`/api/pipelines/${pipelineId}/leads?tenant_id=${user.tenant_id}`);
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      logger.info('Leads buscados via API:', {
        pipelineId,
        leadsCount: data?.length || 0
      });

      setLeads(data || []);
    } catch (error) {
      logger.error('Erro ao buscar leads:', error);
      setLeads([]);
    }
  }, [user, authenticatedFetch]);

  /**
   * ✅ IMPLEMENTAR FUNÇÕES NECESSÁRIAS
   */
  const handleCreateLead = useCallback(async (stageId: string, leadData: any): Promise<Lead | null> => {
    try {
      logger.debug('handleCreateLead chamado:', { stageId, leadData });

      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // Primeiro, criar o lead master se não existe
      let leadMasterId: string;
      
      if (leadData.lead_master_id) {
        leadMasterId = leadData.lead_master_id;
      } else {
        // 🔧 CORREÇÃO RLS: Gerar UUID manualmente para contornar problema de SELECT após INSERT
        leadMasterId = crypto.randomUUID();
        
        const leadMasterData = {
          id: leadMasterId,
          first_name: leadData.first_name || leadData.nome || '',
          last_name: leadData.last_name || leadData.sobrenome || '',
          email: leadData.email || '',
          phone: leadData.phone || leadData.telefone || '',
          company: leadData.company || leadData.empresa || '',
          source: leadData.source || 'Manual',
          tenant_id: user.tenant_id,
          created_by: user.id,
          custom_data: leadData.custom_data || {}
        };

        const { error: leadMasterError } = await supabase
          .from('leads_master')
          .insert([leadMasterData]);

        if (leadMasterError) {
          console.error('Erro ao criar lead master:', leadMasterError);
          throw new Error('Erro ao criar lead master');
        }
      }

      // Buscar pipeline para encontrar a primeira etapa
      const pipeline = pipelines?.find(p => p.id === leadData.pipeline_id);
      if (!pipeline) {
        throw new Error('Pipeline não encontrada');
      }

      // Encontrar a primeira etapa (etapa "Lead" com order_index 0)
      const firstStage = pipeline.pipeline_stages
        ?.sort((a, b) => a.order_index - b.order_index)[0];

      if (!firstStage) {
        throw new Error('Nenhuma etapa encontrada na pipeline');
      }

      // Buscar regra de distribuição para a pipeline
      let assignedTo = leadData.assigned_to || user.id;
      
      try {
        const { data: distributionRule } = await supabase
          .from('pipeline_distribution_rules')
          .select('*')
          .eq('pipeline_id', leadData.pipeline_id)
          .single();

        if (distributionRule && distributionRule.is_active && distributionRule.mode === 'rodizio') {
          // Aplicar distribuição por rodízio
          const { data: pipelineMembers } = await supabase
            .from('pipeline_members')
            .select('member_id, users!member_id(id, first_name, last_name, is_active)')
            .eq('pipeline_id', leadData.pipeline_id);

          if (pipelineMembers && pipelineMembers.length > 0) {
            // Filtrar membros ativos se configurado
            const eligibleMembers = distributionRule.skip_inactive_members 
              ? pipelineMembers.filter(pm => {
                  const user = pm.users as any;
                  return user?.is_active !== false;
                })
              : pipelineMembers;

            if (eligibleMembers.length > 0) {
              // Determinar próximo membro na sequência
              const lastAssignedIndex = distributionRule.last_assigned_member_id 
                ? eligibleMembers.findIndex(m => m.member_id === distributionRule.last_assigned_member_id)
                : -1;
              
              const nextIndex = (lastAssignedIndex + 1) % eligibleMembers.length;
              assignedTo = eligibleMembers[nextIndex].member_id;

              // Atualizar regra de distribuição
              await supabase
                .from('pipeline_distribution_rules')
                .update({
                  last_assigned_member_id: assignedTo,
                  total_assignments: (distributionRule.total_assignments || 0) + 1,
                  last_assignment_at: new Date().toISOString()
                })
                .eq('pipeline_id', leadData.pipeline_id);

              // Registrar histórico de atribuição
              await supabase
                .from('lead_assignment_history')
                .insert({
                  pipeline_id: leadData.pipeline_id,
                  assigned_to: assignedTo,
                  assignment_method: 'round_robin',
                  round_robin_position: nextIndex,
                  total_eligible_members: eligibleMembers.length,
                  status: 'success'
                });
            }
          }
        }
      } catch (distributionError) {
        console.warn('Erro ao aplicar distribuição, usando atribuição manual:', distributionError);
      }

      // 🔧 CORREÇÃO RLS: Gerar UUID manualmente para contornar problema de SELECT após INSERT
      const pipelineLeadId = crypto.randomUUID();
      
      const pipelineLeadData = {
        id: pipelineLeadId,
        pipeline_id: leadData.pipeline_id,
        stage_id: firstStage.id, // Sempre usar a primeira etapa (Lead)
        lead_master_id: leadMasterId,
        assigned_to: assignedTo,
        created_by: user.id,
        tenant_id: user.tenant_id,
        custom_data: {
          ...leadData.custom_data,
          created_via: 'pipeline_management',
          distribution_method: leadData.assigned_to ? 'manual' : 'auto'
        }
      };

      const { error: pipelineLeadError } = await supabase
        .from('pipeline_leads')
        .insert([pipelineLeadData]);

      if (pipelineLeadError) {
        console.error('Erro ao criar pipeline lead:', pipelineLeadError);
        throw new Error('Erro ao criar lead na pipeline');
      }

      logger.info('Lead criado com sucesso na primeira etapa:', {
        leadId: pipelineLeadId,
        stage: firstStage.name,
        assignedTo
      });

      // 🔧 CORREÇÃO RLS: Retornar dados simulados sem dependência do SELECT
      const simulatedLead = {
        id: pipelineLeadId,
        pipeline_id: leadData.pipeline_id,
        stage_id: firstStage.id,
        lead_master_id: leadMasterId,
        assigned_to: assignedTo,
        created_by: user.id,
        tenant_id: user.tenant_id,
        custom_data: pipelineLeadData.custom_data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return simulatedLead as Lead;

    } catch (error) {
      logger.error('Erro ao criar lead:', error);
      throw error;
    }
  }, [pipelines, user, supabase]);

  const updateLeadStage = useCallback(async (leadId: string, stageId: string): Promise<void> => {
    logger.debug('updateLeadStage chamado:', { leadId, stageId });
  }, []);

  const updateLeadData = useCallback(async (leadId: string, data: any): Promise<void> => {
    logger.debug('updateLeadData chamado:', { leadId, data });
  }, []);

  const refreshLeads = useCallback(async (): Promise<void> => {
    if (selectedPipeline) {
      await fetchLeads(selectedPipeline.id);
    }
  }, [selectedPipeline, fetchLeads]);

  const getUserPipelines = useCallback((): Pipeline[] => {
    return pipelines;
  }, [pipelines]);

  const getAdminCreatedPipelines = useCallback((): Pipeline[] => {
    if (user?.role === 'super_admin') {
      return pipelines;
    }
    // Para admin, filtrar apenas pipelines criadas por ele
    return pipelines.filter(p => 
      p.created_by === user?.id || p.created_by === user?.email
    );
  }, [pipelines, user]);

  const getMemberLinkedPipelines = useCallback((): Pipeline[] => {
    // ✅ CONTROLE DE PERMISSÕES: Members só veem pipelines onde estão atribuídos
    if (user?.role === 'member') {
      return pipelines.filter(pipeline => {
        // Verificar se o member está na lista de members da pipeline
        const pipelineMembers = pipeline.pipeline_members || [];
        return pipelineMembers.some(member => member.member_id === user.id);
      });
    }
    // Para outros roles, retornar todas as pipelines
    return pipelines;
  }, [pipelines, user]);

  const linkMemberToPipeline = useCallback(async (memberId: string, pipelineId: string): Promise<boolean> => {
    logger.debug('linkMemberToPipeline chamado:', { memberId, pipelineId });
    return true;
  }, []);

  const unlinkMemberFromPipeline = useCallback(async (memberId: string, pipelineId: string): Promise<boolean> => {
    logger.debug('unlinkMemberFromPipeline chamado:', { memberId, pipelineId });
    return true;
  }, []);

  const getPipelineMembers = useCallback(async (pipelineId: string): Promise<PipelineMember[]> => {
    logger.debug('getPipelineMembers chamado:', pipelineId);
    return [];
  }, []);

  // ✅ Carregar pipelines na inicialização
  useEffect(() => {
    if (user) {
      fetchPipelines();
    }
  }, [user, fetchPipelines]);

  // ✅ Carregar leads quando pipeline selecionada muda
  useEffect(() => {
    if (selectedPipeline) {
      fetchLeads(selectedPipeline.id);
    }
  }, [selectedPipeline, fetchLeads]);

  return {
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
    refreshPipelines: useCallback(async () => {
      // ✅ ENTERPRISE: Otimizado para React Query - menos cache clearing
      localStorage.removeItem(CACHE_KEY);
      
      logger.info('🔄 [REFRESH] Cache pipeline limpo, recarregando dados...');
      
      // ✅ REACT QUERY FRIENDLY: Sem setLoading manual se React Query está controlando
      await fetchPipelines();
    }, [CACHE_KEY, fetchPipelines]),
    refreshLeads,
    getUserPipelines,
    getAdminCreatedPipelines,
    getMemberLinkedPipelines,
    linkMemberToPipeline,
    unlinkMemberFromPipeline,
    getPipelineMembers
  };
}; 