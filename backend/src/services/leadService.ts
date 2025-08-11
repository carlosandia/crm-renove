import { supabase } from '../config/supabase';
import { supabaseAdmin } from './supabase-admin';
import { LeadTasksService } from './leadTasksService';
import { CadenceService } from './cadenceService';

export interface Lead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  lead_data: { [key: string]: any }; // Dados dos campos customizados
  created_by: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  moved_at: string;
}

export interface CreateLeadData {
  pipeline_id: string;
  stage_id: string;
  lead_data: { [key: string]: any };
  created_by: string;
  assigned_to?: string;
}

export interface UpdateLeadData {
  stage_id?: string;
  lead_data?: { [key: string]: any };
  assigned_to?: string;
  moved_at?: string;
}

export class LeadService {
  static async getLeadsByPipeline(pipelineId: string): Promise<Lead[]> {
    // ✅ CORREÇÃO POSIÇÃO: Ordenar por position primeiro, depois created_at como fallback
    const { data: leads, error } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar leads: ${error.message}`);
    }

    return leads || [];
  }

  static async getLeadsByStage(stageId: string): Promise<Lead[]> {
    // ✅ CORREÇÃO POSIÇÃO: Ordenar por position primeiro, depois moved_at como fallback
    const { data: leads, error } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('stage_id', stageId)
      .order('position', { ascending: true, nullsFirst: false })
      .order('moved_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar leads da etapa: ${error.message}`);
    }

    return leads || [];
  }

  static async getLeadById(id: string): Promise<Lead | null> {
    const { data: lead, error } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Erro ao buscar lead: ${error.message}`);
    }

    return lead;
  }

  static async createLead(data: CreateLeadData): Promise<Lead> {
    const { data: lead, error } = await supabase
      .from('pipeline_leads')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar lead: ${error.message}`);
    }

    return lead;
  }

  static async updateLead(id: string, data: UpdateLeadData): Promise<Lead> {
    const updateData = {
      ...data,
      moved_at: data.stage_id ? new Date().toISOString() : undefined
    };

    const { data: lead, error } = await supabase
      .from('pipeline_leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar lead: ${error.message}`);
    }

    return lead;
  }

  static async deleteLead(id: string): Promise<void> {
    const { error } = await supabase
      .from('pipeline_leads')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir lead: ${error.message}`);
    }
  }

  static async moveLeadToStage(leadId: string, newStageId: string, position?: number): Promise<Lead> {
    console.log('🔄 [MOVE LEAD] Iniciando movimentação:', {
      leadId: leadId.substring(0, 8),
      newStageId: newStageId.substring(0, 8),
      hasPosition: position !== undefined,
      position
    });

    // ✅ CORREÇÃO CRÍTICA: Lógica simplificada usando updateLead
    const updateData: UpdateLeadData = {
      stage_id: newStageId,
      moved_at: new Date().toISOString()
    };

    // ✅ POSIÇÃO OPCIONAL: Incluir posição se fornecida
    if (position !== undefined && position !== null) {
      // Converter position para campo no updateData
      // Como UpdateLeadData não tem position, vamos usar o método direto
      console.log('🎯 [MOVE LEAD] Incluindo posição:', position);
      
      const positionNum = typeof position === 'number' ? position : parseInt(String(position));
      const { data: lead, error } = await supabase
        .from('pipeline_leads')
        .update({
          stage_id: newStageId,
          position: !isNaN(positionNum) ? positionNum : null,
          moved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .select()
        .single();

      if (error) {
        console.error('❌ [MOVE LEAD] Erro ao mover lead com posição:', error);
        throw new Error(`Erro ao mover lead para posição específica: ${error.message}`);
      }

      console.log('✅ [MOVE LEAD] Lead movido com posição com sucesso');
    } else {
      // ✅ LÓGICA PADRÃO: Sem posição específica
      console.log('📍 [MOVE LEAD] Movendo lead sem posição específica');
      await this.updateLead(leadId, updateData);
    }

    // Buscar lead atualizado para retornar
    const { data: updatedLead, error: fetchError } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError || !updatedLead) {
      throw new Error(`Erro ao buscar lead atualizado: ${fetchError?.message}`);
    }

    // 🔥 TAREFAS ASSÍNCRONAS - Não aguardar, executar em background
    setImmediate(() => {
      this.generateCadenceTasksForLeadAsync(updatedLead, newStageId)
        .catch(error => {
          console.warn('⚠️ Erro na geração assíncrona de tarefas:', error.message);
        });
    });

    return updatedLead;
  }

  static async getLeadsByMember(memberId: string): Promise<Lead[]> {
    // ✅ CORREÇÃO POSIÇÃO: Ordenar por position primeiro, depois updated_at como fallback
    const { data: leads, error } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('assigned_to', memberId)
      .order('position', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar leads do membro: ${error.message}`);
    }

    return leads || [];
  }

  /**
   * 🚀 NOVA FUNÇÃO - Gerar tarefas de forma completamente assíncrona
   * Não bloqueia o fluxo principal de movimentação
   */
  static async generateCadenceTasksForLeadAsync(lead: Lead, newStageId: string): Promise<number> {
    try {
      console.log('🔄 [LeadService] Iniciando geração assíncrona de tarefas:', {
        leadId: lead.id.substring(0, 8),
        newStageId: newStageId.substring(0, 8),
        leadPipelineId: lead.pipeline_id.substring(0, 8),
        assignedTo: lead.assigned_to?.substring(0, 8),
        timestamp: new Date().toISOString()
      });

      // Buscar informações da etapa e pipeline em paralelo
      console.log('🔍 [LeadService] Buscando dados de stage e pipeline...');
      const [stageResult, pipelineResult] = await Promise.allSettled([
        supabase
          .from('pipeline_stages')
          .select('name, pipeline_id')
          .eq('id', newStageId)
          .single(),
        
        supabase
          .from('pipelines')
          .select('tenant_id')
          .eq('id', lead.pipeline_id)
          .single()
      ]);

      // ✅ DIAGNÓSTICO DETALHADO: Logs específicos para cada consulta
      if (stageResult.status === 'rejected') {
        console.error('❌ [LeadService] Falha ao buscar stage:', {
          newStageId: newStageId.substring(0, 8),
          error: stageResult.reason,
          errorCode: (stageResult.reason as any)?.code,
          errorMessage: (stageResult.reason as any)?.message
        });
        return 0;
      }

      if (pipelineResult.status === 'rejected') {
        console.error('❌ [LeadService] Falha ao buscar pipeline:', {
          pipelineId: lead.pipeline_id.substring(0, 8),
          error: pipelineResult.reason,
          errorCode: (pipelineResult.reason as any)?.code,
          errorMessage: (pipelineResult.reason as any)?.message
        });
        return 0;
      }

      const stage = stageResult.value.data;
      const pipeline = pipelineResult.value.data;

      console.log('📋 [LeadService] Dados obtidos:', {
        stage: stage ? { name: stage.name, pipeline_id: stage.pipeline_id.substring(0, 8) } : 'null',
        pipeline: pipeline ? { tenant_id: pipeline.tenant_id.substring(0, 8) } : 'null'
      });

      if (!stage || !pipeline) {
        console.warn('⚠️ [LeadService] Dados insuficientes para geração de tarefas:', {
          hasStage: !!stage,
          hasPipeline: !!pipeline,
          stageData: stage,
          pipelineData: pipeline
        });
        return 0;
      }

      // ✅ VALIDAÇÃO ADICIONAL: Verificar se stage pertence à mesma pipeline
      if (stage.pipeline_id !== lead.pipeline_id) {
        console.error('❌ [LeadService] Stage não pertence à pipeline do lead:', {
          leadPipelineId: lead.pipeline_id.substring(0, 8),
          stagePipelineId: stage.pipeline_id.substring(0, 8),
          stageName: stage.name
        });
        return 0;
      }

      console.log('🎯 [LeadService] Chamando LeadTasksService.generateTasksForLeadStageEntry...');
      
      // Gerar tarefas usando o serviço
      const tasksGenerated = await LeadTasksService.generateTasksForLeadStageEntry(
        lead.id,
        lead.pipeline_id,
        newStageId,
        stage.name,
        lead.assigned_to,
        pipeline.tenant_id
      );

      console.log('📊 [LeadService] Resultado da geração de tarefas:', {
        leadId: lead.id.substring(0, 8),
        stageName: stage.name,
        tasksGenerated,
        success: tasksGenerated > 0
      });

      if (tasksGenerated > 0) {
        console.log(`✅ [LeadService] ${tasksGenerated} tarefas de cadência geradas com sucesso para lead ${lead.id.substring(0, 8)}`);
      } else {
        console.warn(`⚠️ [LeadService] Nenhuma tarefa foi gerada para lead ${lead.id.substring(0, 8)} na etapa "${stage.name}"`);
      }

      return tasksGenerated;
    } catch (error: any) {
      console.error('❌ [LeadService] Erro crítico na geração assíncrona de tarefas:', {
        leadId: lead.id?.substring(0, 8),
        newStageId: newStageId?.substring(0, 8),
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return 0;
    }
  }

  /**
   * 🔥 ENDPOINT PÚBLICO - Para chamadas do frontend
   */
  static async generateCadenceTasksForLeadEndpoint(leadId: string, stageId: string): Promise<{ success: boolean; tasksGenerated: number }> {
    try {
      // Buscar o lead
      const lead = await this.getLeadById(leadId);
      if (!lead) {
        return { success: false, tasksGenerated: 0 };
      }

      // Gerar tarefas assincronamente
      const tasksGenerated = await this.generateCadenceTasksForLeadAsync(lead, stageId);
      
      return { success: true, tasksGenerated };
    } catch (error: any) {
      console.error('❌ Erro no endpoint de geração de tarefas:', error.message);
      return { success: false, tasksGenerated: 0 };
    }
  }
} 