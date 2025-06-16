import { supabase } from '../index';

export interface PipelineMember {
  id: string;
  pipeline_id: string;
  member_id: string;
  assigned_at: string;
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export class MemberService {
  static async addMemberToPipeline(pipelineId: string, memberId: string): Promise<PipelineMember> {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('pipeline_members')
      .select('id')
      .eq('pipeline_id', pipelineId)
      .eq('member_id', memberId)
      .single();

    if (existing) {
      throw new Error('Membro já está vinculado a esta pipeline');
    }

    // Adicionar membro
    const { data: member, error } = await supabase
      .from('pipeline_members')
      .insert({ pipeline_id: pipelineId, member_id: memberId })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao adicionar membro: ${error.message}`);
    }

    // Buscar dados do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('id', memberId)
      .single();

    return {
      ...member,
      member: userData
    };
  }

  static async removeMemberFromPipeline(pipelineId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from('pipeline_members')
      .delete()
      .eq('pipeline_id', pipelineId)
      .eq('member_id', memberId);

    if (error) {
      throw new Error(`Erro ao remover membro: ${error.message}`);
    }
  }

  static async getPipelineMembers(pipelineId: string): Promise<PipelineMember[]> {
    const { data: members, error } = await supabase
      .from('pipeline_members')
      .select(`
        *,
        users!pipeline_members_member_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('pipeline_id', pipelineId);

    if (error) {
      throw new Error(`Erro ao buscar membros: ${error.message}`);
    }

    return (members || []).map(member => ({
      ...member,
      member: member.users
    }));
  }

  static async getAvailableMembers(tenantId: string, excludePipelineId?: string): Promise<any[]> {
    let query = supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('tenant_id', tenantId)
      .eq('role', 'member');

    // Se fornecido pipeline ID, excluir membros já vinculados
    if (excludePipelineId) {
      const { data: existingMembers } = await supabase
        .from('pipeline_members')
        .select('member_id')
        .eq('pipeline_id', excludePipelineId);

      if (existingMembers && existingMembers.length > 0) {
        const excludeIds = existingMembers.map(m => m.member_id);
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
    }

    const { data: members, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar membros disponíveis: ${error.message}`);
    }

    return members || [];
  }
} 