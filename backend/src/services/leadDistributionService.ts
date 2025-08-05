import { supabase } from '../config/supabase';
import { CadenceService } from './cadenceService';

export interface CreateLeadPayload {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  pipeline_id: string;
  created_via: 'form' | 'webhook' | 'manual';
  created_by?: string;
  additional_fields?: { [key: string]: any };
}

export interface DistributionRule {
  id: string;
  pipeline_id: string;
  mode: 'rodizio' | 'manual';
  last_assigned_member_id?: string;
}

export interface PipelineMember {
  id: string;
  pipeline_id: string;
  member_id: string;
  users: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
  };
}

export class LeadDistributionService {
  
  /**
   * Criar lead com distribuição automática
   */
  static async createLead(payload: CreateLeadPayload) {
    console.log('🎯 Iniciando criação de lead com distribuição:', payload.pipeline_id);

    try {
      // 1. Validar pipeline
      const pipeline = await this.validatePipeline(payload.pipeline_id, payload.created_by);
      if (!pipeline) {
        throw new Error('Pipeline não encontrada ou sem permissão');
      }

      // 2. Obter primeira etapa da pipeline
      const firstStage = await this.getFirstStage(payload.pipeline_id);
      if (!firstStage) {
        throw new Error('Pipeline não possui etapas configuradas');
      }

      // 3. Preparar dados do lead
      const leadData = {
        first_name: payload.first_name,
        last_name: payload.last_name || '',
        email: payload.email,
        phone: payload.phone || '',
        company: payload.company || '',
        ...payload.additional_fields
      };

      // 4. Criar lead na primeira etapa
      const { data: lead, error: leadError } = await supabase
        .from('pipeline_leads')
        .insert({
          pipeline_id: payload.pipeline_id,
          stage_id: firstStage.id,
          custom_data: leadData,
          created_by: payload.created_by || null,
          created_via: payload.created_via,
          assigned_to: null // Será definido pela distribuição
        })
        .select()
        .single();

      if (leadError) throw leadError;

      console.log('✅ Lead criado:', lead.id);

      // 5. Aplicar distribuição
      const assignedTo = await this.distributeLeadToMember(lead.id, payload.pipeline_id);

      // 6. Registrar no histórico
      await this.createLeadHistory(lead.id, 'lead_created', payload.created_by || null, {
        created_via: payload.created_via,
        pipeline_id: payload.pipeline_id,
        assigned_to: assignedTo
      });

      // 7. ✅ AUTOMAÇÃO: Gerar atividades de cadência automaticamente
      try {
        console.log('🎯 [AUTO-CADENCE] Gerando atividades automáticas para lead:', lead.id.substring(0, 8));
        
        const cadenceResult = await CadenceService.generateTaskInstancesForLead(
          lead.id,
          firstStage.id,
          pipeline.tenant_id,
          assignedTo || payload.created_by || 'system'
        );

        console.log('✅ [AUTO-CADENCE] Atividades geradas automaticamente:', {
          leadId: lead.id.substring(0, 8),
          stageId: firstStage.id.substring(0, 8),
          success: cadenceResult.success,
          tasksCreated: cadenceResult.tasks_created || 0,
          message: cadenceResult.message
        });

      } catch (cadenceError: any) {
        console.warn('⚠️ [AUTO-CADENCE] Erro ao gerar atividades automáticas (não crítico):', {
          leadId: lead.id.substring(0, 8),
          error: cadenceError.message,
          note: 'Lead foi criado com sucesso, apenas as atividades falharam'
        });
        // Não interromper criação do lead se atividades falharem
      }

      // 8. Retornar lead com informações de atribuição
      const finalLead = {
        ...lead,
        assigned_to: assignedTo,
        custom_data: leadData
      };

      console.log('🎉 Lead criado e distribuído com sucesso:', finalLead.id);
      return finalLead;

    } catch (error: any) {
      console.error('❌ Erro ao criar lead:', error);
      throw new Error(`Erro ao criar lead: ${error.message}`);
    }
  }

