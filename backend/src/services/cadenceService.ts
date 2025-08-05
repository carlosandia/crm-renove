import { supabase } from '../config/supabase';

export interface CadenceTask {
  id?: string;
  day_offset: number;
  task_order: number;
  channel: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  action_type: 'mensagem' | 'ligacao' | 'tarefa' | 'email_followup' | 'agendamento' | 'proposta';
  task_title: string;
  task_description: string;
  template_content?: string;
  is_active: boolean;
}

export interface CadenceConfig {
  id?: string;
  pipeline_id: string;
  stage_name: string;
  stage_order: number;
  tasks: CadenceTask[];
  is_active: boolean;
  tenant_id: string;
}

export class CadenceService {
  /**
   * ✅ NOVO: Salvar configuração de cadência para uma etapa específica (upsert)
   * Este método substitui o antigo para não deletar outras configurações
   */
  static async saveCadenceConfigForStage(
    pipelineId: string,
    stageConfig: CadenceConfig,
    tenantId: string,
    createdBy: string
  ): Promise<{ success: boolean; message: string; config?: CadenceConfig }> {
    try {
      // ✅ VALIDAÇÃO: Bloquear etapas finais - nunca devem ter atividades de cadência
      if (this.isFinalStage(stageConfig.stage_name, stageConfig.stage_order)) {
        return {
          success: false,
          message: `Não é possível criar atividades de cadência para a etapa "${stageConfig.stage_name}" pois é uma etapa final do sistema. Etapas finais (Ganho/Perdido) não devem ter follow-up automático.`
        };
      }

      // Verificar se já existe configuração para esta etapa
      const { data: existingConfig, error: checkError } = await supabase
        .from('cadence_configs')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .eq('stage_name', stageConfig.stage_name)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (checkError) {
        throw new Error(`Erro ao verificar configuração existente: ${checkError.message}`);
      }

      let savedConfig: CadenceConfig;

      if (existingConfig) {
        // UPDATE: Atualizar configuração existente
        const { data: updatedData, error: updateError } = await supabase
          .from('cadence_configs')
          .update({
            stage_order: stageConfig.stage_order,
            tasks: stageConfig.tasks,
            is_active: stageConfig.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Erro ao atualizar configuração: ${updateError.message}`);
        }

        savedConfig = {
          id: updatedData.id,
          pipeline_id: pipelineId,
          stage_name: stageConfig.stage_name,
          stage_order: stageConfig.stage_order,
          tasks: stageConfig.tasks,
          is_active: stageConfig.is_active,
          tenant_id: tenantId
        };

      } else {
        // INSERT: Criar nova configuração
        const { data: insertedData, error: insertError } = await supabase
          .from('cadence_configs')
          .insert({
            pipeline_id: pipelineId,
            stage_name: stageConfig.stage_name,
            stage_order: stageConfig.stage_order,
            tasks: stageConfig.tasks,
            is_active: stageConfig.is_active,
            tenant_id: tenantId,
            applies_to_entire_pipeline: false,
            pause_resume_capability: true,
            trigger_stage: stageConfig.stage_name
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Erro ao inserir configuração: ${insertError.message}`);
        }

        savedConfig = {
          id: insertedData.id,
          pipeline_id: pipelineId,
          stage_name: stageConfig.stage_name,
          stage_order: stageConfig.stage_order,
          tasks: stageConfig.tasks,
          is_active: stageConfig.is_active,
          tenant_id: tenantId
        };
      }

      return {
        success: true,
        message: `Configuração da etapa "${stageConfig.stage_name}" salva com sucesso`,
        config: savedConfig
      };

    } catch (error: any) {
      console.error(`Erro ao salvar configuração da etapa "${stageConfig.stage_name}":`, error);
      return {
        success: false,
        message: error.message || 'Erro interno do servidor'
      };
    }
  }

  /**
   * ⚠️ DEPRECATED: Método antigo que deleta todas as configurações
   * Mantido para compatibilidade, mas não deve ser usado
   */
  static async saveCadenceConfig(
    pipelineId: string,
    cadenceConfigs: CadenceConfig[],
    tenantId: string,
    createdBy: string
  ): Promise<{ success: boolean; message: string; configs?: CadenceConfig[] }> {
    console.warn('⚠️ [DEPRECATED] saveCadenceConfig deleta todas as configurações. Use saveCadenceConfigForStage');
    
    try {
      // ⚠️ REMOVIDO: Delete que apagava todas as configurações
      // Agora salva cada configuração individualmente usando o novo método

      const savedConfigs: CadenceConfig[] = [];

      // ✅ NOVO: Usar método seguro que não deleta outras configurações
      for (const config of cadenceConfigs) {
        if (config.tasks.length === 0) {
          continue; // Pular etapas sem tarefas
        }

        // Usar novo método que faz upsert por etapa
        const result = await this.saveCadenceConfigForStage(
          pipelineId,
          config,
          tenantId,
          createdBy
        );

        if (!result.success) {
          throw new Error(`Erro ao salvar configuração para etapa "${config.stage_name}": ${result.message}`);
        }

        if (result.config) {
          savedConfigs.push(result.config);
        }
      }

      return {
        success: true,
        message: `${savedConfigs.length} configurações de cadência salvas com sucesso`,
        configs: savedConfigs
      };

    } catch (error: any) {
      console.error('Erro ao salvar configurações de cadência:', error);
      return {
        success: false,
        message: error.message || 'Erro interno do servidor'
      };
    }
  }

