import { supabase } from '../lib/supabase';

export interface LeadSyncData {
  // Dados da oportunidade (primeira etapa)
  nome_oportunidade: string;
  valor?: string;
  responsavel?: string;
  
  // Dados do lead (segunda etapa)
  nome_lead: string;
  email: string;
  telefone?: string;
  
  // Campos customizados
  [key: string]: any;
}

export interface PipelineLeadData {
  pipeline_id: string;
  stage_id: string;
  lead_data: any;
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
  ): Promise<any> {
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
      return leadMaster;

    } catch (error: any) {
      console.error('❌ Erro no LeadSyncService.createLeadMaster:', error);
      throw new Error(`Erro ao criar lead no módulo Leads: ${error.message}`);
    }
  }

  /**
   * Cria oportunidade na pipeline e sincroniza com leads_master
   */
  static async createOpportunityWithLead(
    syncData: LeadSyncData,
    pipelineData: PipelineLeadData
  ): Promise<{ pipelineLead: any; leadMaster: any }> {
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

      if (pipelineError) {
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
      await supabase
        .from('pipeline_leads')
        .update({ 
          lead_data: {
            ...pipelineData.lead_data,
            lead_master_id: leadMaster.id
          }
        })
        .eq('id', pipelineLead.id);

      console.log('🎉 Oportunidade e lead criados com sucesso!');

      return {
        pipelineLead,
        leadMaster
      };

    } catch (error: any) {
      console.error('❌ Erro no LeadSyncService.createOpportunityWithLead:', error);
      throw new Error(`Erro ao criar oportunidade com lead: ${error.message}`);
    }
  }

  /**
   * Atualiza lead_master quando pipeline_lead for atualizado
   */
  static async syncLeadMasterUpdate(
    pipelineLeadId: string,
    updatedData: any
  ): Promise<void> {
    try {
      console.log('🔄 Sincronizando atualização do lead:', { pipelineLeadId, updatedData });

      // Buscar lead_master vinculado pelo email (já que não temos pipeline_lead_id)
      const { data: pipelineLeadData, error: pipelineError } = await supabase
        .from('pipeline_leads')
        .select('lead_data')
        .eq('id', pipelineLeadId)
        .single();

      if (pipelineError || !pipelineLeadData?.lead_data?.email_lead) {
        console.log('ℹ️ Pipeline lead não encontrado para sincronização');
        return;
      }

      const { data: leadMaster, error: findError } = await supabase
        .from('leads_master')
        .select('id')
        .eq('email', pipelineLeadData.lead_data.email_lead)
        .single();

      if (findError || !leadMaster) {
        console.log('ℹ️ Lead master não encontrado para sincronização');
        return;
      }

      // Preparar dados para atualização
      const updateData: Partial<LeadMasterData> = {};

      if (updatedData.nome_lead) {
        const { first_name, last_name } = this.splitFullName(updatedData.nome_lead);
        updateData.first_name = first_name;
        updateData.last_name = last_name;
      }

      if (updatedData.email) {
        updateData.email = updatedData.email;
      }

      if (updatedData.telefone) {
        updateData.phone = updatedData.telefone;
      }

             if (updatedData.valor) {
         const parsedValue = this.parseMonetaryValue(updatedData.valor);
         updateData.estimated_value = parsedValue || undefined;
       }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('leads_master')
          .update(updateData)
          .eq('id', leadMaster.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar lead master:', updateError);
          throw updateError;
        }

        console.log('✅ Lead master sincronizado com sucesso');
      }

    } catch (error: any) {
      console.error('❌ Erro no LeadSyncService.syncLeadMasterUpdate:', error);
      // Não lançar erro para não quebrar o fluxo principal
    }
  }

  /**
   * Remove lead_master quando pipeline_lead for removido
   */
  static async syncLeadMasterDelete(pipelineLeadId: string): Promise<void> {
    try {
      console.log('🗑️ Removendo lead master vinculado:', pipelineLeadId);

      // Buscar lead_master vinculado pelo email (já que não temos pipeline_lead_id)
      const { data: pipelineLeadData, error: pipelineError } = await supabase
        .from('pipeline_leads')
        .select('lead_data')
        .eq('id', pipelineLeadId)
        .single();

      if (pipelineError || !pipelineLeadData?.lead_data?.email_lead) {
        console.log('ℹ️ Pipeline lead não encontrado para exclusão');
        return;
      }

      const { error } = await supabase
        .from('leads_master')
        .delete()
        .eq('email', pipelineLeadData.lead_data.email_lead);

      if (error) {
        console.error('❌ Erro ao remover lead master:', error);
        throw error;
      }

      console.log('✅ Lead master removido com sucesso');

    } catch (error: any) {
      console.error('❌ Erro no LeadSyncService.syncLeadMasterDelete:', error);
      // Não lançar erro para não quebrar o fluxo principal
    }
  }
} 