  /**
   * Distribuir lead para membro baseado na regra da pipeline
   */
  static async distributeLeadToMember(leadId: string, pipelineId: string): Promise<string | null> {
    console.log('🔄 Distribuindo lead:', leadId, 'pipeline:', pipelineId);

    try {
      // 1. Obter regra de distribuição
      const { data: rule, error: ruleError } = await supabase
        .from('pipeline_distribution_rules')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .single();

      if (ruleError || !rule) {
        console.log('⚠️ Regra não encontrada, usando distribuição manual');
        return null;
      }

      console.log('📋 Regra de distribuição:', rule.mode);

      if (rule.mode === 'manual') {
        console.log('📝 Modo manual - lead não será atribuído automaticamente');
        return null;
      }

      if (rule.mode === 'rodizio') {
        return await this.assignLeadByRoundRobin(leadId, pipelineId, rule);
      }

      return null;

    } catch (error: any) {
      console.error('❌ Erro na distribuição:', error);
      return null;
    }
  }

  /**
   * Atribuir lead por rodízio
   */
  static async assignLeadByRoundRobin(leadId: string, pipelineId: string, rule: DistributionRule): Promise<string | null> {
    console.log('🔄 Aplicando rodízio para pipeline:', pipelineId);

    try {
      // 1. Obter membros ativos da pipeline com ordenação consistente
      const { data: members, error: membersError } = await supabase
        .from('pipeline_members')
        .select(`
          *,
          users:member_id (
            id,
            first_name,
            last_name,
            email,
            is_active,
            role
          )
        `)
        .eq('pipeline_id', pipelineId)
        .order('member_id', { ascending: true }); // Ordenação consistente para rodízio justo

      if (membersError || !members || members.length === 0) {
        console.log('⚠️ Nenhum membro encontrado na pipeline');
        return null;
      }

      // 2. Filtrar apenas membros ativos com role 'member'
      const activeMembers = members
        .filter(m => m.users && m.users.is_active && m.users.role === 'member')
        .map(m => m.users)
        .sort((a, b) => a.id.localeCompare(b.id)); // Garantir ordem consistente

      if (activeMembers.length === 0) {
        console.log('⚠️ Nenhum membro ativo na pipeline');
        return null;
      }

      console.log('👥 Membros ativos encontrados:', activeMembers.length);
      console.log('📋 Membros ordenados:', activeMembers.map(m => `${m.first_name} ${m.last_name} (${m.email})`));

      // 3. Determinar próximo membro no rodízio
      let nextMember;
      
      if (!rule.last_assigned_member_id) {
        // Primeiro lead - pegar primeiro membro da lista ordenada
        nextMember = activeMembers[0];
        console.log('🥇 Primeira atribuição - selecionado:', nextMember.email);
      } else {
        // Encontrar índice do último membro atribuído
        const lastIndex = activeMembers.findIndex(m => m.id === rule.last_assigned_member_id);
        if (lastIndex === -1) {
          // Último membro não encontrado (pode ter sido removido), pegar primeiro
          nextMember = activeMembers[0];
          console.log('🔄 Último membro não encontrado, reiniciando com:', nextMember.email);
        } else {
          // Pegar próximo membro (circular)
          const nextIndex = (lastIndex + 1) % activeMembers.length;
          nextMember = activeMembers[nextIndex];
          console.log(`🎯 Rodízio: ${lastIndex} → ${nextIndex}, selecionado:`, nextMember.email);
        }
      }

      // 4. Usar transação para garantir atomicidade
      const { data: transaction, error: transactionError } = await supabase.rpc('assign_lead_round_robin', {
        p_lead_id: leadId,
        p_pipeline_id: pipelineId,
        p_assigned_to: nextMember.id,
        p_last_assigned_member_id: nextMember.id
      });

      if (transactionError) {
        // Fallback para método manual se a função RPC não existir
        console.log('⚠️ Função RPC não disponível, usando método manual');
        
        // 4a. Atribuir lead ao membro
        const { error: updateError } = await supabase
          .from('pipeline_leads')
          .update({ assigned_to: nextMember.id })
          .eq('id', leadId);

        if (updateError) throw updateError;

        // 4b. Atualizar último membro atribuído na regra
        const { error: ruleUpdateError } = await supabase
          .from('pipeline_distribution_rules')
          .update({ 
            last_assigned_member_id: nextMember.id,
            updated_at: new Date().toISOString()
          })
          .eq('pipeline_id', pipelineId);

        if (ruleUpdateError) {
          console.warn('⚠️ Erro ao atualizar regra:', ruleUpdateError);
        }
      }

      // 5. Registrar atribuição (assigned_by = null indica rodízio automático)
      await this.createLeadAssignment(leadId, nextMember.id, null);

      // 6. Registrar no histórico
      await this.createLeadHistory(leadId, 'automatic_assignment', null, {
        assigned_to: nextMember.id,
        assignment_method: 'round_robin',
        pipeline_id: pipelineId,
        member_name: `${nextMember.first_name} ${nextMember.last_name}`,
        member_email: nextMember.email
      });

      console.log('✅ Lead atribuído por rodízio a:', nextMember.email);
      return nextMember.id;

    } catch (error: any) {
      console.error('❌ Erro no rodízio:', error);
      return null;
    }
  }

