import express from 'express';
import { CadenceService } from '../services/cadenceService';
import { authenticateToken } from '../middleware/auth';

// ✅ CORREÇÃO: Importar logger estruturado e Supabase client
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';

const router = express.Router();

/**
 * ✅ NOVO: POST /api/cadence/save-stage
 * Salvar configuração de cadência para uma etapa específica (não afeta outras)
 */
router.post('/save-stage', authenticateToken, async (req, res) => {
  try {
    const {
      pipeline_id,
      stage_name,
      stage_order,
      tasks,
      is_active,
      tenant_id,
      created_by
    } = req.body;

    // Validação básica
    if (!pipeline_id || !stage_name || !tasks || !tenant_id) {
      return res.status(400).json({
        error: 'Campos obrigatórios: pipeline_id, stage_name, tasks, tenant_id'
      });
    }

    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        error: 'tasks deve ser um array'
      });
    }

    const stageConfig = {
      pipeline_id,
      stage_name,
      stage_order: stage_order || 0,
      tasks,
      is_active: is_active !== false,
      tenant_id
    };

    const result = await CadenceService.saveCadenceConfigForStage(
      pipeline_id,
      stageConfig,
      tenant_id,
      created_by || 'system'
    );

    if (result.success) {
      res.json({
        message: result.message,
        config: result.config
      });
    } else {
      res.status(500).json({
        error: result.message
      });
    }

  } catch (error: any) {
    console.error('Erro na rota /cadence/save-stage:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * ⚠️ DEPRECATED: POST /api/cadence/save
 * Salvar configuração de cadência para uma pipeline (método antigo)
 */
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const {
      pipeline_id,
      cadence_configs,
      tenant_id,
      created_by
    } = req.body;

    // Validação básica
    if (!pipeline_id || !cadence_configs || !tenant_id) {
      return res.status(400).json({
        error: 'Campos obrigatórios: pipeline_id, cadence_configs, tenant_id'
      });
    }

    if (!Array.isArray(cadence_configs)) {
      return res.status(400).json({
        error: 'cadence_configs deve ser um array'
      });
    }

    const result = await CadenceService.saveCadenceConfig(
      pipeline_id,
      cadence_configs,
      tenant_id,
      created_by || 'system'
    );

    if (result.success) {
      res.json({
        message: result.message,
        configs: result.configs
      });
    } else {
      res.status(500).json({
        error: result.message
      });
    }

  } catch (error: any) {
    console.error('Erro na rota /cadence/save:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/cadence/generate-task-instances
 * Gerar task instances baseado nas configurações de cadência existentes
 * AIDEV-NOTE: Corrigido para tratar casos de auth inválida com validação robusta
 */
router.post('/generate-task-instances', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 [CadenceRoutes] POST /generate-task-instances iniciado');
    console.log('🚨 [CRITICAL-DEBUG] ROTA INICIADA - VERIFICAR SE ESTE LOG APARECE NO TERMINAL!');
    console.log('📋 [CadenceRoutes] Headers recebidos:', {
      authorization: req.headers.authorization ? 'Bearer ***' : 'AUSENTE',
      contentType: req.headers['content-type'],
      timestamp: new Date().toISOString()
    });
    console.log('📋 [CadenceRoutes] Body recebido:', JSON.stringify(req.body, null, 2));
    console.log('👤 [CadenceRoutes] User autenticado:', {
      hasUser: !!req.user,
      userId: req.user?.id?.substring(0, 8) || 'N/A',
      tenantId: req.user?.tenant_id?.substring(0, 8) || 'N/A',
      role: req.user?.role || 'N/A'
    });

    // ✅ NOVO LOG: Debug específico para investigar problema do badge
    console.log('🔍 [DEBUG-BADGE] Análise completa da requisição:', {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent']?.substring(0, 50),
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      timestamp: new Date().toISOString(),
      correlationId: `badge-debug-${Date.now()}`
    });

    const {
      pipeline_id,
      stage_id,
      lead_id,
      assigned_to
    } = req.body;

    console.log('🔍 [CadenceRoutes] Campos extraídos:', {
      pipeline_id: pipeline_id?.substring(0, 8) || 'AUSENTE',
      stage_id: stage_id?.substring(0, 8) || 'AUSENTE',
      lead_id: lead_id?.substring(0, 8) || 'AUSENTE',
      assigned_to: assigned_to?.substring(0, 8) || 'AUSENTE'
    });

    // Validação básica com logs detalhados e detecção de ID incorreto
    if (!pipeline_id || !stage_id || !lead_id) {
      console.error('❌ [CadenceRoutes] Validação básica falhou:', {
        pipeline_id_missing: !pipeline_id,
        stage_id_missing: !stage_id,
        lead_id_missing: !lead_id
      });
      return res.status(400).json({
        error: 'Campos obrigatórios: pipeline_id, stage_id, lead_id',
        received_fields: {
          pipeline_id: !!pipeline_id,
          stage_id: !!stage_id,
          lead_id: !!lead_id,
          assigned_to: !!assigned_to
        }
      });
    }

    // ✅ CORREÇÃO: Resolver para pipeline_lead_id (necessário para foreign key)
    let resolvedPipelineLeadId = lead_id;
    let leadMasterId = null;
    
    if (lead_id) {
      console.log('🔍 [CadenceRoutes] Resolvendo ID do lead para cadence_task_instances:', {
        provided_id: lead_id.substring(0, 8),
        step: 'ID_RESOLUTION_FOR_FOREIGN_KEY'
      });

      // Tentar primeiro como pipeline_lead_id (que é o que a FK espera)
      const { data: pipelineLeadCheck, error: pipelineError } = await supabase
        .from('pipeline_leads')
        .select('id, lead_master_id')
        .eq('id', lead_id)
        .eq('tenant_id', req.user.tenant_id)
        .single();

      if (pipelineLeadCheck) {
        // ✅ Já é pipeline_lead_id - usar diretamente
        resolvedPipelineLeadId = lead_id;
        leadMasterId = pipelineLeadCheck.lead_master_id;
        console.log('✅ [CadenceRoutes] ID fornecido é pipeline_lead_id - usar diretamente:', {
          pipeline_lead_id: lead_id.substring(0, 8),
          lead_master_id: leadMasterId?.substring(0, 8),
          resolution: 'DIRECT_PIPELINE_LEAD_ID'
        });
      } else {
        // Não é pipeline_lead_id - verificar se é lead_master_id
        const { data: leadMasterCheck, error: leadCheckError } = await supabase
          .from('leads_master')
          .select('id')
          .eq('id', lead_id)
          .eq('tenant_id', req.user.tenant_id)
          .single();

        if (leadMasterCheck) {
          // É lead_master_id - buscar o pipeline_lead_id correspondente
          const { data: pipelineForMaster, error: pipelineForMasterError } = await supabase
            .from('pipeline_leads')
            .select('id')
            .eq('lead_master_id', lead_id)
            .eq('pipeline_id', pipeline_id)
            .eq('tenant_id', req.user.tenant_id)
            .single();

          if (pipelineForMaster) {
            resolvedPipelineLeadId = pipelineForMaster.id;
            leadMasterId = lead_id;
            console.log('🔄 [CadenceRoutes] ID resolvido de lead_master_id para pipeline_lead_id:', {
              provided_lead_master_id: lead_id.substring(0, 8),
              resolved_pipeline_lead_id: resolvedPipelineLeadId.substring(0, 8),
              resolution: 'MASTER_TO_PIPELINE_LEAD'
            });
          } else {
            console.error('❌ [CadenceRoutes] lead_master_id válido mas sem pipeline_lead correspondente:', {
              lead_master_id: lead_id.substring(0, 8),
              pipeline_id: pipeline_id.substring(0, 8),
              error: pipelineForMasterError?.message
            });
            return res.status(404).json({
              error: 'Lead master válido mas não encontrado na pipeline especificada',
              lead_master_id: lead_id.substring(0, 8),
              pipeline_id: pipeline_id.substring(0, 8)
            });
          }
        } else {
          // Não encontrado em nenhuma tabela
          console.error('❌ [CadenceRoutes] ID não encontrado em pipeline_leads nem leads_master:', {
            provided_id: lead_id.substring(0, 8),
            tenant_id: req.user.tenant_id.substring(0, 8),
            pipeline_error: pipelineError?.message,
            lead_master_error: leadCheckError?.message
          });
          return res.status(404).json({
            error: 'Lead não encontrado',
            provided_id: lead_id.substring(0, 8),
            searched_in: ['pipeline_leads', 'leads_master'],
            tenant_id: req.user.tenant_id.substring(0, 8)
          });
        }
      }

      console.log('✅ [CadenceRoutes] Resolução de ID concluída para foreign key:', {
        original_id: lead_id.substring(0, 8),
        resolved_pipeline_lead_id: resolvedPipelineLeadId.substring(0, 8),
        lead_master_id: leadMasterId?.substring(0, 8) || 'N/A',
        validation: 'RESOLVED_FOR_FK_CONSTRAINT'
      });
    }

    // ✅ CORREÇÃO: Verificação robusta do usuário autenticado
    const correlationId = logger.generateCorrelationId();
    
    if (!req.user || !req.user.tenant_id || !req.user.id) {
      console.error('❌ [CadenceRoutes] Usuário não autenticado ou metadados incompletos:', {
        hasUser: !!req.user,
        hasTenantId: !!req.user?.tenant_id,
        hasUserId: !!req.user?.id,
        userObject: req.user ? 'presente' : 'ausente'
      });
      logger.error('Usuário não autenticado ou metadados incompletos', {
        correlationId,
        operation: 'generate_task_instances_auth_fail',
        hasUser: !!req.user,
        hasTenantId: !!req.user?.tenant_id,
        hasUserId: !!req.user?.id,
        userRole: req.user?.role
      });
      
      return res.status(401).json({
        error: 'Usuário não autenticado ou metadados incompletos',
        required_fields: ['user.id', 'user.tenant_id'],
        received: {
          hasUser: !!req.user,
          hasTenantId: !!req.user?.tenant_id,
          hasUserId: !!req.user?.id
        }
      });
    }

    const { tenant_id, id: user_id } = req.user;

    logger.api('Iniciando geração de task instances', {
      correlationId,
      tenantId: tenant_id,
      userId: user_id,
      operation: 'generate_task_instances',
      pipeline_id: pipeline_id.substring(0, 8),
      stage_id: stage_id.substring(0, 8),
      lead_id: lead_id.substring(0, 8),
      assigned_to: assigned_to?.substring(0, 8),
      userRole: req.user.role
    });

    // ✅ CORREÇÃO: Validação adicional de permissões por role
    if (req.user.role === 'member' && assigned_to && assigned_to !== user_id) {
      return res.status(403).json({
        error: 'Members só podem criar tasks para si mesmos',
        assigned_to_received: assigned_to?.substring(0, 8),
        user_id: user_id.substring(0, 8)
      });
    }

    // ✅ NOVO: Usar sistema acumulativo por padrão (padrão dos grandes CRMs)
    console.log('🚀 [DEBUG-BADGE] Iniciando generateCumulativeTaskInstances:', {
      original_lead_id: lead_id.substring(0, 8),
      resolved_pipeline_lead_id: resolvedPipelineLeadId.substring(0, 8),
      resolved_lead_master_id: leadMasterId?.substring(0, 8) || 'N/A',
      pipeline_id: pipeline_id.substring(0, 8),
      stage_id: stage_id.substring(0, 8),
      assigned_to: (assigned_to || user_id).substring(0, 8),
      tenant_id: tenant_id.substring(0, 8),
      timestamp: new Date().toISOString(),
      note: 'Usando pipeline_lead_id para garantir foreign key constraint'
    });

    console.log('🚨 [CRITICAL-DEBUG] CHAMANDO CadenceService.generateCumulativeTaskInstances AGORA!');

    const result = await CadenceService.generateCumulativeTaskInstances(
      resolvedPipelineLeadId, // ✅ CORREÇÃO: Usar pipeline_lead_id para satisfazer FK constraint
      pipeline_id,
      stage_id,
      assigned_to || user_id,
      tenant_id
    );

    console.log('🚨 [CRITICAL-DEBUG] CadenceService RETORNOU:', {
      success: result.success,
      message: result.message,
      tasks_created: result.tasks_created,
      timestamp: new Date().toISOString()
    });

    console.log('📊 [DEBUG-BADGE] Resultado de generateCumulativeTaskInstances:', {
      success: result.success,
      message: result.message,
      tasks_created: result.tasks_created,
      has_details: !!result.details,
      timestamp: new Date().toISOString()
    });

    if (result.success) {
      logger.info('Tasks criadas com sucesso', {
        correlationId,
        tenantId: tenant_id,
        operation: 'generate_task_instances_success',
        tasks_created: result.tasks_created,
        lead_id: lead_id.substring(0, 8)
      });

      res.json({
        success: true,
        message: result.message,
        data: {
          tasks_created: result.tasks_created,
          lead_id: lead_id,
          pipeline_id: pipeline_id,
          stage_id: stage_id,
          details: result.details
        }
      });
    } else {
      console.error('❌ [GENERATE-TASK-INSTANCES] Falha na criação:', {
        error: result.message,
        details: result.details
      });

      res.status(500).json({
        success: false,
        error: result.message,
        details: result.details
      });
    }

  } catch (error: any) {
    console.error('❌ [GENERATE-TASK-INSTANCES] Erro crítico na rota:', {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor',
      source: 'critical_error'
    });
  }
});

/**
 * GET /api/cadence/load/:pipeline_id
 * Carregar configurações de cadência usando RLS nativo com fallback robusto
 * AIDEV-NOTE: Corrigido para tratar incompatibilidades de RLS com raw_user_meta_data vs user_metadata
 */
router.get('/load/:pipeline_id', authenticateToken, async (req, res) => {
  try {
    const { pipeline_id } = req.params;
    
    if (!pipeline_id) {
      return res.status(400).json({
        error: 'Parâmetro obrigatório: pipeline_id'
      });
    }

    const userSupabase = (req as any).userSupabase;
    const userToken = (req as any).supabaseToken;

    const correlationId = logger.generateCorrelationId();
    logger.api('Iniciando carregamento de configurações de cadência', {
      correlationId,
      tenantId: req.user?.tenant_id,
      userId: req.user?.id,
      operation: 'load_cadence_config',
      pipeline_id: pipeline_id.substring(0, 8),
      hasUserSupabase: !!userSupabase,
      hasUserToken: !!userToken,
      hasAuthHeader: !!req.headers.authorization
    });

    // ✅ CORREÇÃO: Tentar primeiro com userSupabase, mas com debug detalhado
    if (userSupabase && userToken) {
      try {
        logger.debug('Tentando query com RLS', {
          correlationId,
          tenantId: req.user?.tenant_id,
          operation: 'rls_query_attempt'
        });
        
        // Usar cliente Supabase do usuário para respeitar RLS
        const { data: cadences, error } = await userSupabase
          .from('cadence_configs')
          .select('*')
          .eq('pipeline_id', pipeline_id)
          .eq('tenant_id', req.user.tenant_id) // ✅ Adicionado filtro explícito por tenant_id
          .order('stage_order');

        if (error) {
          logger.warn('Erro na query RLS - tentando fallback', {
            correlationId,
            tenantId: req.user?.tenant_id,
            operation: 'rls_query_error',
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          
          // Se erro RLS, tentar fallback para service role
          throw new Error(`RLS_ERROR: ${error.message}`);
        }

        logger.info('Query RLS bem-sucedida', {
          correlationId,
          tenantId: req.user?.tenant_id,
          operation: 'rls_query_success',
          pipeline_id: pipeline_id.substring(0, 8),
          configsCount: cadences?.length || 0,
          cadences: cadences?.map(c => ({ stage: c.stage_name, tasks: c.tasks?.length || 0 }))
        });

        return res.json({
          message: `${cadences?.length || 0} configurações encontradas (RLS)`,
          configs: cadences || [],
          source: 'rls'
        });

      } catch (rlsError: any) {
        logger.warn('Fallback para service role devido a erro RLS', {
          correlationId,
          tenantId: req.user?.tenant_id,
          operation: 'rls_to_service_fallback',
          error: rlsError.message
        });
        // Continua para fallback service role
      }
    }

    // ✅ FALLBACK: Usar service role quando RLS falha ou userSupabase não existe
    logger.info('Usando service role como fallback', {
      correlationId,
      tenantId: req.user?.tenant_id,
      operation: 'service_role_fallback'
    });
    
    const result = await CadenceService.loadCadenceConfigWithServiceRole(
      pipeline_id,
      req.user?.tenant_id || 'unknown',
      req.user?.id || 'unknown',
      'GET_endpoint_fallback_due_to_RLS_issue'
    );

    if (result.success) {
      console.log('✅ [CADENCE-LOAD] Fallback service role bem-sucedido:', {
        pipeline_id: pipeline_id.substring(0, 8),
        configsCount: result.configs?.length || 0
      });

      return res.json({
        message: `${result.configs?.length || 0} configurações encontradas (service role)`,
        configs: result.configs || [],
        source: 'service_role_fallback'
      });
    } else {
      console.error('❌ [CADENCE-LOAD] Fallback service role falhou:', result.message);
      return res.status(500).json({
        error: `Erro ao carregar cadências: ${result.message}`,
        source: 'service_role_fallback_failed'
      });
    }

  } catch (error: any) {
    console.error('❌ [CADENCE-LOAD] Erro crítico geral:', {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    
    res.status(500).json({
      error: error.message || 'Erro interno do servidor',
      source: 'critical_error'
    });
  }
});

/**
 * POST /api/cadence/load
 * Carregar configurações de cadência com fallback service_role
 * AIDEV-NOTE: Endpoint especial para casos de JWT inválido onde frontend precisa de fallback
 */
router.post('/load', async (req, res) => {
  try {
    const {
      pipeline_id,
      tenant_id,
      user_id,
      fallback_mode,
      reason
    } = req.body;

    console.log('🔄 [CADENCE-LOAD-FALLBACK] Iniciando carregamento com service_role:', {
      pipeline_id,
      tenant_id,
      user_id,
      fallback_mode,
      reason,
      timestamp: new Date().toISOString()
    });

    // Validação básica
    if (!pipeline_id || !tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: pipeline_id, tenant_id'
      });
    }

    // Usar service_role para carregar dados independente de JWT do frontend
    const result = await CadenceService.loadCadenceConfigWithServiceRole(
      pipeline_id,
      tenant_id,
      user_id,
      reason
    );

    if (result.success) {
      console.log('✅ [CADENCE-LOAD-FALLBACK] Sucesso no carregamento:', {
        pipeline_id,
        configsCount: result.configs?.length || 0,
        message: result.message
      });

      res.json({
        success: true,
        message: result.message,
        configs: result.configs || [],
        fallback_used: true,
        reason
      });
    } else {
      console.error('❌ [CADENCE-LOAD-FALLBACK] Erro no carregamento:', {
        pipeline_id,
        error: result.message
      });

      res.status(500).json({
        success: false,
        error: result.message,
        fallback_used: true
      });
    }

  } catch (error: any) {
    console.error('❌ [CADENCE-LOAD-FALLBACK] Erro crítico:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor',
      fallback_used: true
    });
  }
});

/**
 * ✅ NOVO: DELETE /api/cadence/config/:id
 * Deletar configuração de cadência específica por ID
 */
router.delete('/config/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.query;

    // ✅ NOVO: Log de validação inicial
    console.log('🔍 [DELETE /config/:id] Validação inicial:', {
      configId: id?.substring(0, 8),
      tenantIdQuery: (tenant_id as string)?.substring(0, 8),
      hasAuth: !!req.user,
      userTenantId: req.user?.tenant_id?.substring(0, 8),
      userRole: req.user?.role,
      userId: req.user?.id?.substring(0, 8),
      authHeader: !!req.headers.authorization
    });

    if (!id || !tenant_id) {
      console.log('❌ [DELETE /config/:id] Parâmetros ausentes:', {
        hasId: !!id,
        hasTenantId: !!tenant_id
      });
      
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: id, tenant_id'
      });
    }

    // ✅ NOVO: Validar que o usuário tem permissão para deletar (tenant_id)
    if (req.user?.tenant_id !== tenant_id) {
      console.log('❌ [DELETE /config/:id] Acesso negado - tenant_id mismatch:', {
        configId: id.substring(0, 8),
        userTenantId: req.user?.tenant_id?.substring(0, 8),
        requestTenantId: (tenant_id as string).substring(0, 8),
        userRole: req.user?.role
      });
      
      return res.status(403).json({
        success: false,
        error: 'Acesso negado: tenant_id não corresponde ao usuário autenticado'
      });
    }

    console.log('🗑️ [DELETE /config/:id] Iniciando exclusão:', {
      configId: id.substring(0, 8),
      tenantId: (tenant_id as string).substring(0, 8),
      userId: req.user?.id?.substring(0, 8),
      userRole: req.user?.role
    });

    const result = await CadenceService.deleteCadenceConfigById(
      id,
      tenant_id as string
    );

    if (result.success) {
      console.log('✅ [DELETE /config/:id] Configuração deletada com sucesso:', {
        configId: id.substring(0, 8),
        message: result.message
      });

      res.json({
        success: true,
        message: result.message
      });
    } else {
      // ✅ NOVO: Tolerância a falhas - se não existe, considerar como sucesso
      if (result.message.includes('não encontrada') || result.message.includes('not found')) {
        console.log('⚠️ [DELETE /config/:id] Configuração já foi deletada (404 tratado como sucesso):', {
          configId: id.substring(0, 8),
          message: result.message
        });

        res.json({
          success: true,
          message: `Configuração já foi removida anteriormente (${id.substring(0, 8)})`
        });
      } else {
        console.log('❌ [DELETE /config/:id] Falha real na exclusão:', {
          configId: id.substring(0, 8),
          error: result.message
        });

        res.status(400).json({
          success: false,
          error: result.message
        });
      }
    }

  } catch (error: any) {
    console.error('❌ [DELETE /config/:id] Erro crítico na rota:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * DELETE /api/cadence/delete/:pipeline_id
 * Deletar configurações de cadência de uma pipeline
 */
router.delete('/delete/:pipeline_id', authenticateToken, async (req, res) => {
  try {
    const { pipeline_id } = req.params;
    const { tenant_id } = req.query;

    if (!pipeline_id || !tenant_id) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: pipeline_id, tenant_id'
      });
    }

    const result = await CadenceService.deleteCadenceConfig(
      pipeline_id,
      tenant_id as string
    );

    if (result.success) {
      res.json({
        message: result.message
      });
    } else {
      res.status(500).json({
        error: result.message
      });
    }

  } catch (error: any) {
    console.error('Erro na rota /cadence/delete:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/cadence/stage/:pipeline_id/:stage_name
 * Buscar configuração de cadência para uma etapa específica
 */
router.get('/stage/:pipeline_id/:stage_name', authenticateToken, async (req, res) => {
  try {
    const { pipeline_id, stage_name } = req.params;
    const { tenant_id } = req.query;

    if (!pipeline_id || !stage_name || !tenant_id) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: pipeline_id, stage_name, tenant_id'
      });
    }

    const result = await CadenceService.getCadenceConfigForStage(
      pipeline_id,
      decodeURIComponent(stage_name),
      tenant_id as string
    );

    if (result.success) {
      res.json({
        config: result.config,
        tasks: result.tasks || []
      });
    } else {
      res.status(404).json({
        error: 'Configuração de cadência não encontrada para esta etapa'
      });
    }

  } catch (error: any) {
    console.error('Erro na rota /cadence/stage:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});


/**
 * POST /api/cadence/test
 * Endpoint para testar a funcionalidade
 */
router.post('/test', async (req, res) => {
  try {
    const testData = {
      pipeline_id: 'test-pipeline-id',
      cadence_configs: [
        {
          pipeline_id: 'test-pipeline-id',
          stage_name: 'Novo Lead',
          stage_order: 0,
          tasks: [
            {
              day_offset: 0,
              task_order: 1,
              channel: 'email' as const,
              action_type: 'mensagem' as const,
              task_title: 'E-mail de boas-vindas',
              task_description: 'Enviar e-mail de boas-vindas para o lead',
              template_content: 'Olá {{nome}}, bem-vindo!',
              is_active: true
            },
            {
              day_offset: 1,
              task_order: 1,
              channel: 'whatsapp' as const,
              action_type: 'mensagem' as const,
              task_title: 'WhatsApp follow-up',
              task_description: 'Fazer contato via WhatsApp',
              template_content: 'Oi {{nome}}, vamos conversar?',
              is_active: true
            }
          ],
          is_active: true,
          tenant_id: 'd7caffc1-c923-47c8-9301-ca9eeff1a243'
        }
      ],
      tenant_id: 'd7caffc1-c923-47c8-9301-ca9eeff1a243',
      created_by: 'test-user'
    };

    const result = await CadenceService.saveCadenceConfig(
      testData.pipeline_id,
      testData.cadence_configs,
      testData.tenant_id,
      testData.created_by
    );

    res.json({
      message: 'Teste de cadência executado',
      result,
      test_data: testData
    });

  } catch (error: any) {
    console.error('Erro no teste de cadência:', error);
    res.status(500).json({
      error: error.message || 'Erro no teste'
    });
  }
});

export default router; 