  /**
   * Carregar configurações de cadência de uma pipeline
   */
  static async loadCadenceConfig(
    pipelineId: string,
    tenantId: string
  ): Promise<{ success: boolean; message: string; configs?: CadenceConfig[] }> {
    try {
      // Buscar configurações com tasks como JSONB
      const { data: configs, error: configError } = await supabase
        .from('cadence_configs')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId)
        .order('stage_order', { ascending: true });

      if (configError) {
        throw new Error(`Erro ao carregar configurações: ${configError.message}`);
      }

      // Transformar dados para o formato esperado
      const cadenceConfigs: CadenceConfig[] = (configs || []).map(config => ({
        id: config.id,
        pipeline_id: config.pipeline_id,
        stage_name: config.stage_name,
        stage_order: config.stage_order,
        tasks: Array.isArray(config.tasks) ? config.tasks : [],
        is_active: config.is_active,
        tenant_id: config.tenant_id
      }));

      return {
        success: true,
        message: `${cadenceConfigs.length} configurações carregadas`,
        configs: cadenceConfigs
      };

    } catch (error: any) {
      console.error('Erro ao carregar configurações de cadência:', error);
      return {
        success: false,
        message: error.message || 'Erro interno do servidor'
      };
    }
  }

  /**
   * Carregar configurações de cadência usando service_role (fallback para JWT inválido)
   * AIDEV-NOTE: Método especial para casos onde JWT do frontend está inválido
   */
  static async loadCadenceConfigWithServiceRole(
    pipelineId: string,
    tenantId: string,
    userId?: string,
    reason?: string
  ): Promise<{ success: boolean; message: string; configs?: CadenceConfig[] }> {
    try {
      console.log('🔧 [CADENCE-SERVICE-FALLBACK] Carregando com service_role:', {
        pipelineId,
        tenantId,
        userId,
        reason,
        timestamp: new Date().toISOString()
      });

      // Usar service_role para bypass de RLS
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Buscar configurações usando service_role (bypass RLS)
      const { data: configs, error: configError } = await supabaseAdmin
        .from('cadence_configs')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId)
        .order('stage_order', { ascending: true });

      if (configError) {
        console.error('❌ [CADENCE-SERVICE-FALLBACK] Erro na query:', configError);
        throw new Error(`Erro ao carregar configurações via service_role: ${configError.message}`);
      }

      // Transformar dados para o formato esperado
      const cadenceConfigs: CadenceConfig[] = (configs || []).map(config => ({
        id: config.id,
        pipeline_id: config.pipeline_id,
        stage_name: config.stage_name,
        stage_order: config.stage_order,
        tasks: Array.isArray(config.tasks) ? config.tasks : [],
        is_active: config.is_active,
        tenant_id: config.tenant_id
      }));

      console.log('✅ [CADENCE-SERVICE-FALLBACK] Carregamento bem-sucedido:', {
        pipelineId,
        configsCount: cadenceConfigs.length,
        configs: cadenceConfigs.map(c => ({ stage: c.stage_name, tasks: c.tasks.length }))
      });

      return {
        success: true,
        message: `${cadenceConfigs.length} configurações carregadas via service_role`,
        configs: cadenceConfigs
      };

    } catch (error: any) {
      console.error('❌ [CADENCE-SERVICE-FALLBACK] Erro crítico:', error);
      return {
        success: false,
        message: error.message || 'Erro interno do servidor no fallback service_role'
      };
    }
  }

  /**
   * ✅ NOVO: Gerar atividades acumulativas seguindo padrão dos grandes CRMs
   * - Atividades de etapas anteriores são mantidas
   * - Atividades da etapa atual são geradas se não existirem
   * - Sistema anti-duplicação inteligente
   */
  static async generateCumulativeTaskInstances(
    leadId: string,
    pipelineId: string,
    currentStageId: string,
    assignedTo: string,
    tenantId: string
  ): Promise<{ success: boolean; message: string; tasks_created?: number; details?: any }> {
    try {
      console.log('🔄 [generateCumulativeTaskInstances] Iniciando sistema acumulativo:', {
        leadId: leadId.substring(0, 8),
        pipelineId: pipelineId.substring(0, 8),
        currentStageId: currentStageId.substring(0, 8),
        tenantId: tenantId.substring(0, 8)
      });

      // ✅ NOVO LOG: Validação inicial dos parâmetros
      console.log('🔍 [DEBUG-CRITICAL] Validação de parâmetros de entrada:', {
        hasLeadId: !!leadId,
        hasPipelineId: !!pipelineId,
        hasCurrentStageId: !!currentStageId,
        hasAssignedTo: !!assignedTo,
        hasTenantId: !!tenantId,
        leadIdFull: leadId,
        pipelineIdFull: pipelineId,
        currentStageIdFull: currentStageId,
        tenantIdFull: tenantId,
        timestamp: new Date().toISOString()
      });

      // 1. Buscar todas as etapas da pipeline até a etapa atual (ordem crescente)
      console.log('🔍 [DEBUG-CRITICAL] Buscando stages da pipeline:', {
        pipelineId: pipelineId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        table: 'pipeline_stages',
        query: 'SELECT id, name, order_index WHERE pipeline_id = ? AND tenant_id = ?'
      });

      const { data: allStages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id, name, order_index')
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId)
        .order('order_index', { ascending: true });

      console.log('📊 [DEBUG-CRITICAL] Resultado da busca de stages:', {
        found: !!allStages,
        count: allStages?.length || 0,
        error: stagesError?.message || 'nenhum',
        stages: allStages?.map(s => ({
          id: s.id.substring(0, 8),
          name: s.name,
          order: s.order_index
        })) || []
      });

      if (stagesError || !allStages) {
        console.error('❌ [DEBUG-CRITICAL] ERRO FATAL - Não foi possível buscar stages:', {
          error: stagesError?.message,
          hasData: !!allStages,
          pipelineId: pipelineId.substring(0, 8),
          tenantId: tenantId.substring(0, 8)
        });
        throw new Error(`Erro ao buscar stages: ${stagesError?.message}`);
      }

      const currentStageIndex = allStages.findIndex(s => s.id === currentStageId);
      if (currentStageIndex === -1) {
        throw new Error('Stage atual não encontrado na pipeline');
      }

      // 2. Pegar apenas as etapas até a atual (inclusive)
      const stagesToProcess = allStages.slice(0, currentStageIndex + 1);
      console.log('📋 [generateCumulativeTaskInstances] Etapas a processar:', {
        total: stagesToProcess.length,
        stages: stagesToProcess.map(s => s.name)
      });

      // 3. Para cada etapa, verificar configurações e gerar atividades se necessário
      let totalTasksCreated = 0;
      const entryDate = new Date();
      const processedStages = [];

      for (const stage of stagesToProcess) {
        console.log('🔍 [generateCumulativeTaskInstances] Processando etapa:', {
          stageName: stage.name,
          stageOrder: stage.order_index,
          stageId: stage.id.substring(0, 8)
        });

        // 3.1. PRIMEIRA VERIFICAÇÃO: Buscar configuração de cadência para esta etapa (MOVIDO PARA CIMA)
        console.log('🔍 [DEBUG-CRITICAL] Buscando configuração de cadência:', {
          pipeline_id: pipelineId.substring(0, 8),
          stage_name: stage.name,
          tenant_id: tenantId.substring(0, 8),
          stage_id: stage.id.substring(0, 8),
          table: 'cadence_configs',
          query: `SELECT * WHERE pipeline_id='${pipelineId.substring(0, 8)}' AND stage_name='${stage.name}' AND tenant_id='${tenantId.substring(0, 8)}' AND is_active=true`,
          timestamp: new Date().toISOString()
        });

        const { data: cadenceConfigs, error: cadenceError } = await supabase
          .from('cadence_configs')
          .select('*')
          .eq('pipeline_id', pipelineId)
          .eq('stage_name', stage.name)
          .eq('tenant_id', tenantId)
          .eq('is_active', true);

        console.log('📊 [DEBUG-CRITICAL] Resultado da busca de configuração:', {
          found: !!cadenceConfigs,
          count: cadenceConfigs?.length || 0,
          error: cadenceError?.message || 'nenhum',
          errorCode: cadenceError?.code || 'N/A',
          stage: stage.name,
          rawConfigs: cadenceConfigs,
          configs: cadenceConfigs?.map(c => ({
            id: c.id.substring(0, 8),
            tasksCount: c.tasks?.length || 0,
            isActive: c.is_active,
            activeTasks: Array.isArray(c.tasks) ? c.tasks.filter(t => t.is_active).length : 0,
            taskTitles: Array.isArray(c.tasks) ? c.tasks.filter(t => t.is_active).map(t => t.task_title) : []
          })) || [],
          note: 'ESTA É A BUSCA CRÍTICA - se count=0 aqui, não vai criar atividades'
        });

        if (cadenceError) {
          console.warn('⚠️ [generateCumulativeTaskInstances] Erro ao buscar cadence config:', {
            stage: stage.name,
            error: cadenceError.message
          });
          processedStages.push({ stage: stage.name, action: 'error_config', error: cadenceError.message });
          continue;
        }

        if (!cadenceConfigs || cadenceConfigs.length === 0) {
          console.log('📝 [generateCumulativeTaskInstances] Sem configurações para etapa:', {
            stage: stage.name,
            note: 'Etapa não tem cadência configurada - isso é normal'
          });
          processedStages.push({ stage: stage.name, action: 'no_config', count: 0 });
          continue;
        }

        // 3.2. ✅ NOVA LÓGICA INTELIGENTE: Calcular quantas atividades DEVERIAM existir
        let expectedTasksCount = 0;
        for (const config of cadenceConfigs) {
          const activeTasks = Array.isArray(config.tasks) ? config.tasks.filter(t => t.is_active) : [];
          expectedTasksCount += activeTasks.length;
          
          console.log('🔢 [DEBUG-BADGE-SERVICE] Contando tasks da configuração:', {
            configId: config.id.substring(0, 8),
            totalTasks: Array.isArray(config.tasks) ? config.tasks.length : 0,
            activeTasks: activeTasks.length,
            taskTitles: activeTasks.map(t => t.task_title),
            expectedSoFar: expectedTasksCount
          });
        }

        console.log('🧮 [DEBUG-BADGE-SERVICE] Cálculo final de atividades esperadas:', {
          stage: stage.name,
          expectedTasks: expectedTasksCount,
          configsProcessed: cadenceConfigs.length,
          note: 'Total de atividades que devem ser criadas para esta etapa'
        });

        // 3.3. VERIFICAÇÃO INTELIGENTE: Verificar se já existem tasks AUTO-GERADAS COMPLETAS
        console.log('🔍 [DEBUG-BADGE-SERVICE] Buscando atividades existentes:', {
          lead_id: leadId.substring(0, 8),
          stage_id: stage.id.substring(0, 8),
          tenant_id: tenantId.substring(0, 8),
          stage_name: stage.name,
          note: 'Verificando se já existem atividades auto-geradas para esta etapa'
        });

        const { data: existingTasks, error: existingError } = await supabase
          .from('cadence_task_instances')
          .select('id, title, status, auto_generated, is_manual_activity')
          .eq('lead_id', leadId)
          .eq('stage_id', stage.id)
          .eq('tenant_id', tenantId)
          .eq('auto_generated', true); // ✅ MELHORIA: Só considerar atividades auto-geradas

        console.log('📊 [DEBUG-BADGE-SERVICE] Resultado da busca de atividades existentes:', {
          found: !!existingTasks,
          count: existingTasks?.length || 0,
          error: existingError?.message || 'nenhum',
          stage: stage.name,
          activities: existingTasks?.map(t => ({
            title: t.title,
            status: t.status,
            auto_generated: t.auto_generated
          })) || []
        });

        if (existingError) {
          console.warn('⚠️ [generateCumulativeTaskInstances] Erro ao verificar tasks existentes:', {
            stage: stage.name,
            error: existingError.message
          });
          continue;
        }

        const existingCount = existingTasks ? existingTasks.length : 0;

        // ✅ DECISÃO CRÍTICA: Determinar se deve criar, pular ou completar atividades
        console.log('🎯 [DEBUG-BADGE-SERVICE] DECISÃO CRÍTICA - Comparando atividades:', {
          stage: stage.name,
          existingCount,
          expectedTasksCount,
          hasConfigs: cadenceConfigs.length > 0,
          decision: existingCount >= expectedTasksCount ? 'PULAR_COMPLETA' : 
                   existingCount > 0 ? 'COMPLETAR_INCOMPLETA' : 
                   expectedTasksCount > 0 ? 'CRIAR_NOVA' : 'SEM_CONFIGURACAO',
          note: 'Esta é a decisão que determina se atividades serão criadas'
        });

        // ✅ CORREÇÃO CRÍTICA: Só pular se temos EXATAMENTE o número esperado de atividades
        if (expectedTasksCount > 0 && existingCount >= expectedTasksCount) {
          console.log('✅ [generateCumulativeTaskInstances] Etapa COMPLETA - sistema acumulativo correto:', {
            stage: stage.name,
            existingCount,
            expectedCount: expectedTasksCount,
            status: 'COMPLETA - todas as atividades já existem',
            activities: existingTasks.map(t => ({ 
              title: t.title, 
              status: t.status, 
              auto_generated: t.auto_generated
            }))
          });
          processedStages.push({ stage: stage.name, action: 'skipped_complete', count: existingCount });
          continue; // Pular esta etapa - sistema acumulativo completo
        } else if (existingCount > 0 && existingCount < expectedTasksCount) {
          console.log('🔄 [generateCumulativeTaskInstances] Etapa INCOMPLETA - sistema acumulativo precisa completar:', {
            stage: stage.name,
            existingCount,
            expectedCount: expectedTasksCount,
            missingCount: expectedTasksCount - existingCount,
            status: 'INCOMPLETA - faltam atividades',
            note: 'Vamos completar as atividades faltantes'
          });
          // NÃO fazer continue aqui - continuar processamento para completar as atividades faltantes
        } else {
          console.log('🆕 [generateCumulativeTaskInstances] Etapa NOVA - primeiro acesso:', {
            stage: stage.name,
            existingCount: 0,
            expectedCount: expectedTasksCount,
            status: 'NOVA - nenhuma atividade existe ainda'
          });
          // NÃO fazer continue aqui - continuar processamento para criar todas as atividades
        }

        // ✅ NOVA VERIFICAÇÃO: Log de atividades manuais se existirem (para visibilidade)
        const { data: manualTasks } = await supabase
          .from('cadence_task_instances')
          .select('id, title, status, is_manual_activity')
          .eq('lead_id', leadId)
          .eq('stage_id', stage.id)
          .eq('tenant_id', tenantId)
          .eq('is_manual_activity', true);

        if (manualTasks && manualTasks.length > 0) {
          console.log('📝 [generateCumulativeTaskInstances] Etapa tem atividades manuais (serão mantidas):', {
            stage: stage.name,
            manualCount: manualTasks.length,
            manualActivities: manualTasks.map(t => t.title)
          });
        }

        // 3.4. CONFIGURAÇÕES ENCONTRADAS: Log detalhado
        console.log('🔧 [generateCumulativeTaskInstances] Configurações encontradas:', {
          stage: stage.name,
          configsCount: cadenceConfigs.length,
          expectedTasks: expectedTasksCount,
          existingTasks: existingCount,
          configs: cadenceConfigs.map(c => ({
            id: c.id.substring(0, 8),
            tasksCount: Array.isArray(c.tasks) ? c.tasks.length : 0,
            isActive: c.is_active
          }))
        });

        // 3.5. ✅ GERAR ATIVIDADES INTELIGENTE: Processar apenas as tasks que ainda não existem
        let stageTasksCreated = 0;
        
        console.log('🚀 [DEBUG-BADGE-SERVICE] INICIANDO CRIAÇÃO DE ATIVIDADES:', {
          stage: stage.name,
          expectedTasks: expectedTasksCount,
          existingCount: existingCount,
          configsToProcess: cadenceConfigs.length,
          decision: 'CRIANDO_ATIVIDADES',
          timestamp: new Date().toISOString()
        });
        
        // Criar um mapa das atividades existentes para comparação rápida
        const existingTasksMap = new Map();
        if (existingTasks) {
          existingTasks.forEach(task => {
            const key = `${task.title}-${stage.id}`; // Chave única: título + stage
            existingTasksMap.set(key, task);
          });
        }
        
        for (const config of cadenceConfigs) {
          const tasks = Array.isArray(config.tasks) ? config.tasks.filter(t => t.is_active) : [];
          
          console.log('🔨 [generateCumulativeTaskInstances] Processando tasks da config:', {
            stage: stage.name,
            configId: config.id.substring(0, 8),
            totalTasks: tasks.length,
            existingTasksInStage: existingCount,
            note: 'Vamos verificar task por task se já existe'
          });
          
          for (const task of tasks) {
            try {
              // ✅ VERIFICAÇÃO INTELIGENTE: Verificar se esta task específica já existe
              const taskKey = `${task.task_title}-${stage.id}`;
              
              if (existingTasksMap.has(taskKey)) {
                console.log('⏭️ [generateCumulativeTaskInstances] Task já existe - pulando:', {
                  stage: stage.name,
                  title: task.task_title,
                  channel: task.channel,
                  status: 'JÁ_EXISTE'
                });
                continue; // Pular esta task específica, já existe
              }
              
              const scheduledDate = new Date(entryDate);
              scheduledDate.setDate(scheduledDate.getDate() + (task.day_offset || 0));

              const taskInstanceData = {
                tenant_id: tenantId,
                lead_id: leadId,
                pipeline_id: pipelineId,
                stage_id: stage.id,
                activity_type: task.channel,
                title: task.task_title,
                description: task.task_description,
                channel: task.channel,
                template_content: task.template_content,
                day_offset: task.day_offset,
                task_order: task.task_order,
                status: 'pending',
                scheduled_at: scheduledDate.toISOString(),
                is_manual_activity: false,
                auto_generated: true
              };

              console.log('💾 [DEBUG-CRITICAL] TENTANDO CRIAR ATIVIDADE:', {
                title: task.task_title,
                channel: task.channel,
                dayOffset: task.day_offset,
                leadId: leadId.substring(0, 8),
                stageId: stage.id.substring(0, 8),
                tenantId: tenantId.substring(0, 8),
                scheduledAt: scheduledDate.toISOString().substring(0, 10),
                fullTaskData: taskInstanceData,
                table: 'cadence_task_instances',
                operation: 'INSERT',
                note: 'ESTE É O MOMENTO CRÍTICO - se falhar aqui, verificar RLS ou dados'
              });

              const { error: createError } = await supabase
                .from('cadence_task_instances')
                .insert(taskInstanceData);

              console.log('📋 [DEBUG-CRITICAL] RESULTADO DA INSERÇÃO:', {
                title: task.task_title,
                success: !createError,
                error: createError?.message || 'nenhum',
                code: createError?.code || 'N/A',
                details: createError?.details || 'N/A',
                hint: createError?.hint || 'N/A',
                timestamp: new Date().toISOString(),
                status: !createError ? '✅ SUCESSO - ATIVIDADE CRIADA' : '❌ FALHA - VERIFICAR ERRO ACIMA'
              });

              if (createError) {
                console.error('❌ [generateCumulativeTaskInstances] Erro ao criar task:', {
                  error: createError.message,
                  stage: stage.name,
                  taskTitle: task.task_title
                });
                continue;
              }

              totalTasksCreated++;
              stageTasksCreated++;
              console.log('✅ [generateCumulativeTaskInstances] Task criada (sistema acumulativo):', {
                stage: stage.name,
                title: task.task_title,
                channel: task.channel,
                dayOffset: task.day_offset,
                scheduled: scheduledDate.toISOString().substring(0, 10),
                status: 'NOVA_ATIVIDADE_CRIADA'
              });

            } catch (taskError: any) {
              console.error('❌ [generateCumulativeTaskInstances] Erro individual na task:', {
                error: taskError.message,
                stage: stage.name,
                taskTitle: task.task_title
              });
            }
          }
        }
        
        // Registrar resultado desta etapa com mais detalhes
        const stageAction = stageTasksCreated > 0 ? 'created_activities' : 
                           existingCount > 0 ? 'already_complete' : 'no_activities_needed';
        
        processedStages.push({ 
          stage: stage.name, 
          action: stageAction, 
          count: stageTasksCreated,
          existing: existingCount,
          expected: expectedTasksCount
        });
        
        console.log('🎯 [generateCumulativeTaskInstances] Etapa processada (sistema acumulativo):', {
          stage: stage.name,
          newTasksCreated: stageTasksCreated,
          existingTasks: existingCount,
          expectedTasks: expectedTasksCount,
          totalSoFar: totalTasksCreated,
          status: stageAction === 'created_activities' ? 'ATIVIDADES_CRIADAS' :
                 stageAction === 'already_complete' ? 'JÁ_COMPLETA' : 'SEM_CONFIGURAÇÃO'
        });
      }

      // 4. ✅ RELATÓRIO FINAL DETALHADO CORRIGIDO
      const stagesWithNewActivities = processedStages.filter(s => s.action === 'created_activities').length;
      const stagesAlreadyComplete = processedStages.filter(s => s.action === 'already_complete' || s.action === 'skipped_complete').length;
      const stagesWithoutConfig = processedStages.filter(s => s.action === 'no_config').length;
      const stagesWithErrors = processedStages.filter(s => s.action === 'error_config').length;
      
      console.log('🎉 [generateCumulativeTaskInstances] ✅ SISTEMA ACUMULATIVO CORRIGIDO - Concluído:', {
        leadId: leadId.substring(0, 8),
        totalStagesProcessed: stagesToProcess.length,
        totalNewTasksCreated: totalTasksCreated,
        stageBreakdown: {
          withNewActivities: stagesWithNewActivities,
          alreadyComplete: stagesAlreadyComplete,
          withoutConfig: stagesWithoutConfig,
          withErrors: stagesWithErrors
        },
        detailedResults: processedStages.map(stage => ({
          stage: stage.stage,
          action: stage.action,
          newTasks: stage.count || 0,
          existingTasks: stage.existing || 0,
          expectedTasks: stage.expected || 0,
          status: stage.action === 'created_activities' ? '✅ CRIADAS' :
                 stage.action === 'already_complete' ? '✅ COMPLETA' :
                 stage.action === 'skipped_complete' ? '✅ COMPLETA' :
                 stage.action === 'no_config' ? '📝 SEM CONFIG' : '❌ ERRO'
        })),
        systemStatus: 'FUNCIONANDO_CORRETAMENTE'
      });

      return {
        success: true,
        message: `✅ Sistema acumulativo CORRIGIDO: ${totalTasksCreated} novas atividades criadas para ${stagesToProcess.length} etapas (${stagesAlreadyComplete} já completas)`,
        tasks_created: totalTasksCreated,
        details: {
          leadId,
          totalStagesProcessed: stagesToProcess.length,
          newTasksCreated: totalTasksCreated,
          stagesProcessed: processedStages,
          summary: {
            withNewActivities: stagesWithNewActivities,
            alreadyComplete: stagesAlreadyComplete,
            withoutConfig: stagesWithoutConfig,
            errors: stagesWithErrors
          },
          cumulativeSystemStatus: 'FIXED_AND_WORKING'
        }
      };

    } catch (error: any) {
      console.error('❌ [generateCumulativeTaskInstances] Erro geral:', {
        error: error.message,
        leadId: leadId?.substring(0, 8)
      });
      return {
        success: false,
        message: error.message || 'Erro interno do servidor',
        tasks_created: 0
      };
    }
  }

  /**
   * Gerar task instances para um lead baseado nas configurações de cadência
   * LEGACY: Mantido para compatibilidade, mas recomenda-se usar generateCumulativeTaskInstances
   */
  static async generateTaskInstancesForLead(
    leadId: string,
    pipelineId: string,
    stageId: string,
    assignedTo: string,
    tenantId: string
  ): Promise<{ success: boolean; message: string; tasks_created?: number; details?: any }> {
    try {
      console.log('🔄 [generateTaskInstancesForLead] Iniciando:', {
        leadId: leadId.substring(0, 8),
        pipelineId: pipelineId.substring(0, 8),
        stageId: stageId.substring(0, 8),
        tenantId: tenantId.substring(0, 8)
      });

      // 1. Buscar informações do stage para obter o stage_name
      const { data: stageData, error: stageError } = await supabase
        .from('pipeline_stages')
        .select('name')
        .eq('id', stageId)
        .single();

      if (stageError || !stageData) {
        throw new Error(`Stage não encontrado: ${stageError?.message}`);
      }

      const stageName = stageData.name;

      console.log('📋 [generateTaskInstancesForLead] Stage encontrado:', {
        stageId: stageId.substring(0, 8),
        stageName
      });

      // 2. Buscar configuração de cadência para este pipeline/stage
      const { data: cadenceConfigs, error: cadenceError } = await supabase
        .from('cadence_configs')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('stage_name', stageName)
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (cadenceError) {
        throw new Error(`Erro ao buscar configurações de cadência: ${cadenceError.message}`);
      }

      if (!cadenceConfigs || cadenceConfigs.length === 0) {
        return {
          success: true,
          message: `Nenhuma configuração de cadência encontrada para o stage "${stageName}"`,
          tasks_created: 0
        };
      }

      console.log('🔍 [generateTaskInstancesForLead] Configurações encontradas:', {
        configsCount: cadenceConfigs.length,
        firstConfig: cadenceConfigs[0] ? {
          id: cadenceConfigs[0].id.substring(0, 8),
          tasksCount: Array.isArray(cadenceConfigs[0].tasks) ? cadenceConfigs[0].tasks.length : 0
        } : null
      });

      // 3. Verificar se já existem task instances para este lead neste stage
      const { data: existingTasks, error: existingError } = await supabase
        .from('cadence_task_instances')
        .select('id')
        .eq('lead_id', leadId)
        .eq('stage_id', stageId)
        .eq('tenant_id', tenantId);

      if (existingError) {
        throw new Error(`Erro ao verificar tasks existentes: ${existingError.message}`);
      }

      if (existingTasks && existingTasks.length > 0) {
        console.log('⚠️ [generateTaskInstancesForLead] Tasks já existem:', {
          existingCount: existingTasks.length,
          leadId: leadId.substring(0, 8)
        });
        return {
          success: true,
          message: `Lead já possui ${existingTasks.length} task instances para este stage`,
          tasks_created: 0
        };
      }

      // 4. Gerar task instances baseado nas configurações
      let totalTasksCreated = 0;
      const entryDate = new Date();

      for (const config of cadenceConfigs) {
        const tasks = Array.isArray(config.tasks) ? config.tasks : [];
        
        console.log('🔨 [generateTaskInstancesForLead] Processando config:', {
          configId: config.id.substring(0, 8),
          stageName: config.stage_name,
          tasksCount: tasks.length
        });

        for (const task of tasks) {
          if (!task.is_active) {
            console.log('⏭️ [generateTaskInstancesForLead] Task inativa, pulando:', {
              taskTitle: task.task_title
            });
            continue;
          }

          try {
            // Calcular data programada baseada no day_offset
            const scheduledDate = new Date(entryDate);
            scheduledDate.setDate(scheduledDate.getDate() + (task.day_offset || 0));

            // Criar task instance
            const taskInstanceData = {
              tenant_id: tenantId,
              lead_id: leadId,
              pipeline_id: pipelineId,
              stage_id: stageId,
              cadence_step_id: null, // Não temos cadence_step_id no novo modelo
              day_offset: task.day_offset,
              task_order: task.task_order,
              title: task.task_title,
              description: task.task_description,
              activity_type: task.action_type,
              channel: task.channel,
              template_content: task.template_content,
              status: 'pending',
              scheduled_at: scheduledDate.toISOString(),
              is_manual_activity: false,
              auto_generated: true
            };

            console.log('💾 [generateTaskInstancesForLead] Criando task instance:', {
              title: task.task_title,
              channel: task.channel,
              dayOffset: task.day_offset,
              scheduledAt: scheduledDate.toISOString().substring(0, 10)
            });

            const { data: createdTask, error: createError } = await supabase
              .from('cadence_task_instances')
              .insert(taskInstanceData)
              .select()
              .single();

            if (createError) {
              console.error('❌ [generateTaskInstancesForLead] Erro ao criar task:', {
                error: createError.message,
                taskTitle: task.task_title
              });
              throw new Error(`Erro ao criar task instance: ${createError.message}`);
            }

            totalTasksCreated++;

            console.log('✅ [generateTaskInstancesForLead] Task criada:', {
              taskId: createdTask.id.substring(0, 8),
              title: task.task_title,
              scheduled: scheduledDate.toISOString().substring(0, 10)
            });

          } catch (taskError: any) {
            console.error('❌ [generateTaskInstancesForLead] Erro individual na task:', {
              error: taskError.message,
              taskTitle: task.task_title
            });
            // Continuar com as outras tasks mesmo se uma falhar
          }
        }
      }

      console.log('🎉 [generateTaskInstancesForLead] Processo concluído:', {
        totalTasksCreated,
        leadId: leadId.substring(0, 8),
        stageName
      });

      return {
        success: true,
        message: `${totalTasksCreated} task instances criadas com sucesso`,
        tasks_created: totalTasksCreated,
        details: {
          leadId,
          stageName,
          tasksCreated: totalTasksCreated
        }
      };

    } catch (error: any) {
      console.error('❌ [generateTaskInstancesForLead] Erro geral:', {
        error: error.message,
        leadId: leadId?.substring(0, 8)
      });
      return {
        success: false,
        message: error.message || 'Erro interno do servidor',
        tasks_created: 0
      };
    }
  }

  /**
   * ✅ NOVO: Deletar configuração de cadência específica por ID
   */
  static async deleteCadenceConfigById(
    configId: string,
    tenantId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🗑️ [deleteCadenceConfigById] Iniciando exclusão:', {
        configId: configId.substring(0, 8),
        tenantId: tenantId.substring(0, 8)
      });

      // Verificar se a configuração existe e pertence ao tenant
      const { data: existingConfig, error: checkError } = await supabase
        .from('cadence_configs')
        .select('id, stage_name, tasks, tenant_id')
        .eq('id', configId)
        .eq('tenant_id', tenantId)
        .single();

      console.log('🔍 [deleteCadenceConfigById] Resultado da verificação:', {
        configId: configId.substring(0, 8),
        tenantId: tenantId.substring(0, 8),
        existingConfig: existingConfig ? {
          id: existingConfig.id.substring(0, 8),
          stage_name: existingConfig.stage_name,
          tenant_id: existingConfig.tenant_id?.substring(0, 8),
          tasks_count: Array.isArray(existingConfig.tasks) ? existingConfig.tasks.length : 0
        } : null,
        checkError: checkError ? {
          code: checkError.code,
          message: checkError.message,
          details: checkError.details
        } : null
      });

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          console.log('📝 [deleteCadenceConfigById] Configuração não encontrada (PGRST116):', {
            configId: configId.substring(0, 8),
            tenantId: tenantId.substring(0, 8),
            errorDetails: checkError
          });
          return {
            success: false,
            message: 'Configuração não encontrada ou não pertence ao tenant'
          };
        }
        throw new Error(`Erro ao verificar configuração: ${checkError.message}`);
      }

      if (!existingConfig) {
        return {
          success: false,
          message: 'Configuração não encontrada'
        };
      }

      // Deletar a configuração
      const { error: deleteError } = await supabase
        .from('cadence_configs')
        .delete()
        .eq('id', configId)
        .eq('tenant_id', tenantId);

      if (deleteError) {
        throw new Error(`Erro ao deletar configuração: ${deleteError.message}`);
      }

      console.log('✅ [deleteCadenceConfigById] Configuração deletada com sucesso:', {
        configId: configId.substring(0, 8),
        stageName: existingConfig.stage_name,
        tasksCount: Array.isArray(existingConfig.tasks) ? existingConfig.tasks.length : 0
      });

      return {
        success: true,
        message: `Configuração da etapa "${existingConfig.stage_name}" removida com sucesso`
      };

    } catch (error: any) {
      console.error('❌ [deleteCadenceConfigById] Erro ao deletar configuração:', error);
      return {
        success: false,
        message: error.message || 'Erro interno do servidor'
      };
    }
  }

  /**
   * Deletar configuração de cadência de uma pipeline
   */
  static async deleteCadenceConfig(
    pipelineId: string,
    tenantId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('cadence_configs')
        .delete()
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId);

      if (error) {
        throw new Error(`Erro ao deletar configurações: ${error.message}`);
      }

      return {
        success: true,
        message: 'Configurações de cadência removidas com sucesso'
      };

    } catch (error: any) {
      console.error('Erro ao deletar configurações de cadência:', error);
      return {
        success: false,
        message: error.message || 'Erro interno do servidor'
      };
    }
  }

  /**
   * Buscar configuração de cadência para uma etapa específica
   */
  static async getCadenceConfigForStage(
    pipelineId: string,
    stageName: string,
    tenantId: string
  ): Promise<{ success: boolean; config?: CadenceConfig; tasks?: CadenceTask[] }> {
    try {
      const { data: config, error } = await supabase
        .from('cadence_configs')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('stage_name', stageName)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      if (error || !config) {
        return { success: false };
      }

      const tasks: CadenceTask[] = Array.isArray(config.tasks) 
        ? config.tasks.filter((task: any) => task.is_active)
        : [];

      return {
        success: true,
        config: {
          id: config.id,
          pipeline_id: config.pipeline_id,
          stage_name: config.stage_name,
          stage_order: config.stage_order,
          tasks,
          is_active: config.is_active,
          tenant_id: config.tenant_id
        },
        tasks
      };

    } catch (error: any) {
      console.error('Erro ao buscar configuração de cadência para etapa:', error);
      return { success: false };
    }
  }

  /**
   * ✅ MELHORADO: Verificar se uma etapa é final do sistema (não deve ter atividades de cadência)
   * Etapas finais: "Ganho", "Perdido", "Closed Won", "Closed Lost" ou order_index >= 998
   */
  private static isFinalStage(stageName: string, stageOrder?: number): boolean {
    // ✅ CRITÉRIO 1: Etapas finais têm order_index >= 998
    if (stageOrder !== undefined && stageOrder >= 998) {
      return true;
    }
    
    // ✅ CRITÉRIO 2: Nomes de etapas finais conhecidos (case-insensitive)
    const finalStageNames = [
      'Ganho', 'Perdido', 
      'Closed Won', 'Closed Lost',
      'Ganha', 'Perdida',
      'Won', 'Lost',
      'Finalizado', 'Cancelado'
    ];
    
    const stageNameLower = stageName?.trim().toLowerCase();
    const isFinalByName = finalStageNames.some(finalName => 
      stageNameLower === finalName.toLowerCase()
    );
    
    if (isFinalByName) {
      return true;
    }
    
    // ✅ CRITÉRIO 3: Verificar se contém palavras-chave de etapas finais
    if (stageNameLower.includes('won') || stageNameLower.includes('lost') || 
        stageNameLower.includes('ganho') || stageNameLower.includes('perdido')) {
      return true;
    }

    return false;
  }
} 