  /**
   * Registrar atribuição de lead
   */
  static async createLeadAssignment(leadId: string, assignedTo: string, assignedBy: string | null) {
    try {
      const { error } = await supabase
        .from('lead_assignments')
        .insert({
          lead_id: leadId,
          assigned_to: assignedTo,
          assigned_by: assignedBy,
          is_active: true
        });

      if (error) {
        console.warn('⚠️ Erro ao registrar atribuição:', error);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao registrar atribuição:', error);
    }
  }

  /**
   * Criar entrada no histórico
   */
  static async createLeadHistory(leadId: string, action: string, performedBy: string | null, newValues: any = {}) {
    try {
      const { error } = await supabase
        .from('lead_history')
        .insert({
          lead_id: leadId,
          action,
          performed_by: performedBy,
          new_values: newValues,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.warn('⚠️ Erro ao registrar histórico:', error);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao registrar histórico:', error);
    }
  }

  /**
   * Validar pipeline e permissões
   */
  static async validatePipeline(pipelineId: string, createdBy?: string) {
    try {
      let query = supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .eq('is_active', true);

      // Se tem created_by, validar se pertence ao tenant
      if (createdBy) {
        const { data: user } = await supabase
          .from('users')
          .select('tenant_id, role')
          .eq('id', createdBy)
          .single();

        if (user) {
          query = query.eq('tenant_id', user.tenant_id);
        }
      }

      const { data: pipeline, error } = await query.single();

      if (error || !pipeline) {
        console.log('❌ Pipeline não encontrada:', pipelineId);
        return null;
      }

      return pipeline;
    } catch (error) {
      console.error('❌ Erro ao validar pipeline:', error);
      return null;
    }
  }

  /**
   * Obter primeira etapa da pipeline
   */
  static async getFirstStage(pipelineId: string) {
    try {
      const { data: stage, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('order_index', { ascending: true })
        .limit(1)
        .single();

      if (error || !stage) {
        console.log('❌ Primeira etapa não encontrada para pipeline:', pipelineId);
        return null;
      }

      return stage;
    } catch (error) {
      console.error('❌ Erro ao buscar primeira etapa:', error);
      return null;
    }
  }

  /**
   * Obter regra de distribuição da pipeline
   */
  static async getDistributionRule(pipelineId: string): Promise<DistributionRule | null> {
    try {
      const { data: rule, error } = await supabase
        .from('pipeline_distribution_rules')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .single();

      if (error || !rule) {
        return null;
      }

      return rule;
    } catch (error) {
      console.error('❌ Erro ao buscar regra de distribuição:', error);
      return null;
    }
  }

  /**
   * Atualizar regra de distribuição
   */
  static async updateDistributionRule(pipelineId: string, mode: 'rodizio' | 'manual') {
    try {
      const { data, error } = await supabase
        .from('pipeline_distribution_rules')
        .upsert({
          pipeline_id: pipelineId,
          mode: mode,
          last_assigned_member_id: null // Reset ao mudar modo
        }, {
          onConflict: 'pipeline_id'
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Regra de distribuição atualizada:', pipelineId, mode);
      return data;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar regra:', error);
      throw error;
    }
  }
} 