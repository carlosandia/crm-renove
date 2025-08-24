import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { Pipeline, PipelineStage, CustomField, PipelineMember } from '../types/Pipeline';
import { Lead } from '../types/Pipeline';
import { retrySupabaseQuery, retryFetchOperation, createRetryLogger } from '../utils/retryUtils';
import { logger } from '../utils/logger';

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
  const { user } = useAuth();
  
  // Estados principais
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ PERFORMANCE: useRef para controlar re-renderizações
  const renderCountRef = useRef(0);
  const lastFetchRef = useRef<number>(0);
  
  // ✅ OTIMIZAÇÃO: Logger centralizado + retry logger memoizado
  const retryLogger = useMemo(() => createRetryLogger(`PipelineData-${user?.tenant_id?.substring(0, 8) || 'unknown'}`), [user?.tenant_id]);
  // ✅ CORREÇÃO: Usar logger padrão ao invés de createContext inexistente
  const pipelineLogger = useMemo(() => logger, []);

  // ✅ CACHE INTELIGENTE - TEMPORARIAMENTE DESABILITADO PARA DEBUG
  // ✅ CORREÇÃO CRÍTICA: Memoizar CACHE_KEY para evitar recriação do useCallback fetchPipelines
  const CACHE_KEY = useMemo(() => `pipelines_${user?.tenant_id}`, [user?.tenant_id]);
  const CACHE_DURATION = 0; // Desabilitado para debug

  const getCachedPipelines = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        if (!isExpired && Array.isArray(data)) {
          pipelineLogger.debug('Cache válido encontrado:', { count: data.length, type: 'pipelines' });
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
      pipelineLogger.debug('Cache atualizado:', { count: data.length, type: 'pipelines' });
    } catch (error) {
      pipelineLogger.warn('Erro ao salvar cache:', error);
    }
  }, [CACHE_KEY]);

  /**
   * ✅ FUNÇÃO PRINCIPAL DE BUSCA DE PIPELINES
   */
  const fetchPipelines = useCallback(async (): Promise<void> => {
    // ✅ PERFORMANCE: Incrementar contador de renders para debug
    renderCountRef.current += 1;
    
    // 🚀 LOG CRÍTICO: Sempre mostrar execução do hook
    console.log('🚀 [PIPELINE-DEBUG] HOOK usePipelineData EXECUTANDO:', {
      renderCount: renderCountRef.current,
      timestamp: new Date().toISOString(),
      user: user ? {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        role: user.role
      } : 'NOT_AUTHENTICATED'
    });
    
    // ✅ THROTTLING: Evitar execuções muito próximas (< 500ms)
    const now = Date.now();
    if (now - lastFetchRef.current < 500) {
      console.warn(`🚨 [PIPELINE-DEBUG] THROTTLING: fetchPipelines bloqueado - última execução há ${now - lastFetchRef.current}ms (render #${renderCountRef.current})`);
      return;
    }
    lastFetchRef.current = now;
    
    // ✅ DEBUG: Log para rastrear correção de duplicatas
    console.log(`🔄 [PIPELINE-DEBUG] FETCH INICIADO: fetchPipelines executando (render #${renderCountRef.current}) - correção de dependências aplicada`);
    
    if (!user) {
      console.error('❌ [PIPELINE-DEBUG] Usuário não autenticado - não é possível buscar pipelines');
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
    const logLevel = import.meta.env.VITE_LOG_LEVEL || 'warn';
    if (logLevel === 'debug') {
      localStorage.removeItem(CACHE_KEY);
      pipelineLogger.debug('Cache limpo para debug');
    }

    setLoading(true);
    setError(null);
    pipelineLogger.info(`Buscando pipelines da API para: ${user?.email || 'N/A'} (render #${renderCountRef.current})`);

    try {
      // ✅ SEMPRE USAR SUPABASE DIRETO PARA GARANTIR FILTRO CORRETO DE TENANT_ID
      pipelineLogger.debug('Buscando pipelines via Supabase:', {
        userEmail: user.email,
        userRole: user.role,
        tenantId: user.tenant_id,
        renderCount: renderCountRef.current
      });
      
      // ✅ CORREÇÃO CRÍTICA: Aguardar sessão estar totalmente sincronizada
      let sessionData, userData;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        // Verificar estado da sessão
        const sessionResult = await supabase.auth.getSession();
        sessionData = sessionResult.data;
        const sessionError = sessionResult.error;

        // Verificar se auth.uid() funciona no cliente
        const userResult = await supabase.auth.getUser();
        userData = userResult.data;
        const userError = userResult.error;

        pipelineLogger.debug(`🔍 SESSÃO DEBUG (tentativa ${retryCount + 1}):`, {
          sessionExists: !!sessionData?.session,
          sessionAccessToken: sessionData?.session?.access_token ? 'EXISTS' : 'NULL',
          sessionUser: sessionData?.session?.user?.id || 'NULL',
          sessionError: sessionError?.message || 'NONE',
          userDataExists: !!userData?.user,
          userDataId: userData?.user?.id || 'NULL',
          userError: userError?.message || 'NONE'
        });

        // Se sessão está válida, prosseguir
        if (sessionData?.session && userData?.user && !sessionError && !userError) {
          pipelineLogger.debug('✅ Sessão validada - prosseguindo com query');
          break;
        }

        // Se não é válida e ainda temos retries, aguardar e tentar novamente
        if (retryCount < maxRetries - 1) {
          pipelineLogger.warn(`⚠️ Sessão não sincronizada - aguardando 1s e tentando novamente (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        retryCount++;
      }

      // Se após todos os retries ainda não temos sessão válida, tentar forçar sincronização
      if (!sessionData?.session || !userData?.user) {
        pipelineLogger.warn('🔄 Forçando re-sincronização da sessão...');
        
        // Tentar refresh da sessão
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshData?.session && !refreshError) {
          sessionData = { session: refreshData.session };
          userData = { user: refreshData.user };
          pipelineLogger.debug('✅ Sessão re-sincronizada com sucesso');
        } else {
          pipelineLogger.error('❌ Falha na re-sincronização da sessão:', refreshError);
          throw new Error('Sessão não pôde ser sincronizada para executar query');
        }
      }

      // ✅ DEBUG JWT: Verificar estrutura completa do JWT no frontend
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      pipelineLogger.debug('🔍 JWT STRUCTURE DEBUG:', {
        sessionExists: !!session,
        sessionError: sessionError?.message,
        accessToken: session?.access_token ? 'EXISTS' : 'NULL',
        user: {
          id: session?.user?.id,
          email: session?.user?.email,
          user_metadata: session?.user?.user_metadata,
          app_metadata: session?.user?.app_metadata,
          role: session?.user?.role
        },
        tenantIdFromUserMetadata: session?.user?.user_metadata?.tenant_id,
        tenantIdFromAppMetadata: session?.user?.app_metadata?.tenant_id,
        tenantIdFromContext: user.tenant_id,
        timestamp: new Date().toISOString()
      });

      // ✅ CORREÇÃO: Buscar pipelines usando queries separadas (JOIN não funciona)  
      pipelineLogger.debug('🔍 QUERY DEBUG - Executando query pipelines:', {
        table: 'pipelines',
        filter_tenant_id: user.tenant_id,
        query_string: `tenant_id=eq.${user.tenant_id}`
      });

      // ✅ TESTE RLS POLICY: Verificar se RLS está funcionando corretamente
      const testRLSPolicy = async () => {
        try {
          // Teste 1: Query sem filtro tenant_id (RLS deve aplicar automaticamente)
          const { data: rlsTest, error: rlsError } = await supabase
            .from('pipelines')
            .select('id, name, tenant_id')
            .limit(5);
            
          pipelineLogger.debug('🧪 RLS POLICY TEST:', {
            withoutTenantFilter: {
              success: !rlsError,
              error: rlsError?.message,
              count: rlsTest?.length || 0,
              data: rlsTest?.map(p => ({ id: p.id, name: p.name, tenant_id: p.tenant_id }))
            }
          });

          // Teste 2: Query direta para pipeline "Vendas" específica
          const { data: vendasTest, error: vendasError } = await supabase
            .from('pipelines')
            .select('*')
            .eq('name', 'Vendas')
            .single();

          pipelineLogger.debug('🧪 VENDAS PIPELINE TEST:', {
            found: !!vendasTest,
            error: vendasError?.message,
            tenantIdMatch: vendasTest?.tenant_id === user.tenant_id,
            data: vendasTest ? {
              id: vendasTest.id,
              name: vendasTest.name,
              tenant_id: vendasTest.tenant_id,
              is_active: vendasTest.is_active
            } : null
          });

          return { rlsTest, vendasTest };
        } catch (error) {
          pipelineLogger.error('🚨 RLS TEST FAILED:', error);
          return { rlsTest: null, vendasTest: null };
        }
      };

      const { rlsTest, vendasTest } = await testRLSPolicy();

      // 🔍 LOG CRÍTICO: Antes da query principal - VERIFICAR UUID COMPLETO
      console.log('🔍 [PIPELINE-DEBUG] ANTES DA QUERY PRINCIPAL - VERIFICAÇÃO UUID COMPLETO:', {
        timestamp: new Date().toISOString(),
        tenantId_FULL: user.tenant_id,
        tenantId_LENGTH: user.tenant_id?.length || 0,
        tenantId_EXPECTED: 'c983a983-b1c6-451f-b528-64a5d1c831a0',
        tenantId_MATCHES_EXPECTED: user.tenant_id === 'c983a983-b1c6-451f-b528-64a5d1c831a0',
        queryDetails: {
          table: 'pipelines',
          filter: `tenant_id = eq.${user.tenant_id}`,
          order: 'created_at desc'
        },
        sessionInfo: {
          hasSession: !!sessionData?.session,
          hasUser: !!userData?.user,
          accessTokenExists: !!sessionData?.session?.access_token
        },
        rlsTestResults: {
          rlsTestCount: rlsTest?.length || 0,
          vendasFound: !!vendasTest,
          vendasTenantMatch: vendasTest?.tenant_id === user.tenant_id,
          vendasTenantId: vendasTest?.tenant_id,
          userTenantId: user.tenant_id
        }
      });

      const { data: supabasePipelines, error: supabaseError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      // 🔍 LOG CRÍTICO: Depois da query principal
      console.log('🔍 [PIPELINE-DEBUG] DEPOIS DA QUERY PRINCIPAL:', {
        timestamp: new Date().toISOString(),
        querySuccess: !supabaseError,
        error: supabaseError ? {
          message: supabaseError.message,
          code: supabaseError.code,
          hint: supabaseError.hint,
          details: supabaseError.details
        } : null,
        pipelinesCount: supabasePipelines?.length || 0,
        pipelinesData: supabasePipelines?.map(p => ({
          id: p.id,
          name: p.name,
          tenant_id: p.tenant_id,
          is_active: p.is_active,
          created_at: p.created_at
        })) || []
      });
        
      if (supabaseError) {
        pipelineLogger.error('🚨 ERRO 401 DETALHADO:', {
          errorMessage: supabaseError.message,
          errorCode: supabaseError.code,
          errorHint: supabaseError.hint,
          errorDetails: supabaseError.details,
          sessionActive: !!sessionData?.session,
          authUidWorking: !!userData?.user,
          tenantIdUsed: user.tenant_id,
          userRole: user.role,
          timestamp: new Date().toISOString()
        });
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
            pipelineLogger.warn('Erro ao buscar stages:', stagesError);
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
            pipelineLogger.warn('Supabase falhou para members, tentando backend:', membersResult.error?.message);
            
            const backendResult = await retryFetchOperation(
              () => fetch(`${import.meta.env.VITE_API_URL}/database/pipeline-members/${pipeline.id}?tenant_id=${user.tenant_id}`, {
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
              pipelineLogger.info('Backend fallback para members: SUCESSO', { count: members.length });
            } else {
              pipelineLogger.warn('Ambos falharam para members, usando array vazio');
              members = [];
            }
          }
          
          // Carregar campos customizados
          const { data: customFields } = await supabase
            .from('pipeline_custom_fields')
            .select('*')
            .eq('pipeline_id', pipeline.id)
            .order('field_order', { ascending: true });

          // Custom fields carregados para a pipeline

          // Pipeline específica processada

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

      // 🔍 LOG CRÍTICO: Dados processados completamente
      console.log('🔍 [PIPELINE-DEBUG] DADOS PROCESSADOS COMPLETOS:', {
        timestamp: new Date().toISOString(),
        totalPipelines: pipelinesData.length,
        renderCount: renderCountRef.current,
        pipelinesProcessed: pipelinesData.map(p => ({
          id: p.id,
          name: p.name,
          tenant_id: p.tenant_id,
          is_active: p.is_active,
          created_by: p.created_by,
          stagesCount: p.pipeline_stages?.length || 0,
          customFieldsCount: p.pipeline_custom_fields?.length || 0,
          membersCount: p.pipeline_members?.length || 0,
          hasAllRequiredFields: !!(p.id && p.name && p.tenant_id),
          stagesSample: p.pipeline_stages?.slice(0, 2)?.map(s => s.name) || [],
          createdAt: p.created_at
        })),
        vendasPipelineFound: pipelinesData.some(p => p.name === 'Vendas'),
        vendasPipelineDetails: pipelinesData.find(p => p.name === 'Vendas') ? {
          id: pipelinesData.find(p => p.name === 'Vendas')?.id,
          tenant_id: pipelinesData.find(p => p.name === 'Vendas')?.tenant_id,
          is_active: pipelinesData.find(p => p.name === 'Vendas')?.is_active,
          stages_count: pipelinesData.find(p => p.name === 'Vendas')?.pipeline_stages?.length
        } : null
      });
      
      pipelineLogger.info('Pipelines carregadas:', {
        total: pipelinesData.length,
        renderCount: renderCountRef.current,
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
        pipelineLogger.error('Pipelines sem tenant_id:', pipelinesWithoutTenant);
      }
      
      // ✅ DEBUG APENAS EM MODO DEBUG - CORRIGIDO: Log seguro sem undefined
      const logLevel = import.meta.env.VITE_LOG_LEVEL || 'warn';
      if (logLevel === 'debug' && pipelinesData.length > 0 && pipelinesData[0]) {
        const firstPipeline = pipelinesData[0];
        pipelineLogger.debug('Primeira pipeline detalhada:', {
          id: firstPipeline.id || 'N/A',
          name: firstPipeline.name || 'N/A',
          tenant_id: firstPipeline.tenant_id || 'N/A',
          tenant_id_type: typeof firstPipeline.tenant_id,
          created_at: firstPipeline.created_at || 'N/A',
          stages_count: firstPipeline.stages?.length || 0,
          has_stages: !!firstPipeline.stages
        });
      }

      // 🔍 LOG CRÍTICO: Antes de atualizar o estado do React
      console.log('🔍 [PIPELINE-DEBUG] ANTES DE SETPIPELINES:', {
        timestamp: new Date().toISOString(),
        dataToSet: {
          length: pipelinesData.length,
          hasVendas: pipelinesData.some(p => p.name === 'Vendas'),
          allNames: pipelinesData.map(p => p.name),
          firstPipeline: pipelinesData[0] ? {
            id: pipelinesData[0].id,
            name: pipelinesData[0].name,
            tenant_id: pipelinesData[0].tenant_id,
            is_active: pipelinesData[0].is_active
          } : null
        },
        currentStateInfo: {
          renderCount: renderCountRef.current,
          currentPipelinesCount: pipelines.length
        }
      });
      
      setPipelines(pipelinesData);
      
      // 🔍 LOG CRÍTICO: Estado atualizado (vai executar no próximo render)
      console.log('🔍 [PIPELINE-DEBUG] SETPIPELINES CHAMADO:', {
        timestamp: new Date().toISOString(),
        newDataLength: pipelinesData.length,
        hasVendasInNewData: pipelinesData.some(p => p.name === 'Vendas'),
        renderCount: renderCountRef.current,
        message: 'Estado React será atualizado no próximo render'
      });
      
      // setCachedPipelines(pipelinesData); // ✅ REMOVIDO: Cache desabilitado para debug

    } catch (fetchError: any) {
      // ✅ RETRY AUTOMÁTICO PARA ERROS 401
      const is401Error = fetchError?.code === 'PGRST116' || fetchError?.message?.includes('401') || fetchError?.message?.includes('Unauthorized');
      
      if (is401Error && !fetchPipelines.retryAttempted) {
        pipelineLogger.warn('🔄 Erro 401 detectado - tentando retry com re-autenticação...');
        
        // Marcar que já tentamos retry para evitar loop infinito
        (fetchPipelines as any).retryAttempted = true;
        
        try {
          // Forçar refresh da sessão
          pipelineLogger.debug('🔄 Forçando refresh de sessão para retry...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshData?.session && !refreshError) {
            pipelineLogger.debug('✅ Sessão refreshed - tentando query novamente...');
            
            // Aguardar propagação
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Retry da query principal
            const { data: retryPipelines, error: retryError } = await supabase
              .from('pipelines')
              .select('*')
              .eq('tenant_id', user.tenant_id)
              .order('created_at', { ascending: false });
            
            if (!retryError && retryPipelines) {
              pipelineLogger.info('✅ RETRY COM SUCESSO - pipelines carregadas:', { count: retryPipelines.length });
              
              // Processar pipelines como no fluxo normal
              const pipelinesData = await Promise.all(
                retryPipelines.map(async (pipeline) => {
                  // Buscar stages
                  const { data: stages } = await supabase
                    .from('pipeline_stages')
                    .select('*')
                    .eq('pipeline_id', pipeline.id)
                    .order('order_index', { ascending: true });

                  return {
                    ...pipeline,
                    stages: stages || []
                  };
                })
              );
              
              setPipelines(pipelinesData);
              setError(null);
              return; // Sair com sucesso
            } else {
              pipelineLogger.error('❌ Retry falhou:', retryError);
            }
          } else {
            pipelineLogger.error('❌ Falha no refresh da sessão:', refreshError);
          }
        } catch (retryError) {
          pipelineLogger.error('❌ Erro no retry 401:', retryError);
        }
        
        // Reset flag para próximas tentativas
        delete (fetchPipelines as any).retryAttempted;
      }

      pipelineLogger.error('💥 Erro final ao buscar pipelines:', fetchError);
      setPipelines([]);
      setError(is401Error ? 'Erro de autenticação - tente recarregar a página' : 'Erro ao carregar pipelines');
    } finally {
      setLoading(false);
      
      // 🔍 LOG CRÍTICO: Função fetchPipelines finalizada
      console.log('🔍 [PIPELINE-DEBUG] FETCHPIPELINES FINALIZADA:', {
        timestamp: new Date().toISOString(),
        renderCount: renderCountRef.current,
        loadingState: false,
        currentPipelinesInState: pipelines.length,
        message: 'fetchPipelines executada completamente'
      });
    }
  }, [user?.tenant_id, user?.email, CACHE_KEY]); // ✅ OTIMIZAÇÃO: Dependências mínimas específicas

  /**
   * ✅ BUSCAR LEADS DE UMA PIPELINE VIA API REST (COM SUPABASE AUTH)
   */
  const fetchLeads = useCallback(async (pipelineId?: string): Promise<void> => {
    if (!pipelineId || !user) return;

    pipelineLogger.debug('fetchLeads chamado:', { pipelineId, userId: user.id });

    try {
      // ✅ CORREÇÃO: Usar autenticação básica Supabase conforme CLAUDE.md
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      const userTenantId = currentUser.user_metadata?.tenant_id;
      if (!userTenantId || userTenantId !== user.tenant_id) {
        throw new Error('Acesso negado: tenant não autorizado');
      }
      
      // ✅ CONTROLE DE PERMISSÕES: Members só veem leads criados por eles ou atribuídos a eles
      let query = supabase
        .from('pipeline_leads')
        .select(`
          *,
          pipeline_stages!inner(name, order_index)
        `)
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', user.tenant_id);

      // Aplicar filtro específico para members
      if (user.role === 'member') {
        query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id},responsavel_oportunidade.eq.${user.id}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Erro Supabase: ${error.message}`);
      }

      pipelineLogger.info('Leads buscados via Supabase:', {
        pipelineId,
        leadsCount: data?.length || 0
      });

      setLeads(data || []);
    } catch (error) {
      pipelineLogger.error('Erro ao buscar leads:', error);
      setLeads([]);
    }
  }, [user, pipelineLogger]);

  /**
   * ✅ IMPLEMENTAR FUNÇÕES NECESSÁRIAS
   */
  const handleCreateLead = useCallback(async (stageId: string, leadData: any): Promise<Lead | null> => {
    try {
      pipelineLogger.debug('handleCreateLead chamado:', { stageId, leadData });

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
        console.debug('🔍 [DISTRIBUTION] Erro ao aplicar distribuição, usando fallback para atribuição manual:', distributionError);
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
          ...(leadData.custom_data || {}),
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

      pipelineLogger.info('Lead criado com sucesso na primeira etapa:', {
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
      pipelineLogger.error('Erro ao criar lead:', error);
      throw error;
    }
  }, [pipelines, user, pipelineLogger]);

  const updateLeadStage = useCallback(async (leadId: string, stageId: string): Promise<void> => {
    pipelineLogger.debug('updateLeadStage chamado:', { leadId, stageId });
  }, [pipelineLogger]);

  const updateLeadData = useCallback(async (leadId: string, data: any): Promise<void> => {
    pipelineLogger.debug('updateLeadData chamado:', { leadId, data });
  }, [pipelineLogger]);

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
    pipelineLogger.debug('linkMemberToPipeline chamado:', { memberId, pipelineId });
    return true;
  }, [pipelineLogger]);

  const unlinkMemberFromPipeline = useCallback(async (memberId: string, pipelineId: string): Promise<boolean> => {
    pipelineLogger.debug('unlinkMemberFromPipeline chamado:', { memberId, pipelineId });
    return true;
  }, [pipelineLogger]);

  const getPipelineMembers = useCallback(async (pipelineId: string): Promise<PipelineMember[]> => {
    pipelineLogger.debug('getPipelineMembers chamado:', pipelineId);
    return [];
  }, [pipelineLogger]);

  // ✅ OTIMIZAÇÃO: useEffect com throttling para evitar execuções duplicadas
  const userIdRef = useRef<string | null>(null);
  const selectedPipelineIdRef = useRef<string | null>(null);
  
  // ✅ Carregar pipelines na inicialização (com controle de duplicação)
  useEffect(() => {
    if (user && user.id !== userIdRef.current) {
      userIdRef.current = user.id;
      pipelineLogger.debug('useEffect fetchPipelines - user mudou:', user.id);
      fetchPipelines();
    } else if (user && user.id === userIdRef.current) {
      pipelineLogger.debug('useEffect fetchPipelines - SKIP (mesmo user):', user.id);
    }
  }, [user?.id, fetchPipelines, pipelineLogger]);

  // ✅ Carregar leads quando pipeline selecionada muda (com controle de duplicação)
  useEffect(() => {
    if (selectedPipeline && selectedPipeline.id !== selectedPipelineIdRef.current) {
      selectedPipelineIdRef.current = selectedPipeline.id;
      pipelineLogger.debug('useEffect fetchLeads - pipeline mudou:', selectedPipeline.id);
      fetchLeads(selectedPipeline.id);
    } else if (selectedPipeline && selectedPipeline.id === selectedPipelineIdRef.current) {
      pipelineLogger.debug('useEffect fetchLeads - SKIP (mesma pipeline):', selectedPipeline.id);
    }
  }, [selectedPipeline?.id, fetchLeads, pipelineLogger]);

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
      
      pipelineLogger.info('🔄 [REFRESH] Cache pipeline limpo, recarregando dados...');
      
      // ✅ REACT QUERY FRIENDLY: Sem setLoading manual se React Query está controlando
      await fetchPipelines();
    }, [CACHE_KEY, fetchPipelines, pipelineLogger]),
    refreshLeads,
    getUserPipelines,
    getAdminCreatedPipelines,
    getMemberLinkedPipelines,
    linkMemberToPipeline,
    unlinkMemberFromPipeline,
    getPipelineMembers
  };
}; 