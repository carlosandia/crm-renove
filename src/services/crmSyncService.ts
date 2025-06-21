import { supabase } from '../lib/supabase';

// ============================================
// SERVIÇO DE CRM PROFISSIONAL - VERSÃO ADAPTATIVA
// Lógica dos Grandes CRMs: Lead Master + Oportunidades
// Com fallback inteligente para casos onde lead_id não existe
// ============================================

export interface LeadData {
  nome_lead?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  telefone?: string;
  phone?: string;
  empresa?: string;
  company?: string;
  cargo?: string;
  job_title?: string;
  lead_temperature?: string;
  status?: string;
  lead_source?: string;
}

export interface OpportunityData {
  nome?: string;
  nome_oportunidade?: string;
  valor?: string | number;
  responsavel?: string;
  [key: string]: any; // Campos customizados
}

export interface CreateLeadOpportunityResult {
  lead: any;
  opportunity: any;
  success: boolean;
  message: string;
  method: 'crm_sync' | 'traditional' | 'leads_only';
}

export class CRMSyncService {
  
  /**
   * CRIAR LEAD + OPORTUNIDADE (VERSÃO ADAPTATIVA)
   * Tenta diferentes métodos até encontrar um que funcione
   */
  static async createLeadWithOpportunity(
    leadData: LeadData,
    opportunityData: OpportunityData,
    pipelineId: string,
    stageId: string,
    createdBy: string,
    assignedTo?: string
  ): Promise<CreateLeadOpportunityResult> {
    
    console.log('🎯 CRM Sync: Iniciando criação adaptativa', {
      leadData,
      opportunityData,
      pipelineId,
      stageId,
      createdBy,
      assignedTo
    });

    // MÉTODO 1: Tentar CRM completo (leads_master + pipeline_leads com lead_id)
    try {
      console.log('🔄 Tentativa 1: CRM completo com vinculação');
      const crmResult = await this.tryFullCRMCreation(leadData, opportunityData, pipelineId, stageId, createdBy, assignedTo);
      if (crmResult.success) {
        console.log('✅ Sucesso no método CRM completo');
        return { ...crmResult, method: 'crm_sync' };
      }
    } catch (error: any) {
      console.warn('⚠️ Método CRM completo falhou:', error.message);
    }

    // MÉTODO 2: Tentar apenas lead master (sem vinculação)
    try {
      console.log('🔄 Tentativa 2: Apenas lead master');
      const leadOnlyResult = await this.tryLeadMasterOnly(leadData, opportunityData, createdBy, assignedTo);
      if (leadOnlyResult.success) {
        console.log('✅ Sucesso criando apenas lead master');
        return { ...leadOnlyResult, method: 'leads_only' };
      }
    } catch (error: any) {
      console.warn('⚠️ Método lead master falhou:', error.message);
    }

    // MÉTODO 3: Fallback tradicional (apenas pipeline_leads)
    console.log('🔄 Tentativa 3: Método tradicional (apenas pipeline)');
    return await this.tryTraditionalMethod(opportunityData, pipelineId, stageId, createdBy, assignedTo);
  }

