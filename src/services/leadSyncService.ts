import { supabase } from '../lib/supabase';

// ============================================================================
// TIPOS ESPECÍFICOS PARA LEAD SYNC SERVICE
// ============================================================================

export interface CustomFields {
  [key: string]: string | number | boolean | null | undefined;
}

export interface LeadSyncData {
  // Dados da oportunidade (primeira etapa)
  nome_oportunidade: string;
  valor?: string;
  responsavel?: string;
  
  // Dados do lead (segunda etapa)
  nome_lead: string;
  email: string;
  telefone?: string;
  empresa?: string;
  cargo?: string;
  
  // Campos customizados tipados
  [key: string]: string | number | boolean | null | undefined;
}

export interface PipelineLeadData {
  pipeline_id: string;
  stage_id: string;
  lead_data: Record<string, unknown>;
  created_by: string;
  assigned_to?: string;
}

export interface LeadMasterData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_temperature: string;
  status: string;
  lead_source: string;
  estimated_value?: number;
  tenant_id: string;
  assigned_to?: string;
  created_by: string;
  origem: string;
}

export interface PipelineLead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  lead_data: Record<string, unknown>;
  created_by: string;
  assigned_to?: string;
  created_at: string;
  updated_at?: string;
}

export interface LeadMaster {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_temperature: string;
  status: string;
  lead_source: string;
  estimated_value?: number;
  tenant_id: string;
  assigned_to?: string;
  created_by: string;
  origem: string;
  created_at: string;
  updated_at?: string;
}

export interface SyncResult {
  pipelineLead: PipelineLead;
  leadMaster: LeadMaster;
}

export interface UserData {
  tenant_id: string;
}

export interface PipelineInfo {
  tenant_id: string;
}

export class LeadSyncService {
  /**
   * Converte valor monetário formatado para número
   */
  private static parseMonetaryValue(value: string): number | null {
    if (!value) return null;
    
    // Remove formatação brasileira (R$, pontos, vírgulas)
    const cleanValue = value
      .replace(/R\$\s?/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');
    
    const numericValue = parseFloat(cleanValue);
    return isNaN(numericValue) ? null : numericValue;
  }

  /**
   * Divide nome completo em primeiro e último nome
   */
  private static splitFullName(fullName: string): { first_name: string; last_name: string } {
    const nameParts = fullName.trim().split(' ');
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';
    
    return { first_name, last_name };
  }

  /**
   * Cria lead na tabela leads_master baseado nos dados da pipeline
   */
  static async createLeadMaster(
    syncData: LeadSyncData, 
    pipelineLeadId: string,
    tenantId: string,
    createdBy: string,
    assignedTo?: string
  ): Promise<LeadMaster> {
    try {
      console.log('🔄 Criando lead no módulo Leads:', syncData);

      // Dividir nome completo
      const { first_name, last_name } = this.splitFullName(syncData.nome_lead);

      // Converter valor monetário
      const estimated_value = this.parseMonetaryValue(syncData.valor || '');

      // Preparar dados para leads_master
      const leadMasterData: LeadMasterData = {
        first_name,
        last_name,
        email: syncData.email,
        phone: syncData.telefone || undefined,
        company: syncData.empresa || undefined,
        job_title: syncData.cargo || undefined,
        lead_temperature: 'warm', // Padrão para leads vindos da pipeline
        status: 'active',
        lead_source: 'Pipeline',
        estimated_value: estimated_value || undefined,
        tenant_id: tenantId,
        assigned_to: assignedTo || undefined,
        created_by: createdBy,
        origem: 'Pipeline'
      };

      // Inserir na tabela leads_master
      const { data: leadMaster, error } = await supabase
        .from('leads_master')
        .insert([leadMasterData])
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar lead master:', error);
        throw error;
      }

      console.log('✅ Lead criado no módulo Leads:', leadMaster);
      return leadMaster as LeadMaster;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro no LeadSyncService.createLeadMaster:', error);
      throw new Error(`Erro ao criar lead no módulo Leads: ${errorMessage}`);
    }
  }

