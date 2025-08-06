import { supabase } from '../config/supabase';
import supabaseAdmin from './supabase-admin';
import { CadenceService } from './cadenceService'; // ✅ CORREÇÃO: Importar CadenceService para delegar operações de cadência

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  pipeline_members?: any[];
  pipeline_stages?: any[];
  pipeline_custom_fields?: any[];
}

export interface CreatePipelineData {
  name: string;
  description?: string;
  tenant_id: string;
  created_by: string;
  member_ids?: string[];
}

export interface UpdatePipelineData {
  name?: string;
  description?: string;
  qualification_rules?: any; // JSONB data for MQL/SQL qualification rules
  cadence_configs?: any[]; // Array of cadence configurations
  outcome_reasons?: any[]; // Array of pipeline outcome reasons (win/loss motives)
  stages?: any[]; // ✅ NOVO: Array of pipeline stages (custom stages only)
}

export interface PipelineNameValidation {
  is_valid: boolean;
  error?: string;
  suggestion?: string;
  similar_names?: string[];
}

export class PipelineService {
  static async validatePipelineName(
    name: string, 
    tenantId: string, 
    pipelineId?: string
  ): Promise<PipelineNameValidation> {
    try {
      console.log('🔍 [PipelineService] Validando nome de pipeline:', {
        name,
        tenantId,
        pipelineId: pipelineId || 'novo'
      });

      // ✅ TENTAR FUNÇÃO POSTGRESQL PRIMEIRO (tipos corretos baseados na verificação)
      console.log('🔄 [PipelineService] Chamando função RPC validate_pipeline_name_unique com:', {
        p_name: name.trim(),
        p_tenant_id: tenantId,
        p_pipeline_id: pipelineId || null
      });

      const { data, error } = await supabase.rpc('validate_pipeline_name_unique', {
        p_name: name.trim(),
        p_tenant_id: tenantId, // TEXT - correto conforme verificação
        p_pipeline_id: pipelineId || null // UUID - será convertido automaticamente
      });

      if (error) {
        console.warn('⚠️ [PipelineService] Função PostgreSQL falhou, usando fallback:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error('FALLBACK_NEEDED');
      }

      console.log('✅ [PipelineService] Validação PostgreSQL concluída:', {
        data,
        is_valid: data?.is_valid,
        has_error: !!data?.error
      });

      // ✅ BUSCAR PIPELINES SIMILARES MANUALMENTE
      const { data: similarPipelines } = await supabase
        .from('pipelines')
        .select('name')
        .eq('tenant_id', tenantId)
        .ilike('name', `%${name.trim()}%`)
        .limit(3);

      return {
        is_valid: data?.is_valid || false,
        error: data?.error || undefined,
        suggestion: data?.suggestion || undefined,
        similar_names: similarPipelines?.map(p => p.name) || []
      };

    } catch (error) {
      console.error('❌ [PipelineService] Erro crítico na validação, usando fallback:', {
        error: error.message,
        name,
        tenantId,
        pipelineId: pipelineId || 'novo'
      });
      
      // ✅ CORREÇÃO CRÍTICA: Excluir pipeline atual da validação em fallback mode
      let query = supabase
        .from('pipelines')
        .select('name, id')
        .eq('tenant_id', tenantId)
        .ilike('name', name.trim())
        .eq('is_active', true);

      // Se é uma edição, excluir a pipeline atual da validação
      if (pipelineId) {
        console.log('🔍 [PipelineService] Modo edição: excluindo pipeline atual da validação:', pipelineId);
        query = query.neq('id', pipelineId);
      }

      const { data: existingPipelines, error: fallbackError } = await query;

      if (fallbackError) {
        console.error('❌ [PipelineService] Erro na validação fallback:', fallbackError);
        throw new Error(`Erro na validação fallback: ${fallbackError.message}`);
      }

      console.log('🔍 [PipelineService] Pipelines existentes encontradas:', {
        count: existingPipelines?.length || 0,
        pipelines: existingPipelines?.map(p => ({ name: p.name, id: p.id })) || [],
        searchingFor: name.trim().toLowerCase()
      });

      const hasConflict = existingPipelines?.some(p => 
        p.name.toLowerCase().trim() === name.toLowerCase().trim()
      ) || false;

      console.log('🔍 [PipelineService] Resultado da validação fallback:', {
        hasConflict,
        is_valid: !hasConflict,
        conflictingPipelines: existingPipelines?.filter(p => 
          p.name.toLowerCase().trim() === name.toLowerCase().trim()
        ).map(p => ({ name: p.name, id: p.id })) || []
      });

      return {
        is_valid: !hasConflict,
        error: hasConflict ? 'Já existe uma pipeline com este nome' : undefined,
        suggestion: hasConflict ? `${name} (2)` : undefined,
        similar_names: existingPipelines?.map(p => p.name) || []
      };
    }
  }

  static async getPipelinesByTenant(tenantId: string): Promise<Pipeline[]> {
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (pipelinesError) {
      throw new Error(`Erro ao buscar pipelines: ${pipelinesError.message}`);
    }

    if (!pipelines || pipelines.length === 0) {
      return [];
    }

    const pipelinesWithDetails = await Promise.all(
      pipelines.map(async (pipeline) => {
        const { data: pipelineMembers } = await supabase
          .from('pipeline_members')
          .select('*')
          .eq('pipeline_id', pipeline.id);

        const membersWithUserData = await Promise.all(
          (pipelineMembers || []).map(async (pm) => {
            const { data: userData } = await supabase
              .from('users')
              .select('id, first_name, last_name, email')
              .eq('id', pm.member_id)
              .single();

            return {
              ...pm,
              member: userData
            };
          })
        );

        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', pipeline.id)
          .order('order_index');

        const { data: customFields } = await supabase
          .from('pipeline_custom_fields')
          .select('*')
          .eq('pipeline_id', pipeline.id)
          .order('field_order', { ascending: true });

        return {
          ...pipeline,
          pipeline_members: membersWithUserData || [],
          pipeline_stages: stages || [],
          pipeline_custom_fields: customFields || []
        };
      })
    );

    return pipelinesWithDetails;
  }

  static async getPipelineById(id: string): Promise<Pipeline | null> {
    // 🔧 CORREÇÃO: Buscar pipeline básico primeiro
    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erro ao buscar pipeline: ${error.message}`);
    }

    // 🔧 CORREÇÃO: Buscar relacionamentos separadamente para evitar erro de schema cache
    const { data: pipelineMembers } = await supabase
      .from('pipeline_members')
      .select('*')
      .eq('pipeline_id', id);

    const { data: pipelineStages } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', id)
      .order('order_index');

    // 🔧 CORREÇÃO: Buscar campos customizados da pipeline
    const { data: pipelineCustomFields } = await supabase
      .from('pipeline_custom_fields')
      .select('*')
      .eq('pipeline_id', id)
      .order('field_order');

    // Buscar dados dos membros se houver
    const membersWithUserData = await Promise.all(
      (pipelineMembers || []).map(async (pm) => {
        const { data: userData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .eq('id', pm.member_id)
          .single();

        return {
          ...pm,
          member: userData
        };
      })
    );

    return {
      ...pipeline,
      pipeline_members: membersWithUserData,
      pipeline_stages: pipelineStages || [],
      pipeline_custom_fields: pipelineCustomFields || []
    };
  }

  static async createPipeline(data: CreatePipelineData): Promise<Pipeline> {
    const { member_ids, ...pipelineData } = data;

    console.log('🔍 [PipelineService] Validando nome antes de criar pipeline...');
    const validation = await this.validatePipelineName(
      pipelineData.name,
      pipelineData.tenant_id
    );

    if (!validation.is_valid) {
      const errorMessage = `${validation.error}${validation.suggestion ? ` Sugestão: "${validation.suggestion}"` : ''}`;
      console.error('❌ [PipelineService] Validação falhou:', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('✅ [PipelineService] Nome validado, criando pipeline...');

    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert(pipelineData)
      .select()
      .single();

    if (pipelineError) {
      if (pipelineError.code === '23505' && pipelineError.message.includes('idx_pipelines_unique_name_per_tenant')) {
        throw new Error(`Já existe uma pipeline com o nome "${pipelineData.name}" nesta empresa. Escolha um nome diferente.`);
      }
      throw new Error(`Erro ao criar pipeline: ${pipelineError.message}`);
    }

    if (member_ids && member_ids.length > 0) {
      const memberInserts = member_ids.map(member_id => ({
        pipeline_id: pipeline.id,
        member_id
      }));

      const { error: membersError } = await supabase
        .from('pipeline_members')
        .insert(memberInserts);

      if (membersError) {
        console.warn('⚠️ [PipelineService] Erro ao adicionar membros:', membersError);
      }
    }

    // ✅ NOVO: Criar campos sistema obrigatórios (nome, email, telefone)
    const systemFields = [
      {
        pipeline_id: pipeline.id,
        field_name: 'nome_lead',
        field_label: 'Nome do Lead',
        field_type: 'text',
        is_required: true,
        field_order: 1,
        placeholder: 'Digite o nome do lead',
        show_in_card: true,
        tenant_id: pipeline.tenant_id
      },
      {
        pipeline_id: pipeline.id,
        field_name: 'email',
        field_label: 'E-mail',
        field_type: 'email',
        is_required: true,
        field_order: 2,
        placeholder: 'exemplo@email.com',
        show_in_card: true,
        tenant_id: pipeline.tenant_id
      },
      {
        pipeline_id: pipeline.id,
        field_name: 'telefone',
        field_label: 'Telefone',
        field_type: 'phone',
        is_required: true,
        field_order: 3,
        placeholder: '(11) 99999-9999',
        show_in_card: true,
        tenant_id: pipeline.tenant_id
      }
    ];

    const { error: fieldsError } = await supabase
      .from('pipeline_custom_fields')
      .insert(systemFields);

    if (fieldsError) {
      console.warn('⚠️ [PipelineService] Erro ao criar campos sistema:', fieldsError);
    } else {
      console.log('✅ [PipelineService] Campos sistema criados com sucesso');
    }

    console.log('✅ [PipelineService] Pipeline criada com sucesso:', {
      id: pipeline.id,
      name: pipeline.name,
      tenant_id: pipeline.tenant_id
    });

    return pipeline;
  }

  static async updatePipeline(id: string, data: UpdatePipelineData): Promise<Pipeline> {
    console.log('🔍 [PipelineService] Iniciando atualização da pipeline:', {
      id: id.substring(0, 8),
      hasName: !!data.name,
      hasDescription: !!data.description,
      hasQualificationRules: !!data.qualification_rules,
      hasCadenceConfigs: !!data.cadence_configs?.length,
      hasOutcomeReasons: !!data.outcome_reasons?.length
    });

    // Buscar pipeline atual para validações
    const currentPipeline = await this.getPipelineById(id);
    if (!currentPipeline) {
      throw new Error('Pipeline não encontrada');
    }

    // Validar nome se fornecido
    if (data.name) {
      console.log('🔍 [PipelineService] Validando novo nome para edição...');
      
      const validation = await this.validatePipelineName(
        data.name,
        currentPipeline.tenant_id,
        id
      );

      if (!validation.is_valid) {
        const errorMessage = `${validation.error}${validation.suggestion ? ` Sugestão: "${validation.suggestion}"` : ''}`;
        console.error('❌ [PipelineService] Validação de edição falhou:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ [PipelineService] Nome validado para edição');
    }

    // ✅ NOVA FUNCIONALIDADE: Preparar dados para atualização da pipeline principal
    const pipelineUpdateData: any = {};
    if (data.name !== undefined) pipelineUpdateData.name = data.name;
    if (data.description !== undefined) pipelineUpdateData.description = data.description;
    if (data.qualification_rules !== undefined) pipelineUpdateData.qualification_rules = data.qualification_rules;

    // Atualizar pipeline principal (name, description, qualification_rules)
    let updatedPipeline = currentPipeline;
    if (Object.keys(pipelineUpdateData).length > 0) {
      console.log('🔄 [PipelineService] Atualizando dados principais da pipeline...');
      
      const { data: pipeline, error } = await supabase
        .from('pipelines')
        .update(pipelineUpdateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505' && error.message.includes('idx_pipelines_unique_name_per_tenant')) {
          throw new Error(`Já existe uma pipeline com o nome "${data.name}" nesta empresa. Escolha um nome diferente.`);
        }
        throw new Error(`Erro ao atualizar pipeline: ${error.message}`);
      }

      updatedPipeline = pipeline;
      console.log('✅ [PipelineService] Dados principais atualizados');
    }

    // ✅ CORREÇÃO: Delegar operações de cadência para CadenceService (evita erro 500)
    if (data.cadence_configs !== undefined) {
      console.log('🔄 [PipelineService] Delegando configurações de cadência para CadenceService...');
      
      try {
        // ✅ CORREÇÃO: Usar CadenceService.saveCadenceConfig() que tem lógica robusta
        // Este método usa service role e trata adequadamente RLS e conflitos de dados
        const cadenceResult = await CadenceService.saveCadenceConfig(
          id, // pipeline_id
          data.cadence_configs, // configurações com tasks
          currentPipeline.tenant_id,
          'pipeline_update_operation' // created_by identificando a origem
        );

        if (cadenceResult.success) {
          console.log('✅ [PipelineService] Cadências salvas via CadenceService:', {
            pipeline_id: id.substring(0, 8),
            configs_count: data.cadence_configs.length,
            message: cadenceResult.message
          });
        } else {
          // ✅ DEGRADAÇÃO GRACIOSA: Log do erro mas não falha completamente
          console.warn('⚠️ [PipelineService] Cadências falharam mas pipeline foi salva:', {
            pipeline_id: id.substring(0, 8),
            error: cadenceResult.message,
            degraded_mode: true
          });
          // Não throw - permite que pipeline principal seja salva mesmo com falha nas cadências
        }
      } catch (cadenceError: any) {
        // ✅ DEGRADAÇÃO GRACIOSA: Log do erro mas não falha completamente
        console.error('❌ [PipelineService] Erro crítico em cadências (modo degradado):', {
          pipeline_id: id.substring(0, 8),
          error: cadenceError.message,
          stack: cadenceError.stack?.split('\n').slice(0, 3),
          degraded_mode: true
        });
        // Não throw - permite que dados principais da pipeline sejam salvos
      }
    }

    // ✅ NOVA FUNCIONALIDADE: Atualizar outcome_reasons se fornecidas
    if (data.outcome_reasons !== undefined) {
      console.log('🔄 [PipelineService] Atualizando motivos de resultado...');
      
      try {
        // Remover motivos existentes
        const { error: deleteError } = await supabase
          .from('pipeline_outcome_reasons')
          .delete()
          .eq('pipeline_id', id);

        if (deleteError) {
          console.warn('⚠️ [PipelineService] Aviso ao remover motivos existentes:', deleteError.message);
        }

        // Inserir novos motivos se houver
        if (data.outcome_reasons.length > 0) {
          const reasonsData = data.outcome_reasons.map(reason => ({
            ...reason,
            pipeline_id: id,
            tenant_id: currentPipeline.tenant_id
          }));

          const { error: insertError } = await supabase
            .from('pipeline_outcome_reasons')
            .insert(reasonsData);

          if (insertError) {
            console.error('❌ [PipelineService] Erro ao inserir motivos:', insertError.message);
            throw new Error(`Erro ao salvar motivos de resultado: ${insertError.message}`);
          }

          console.log('✅ [PipelineService] Motivos de resultado atualizados:', data.outcome_reasons.length);
        } else {
          console.log('✅ [PipelineService] Motivos removidos (array vazio)');
        }
      } catch (reasonsError: any) {
        console.error('❌ [PipelineService] Erro crítico ao atualizar motivos:', reasonsError.message);
        throw new Error(`Erro ao atualizar motivos: ${reasonsError.message}`);
      }
    }

    // ✅ NOVA FUNCIONALIDADE: Atualizar pipeline_stages se fornecidas
    if (data.stages !== undefined) {
      console.log('🔄 [PipelineService] Atualizando etapas da pipeline...');
      
      try {
        // ✅ NOVA ABORDAGEM: Atualizar order_index das stages existentes (não-destrutivo)
        console.log('🔄 [PipelineService] Atualizando ordem das etapas (não-destrutivo)...');
        
        if (data.stages.length > 0) {
          // ✅ FILTRAR: Apenas stages customizadas (não do sistema)
          const customStages = data.stages.filter(stage => !stage.is_system_stage);
          
          if (customStages.length > 0) {
            console.log('📝 [PipelineService] Atualizando order_index de', customStages.length, 'etapas customizadas');
            
            // Atualizar cada stage individualmente com sua nova order_index
            for (const stage of customStages) {
              console.log(`🔄 Atualizando etapa "${stage.name}" para order_index: ${stage.order_index}`);
              
              const { error: updateError } = await supabase
                .from('pipeline_stages')
                .update({ 
                  order_index: stage.order_index,
                  color: stage.color || '#3B82F6' // Também atualizar cor se fornecida
                })
                .eq('pipeline_id', id)
                .eq('name', stage.name)
                .eq('is_system_stage', false);

              if (updateError) {
                console.error(`❌ [PipelineService] Erro ao atualizar etapa "${stage.name}":`, updateError.message);
                throw new Error(`Erro ao atualizar etapa "${stage.name}": ${updateError.message}`);
              }
            }

            console.log('✅ [PipelineService] Ordem das etapas atualizada com sucesso');
          } else {
            console.log('✅ [PipelineService] Apenas stages do sistema fornecidas, nenhuma atualização necessária');
          }
        } else {
          console.log('⚠️ [PipelineService] Nenhuma etapa fornecida para atualização');
        }
      } catch (stagesError: any) {
        console.error('❌ [PipelineService] Erro crítico ao atualizar stages:', stagesError.message);
        throw new Error(`Erro ao atualizar etapas: ${stagesError.message}`);
      }
    }

    // ✅ VALIDAÇÃO DE CONSISTÊNCIA: Verificar se cadence_configs e task_instances estão sincronizados
    if (data.cadence_configs !== undefined) {
      console.log('🔍 [PipelineService] Validando consistência cadence_configs vs task_instances...');
      try {
        await this.validateCadenceConsistency(id, currentPipeline.tenant_id);
      } catch (validationError: any) {
        console.warn('⚠️ [PipelineService] Aviso de consistência (não crítico):', {
          pipeline_id: id.substring(0, 8), 
          validation_error: validationError.message
        });
        // Não falhar por problemas de validação - apenas log
      }
    }

    console.log('✅ [PipelineService] Pipeline atualizada com sucesso:', {
      id: updatedPipeline.id,
      name: updatedPipeline.name,
      hasQualificationRules: !!(updatedPipeline as any).qualification_rules,
      updatedCadences: data.cadence_configs !== undefined,
      updatedReasons: data.outcome_reasons !== undefined,
      updatedStages: data.stages !== undefined
    });

    return updatedPipeline;
  }

  /**
   * ✅ NOVO: Validar consistência entre cadence_configs e task_instances
   * Prevenir inconsistências futuras entre configurações e instâncias
   */
  static async validateCadenceConsistency(pipelineId: string, tenantId: string): Promise<void> {
    try {
      console.log('🔍 [PipelineService] Iniciando validação de consistência...', {
        pipeline_id: pipelineId.substring(0, 8),
        tenant_id: tenantId.substring(0, 8)
      });

      // Verificar se há cadence_configs
      const { data: configs, error: configsError } = await supabase
        .from('cadence_configs')
        .select('id, stage_name, tasks')
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId);

      if (configsError) {
        throw new Error(`Erro ao buscar cadence_configs: ${configsError.message}`);
      }

      // Verificar se há task_instances
      const { data: instances, error: instancesError } = await supabase
        .from('cadence_task_instances')
        .select('id, stage_id')
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId)
        .limit(5); // Apenas uma amostra para verificar existência

      if (instancesError) {
        throw new Error(`Erro ao buscar task_instances: ${instancesError.message}`);
      }

      const hasConfigs = configs && configs.length > 0;
      const hasInstances = instances && instances.length > 0;

      console.log('📊 [PipelineService] Resultado da validação:', {
        pipeline_id: pipelineId.substring(0, 8),
        has_configs: hasConfigs,
        configs_count: configs?.length || 0,
        has_instances: hasInstances,
        instances_sample: instances?.length || 0
      });

      // ✅ CASOS VÁLIDOS:
      // 1. Ambos existem (normal)
      // 2. Nenhum existe (pipeline nova sem cadências)
      if ((hasConfigs && hasInstances) || (!hasConfigs && !hasInstances)) {
        console.log('✅ [PipelineService] Consistência validada - estado normal');
        return;
      }

      // ⚠️ CASOS DE INCONSISTÊNCIA:
      if (hasInstances && !hasConfigs) {
        console.warn('⚠️ [PipelineService] Inconsistência detectada: task_instances sem cadence_configs');
        // Este era o problema do usuário - já resolvido com a migração
      } else if (hasConfigs && !hasInstances) {
        console.warn('⚠️ [PipelineService] Aviso: cadence_configs sem task_instances (normal para pipelines novas)');
      }

    } catch (error: any) {
      console.error('❌ [PipelineService] Erro na validação de consistência:', error.message);
      throw error;
    }
  }

  static async deletePipeline(id: string): Promise<void> {
    const { error } = await supabase
      .from('pipelines')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir pipeline: ${error.message}`);
    }
  }

  static async getPipelinesByMember(memberId: string): Promise<Pipeline[]> {
    const { data: pipelineMembers, error: membersError } = await supabase
      .from('pipeline_members')
      .select('pipeline_id')
      .eq('member_id', memberId);

    if (membersError) {
      throw new Error(`Erro ao buscar pipeline_members: ${membersError.message}`);
    }

    if (!pipelineMembers || pipelineMembers.length === 0) {
      return [];
    }

    const pipelineIds = pipelineMembers.map(pm => pm.pipeline_id);

    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('*')
      .in('id', pipelineIds)
      .order('created_at', { ascending: false });

    if (pipelinesError) {
      throw new Error(`Erro ao buscar pipelines: ${pipelinesError.message}`);
    }

    if (!pipelines || pipelines.length === 0) {
      return [];
    }

    const pipelinesWithDetails = await Promise.all(
      pipelines.map(async (pipeline) => {
        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', pipeline.id)
          .order('order_index');

        const { data: customFields } = await supabase
          .from('pipeline_custom_fields')
          .select('*')
          .eq('pipeline_id', pipeline.id)
          .order('field_order');

        return {
          ...pipeline,
          pipeline_stages: stages || [],
          pipeline_custom_fields: customFields || []
        };
      })
    );

    return pipelinesWithDetails;
  }

  // ✅ NOVA FUNCIONALIDADE: Arquivar pipeline (soft delete)
  static async archivePipeline(pipelineId: string, tenantId: string): Promise<void> {
    console.log('📁 [PipelineService] Arquivando pipeline:', { pipelineId, tenantId });

    // Verificar se pipeline existe e pertence ao tenant
    const { data: pipeline, error: checkError } = await supabase
      .from('pipelines')
      .select('id, name, is_active')
      .eq('id', pipelineId)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !pipeline) {
      throw new Error('Pipeline não encontrada ou não pertence a esta empresa');
    }

    if (!pipeline.is_active) {
      throw new Error('Pipeline já está inativa');
    }

    // Arquivar pipeline (soft delete)
    const { error: archiveError } = await supabase
      .from('pipelines')
      .update({ 
        is_archived: true,
        archived_at: new Date().toISOString(),
        is_active: false // Manter consistência com campo existente
      })
      .eq('id', pipelineId)
      .eq('tenant_id', tenantId);

    if (archiveError) {
      console.error('❌ [PipelineService] Erro ao arquivar pipeline:', archiveError);
      throw new Error('Erro ao arquivar pipeline');
    }

    console.log('✅ [PipelineService] Pipeline arquivada com sucesso:', pipeline.name);
  }

  // ✅ NOVA FUNCIONALIDADE: Desarquivar pipeline
  static async unarchivePipeline(pipelineId: string, tenantId: string): Promise<void> {
    console.log('📂 [PipelineService] Desarquivando pipeline:', { pipelineId, tenantId });

    // Verificar se pipeline existe e pertence ao tenant
    const { data: pipeline, error: checkError } = await supabase
      .from('pipelines')
      .select('id, name, is_archived, archived_at')
      .eq('id', pipelineId)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !pipeline) {
      console.error('❌ [PipelineService] Pipeline não encontrada:', { pipelineId, tenantId, error: checkError });
      throw new Error('Pipeline não encontrada ou não pertence a esta empresa');
    }

    console.log('🔍 [PipelineService] Status da pipeline:', { 
      id: pipeline.id, 
      name: pipeline.name, 
      is_archived: pipeline.is_archived, 
      archived_at: pipeline.archived_at 
    });

    // ✅ CORREÇÃO: Usar is_archived ao invés de archived_at para validação
    if (!pipeline.is_archived) {
      console.warn('⚠️ [PipelineService] Pipeline já está ativa:', pipeline.name);
      throw new Error('Pipeline não está arquivada');
    }

    // Desarquivar pipeline
    const { error: unarchiveError } = await supabase
      .from('pipelines')
      .update({ 
        is_archived: false,
        archived_at: null,
        is_active: true // Reativar pipeline
      })
      .eq('id', pipelineId)
      .eq('tenant_id', tenantId);

    if (unarchiveError) {
      console.error('❌ [PipelineService] Erro ao desarquivar pipeline:', unarchiveError);
      throw new Error('Erro ao desarquivar pipeline');
    }

    console.log('✅ [PipelineService] Pipeline desarquivada com sucesso:', pipeline.name);

    // ✅ VALIDAÇÃO: Garantir que pipeline tenha etapas obrigatórias após desarquivamento
    try {
      console.log('🔍 [PipelineService] Verificando etapas obrigatórias após desarquivamento...');
      // AIDEV-NOTE: Verificação simples de etapas - método ensurePipelineStages não implementado ainda
      const { data: stages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id, name, stage_type')
        .eq('pipeline_id', pipelineId)
        .eq('tenant_id', tenantId);

      if (stagesError) {
        console.warn('⚠️ [PipelineService] Erro ao verificar etapas:', stagesError.message);
      } else if (!stages || stages.length === 0) {
        console.warn('⚠️ [PipelineService] Pipeline desarquivada sem etapas - pode precisar de configuração');
      } else {
        console.log('✅ [PipelineService] Etapas encontradas:', stages.length);
      }
    } catch (stageError: any) {
      console.warn('⚠️ [PipelineService] Aviso: Erro ao validar etapas obrigatórias:', stageError.message);
      // Não lançar erro aqui, pois pipeline já foi desarquivada com sucesso
      // O aviso permite que a operação continue, mas registra o problema
    }
  }

  // ✅ NOVA FUNCIONALIDADE: Listar pipelines arquivadas
  static async getArchivedPipelines(tenantId: string): Promise<Pipeline[]> {
    console.log('📋 [PipelineService] Buscando pipelines arquivadas para tenant:', tenantId);

    const { data: pipelines, error } = await supabase
      .from('pipelines')
      .select(`
        id, name, description, tenant_id, created_by, created_at, updated_at, archived_at,
        pipeline_stages (id, name, order_index, stage_type),
        pipeline_custom_fields (id, field_name, field_type, is_required)
      `)
      .eq('tenant_id', tenantId)
      .not('archived_at', 'is', null) // Apenas pipelines arquivadas
      .order('archived_at', { ascending: false }); // Mais recentemente arquivadas primeiro

    if (error) {
      console.error('❌ [PipelineService] Erro ao buscar pipelines arquivadas:', error);
      throw new Error('Erro ao buscar pipelines arquivadas');
    }

    console.log('✅ [PipelineService] Pipelines arquivadas encontradas:', pipelines?.length || 0);

    return pipelines || [];
  }

  // ✅ FUNCIONALIDADE ATUALIZADA: Modificar getAllByTenant para excluir arquivadas por padrão
  static async getActivePipelines(tenantId: string): Promise<Pipeline[]> {
    console.log('📋 [PipelineService] Buscando pipelines ativas para tenant:', tenantId);

    const { data: pipelines, error } = await supabase
      .from('pipelines')
      .select(`
        id, name, description, tenant_id, created_by, created_at, updated_at, is_active,
        pipeline_stages (id, name, order_index, stage_type),
        pipeline_custom_fields (id, field_name, field_type, is_required)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('archived_at', null) // Apenas pipelines não arquivadas
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [PipelineService] Erro ao buscar pipelines ativas:', error);
      throw new Error('Erro ao buscar pipelines ativas');
    }

    console.log('✅ [PipelineService] Pipelines ativas encontradas:', pipelines?.length || 0);

    return pipelines || [];
  }

  // ✅ NOVA FUNCIONALIDADE: Duplicar pipeline completa
  static async duplicatePipeline(pipelineId: string, tenantId: string, userId: string) {
    console.log('🔄 [PipelineService] Iniciando duplicação:', { pipelineId, tenantId, userId });

    // 🔍 VALIDAÇÃO SIMPLIFICADA: Verificar disponibilidade do supabaseAdmin
    console.log('🔍 [PipelineService] Inicializando duplicação com sistema de fallback...');

    // 1. Buscar pipeline original com todos os dados relacionados
    console.log('🔍 [PipelineService] Buscando pipeline original...');
    
    // 🔄 SISTEMA DE FALLBACK OTIMIZADO - Teste de conectividade antes
    let dbClient = supabaseAdmin;
    let originalPipeline: any = null;
    let pipelineError: any = null;

    // ✅ OTIMIZAÇÃO: Testar conectividade rapidamente primeiro
    try {
      // Teste rápido de conectividade (timeout 3s)
      const testQuery = await supabaseAdmin
        .from('pipelines')
        .select('id')
        .limit(1)
        .abortSignal(AbortSignal.timeout(3000));
      
      if (!testQuery.error) {
        console.log('✅ [PipelineService] supabaseAdmin conectado - usando diretamente');
        dbClient = supabaseAdmin;
      } else {
        throw new Error('supabaseAdmin indisponível');
      }
    } catch (connectivityError: any) {
      console.warn('⚠️ [PipelineService] supabaseAdmin indisponível, usando fallback:', connectivityError.message);
      dbClient = supabase;
    }

    // Usar cliente selecionado diretamente (sem loop)
    try {
      const clientName = dbClient === supabaseAdmin ? 'supabaseAdmin' : 'supabase';
      console.log(`🔍 [PipelineService] Usando ${clientName}...`);
        
      // 🔧 CORREÇÃO: Buscar pipeline básica primeiro para evitar erro de schema cache
      const pipelineResult = await dbClient
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (pipelineResult.error || !pipelineResult.data) {
        throw new Error(`Pipeline não encontrada: ${pipelineResult.error?.message}`);
      }
      
      // Buscar relacionamentos separadamente para evitar erro de schema cache
      const [stagesResult, fieldsResult, membersResult, distributionResult, cadenceResult] = await Promise.all([
        dbClient.from('pipeline_stages').select('*').eq('pipeline_id', pipelineId),
        dbClient.from('pipeline_custom_fields').select('*').eq('pipeline_id', pipelineId),
        dbClient.from('pipeline_members').select('*').eq('pipeline_id', pipelineId),
        dbClient.from('pipeline_distribution_rules').select('*').eq('pipeline_id', pipelineId),
        dbClient.from('cadence_configs').select('*').eq('pipeline_id', pipelineId)
      ]);
      
      originalPipeline = {
        ...pipelineResult.data,
        pipeline_stages: stagesResult.data || [],
        pipeline_custom_fields: fieldsResult.data || [],
        pipeline_members: membersResult.data || [],
        pipeline_distribution_rules: distributionResult.data || [],
        cadence_configs: cadenceResult.data || []
      };
      
      console.log(`✅ [PipelineService] Sucesso com ${clientName}`);
      
    } catch (error: any) {
      console.error(`❌ [PipelineService] Erro com ${dbClient === supabaseAdmin ? 'supabaseAdmin' : 'supabase'}:`, error.message);
      pipelineError = error;
      
      // ✅ FALLBACK FINAL: Se o cliente principal falhou, tentar o outro
      if (dbClient === supabaseAdmin) {
        console.log('🔄 [PipelineService] Tentando fallback para supabase...');
        dbClient = supabase;
        try {
          const pipelineResult = await dbClient
            .from('pipelines')
            .select('*')
            .eq('id', pipelineId)
            .eq('tenant_id', tenantId)
            .single();
          
          if (!pipelineResult.error && pipelineResult.data) {
            const [stagesResult, fieldsResult, membersResult, distributionResult, cadenceResult] = await Promise.all([
              dbClient.from('pipeline_stages').select('*').eq('pipeline_id', pipelineId),
              dbClient.from('pipeline_custom_fields').select('*').eq('pipeline_id', pipelineId),
              dbClient.from('pipeline_members').select('*').eq('pipeline_id', pipelineId),
              dbClient.from('pipeline_distribution_rules').select('*').eq('pipeline_id', pipelineId),
              dbClient.from('cadence_configs').select('*').eq('pipeline_id', pipelineId)
            ]);
            
            originalPipeline = {
              ...pipelineResult.data,
              pipeline_stages: stagesResult.data || [],
              pipeline_custom_fields: fieldsResult.data || [],
              pipeline_members: membersResult.data || [],
              pipeline_distribution_rules: distributionResult.data || [],
              cadence_configs: cadenceResult.data || []
            };
            
            console.log('✅ [PipelineService] Fallback para supabase bem-sucedido');
            pipelineError = null;
          }
        } catch (fallbackError: any) {
          console.error('❌ [PipelineService] Fallback também falhou:', fallbackError.message);
          pipelineError = fallbackError;
        }
      }
    }

    if (pipelineError || !originalPipeline) {
      console.error('❌ [PipelineService] Erro ao buscar pipeline original:', pipelineError);
      throw new Error(`Pipeline não encontrada ou sem permissão: ${pipelineError?.message || 'Erro desconhecido'}`);
    }

    console.log('✅ [PipelineService] Pipeline original encontrada:', {
      id: originalPipeline.id,
      name: originalPipeline.name,
      stages: originalPipeline.pipeline_stages?.length || 0,
      fields: originalPipeline.pipeline_custom_fields?.length || 0,
      members: originalPipeline.pipeline_members?.length || 0,
      distribution_rules: originalPipeline.pipeline_distribution_rules?.length || 0,
      cadence_configs: originalPipeline.cadence_configs?.length || 0
    });

    // 2. Gerar nome único para a cópia
    const originalName = originalPipeline.name;
    let duplicateName = `${originalName} - Cópia`;
    
    // Verificar se já existe uma pipeline com este nome
    const { data: existingPipelines } = await supabaseAdmin
      .from('pipelines')
      .select('name')
      .eq('tenant_id', tenantId)
      .ilike('name', `${originalName}%`);
    
    // Se existir, encontrar próximo número disponível
    if (existingPipelines && existingPipelines.length > 0) {
      const existingNames = existingPipelines.map(p => p.name);
      let counter = 2;
      
      while (existingNames.includes(duplicateName)) {
        duplicateName = `${originalName} (${counter})`;
        counter++;
      }
    }

    // 3. Criar nova pipeline
    console.log('🔄 [PipelineService] Criando nova pipeline:', duplicateName);
    const { data: newPipeline, error: newPipelineError } = await dbClient
      .from('pipelines')
      .insert({
        name: duplicateName,
        description: `${originalPipeline.description || ''} (Duplicada)`,
        tenant_id: tenantId,
        created_by: userId,
        is_active: true,
        qualification_rules: originalPipeline.qualification_rules
      })
      .select()
      .single();
    
    console.log('🔍 [PipelineService] Resultado criação pipeline:', { 
      success: !!newPipeline, 
      error: newPipelineError?.message,
      clientUsed: dbClient === supabaseAdmin ? 'supabaseAdmin' : 'supabase'
    });

    if (newPipelineError || !newPipeline) {
      console.error('❌ [PipelineService] Erro ao criar nova pipeline:', newPipelineError);
      throw new Error('Erro ao criar nova pipeline');
    }

    console.log('✅ [PipelineService] Nova pipeline criada:', newPipeline.id);

    // 4. Duplicar stages
    if (originalPipeline.pipeline_stages?.length > 0) {
      const stagesData = originalPipeline.pipeline_stages.map((stage: any) => ({
        pipeline_id: newPipeline.id,
        name: stage.name,
        order_index: stage.order_index,
        stage_type: stage.stage_type,
        color: stage.color,
        is_default: stage.is_default,
        tenant_id: tenantId
      }));

      const { error: stagesError } = await dbClient
        .from('pipeline_stages')
        .insert(stagesData);

      if (stagesError) {
        console.error('❌ [PipelineService] Erro ao duplicar stages:', stagesError);
        // Não falhar a operação, continuar
      } else {
        console.log('✅ [PipelineService] Stages duplicadas:', stagesData.length);
      }
    }

    // 5. Duplicar custom fields
    if (originalPipeline.pipeline_custom_fields?.length > 0) {
      const fieldsData = originalPipeline.pipeline_custom_fields.map((field: any) => ({
        pipeline_id: newPipeline.id,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        field_options: field.field_options,
        is_required: field.is_required,
        field_order: field.field_order,
        placeholder: field.placeholder,
        show_in_card: field.show_in_card,
        tenant_id: tenantId
      }));

      const { error: fieldsError } = await dbClient
        .from('pipeline_custom_fields')
        .insert(fieldsData);

      if (fieldsError) {
        console.error('❌ [PipelineService] Erro ao duplicar campos:', fieldsError);
      } else {
        console.log('✅ [PipelineService] Campos customizados duplicados:', fieldsData.length);
      }
    }

    // 6. Duplicar members
    if (originalPipeline.pipeline_members?.length > 0) {
      const membersData = originalPipeline.pipeline_members.map((member: any) => ({
        pipeline_id: newPipeline.id,
        member_id: member.member_id  // ✅ CORREÇÃO: Campo correto conforme estrutura da tabela
      }));

      const { error: membersError } = await dbClient
        .from('pipeline_members')
        .insert(membersData);

      if (membersError) {
        console.error('❌ [PipelineService] Erro ao duplicar membros:', membersError);
      } else {
        console.log('✅ [PipelineService] Membros duplicados:', membersData.length);
      }
    }

    // 7. Duplicar distribution rules
    if (originalPipeline.pipeline_distribution_rules?.length > 0) {
      const distributionData = originalPipeline.pipeline_distribution_rules.map((rule: any) => ({
        pipeline_id: newPipeline.id,
        mode: rule.mode,
        is_active: rule.is_active,
        working_hours_only: rule.working_hours_only,
        skip_inactive_members: rule.skip_inactive_members,
        fallback_to_manual: rule.fallback_to_manual,
        tenant_id: tenantId
        // Não copiar campos de estatísticas (assignment_count, total_assignments, etc.)
        // Estes devem começar zerados na nova pipeline
      }));

      const { error: distributionError } = await dbClient
        .from('pipeline_distribution_rules')
        .insert(distributionData);

      if (distributionError) {
        console.error('❌ [PipelineService] Erro ao duplicar regras de distribuição:', distributionError);
      } else {
        console.log('✅ [PipelineService] Regras de distribuição duplicadas:', distributionData.length);
      }
    }

    // 8. Duplicar cadence configs
    if (originalPipeline.cadence_configs?.length > 0) {
      const cadenceData = originalPipeline.cadence_configs.map((config: any) => ({
        pipeline_id: newPipeline.id,
        stage_name: config.stage_name,
        stage_order: config.stage_order,
        tasks: config.tasks,
        is_active: config.is_active,
        tenant_id: tenantId,
        applies_to_entire_pipeline: config.applies_to_entire_pipeline,
        pause_resume_capability: config.pause_resume_capability,
        trigger_stage: config.trigger_stage
      }));

      const { error: cadenceError } = await dbClient
        .from('cadence_configs')
        .insert(cadenceData);

      if (cadenceError) {
        console.error('❌ [PipelineService] Erro ao duplicar cadências:', cadenceError);
      } else {
        console.log('✅ [PipelineService] Cadências duplicadas:', cadenceData.length);
      }
    }

    console.log('✅ [PipelineService] Duplicação concluída:', {
      originalId: pipelineId,
      newId: newPipeline.id,
      newName: duplicateName
    });

    return newPipeline;
  }
} 