  /**
   * MÉTODO 1: CRM COMPLETO COM VINCULAÇÃO (COM SUPORTE A LEAD EXISTENTE)
   */
  private static async tryFullCRMCreation(
    leadData: LeadData,
    opportunityData: OpportunityData,
    pipelineId: string,
    stageId: string,
    createdBy: string,
    assignedTo?: string
  ): Promise<CreateLeadOpportunityResult> {
    
    console.log('🔄 Tentando método CRM completo...');
    
    // Buscar tenant_id do usuário CORRIGIDO
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id, id')
      .eq('email', createdBy) // USAR EMAIL para buscar
      .single();

    if (userError || !userData?.tenant_id) {
      console.warn('⚠️ Usuário não encontrado ou sem tenant_id:', { createdBy, userError });
      throw new Error(`Usuário ${createdBy} não encontrado ou sem tenant_id`);
    }

    console.log('✅ Usuário encontrado:', userData);

    let leadMaster: any;

    // Verificar se é para usar lead existente
    const existingLeadId = (opportunityData as any).existing_lead_id;
    
    if (existingLeadId) {
      console.log('🔄 Usando lead existente:', existingLeadId);
      
      // Buscar lead existente
      const { data: existingLead, error: existingLeadError } = await supabase
        .from('leads_master')
        .select('*')
        .eq('id', existingLeadId)
        .eq('tenant_id', userData.tenant_id) // Verificar se pertence ao tenant
        .single();

      if (existingLeadError || !existingLead) {
        console.error('❌ Lead existente não encontrado:', existingLeadError);
        throw new Error('Lead existente não encontrado ou não pertence à sua empresa');
      }

      leadMaster = existingLead;
      console.log('✅ Lead existente encontrado:', leadMaster);
    } else {
      console.log('📋 Criando novo lead master...');
      
      // Preparar dados do lead master
      const { first_name, last_name } = this.splitFullName(leadData.nome_lead || leadData.first_name || '');
      
      const leadMasterData = {
        first_name: first_name || 'Nome não informado',
        last_name: last_name || '',
        email: leadData.email,
        phone: leadData.phone || leadData.telefone,
        company: leadData.company || leadData.empresa,
        job_title: leadData.job_title || leadData.cargo,
        lead_temperature: leadData.lead_temperature || 'Frio',
        status: leadData.status || 'Novo',
        lead_source: leadData.lead_source || 'Pipeline',
        estimated_value: this.parseMonetaryValue(opportunityData.valor || 0),
        tenant_id: userData.tenant_id,
        assigned_to: assignedTo, // UUID do usuário
        created_by: userData.id, // USAR ID (UUID) do usuário, não email
        origem: 'Pipeline'
      };

      console.log('📋 Dados do novo lead master:', leadMasterData);

      // 1. CRIAR LEAD MASTER
      const { data: newLeadMaster, error: leadError } = await supabase
        .from('leads_master')
        .insert([leadMasterData])
        .select()
        .single();

      if (leadError) {
        console.error('❌ Erro ao criar lead master:', leadError);
        throw leadError;
      }

      leadMaster = newLeadMaster;
      console.log('✅ Lead master criado:', leadMaster);
    }

    // 2. CRIAR OPORTUNIDADE VINCULADA (com lead_id)
    const leadFullName = `${leadMaster.first_name} ${leadMaster.last_name || ''}`.trim();
    
    const opportunityPayload = {
      lead_id: leadMaster.id, // VINCULAÇÃO
      pipeline_id: pipelineId,
      stage_id: stageId,
      lead_data: {
        ...opportunityData,
        nome_oportunidade: opportunityData.nome_oportunidade || opportunityData.nome || 'Oportunidade sem nome',
        valor_numerico: this.parseMonetaryValue(opportunityData.valor || 0),
        lead_master_id: leadMaster.id, // Backup no lead_data
        lead_name: leadFullName,
        lead_email: leadMaster.email
      },
      created_by: userData.id, // USAR ID (UUID) do usuário
      assigned_to: assignedTo
    };

    console.log('💼 Criando oportunidade vinculada:', opportunityPayload);

    const { data: opportunity, error: opportunityError } = await supabase
      .from('pipeline_leads')
      .insert([opportunityPayload])
      .select()
      .single();

    if (opportunityError) {
      console.error('❌ Erro ao criar oportunidade vinculada:', opportunityError);
      
      // Limpar lead master criado
      try {
        await supabase.from('leads_master').delete().eq('id', leadMaster.id);
        console.log('🔄 Lead master removido após falha na oportunidade');
      } catch (cleanupError) {
        console.warn('⚠️ Erro ao limpar lead master:', cleanupError);
      }
      
      throw opportunityError;
    }

    console.log('✅ Oportunidade vinculada criada:', opportunity);

    return {
      lead: leadMaster,
      opportunity: opportunity,
      success: true,
      message: 'Lead master e oportunidade criados com vinculação',
      method: 'crm_sync'
    };
  }