  /**
   * Cria oportunidade na pipeline e sincroniza com leads_master
   */
  static async createOpportunityWithLead(
    syncData: LeadSyncData,
    pipelineData: PipelineLeadData
  ): Promise<SyncResult> {
    try {
      console.log('🚀 Iniciando criação de oportunidade com lead:', { syncData, pipelineData });

      // 1. Criar lead na pipeline (oportunidade)
      const { data: pipelineLead, error: pipelineError } = await supabase
        .from('pipeline_leads')
        .insert([{
          pipeline_id: pipelineData.pipeline_id,
          stage_id: pipelineData.stage_id,
          lead_data: pipelineData.lead_data,
          created_by: pipelineData.created_by,
          assigned_to: pipelineData.assigned_to
        }])
        .select()
        .single();

      if (pipelineError || !pipelineLead) {
        console.error('❌ Erro ao criar pipeline lead:', pipelineError);
        throw pipelineError;
      }

      console.log('✅ Pipeline lead criado:', pipelineLead);

      // 2. Buscar tenant_id do usuário e da pipeline
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', pipelineData.created_by)
        .single();

      // Buscar tenant_id da pipeline como fallback
      const { data: pipelineInfo, error: pipelineInfoError } = await supabase
        .from('pipelines')
        .select('tenant_id')
        .eq('id', pipelineData.pipeline_id)
        .single();

      if (userError || !userData?.tenant_id) {
        console.warn('⚠️ Não foi possível obter tenant_id do usuário');
      }

      if (pipelineInfoError || !pipelineInfo?.tenant_id) {
        console.warn('⚠️ Não foi possível obter tenant_id da pipeline');
      }

      // Priorizar tenant_id do usuário, depois da pipeline, depois usar created_by como fallback
      const tenantId = userData?.tenant_id || pipelineInfo?.tenant_id || pipelineData.created_by;
      
      console.log('🔍 Debug tenant_id:', {
        userTenantId: userData?.tenant_id,
        pipelineTenantId: pipelineInfo?.tenant_id,
        finalTenantId: tenantId,
        createdBy: pipelineData.created_by
      });

      // 3. Criar lead no módulo Leads
      const leadMaster = await this.createLeadMaster(
        syncData,
        pipelineLead.id,
        tenantId,
        pipelineData.created_by,
        pipelineData.assigned_to
      );

      // 4. Atualizar pipeline_leads com referência ao lead_master
      try {
        const { error: updateError } = await supabase
          .from('pipeline_leads')
          .update({ lead_master_id: leadMaster.id })
          .eq('id', pipelineLead.id);

        if (updateError) {
          console.warn('⚠️ Erro ao atualizar referência do lead_master:', updateError);
        } else {
          console.log('✅ Referência lead_master_id atualizada no pipeline_leads');
        }
      } catch (updateError: unknown) {
        console.warn('⚠️ Erro ao atualizar referência:', updateError);
      }

      console.log('🎉 Sincronização completa!', {
        pipelineLeadId: pipelineLead.id,
        leadMasterId: leadMaster.id
      });

      return {
        pipelineLead: pipelineLead as PipelineLead,
        leadMaster
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro no LeadSyncService.createOpportunityWithLead:', error);
      throw new Error(`Erro ao criar oportunidade: ${errorMessage}`);
    }
  }

  /**
   * Sincroniza atualizações do lead_master para pipeline_leads
   */
  static async syncLeadMasterUpdate(
    pipelineLeadId: string,
    updatedData: Partial<LeadMaster>
  ): Promise<void> {
    try {
      console.log('🔄 Sincronizando atualização de lead master para pipeline:', pipelineLeadId, updatedData);

      // Buscar dados atuais do pipeline_lead
      const { data: pipelineLead, error: fetchError } = await supabase
        .from('pipeline_leads')
        .select('lead_data, id')
        .eq('id', pipelineLeadId)
        .single();

      if (fetchError || !pipelineLead) {
        console.error('❌ Pipeline lead não encontrado:', pipelineLeadId);
        return;
      }

      // Atualizar lead_data com novos dados
      const currentLeadData = pipelineLead.lead_data || {};
      const updatedLeadData = {
        ...currentLeadData,
        ...updatedData,
        last_sync_at: new Date().toISOString()
      };

      // Atualizar pipeline_leads
      const { error: updateError } = await supabase
        .from('pipeline_leads')
        .update({ lead_data: updatedLeadData })
        .eq('id', pipelineLeadId);

      if (updateError) {
        console.error('❌ Erro ao sincronizar atualização:', updateError);
        throw updateError;
      }

      console.log('✅ Sincronização de atualização completa!');

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro no LeadSyncService.syncLeadMasterUpdate:', error);
      throw new Error(`Erro na sincronização: ${errorMessage}`);
    }
  }

  /**
   * Remove sincronização quando pipeline_lead é deletado
   */
  static async syncLeadMasterDelete(pipelineLeadId: string): Promise<void> {
    try {
      console.log('🗑️ Processando exclusão de pipeline lead:', pipelineLeadId);

      // Buscar lead_master_id antes de deletar
      const { data: pipelineLead, error: fetchError } = await supabase
        .from('pipeline_leads')
        .select('lead_master_id')
        .eq('id', pipelineLeadId)
        .single();

      if (fetchError || !pipelineLead?.lead_master_id) {
        console.log('⚠️ Pipeline lead não tem lead_master_id associado');
        return;
      }

      // Marcar lead_master como órfão ou remover dependendo da regra de negócio
      const { error: updateError } = await supabase
        .from('leads_master')
        .update({ 
          status: 'orphaned',
          origem: 'Pipeline (removida)',
          updated_at: new Date().toISOString()
        })
        .eq('id', pipelineLead.lead_master_id);

      if (updateError) {
        console.error('❌ Erro ao marcar lead master como órfão:', updateError);
      } else {
        console.log('✅ Lead master marcado como órfão');
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro no LeadSyncService.syncLeadMasterDelete:', error);
      throw new Error(`Erro ao processar exclusão: ${errorMessage}`);
    }
  }
} 