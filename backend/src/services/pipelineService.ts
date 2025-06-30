import { supabase } from '../config/supabase';

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
    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .select(`
        *,
        pipeline_members(
          id,
          assigned_at,
          member_id,
          users!pipeline_members_member_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        ),
        pipeline_stages(
          *,
          follow_ups(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erro ao buscar pipeline: ${error.message}`);
    }

    return {
      ...pipeline,
      pipeline_members: (pipeline.pipeline_members || []).map((pm: any) => ({
        ...pm,
        member: pm.users
      }))
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
} 