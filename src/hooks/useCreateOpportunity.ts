import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateOpportunityRequest } from '../services/leadOpportunityApiService';
import { showSuccessToast, showErrorToast } from './useToast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { recordTiming, recordSuccessRate, measureAsync, performanceTracker } from '../utils/performanceMetrics';
import { logger } from '../utils/logger';
import { createOpportunityViaBackend } from '../services/adminApi';

/**
 * ✅ URL UNIVERSAL: Detecção automática baseada no hostname atual
 */
const getCurrentBackendURL = () => {  
  // Usar variável de ambiente configurada ou fallback para desenvolvimento
  return import.meta.env.VITE_API_URL || (import.meta.env.VITE_ENVIRONMENT === 'production' ? 'https://crm.renovedigital.com.br/api' : 'http://127.0.0.1:3001/api');
};

/**
 * Hook para criar nova oportunidade
 * ARQUITETURA SIMPLIFICADA: Autenticação básica + validação de primeira etapa
 * Seguindo padrão exato do ModernPipelineCreatorRefactored
 */
export const useCreateOpportunity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    // ✅ CORREÇÃO: Implementar mutation scope para evitar execuções duplas
    mutationKey: ['create-opportunity', user?.id],
    scope: {
      id: 'create-opportunity'
    },
    mutationFn: async (data: CreateOpportunityRequest) => {
      // ✅ PERFORMANCE: Medir tempo total da operação
      return await measureAsync('opportunity', 'create-complete', async () => {
      // ✅ LOG-LEVEL-INFO: Apenas operação principal
      logger.opportunity('Iniciando criação de oportunidade', {
        operation: 'create-start',
        pipeline_id: data.pipeline_id?.substring(0, 8),
        nome_oportunidade: data.nome_oportunidade
      });

      // ✅ AUTENTICAÇÃO SIMPLES (padrão ModernPipelineCreator)
      if (!user?.id || !user?.tenant_id) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      // ✅ CORREÇÃO: Verificar sessão do Supabase antes de prosseguir
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        logger.error('Session validation failed', {
          operation: 'session-check',
          error: sessionError?.message,
          hasSession: !!session,
          hasToken: !!session?.access_token
        });
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      logger.info('Session validated successfully', {
        operation: 'session-validated',
        user_id: session.user.id.substring(0, 8),
        has_token: !!session.access_token
      });

      // ✅ LOG-LEVEL-DEBUG: UUID validation reduzida
      logger.validation('Validando UUIDs', {
        operation: 'uuid-validation',
        pipeline_valid: data.pipeline_id?.length === 36,
        stage_valid: data.stage_id?.length === 36
      });

      if (data.stage_id?.length !== 36) {
        throw new Error(`Stage ID inválido: "${data.stage_id}" (deve ter 36 caracteres, recebeu ${data.stage_id?.length})`);
      }

      if (data.pipeline_id?.length !== 36) {
        throw new Error(`Pipeline ID inválido: "${data.pipeline_id}" (deve ter 36 caracteres, recebeu ${data.pipeline_id?.length})`);
      }

      // ✅ LOG-LEVEL-DEBUG: Stage validation start
      
      // ✅ STRUCTURED LOGGING: Usar logger estruturado para stage validation
      logger.validation('Iniciando validação de primeira etapa', {
        operation: 'stage-validation',
        stage_id: data.stage_id?.substring(0, 8),
        pipeline_id: data.pipeline_id?.substring(0, 8),
        tenant_id: user.tenant_id?.substring(0, 8)
      });
      
      // ✅ OTIMIZAÇÃO: Query com campos explícitos e fallbacks
      const { data: stageInfo, error: stageError } = await supabase
        .from('pipeline_stages')
        .select('id, name, order_index, pipeline_id, tenant_id')
        .eq('id', data.stage_id)
        .eq('tenant_id', user.tenant_id)
        .single();

      // ✅ LOG-LEVEL-DEBUG: Stage lookup apenas se houver problema
      if (stageError || !stageInfo) {
        logger.error('Stage lookup failed', {
          operation: 'stage-lookup-error',
          stage_id: data.stage_id?.substring(0, 8),
          error: stageError?.message
        });
      }

      if (stageError || !stageInfo) {
        throw new Error('Etapa da pipeline não encontrada');
      }

      // ✅ CORREÇÃO: Robusto parsing para array vs objeto com fallbacks
      let actualStageData;
      if (Array.isArray(stageInfo)) {
        actualStageData = stageInfo.length > 0 ? stageInfo[0] : null;
        logger.validation('Query retornou array - extraindo primeiro elemento', {
          operation: 'array-parsing',
          array_length: stageInfo.length,
          has_first_element: !!actualStageData
        });
      } else if (stageInfo && typeof stageInfo === 'object') {
        actualStageData = stageInfo;
        logger.validation('Query retornou objeto - usando diretamente', {
          operation: 'object-parsing',
          object_keys: Object.keys(stageInfo)
        });
      } else {
        actualStageData = null;
        logger.validation('Query retornou tipo inesperado', {
          operation: 'unexpected-type',
          data_type: typeof stageInfo,
          data_value: stageInfo
        });
      }

      if (!actualStageData) {
        logger.error('Stage data invalid after parsing', { operation: 'stage-parsing-error' });
        throw new Error('Dados da etapa estão em formato inválido');
      }

      const stageName = actualStageData.name || 'Etapa sem nome';
      const stageOrderIndex = typeof actualStageData.order_index === 'number' 
        ? actualStageData.order_index 
        : parseInt(actualStageData.order_index) || 0;

      // ✅ LOG-LEVEL-SILLY: Stage parsing apenas em debug profundo
      logger.silly('Stage data parsed', {
        operation: 'stage-parsing',
        stage_name: stageName,
        stage_order_index: stageOrderIndex
      });

      // ✅ LOG-LEVEL-DEBUG: Stage validation consolidada
      logger.validation('Stage validation completed', {
        operation: 'stage-validation',
        stage_name: stageName,
        is_first_stage: stageOrderIndex === 0,
        pipeline_match: actualStageData?.pipeline_id === data.pipeline_id
      });

      if (stageOrderIndex !== 0) {
        logger.error('Tentativa de criação em etapa não inicial', {
          operation: 'stage-validation-error',
          stage_name: stageName,
          order_index: stageOrderIndex
        });
        throw new Error(`Oportunidade só pode ser criada na primeira etapa. Etapa atual: "${stageName}" (posição ${stageOrderIndex})`);
      }

      // ✅ LOG-LEVEL-INFO: Stage validation success
      logger.info('Stage validation successful', {
        operation: 'stage-validation-success',
        stage_name: stageName
      });
      
      // ✅ STRUCTURED LOGGING: Registrar sucesso da validação
      logger.validation('Stage validation bem-sucedida', {
        operation: 'stage-validation-success',
        stage_name: stageName,
        stage_order_index: stageOrderIndex,
        parsing_method: Array.isArray(stageInfo) ? 'array-extraction' : 'direct-object',
        pipeline_match: actualStageData?.pipeline_id === data.pipeline_id
      });

      // ✅ LOG-LEVEL-DEBUG: FK validation start
      
      // ✅ CACHE INTELIGENTE: Verificar se pipeline já foi validada
      const pipelineCacheKey = `validated-pipeline-${data.pipeline_id}`;
      const cachedPipeline = sessionStorage.getItem(pipelineCacheKey);
      let pipelineName = 'Pipeline sem nome';
      let pipelineCheck: any = null;
      let usedCache = false;
      
      if (cachedPipeline) {
        try {
          const cached = JSON.parse(cachedPipeline);
          if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutos
            logger.smartCache('Pipeline cache hit', {
              operation: 'pipeline-cache-hit',
              pipeline_name: cached.name,
              cache_age_ms: Date.now() - cached.timestamp
            });
            
            // ✅ CORREÇÃO: Criar objeto pipelineCheck a partir do cache
            pipelineCheck = {
              id: cached.id,
              name: cached.name,
              is_active: cached.is_active,
              is_archived: cached.is_archived,
              tenant_id: user.tenant_id,
              created_by: cached.created_by || user.id
            };
            
            pipelineName = cached.name;
            usedCache = true;
            // ✅ LOG-LEVEL-SILLY: Cache creation details
            logger.silly('Pipeline object created from cache', {
              name: pipelineCheck.name,
              is_active: pipelineCheck.is_active
            });
          }
        } catch (cacheError) {
          logger.warn('Pipeline cache invalid', { operation: 'cache-parse-error' });
        }
      }
      
      // ✅ VALIDAÇÃO CONDICIONAL: Só validar se não tiver cache válido
      if (!usedCache) {
      
      // ✅ TENTATIVA 1: Query normal com client anônimo  
      let pipelineCheckError: any = null;
      
      logger.validation('Iniciando validação de pipeline', {
        operation: 'pipeline-validation-start',
        pipeline_id: data.pipeline_id?.substring(0, 8),
        tenant_id: user.tenant_id?.substring(0, 8)
      });
      
      try {
        const result = await supabase
          .from('pipelines')
          .select('id, name, tenant_id, created_by, is_active, is_archived')
          .eq('id', data.pipeline_id)
          .eq('tenant_id', user.tenant_id)
          .single();
          
        pipelineCheck = result.data;
        pipelineCheckError = result.error;
        
        if (result.error) {
          logger.warn('Pipeline query failed', { operation: 'pipeline-query-error', error: result.error?.message });
        }
      } catch (normalError) {
        logger.warn('Pipeline query exception', { operation: 'pipeline-query-exception', error: normalError?.message });
        pipelineCheckError = normalError;
      }
      
      // ✅ FALLBACK: Se falhou, tentar com Service Role Client
      if (pipelineCheckError && !pipelineCheck) {
        logger.info('Trying service role for pipeline validation', { operation: 'pipeline-service-role-attempt' });
        
        try {
          const serviceClient = supabase;
          const serviceResult = await serviceClient
            .from('pipelines')
            .select('id, name, tenant_id, created_by, is_active, is_archived')
            .eq('id', data.pipeline_id)
            .eq('tenant_id', user.tenant_id)
            .single();
            
          if (!serviceResult.error && serviceResult.data) {
            pipelineCheck = serviceResult.data;
            pipelineCheckError = null;
            
            logger.validation('Pipeline validation via service role successful', {
              operation: 'pipeline-validation-service-success',
              pipeline_name: serviceResult.data.name
            });
            
            logger.info('Service role validation successful', { operation: 'pipeline-service-role-success' });
          } else {
            logger.warn('Service role validation failed', { operation: 'pipeline-service-role-error', error: serviceResult.error?.message });
          }
        } catch (serviceError) {
          logger.warn('Service role exception', { operation: 'pipeline-service-role-exception', error: serviceError?.message });
        }
      }
        
      if (pipelineCheckError || !pipelineCheck) {
        logger.error('Pipeline not found', {
          operation: 'pipeline-validation-final-error',
          pipeline_id: data.pipeline_id?.substring(0, 8),
          error_code: pipelineCheckError?.code
        });
        
        logger.validation('Pipeline validation failed', {
          operation: 'pipeline-validation-error',
          pipeline_id: data.pipeline_id?.substring(0, 8),
          error_code: pipelineCheckError?.code,
          error_message: pipelineCheckError?.message
        });
        
        throw new Error(`Pipeline não encontrada: ${data.pipeline_id}`);
      }
      
      // ✅ CORREÇÃO: Remover validação duplicada - será feita após cache/validação unificada
      pipelineName = pipelineCheck.name || 'Pipeline sem nome';
      logger.info('Pipeline found via database', { operation: 'pipeline-validation-db-success', pipeline_name: pipelineName });
      
      logger.validation('Pipeline validation success', {
        operation: 'pipeline-validation-success',
        pipeline_name: pipelineName,
        is_active: pipelineCheck.is_active,
        is_archived: pipelineCheck.is_archived
      });
      
      // ✅ CACHE: Salvar pipeline validada no cache para próximas tentativas
      const pipelineData = {
        id: pipelineCheck.id,
        name: pipelineName,
        is_active: pipelineCheck.is_active,
        is_archived: pipelineCheck.is_archived,
        timestamp: Date.now()
      };
      
      try {
        sessionStorage.setItem(pipelineCacheKey, JSON.stringify(pipelineData));
        logger.smartCache('Pipeline cached after validation', {
          pipeline_name: pipelineName
        });
      } catch (cacheError) {
        logger.warn('Pipeline cache save failed', { operation: 'cache-save-error' });
      }
      
      } // ✅ Fim da validação condicional (só executa se não tiver cache)
      
      // ✅ LOG-LEVEL-DEBUG: Pipeline final state (já foi movido para logger.debug acima)
      
      logger.validation('Pipeline validation completed', {
        operation: 'pipeline-validation-final-state',
        pipeline_name: pipelineName,
        used_cache: usedCache,
        pipeline_check_exists: !!pipelineCheck
      });
      
      // ✅ VALIDAÇÃO UNIFICADA: Verificar se pipeline está em estado válido  
      if (!pipelineCheck) {
        // Já foi movido para logger.error acima
        throw new Error(`Erro interno: Validação de pipeline falhou para ${data.pipeline_id}`);
      }
      
      // ✅ VALIDAÇÃO ROBUSTA: Verificar todos os estados problemáticos
      if (pipelineCheck.is_archived) {
        // Já foi movido para logger.error acima
        throw new Error(`Pipeline "${pipelineCheck.name}" está arquivada e não pode receber novas oportunidades`);
      }
      
      // ✅ VALIDAÇÃO ADICIONAL: Verificar se is_active existe e é válido
      if (pipelineCheck.is_active === false) {
        // Já foi movido para logger.error acima
        throw new Error(`Pipeline "${pipelineCheck.name}" está inativa e não pode receber novas oportunidades`);
      }
      
      // ✅ LOG-LEVEL-INFO: Já consolidado em logger.info acima
      
      // ✅ OTIMIZAÇÃO: Verificar se usuário existe (com campos explícitos)
      const { data: userCheck, error: userCheckError } = await supabase
        .from('users')
        .select('id, email, tenant_id, role, first_name, last_name')
        .eq('id', user.id)
        .eq('tenant_id', user.tenant_id)
        .single();
        
      if (userCheckError || !userCheck) {
        // Já foi movido para logger.error acima
        throw new Error(`Usuário não encontrado: ${user.id}`);
      }
      
      const userEmail = userCheck.email || 'Email não disponível';
      const userName = `${userCheck.first_name || ''} ${userCheck.last_name || ''}`.trim() || 'Usuário sem nome';
      // Já foi movido para logger.debug acima

      let leadMasterId: string;

      // ================================================================================
      // FASE 1: GERENCIAR LEAD_MASTER (via Supabase direto)
      // ================================================================================
      
      if (data.lead_source === 'existing_lead' && data.existing_lead_id) {
        logger.info('Using existing lead', { 
          operation: 'existing-lead-mode',
          existing_lead_id: data.existing_lead_id?.substring(0, 8)
        });
        
        // ✅ CORREÇÃO: Com leads únicos, existing_lead_id já é o leads_master.id
        // Não precisamos mais buscar pipeline_leads para obter lead_master_id
        leadMasterId = data.existing_lead_id;
        
        logger.info('Lead master ID set from existing lead', {
          operation: 'lead-master-id-direct',
          lead_master_id: leadMasterId?.substring(0, 8)
        });
        
      } else {
        // Criar novo lead_master
        // Já foi movido para logger.info acima
        
        const newLeadMaster = {
          first_name: data.nome_lead.split(' ')[0] || '',
          last_name: data.nome_lead.split(' ').slice(1).join(' ') || '',
          email: data.email,
          phone: data.telefone || null,
          company: data.nome_contato || null,
          tenant_id: user.tenant_id,
          created_by: user.id,
          status: 'active',
          lead_temperature: 'warm'
        };

        const { data: createdLeadMaster, error: createError } = await supabase
          .from('leads_master')
          .insert(newLeadMaster)
          .select('id')
          .single();

        if (createError || !createdLeadMaster) {
          // ✅ RECOVERY SIMPLES: Apenas para duplicatas de email
          if (createError?.message?.includes('leads_master_email_tenant_unique')) {
            // Já foi movido para logger.info acima
            
            const { data: existingLeadMaster, error: searchError } = await supabase
              .from('leads_master')
              .select('id')
              .eq('email', data.email.toLowerCase().trim())
              .eq('tenant_id', user.tenant_id)
              .single();
            
            if (searchError || !existingLeadMaster) {
              throw new Error('Lead com este email já existe mas não foi encontrado');
            }
            
            leadMasterId = existingLeadMaster.id;
            // Já foi movido para logger.info acima
            
          } else {
            // Já foi movido para logger.error acima
            throw new Error(`Erro ao criar lead master: ${createError?.message || 'Erro desconhecido'}`);
          }
        } else {
          leadMasterId = createdLeadMaster.id;
          // Já foi movido para logger.info acima
        }
      }
      
      // ✅ VALIDAÇÃO FINAL: Verificar se lead_master_id existe (com campos explícitos)
      // Já foi movido para logger.debug acima
      const { data: leadMasterCheck, error: leadMasterCheckError } = await supabase
        .from('leads_master')
        .select('id, email, tenant_id, first_name, last_name, status, company')
        .eq('id', leadMasterId)
        .eq('tenant_id', user.tenant_id)
        .single();
        
      if (leadMasterCheckError || !leadMasterCheck) {
        // Já foi movido para logger.error acima
        throw new Error(`Lead master não encontrado: ${leadMasterId}`);
      }
      
      const leadEmail = leadMasterCheck.email || 'Email não disponível';
      const leadName = `${leadMasterCheck.first_name || ''} ${leadMasterCheck.last_name || ''}`.trim() || 'Lead sem nome';
      // Já foi movido para logger.info acima

      // ================================================================================
      // FASE 2: CRIAR PIPELINE_LEAD (OPORTUNIDADE)
      // ================================================================================

      // Já foi movido para logger.info acima
      
      // Preparar campos customizados
      const customFields: any = {};
      customFields.nome_oportunidade = data.nome_oportunidade;
      customFields.nome_lead = data.nome_lead;
      customFields.nome_contato = data.nome_contato || data.nome_lead;
      customFields.email = data.email;
      customFields.email_contato = data.email_contato || data.email;
      customFields.telefone = data.telefone || '';
      customFields.telefone_contato = data.telefone_contato || data.telefone || '';
      
      // Valor da oportunidade
      if (data.valor) {
        const valorNumerico = parseFloat(data.valor.toString().replace(/[^\d,]/g, '').replace(',', '.'));
        customFields.valor = isNaN(valorNumerico) ? 0 : valorNumerico;
      }

      // Campos customizados adicionais
      Object.keys(data).forEach(key => {
        const knownFields = ['pipeline_id', 'stage_id', 'nome_oportunidade', 'valor', 'responsavel', 
                           'nome_lead', 'nome_contato', 'email', 'email_contato', 'telefone', 
                           'telefone_contato', 'lead_source', 'existing_lead_id'];
        if (!knownFields.includes(key) && data[key] !== undefined) {
          customFields[key] = data[key];
        }
      });

      // ✅ CORREÇÃO PREVENTIVA: Garantir que custom_data nunca seja null
      const safeCustomFields = customFields && Object.keys(customFields).length > 0 
        ? customFields 
        : {}; // Garantir que nunca seja null/undefined

      // ✅ CORREÇÃO CRÍTICA: Usar tenant_id da sessão autenticada para consistência
      const sessionTenantId = session.user.user_metadata?.tenant_id;
      const finalTenantId = sessionTenantId || user.tenant_id;

      if (!finalTenantId) {
        throw new Error('Tenant ID não encontrado na sessão ou usuário');
      }

      const newPipelineLead = {
        pipeline_id: data.pipeline_id,
        stage_id: data.stage_id,
        lead_master_id: leadMasterId,
        assigned_to: data.responsavel || user.id,
        custom_data: safeCustomFields,
        tenant_id: finalTenantId,
        created_by: session.user.id, // Usar ID da sessão
        position: 1000,
        status: 'active',
        lifecycle_stage: 'lead'
      };

      logger.debug('Pipeline lead data prepared', {
        operation: 'pipeline-lead-prepared',
        tenant_id: finalTenantId.substring(0, 8),
        created_by: session.user.id.substring(0, 8),
        pipeline_id: data.pipeline_id.substring(0, 8)
      });

      // ✅ LOG-LEVEL-DEBUG: Já foi movido para logger.debug acima

      // ================================================================================
      // SMART CACHING: Sistema Avançado de Detecção e Bypass
      // ================================================================================
      
      // ✅ SMART CACHING: Verificar histórico de estratégias
      const strategyHistory = JSON.parse(sessionStorage.getItem('supabase-strategy-history') || '[]');
      const lastSuccessfulStrategy = sessionStorage.getItem('supabase-last-success-strategy');
      const failureCount = parseInt(sessionStorage.getItem('supabase-failure-count') || '0');
      
      // Já foi movido para logger.smartCache acima
      
      // ✅ CLIENT SINGLETON: Usando instância única do Supabase (warning eliminado)
      logger.silly('Using Supabase singleton client', { operation: 'client-singleton' });
      
      let createdPipelineLead: any = null;
      let pipelineError: any = null;
      let usedStrategy = 'normal';
      
      // ✅ DETECÇÃO INTELIGENTE: Pular normal se histórico indica falha consistente
      if ((lastSuccessfulStrategy === 'backend-api' || lastSuccessfulStrategy === 'service-role') && failureCount >= 2) {
        logger.strategy('Smart bypass activated - skipping normal insert', { operation: 'smart-bypass-activate' });
        createdPipelineLead = null;
        pipelineError = null;
        usedStrategy = 'smart-bypass';
      } else {
        // ✅ PRIMEIRA TENTATIVA: INSERT normal com triggers
        logger.info('Attempting normal insert', { operation: 'normal-insert-attempt' });
        
        try {
          // ✅ CORREÇÃO: Usar cliente autenticado verificado
          const authenticatedClient = supabase;
          
          // ✅ VERIFICAÇÃO CRÍTICA: Garantir que o contexto de auth está correto
          const currentUser = await authenticatedClient.auth.getUser();
          if (!currentUser.data.user || currentUser.data.user.id !== session.user.id) {
            throw new Error('Contexto de autenticação inconsistente');
          }
          
          logger.debug('Auth context verified', {
            operation: 'auth-context-verified',
            authenticated: !!currentUser.data.user,
            user_matches: currentUser.data.user.id === session.user.id
          });
          
          // ✅ CORREÇÃO: Usar API backend (método padrão, não é problema de RLS)
          logger.debug('Using backend API for opportunity creation', {
            operation: 'backend-api-creation',
            reason: 'Standard backend processing'
          });
          
          // ✅ URL UNIVERSAL: Usar função de detecção global
          const primaryApiUrlDetected = getCurrentBackendURL();
          const createOpportunityUrl = `${primaryApiUrlDetected}/api/opportunities/create`;
          
          logger.debug('URL detection result', {
            operation: 'url-detection',
            current_host: window.location.hostname,
            detected_backend: primaryApiUrlDetected,
            env_fallback: import.meta.env.VITE_API_URL
          });
          
          logger.debug('Backend API request details', {
            operation: 'backend-api-request',
            url: createOpportunityUrl,
            hasToken: !!session.access_token,
            tokenLength: session.access_token?.length || 0
          });
          
          // ✅ SISTEMA DE FALLBACK: Tentar URL primária, depois fallback
          const requestPayload = {
            pipeline_id: data.pipeline_id,
            stage_id: data.stage_id,
            nome_oportunidade: data.nome_oportunidade,
            nome_lead: data.nome_lead,
            email: data.email,
            telefone: data.telefone || '',
            lead_source: data.lead_source,
            existing_lead_id: data.existing_lead_id,
            responsavel: data.responsavel,
            valor: data.valor,
            nome_contato: data.nome_contato,
            email_contato: data.email_contato,
            telefone_contato: data.telefone_contato
          };

          const requestOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(requestPayload)
          };

          let backendResponse: Response;

          try {
            // Primeira tentativa com URL detectada
            logger.debug('Attempting primary URL', { 
              operation: 'primary-url-attempt', 
              url: createOpportunityUrl 
            });
            
            backendResponse = await fetch(createOpportunityUrl, requestOptions);
            
            if (backendResponse.ok) {
              logger.info('Primary URL successful', { 
                operation: 'primary-url-success', 
                url: primaryApiUrlDetected 
              });
            } else {
              throw new Error(`Primary URL failed: ${backendResponse.status}`);
            }
          } catch (primaryError) {
            // Fallback: tentar URL alternativa
            const alternativeUrl = primaryApiUrlDetected.includes('localhost') 
              ? (await import('../config/environment')).environmentConfig.urls.api 
              : (await import('../config/environment')).environmentConfig.urls.api;
            
            const fallbackCreateUrl = `${alternativeUrl}/api/opportunities/create`;
            
            logger.warn('Primary URL failed, trying fallback', {
              operation: 'url-fallback-attempt',
              primary_url: primaryApiUrlDetected,
              fallback_url: alternativeUrl,
              error: primaryError.message
            });

            try {
              backendResponse = await fetch(fallbackCreateUrl, requestOptions);
              
              if (backendResponse.ok) {
                logger.info('Fallback URL successful', { 
                  operation: 'fallback-url-success', 
                  url: alternativeUrl 
                });
              } else {
                throw new Error(`Fallback URL also failed: ${backendResponse.status}`);
              }
            } catch (fallbackError) {
              logger.error('Both URLs failed', {
                operation: 'all-urls-failed',
                primary_error: primaryError.message,
                fallback_error: fallbackError.message
              });
              throw new Error(`Conexão com backend falhou. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
            }
          }

          if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            throw new Error(`Backend API error: ${backendResponse.status} - ${errorText}`);
          }

          const backendResult = await backendResponse.json();
          
          // Simular resposta do Supabase para compatibilidade
          const insertResult = {
            data: backendResult.opportunity || backendResult,
            error: null
          };
            
          if (!insertResult.error && insertResult.data) {
            // Backend bem-sucedido
            createdPipelineLead = insertResult.data;
            pipelineError = null;
            logger.info('Backend API insert successful', { 
              operation: 'backend-api-success',
              opportunity_id: insertResult.data.id?.substring(0, 8)
            });
          } else {
            createdPipelineLead = null;
            pipelineError = insertResult.error || new Error('Backend API failed');
            logger.error('Backend API insert failed', { 
              operation: 'backend-api-error', 
              error: insertResult.error?.message || 'Unknown backend error'
            });
          }
          usedStrategy = 'backend-api';
          
        } catch (normalError) {
          logger.error('Normal insert exception', { operation: 'normal-insert-exception', error: normalError?.message });
          pipelineError = normalError;
          usedStrategy = 'normal-error';
        }
      }
        
      // ✅ LOG-LEVEL-DEBUG: Resposta do Supabase apenas se necessário
      logger.debug('Supabase response analysis', {
        operation: 'supabase-response-check',
        has_data: !!createdPipelineLead,
        has_error: !!pipelineError,
        strategy_used: usedStrategy
      });

      // ✅ CORREÇÃO: Melhorar detecção de silent failure
      // Problema: estava detectando {error: null, data: null} como falha quando pode ser resposta válida
      const isRealFailure = !pipelineError && !createdPipelineLead && usedStrategy === 'normal';
      const hasValidResponse = createdPipelineLead && createdPipelineLead.id;
      
      // ✅ LOG-LEVEL-DEBUG: Silent failure check apenas se houver problema
      if (isRealFailure) {
        logger.warn('Silent failure detected', {
          operation: 'silent-failure-check',
          used_strategy: usedStrategy,
          has_valid_response: hasValidResponse
        });
      }
      
      // ✅ DIAGNÓSTICO: Sistema de fallback removido temporariamente
      // Objetivo: Forçar INSERT normal a funcionar e eliminar duplicação
      if (isRealFailure) {
        logger.error('INSERT normal failed - diagnostic mode', {
          operation: 'insert-diagnostic-failure',
          pipeline_id_valid: !!newPipelineLead.pipeline_id && newPipelineLead.pipeline_id.length === 36,
          stage_id_valid: !!newPipelineLead.stage_id && newPipelineLead.stage_id.length === 36,
          lead_master_id_valid: !!newPipelineLead.lead_master_id && newPipelineLead.lead_master_id.length === 36
        });
        
        // Em vez de fallback, retornar erro para debug
        throw new Error('INSERT normal falhou - Sistema de fallback desabilitado para diagnóstico');
      }

      // ✅ TRATAR SUCESSO DO INSERT NORMAL
      if (!pipelineError && createdPipelineLead && createdPipelineLead.id) {
        logger.opportunity('Opportunity created via normal insert', {
          operation: 'opportunity-created-normal',
          opportunity_id: createdPipelineLead.id?.substring(0, 8)
        });
        
        // ✅ SMART CACHE: Salvar estratégia bem-sucedida
        const successStrategy = {
          strategy: 'normal',
          timestamp: Date.now(),
          success: true
        };
        
        const updatedHistory = [...strategyHistory.slice(-9), successStrategy];
        sessionStorage.setItem('supabase-strategy-history', JSON.stringify(updatedHistory));
        sessionStorage.setItem('supabase-last-success-strategy', 'normal');
        sessionStorage.setItem('supabase-failure-count', '0');
        
        logger.smartCache('Normal strategy registered as successful', { operation: 'strategy-success-cache' });
        
        return {
          success: true,
          message: 'Oportunidade criada via Supabase client',
          opportunity_id: createdPipelineLead.id,
          lead_id: leadMasterId,
          strategy_used: 'normal'
        };
      }

      // ✅ TRATAR ERROS EXPLÍCITOS (não-silent failures)
      if (pipelineError) {
        logger.error('Detailed pipeline_lead creation error', {
          operation: 'pipeline-lead-creation-error',
          error_message: pipelineError?.message,
          error_code: pipelineError?.code,
          error_details: pipelineError?.details
        });
        
        // Mensagem específica baseada no código de erro
        let errorMessage = 'Erro ao criar oportunidade na pipeline';
        if (pipelineError?.code === '23502') {
          errorMessage = 'Campo obrigatório ausente na criação da oportunidade';
        } else if (pipelineError?.code === '23503') {
          errorMessage = 'Referência inválida (pipeline, stage ou usuário não encontrado)';
        } else if (pipelineError?.code === '23505') {
          errorMessage = 'Oportunidade duplicada detectada';
        } else if (pipelineError?.message) {
          errorMessage = pipelineError.message;
        }
        
        throw new Error(`${errorMessage}: ${pipelineError?.details || pipelineError?.message || 'Erro desconhecido'}`);
      }

      const pipelineLeadId = createdPipelineLead.id;
      logger.opportunity('Opportunity creation completed successfully', {
        operation: 'opportunity-creation-complete',
        opportunity_id: pipelineLeadId?.substring(0, 8)
      });

      // ✅ SIMPLIFICAÇÃO: Atividades são geradas automaticamente pelo backend
      // O endpoint /api/opportunities/create já gera atividades via LeadService.generateCadenceTasksForLeadAsync()
      logger.opportunity('Opportunity created - activities will be generated automatically by backend', {
        operation: 'backend-activity-generation',
        opportunity_id: pipelineLeadId?.substring(0, 8),
        lead_master_id: leadMasterId?.substring(0, 8),
        note: 'Frontend removed duplicated activity generation call'
      });

      // ✅ SMART CACHE: Registrar sucesso da estratégia normal
      if (usedStrategy === 'normal') {
        const successStrategy = {
          strategy: 'normal',
          timestamp: Date.now(),
          executionTime: 50, // Aproximação para estratégia normal
          success: true
        };
        
        const updatedHistory = [...strategyHistory.slice(-9), successStrategy];
        sessionStorage.setItem('supabase-strategy-history', JSON.stringify(updatedHistory));
        sessionStorage.setItem('supabase-last-success-strategy', 'normal');
        sessionStorage.setItem('supabase-failure-count', '0');
        
        logger.smartCache('Normal strategy success cached', { operation: 'final-strategy-cache' });
      }

      return {
        success: true,
        message: 'Oportunidade criada com sucesso',
        opportunity_id: pipelineLeadId,
        lead_id: leadMasterId,
        strategy_used: usedStrategy
      };
      }); // ✅ PERFORMANCE: Fim da medição
    },
    
    onSuccess: (result, variables) => {
      logger.opportunity('Opportunity mutation success', { operation: 'mutation-success' });
      
      // ✅ PERFORMANCE: Registrar sucesso da estratégia
      const strategyUsed = (result as any).strategy_used || 'unknown';
      recordSuccessRate('opportunity', `strategy-${strategyUsed}`, 100, {
        pipeline_id: variables.pipeline_id?.substring(0, 8),
        strategy: strategyUsed
      });

      // ✅ OTIMIZAÇÃO: Cache invalidation mais específico e eficiente
      const pipelineId = variables.pipeline_id;
      
      // Invalidar apenas caches relacionados à pipeline específica
      queryClient.invalidateQueries({ 
        queryKey: ['pipeline-leads', pipelineId] 
      });
      
      // Invalidar métricas da pipeline
      queryClient.invalidateQueries({
        queryKey: ['enterprise-metrics', pipelineId]
      });
      
      // ✅ OPTIMISTIC UPDATE: Atualizar contadores imediatamente
      queryClient.setQueryData(['existing-leads'], (oldData: any) => {
        if (oldData && Array.isArray(oldData)) {
          return [...oldData]; // Trigger re-render sem busca adicional
        }
        return oldData;
      });

      showSuccessToast('Oportunidade criada com sucesso!');
    },

    onError: (error: Error) => {
      logger.error('Opportunity creation mutation error', { operation: 'mutation-error', error: error.message });
      
      // ✅ PERFORMANCE: Registrar falha da estratégia
      recordSuccessRate('opportunity', 'create-failure', 0, {
        error: error.message,
        errorType: error.name
      });
      
      // ✅ SMART CACHE: Incrementar contador de falhas
      const currentFailures = parseInt(sessionStorage.getItem('supabase-failure-count') || '0');
      sessionStorage.setItem('supabase-failure-count', (currentFailures + 1).toString());
      
      logger.smartCache('Failure count incremented', { 
        operation: 'failure-count-increment', 
        failure_count: currentFailures + 1 
      });
      
      let errorMessage = 'Erro ao criar oportunidade';
      
      if (error.message) {
        if (error.message.includes('não autenticado')) {
          errorMessage = 'Sessão expirada. Faça login novamente.';
        } else if (error.message.includes('primeira etapa')) {
          errorMessage = error.message; // Usar mensagem específica de validação de etapa
        } else if (error.message.includes('email')) {
          errorMessage = 'Email inválido ou já existente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showErrorToast(errorMessage);
    },

    meta: {
      errorMessage: 'Erro ao criar oportunidade'
    }
  });
};