  /**
   * MÉTODO 2: APENAS LEAD MASTER (SEM VINCULAÇÃO)
   */
  private static async tryLeadMasterOnly(
    leadData: LeadData,
    opportunityData: OpportunityData,
    createdBy: string,
    assignedTo?: string
  ): Promise<CreateLeadOpportunityResult> {
    
    console.log('🔄 Tentando método lead master only...');
    
    // Buscar tenant_id do usuário CORRIGIDO
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id, id')
      .eq('email', createdBy) // USAR EMAIL para buscar
      .single();

    if (userError || !userData?.tenant_id) {
      console.warn('⚠️ Usuário não encontrado ou sem tenant_id:', { createdBy, userError });
      throw new Error(`Usuário ${createdBy} não encontrado ou sem tenant_id`);
    }

    console.log('✅ Usuário encontrado para lead master:', userData);

    // Preparar dados do lead master
    const { first_name, last_name } = this.splitFullName(leadData.nome_lead || leadData.first_name || '');
    
    const leadMasterData = {
      first_name: first_name || 'Nome não informado',
      last_name: last_name || '',
      email: leadData.email,
      phone: leadData.phone || leadData.telefone,
      company: leadData.company || leadData.empresa,
      job_title: leadData.job_title || leadData.cargo,
      lead_temperature: leadData.lead_temperature || 'Quente',
      status: leadData.status || 'Novo',
      lead_source: leadData.lead_source || 'Pipeline',
      estimated_value: this.parseMonetaryValue(opportunityData.valor || 0),
      tenant_id: userData.tenant_id,
      assigned_to: assignedTo, // UUID do usuário
      created_by: userData.id, // USAR ID (UUID) do usuário, não email
      origem: 'Pipeline'
    };

    console.log('📋 Criando apenas lead master:', leadMasterData);

    const { data: leadMaster, error: leadError } = await supabase
      .from('leads_master')
      .insert([leadMasterData])
      .select()
      .single();

    if (leadError) {
      console.error('❌ Erro ao criar lead master:', leadError);
      throw leadError;
    }

    console.log('✅ Lead master criado (sem oportunidade vinculada):', leadMaster);

    return {
      lead: leadMaster,
      opportunity: null,
      success: true,
      message: 'Lead master criado com sucesso (oportunidade não vinculada)',
      method: 'leads_only'
    };
  }

  /**
   * MÉTODO 3: TRADICIONAL (APENAS PIPELINE_LEADS)
   */
  private static async tryTraditionalMethod(
    opportunityData: OpportunityData,
    pipelineId: string,
    stageId: string,
    createdBy: string,
    assignedTo?: string
  ): Promise<CreateLeadOpportunityResult> {
    
    console.log('📝 Usando método tradicional (apenas pipeline_leads)');
    console.log('🎯 Dados para criação tradicional:', {
      pipelineId,
      stageId,
      createdBy,
      assignedTo,
      opportunityData
    });

    // Buscar UUID do usuário para created_by
    let userUUID = createdBy;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', createdBy)
        .single();

      if (userData?.id) {
        userUUID = userData.id;
        console.log('✅ UUID do usuário encontrado:', userUUID);
      } else {
        console.warn('⚠️ UUID não encontrado, usando email como fallback');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar UUID, usando email como fallback:', error);
    }
    
    const opportunityPayload = {
      pipeline_id: pipelineId,
      stage_id: stageId,
      lead_data: {
        ...opportunityData,
        nome_oportunidade: opportunityData.nome_oportunidade || opportunityData.nome || 'Oportunidade sem nome',
        valor_numerico: this.parseMonetaryValue(opportunityData.valor || 0),
        metodo_criacao: 'tradicional'
      },
      created_by: userUUID, // USAR UUID se encontrado, senão email
      assigned_to: assignedTo
    };

    console.log('💼 Criando oportunidade tradicional:', opportunityPayload);

    const { data: opportunity, error: opportunityError } = await supabase
      .from('pipeline_leads')
      .insert([opportunityPayload])
      .select()
      .single();

    if (opportunityError) {
      console.error('❌ Erro no método tradicional:', opportunityError);
      throw opportunityError;
    }

    console.log('✅ Oportunidade criada (método tradicional):', opportunity);
    console.log('🎯 Detalhes da oportunidade criada:', {
      id: opportunity.id,
      pipeline_id: opportunity.pipeline_id,
      stage_id: opportunity.stage_id,
      created_by: opportunity.created_by,
      assigned_to: opportunity.assigned_to,
      lead_data: opportunity.lead_data
    });

    return {
      lead: null,
      opportunity: opportunity,
      success: true,
      message: 'Oportunidade criada com método tradicional',
      method: 'traditional'
    };
  }

