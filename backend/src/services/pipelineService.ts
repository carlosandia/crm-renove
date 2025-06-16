import { supabase } from '../index';

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

export class PipelineService {
  // Query otimizada única para buscar pipelines com todos os relacionamentos
  static async getPipelinesByTenant(tenantId: string): Promise<Pipeline[]> {
    // Primeiro buscar pipelines
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

    // Para cada pipeline, buscar membros e etapas
    const pipelinesWithDetails = await Promise.all(
      pipelines.map(async (pipeline) => {
        // Buscar membros
        const { data: pipelineMembers } = await supabase
          .from('pipeline_members')
          .select('*')
          .eq('pipeline_id', pipeline.id);

        // Buscar dados dos usuários membros
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

        // Buscar etapas
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

    // Criar pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert(pipelineData)
      .select()
      .single();

    if (pipelineError) {
      throw new Error(`Erro ao criar pipeline: ${pipelineError.message}`);
    }

    // Adicionar membros se fornecidos
    if (member_ids && member_ids.length > 0) {
      const memberInserts = member_ids.map(member_id => ({
        pipeline_id: pipeline.id,
        member_id
      }));

      const { error: membersError } = await supabase
        .from('pipeline_members')
        .insert(memberInserts);

      if (membersError) {
        console.warn('Erro ao adicionar membros:', membersError);
      }
    }

    return pipeline;
  }

  static async updatePipeline(id: string, data: UpdatePipelineData): Promise<Pipeline> {
    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar pipeline: ${error.message}`);
    }

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
    // Query otimizada para buscar pipelines do membro
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

    // Buscar pipelines primeiro
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

    // Para cada pipeline, buscar as etapas e campos customizados separadamente
    const pipelinesWithDetails = await Promise.all(
      pipelines.map(async (pipeline) => {
        // Buscar etapas
        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', pipeline.id)
          .order('order_index');

        // Buscar campos customizados
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