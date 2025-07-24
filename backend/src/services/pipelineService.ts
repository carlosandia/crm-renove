import { supabase } from '../config/supabase';
import { supabaseAdmin } from './supabase-admin';

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
      const { data, error } = await supabase.rpc('validate_pipeline_name_unique', {
        p_name: name.trim(),
        p_tenant_id: tenantId, // TEXT - correto conforme verificação
        p_pipeline_id: pipelineId || null // UUID - será convertido automaticamente
      });

      if (error) {
        console.warn('⚠️ [PipelineService] Função PostgreSQL não disponível, usando fallback:', error.message);
        throw new Error('FALLBACK_NEEDED');
      }

      console.log('✅ [PipelineService] Validação PostgreSQL concluída:', data);

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
      console.error('❌ [PipelineService] Erro crítico na validação:', error);
      
      const { data: existingPipelines, error: fallbackError } = await supabase
        .from('pipelines')
        .select('name')
        .eq('tenant_id', tenantId)
        .ilike('name', name.trim())
        .eq('is_active', true);

      if (fallbackError) {
        throw new Error(`Erro na validação fallback: ${fallbackError.message}`);
      }

      const hasConflict = existingPipelines?.some(p => 
        p.name.toLowerCase().trim() === name.toLowerCase().trim()
      ) || false;

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

        return {
          ...pipeline,
          pipeline_members: membersWithUserData || [],
          pipeline_stages: stages || []
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

    console.log('✅ [PipelineService] Pipeline criada com sucesso:', {
      id: pipeline.id,
      name: pipeline.name,
      tenant_id: pipeline.tenant_id
    });

    return pipeline;
  }

  static async updatePipeline(id: string, data: UpdatePipelineData): Promise<Pipeline> {
    if (data.name) {
      console.log('🔍 [PipelineService] Validando novo nome para edição...');
      
      const currentPipeline = await this.getPipelineById(id);
      if (!currentPipeline) {
        throw new Error('Pipeline não encontrada');
      }

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

    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505' && error.message.includes('idx_pipelines_unique_name_per_tenant')) {
        throw new Error(`Já existe uma pipeline com o nome "${data.name}" nesta empresa. Escolha um nome diferente.`);
      }
      throw new Error(`Erro ao atualizar pipeline: ${error.message}`);
    }

    console.log('✅ [PipelineService] Pipeline atualizada com sucesso:', {
      id: pipeline.id,
      name: pipeline.name
    });

    return pipeline;
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

    // 1. Buscar pipeline original com todos os dados relacionados
    const { data: originalPipeline, error: pipelineError } = await supabaseAdmin
      .from('pipelines')
      .select(`
        *,
        pipeline_stages (*),
        pipeline_custom_fields (*),
        pipeline_members (*),
        pipeline_distribution_rules (*),
        cadence_configs (*)
      `)
      .eq('id', pipelineId)
      .eq('tenant_id', tenantId)
      .single();

    if (pipelineError || !originalPipeline) {
      console.error('❌ [PipelineService] Erro ao buscar pipeline original:', pipelineError);
      throw new Error('Pipeline não encontrada ou sem permissão');
    }

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
    const { data: newPipeline, error: newPipelineError } = await supabaseAdmin
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

      const { error: stagesError } = await supabaseAdmin
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

      const { error: fieldsError } = await supabaseAdmin
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
        user_id: member.user_id,
        tenant_id: tenantId
      }));

      const { error: membersError } = await supabaseAdmin
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
        rule_type: rule.rule_type,
        rule_config: rule.rule_config,
        is_active: rule.is_active,
        tenant_id: tenantId
      }));

      const { error: distributionError } = await supabaseAdmin
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
        name: config.name,
        description: config.description,
        is_active: config.is_active,
        cadence_steps: config.cadence_steps,
        tenant_id: tenantId
      }));

      const { error: cadenceError } = await supabaseAdmin
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