  /**
   * BUSCAR OPORTUNIDADES COM DADOS DO LEAD (VERSÃO ADAPTATIVA)
   */
  static async getPipelineOpportunitiesWithLeads(pipelineId: string) {
    try {
      console.log('🔍 CRM Sync: Buscando oportunidades da pipeline:', pipelineId);

      const { data, error } = await supabase
        .from('pipeline_leads')
        .select(`
          *,
          leads_master (
            id,
            first_name,
            last_name,
            email,
            phone,
            company
          )
        `)
        .eq('pipeline_id', pipelineId);

      if (error) throw error;

      console.log('✅ CRM Sync: Oportunidades encontradas:', data?.length || 0);
      return data || [];

    } catch (error: any) {
      console.error('❌ CRM Sync: Erro ao buscar oportunidades:', error);
      return [];
    }
  }

  /**
   * BUSCAR LEADS COM SUAS OPORTUNIDADES (VERSÃO ADAPTATIVA)
   */
  static async getLeadsWithOpportunities(tenantId: string) {
    try {
      console.log('🔍 CRM Sync: Buscando leads do tenant:', tenantId);

      const { data, error } = await supabase
        .from('leads_master')
        .select(`
          *,
          pipeline_leads (
            id,
            pipeline_id,
            stage_id,
            lead_data
          )
        `)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      console.log('✅ CRM Sync: Leads encontrados:', data?.length || 0);
      return data || [];

    } catch (error: any) {
      console.error('❌ CRM Sync: Erro ao buscar leads:', error);
      return [];
    }
  }

  /**
   * CONVERTER VALOR MONETÁRIO
   * Converte string "R$ 1.500,00" para número 1500
   */
  static parseMonetaryValue(value: string | number): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    try {
      const cleanValue = value.toString()
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      
      const numericValue = parseFloat(cleanValue);
      return isNaN(numericValue) ? 0 : numericValue;
    } catch (error) {
      console.warn('⚠️ Erro ao converter valor monetário:', value, error);
      return 0;
    }
  }

  /**
   * DIVIDIR NOME COMPLETO
   * Divide "João Silva Santos" em first_name e last_name
   */
  static splitFullName(fullName: string): { first_name: string; last_name: string } {
    if (!fullName) return { first_name: '', last_name: '' };
    
    const parts = fullName.trim().split(' ');
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ') || '';
    
    return { first_name, last_name };
  }

  /**
   * VERIFICAR SE DADOS SÃO SUFICIENTES PARA SINCRONIZAÇÃO
   */
  static hasSufficientData(leadData: LeadData): boolean {
    // Menos restritivo: apenas email OU nome é suficiente
    const hasEmail = !!(leadData.email && leadData.email.trim());
    const hasName = !!(leadData.nome_lead || leadData.first_name);
    
    console.log('🔍 Verificando dados suficientes:', {
      email: hasEmail ? 'presente' : 'ausente',
      nome: hasName ? 'presente' : 'ausente',
      leadData,
      suficiente: hasEmail || hasName
    });
    
    return hasEmail || hasName;
  }
} 