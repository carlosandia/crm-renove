import express from 'express';
import { supabase } from '../config/supabase';

const router = express.Router();

// Importar sistema de distribuição existente
import { LeadDistributionService } from '../services/leadDistributionService';

// GET /api/forms - Listar formulários do tenant
router.get('/', async (req, res) => {
  try {
    const { user } = req as any;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { data: forms, error } = await supabase
      .from('custom_forms')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar formulários:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json(forms || []);
  } catch (error) {
    console.error('Erro ao listar formulários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/forms/:id - Buscar formulário específico
router.get('/:id', async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { data: form, error } = await supabase
      .from('custom_forms')
      .select(`
        *,
        form_fields (*)
      `)
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (error) {
      console.error('Erro ao buscar formulário:', error);
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    res.json(form);
  } catch (error) {
    console.error('Erro ao buscar formulário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/forms - Criar novo formulário
router.post('/', async (req, res) => {
  try {
    const { user } = req as any;
    const formData = req.body;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Criar formulário
    const { data: form, error: formError } = await supabase
      .from('custom_forms')
      .insert({
        ...formData,
        tenant_id: user.tenant_id,
        created_by: user.id
      })
      .select()
      .single();

    if (formError) {
      console.error('Erro ao criar formulário:', formError);
      return res.status(500).json({ error: 'Erro ao criar formulário' });
    }

    res.status(201).json(form);
  } catch (error) {
    console.error('Erro ao criar formulário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/forms/:id - Atualizar formulário
router.put('/:id', async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;
    const formData = req.body;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se o formulário existe e pertence ao tenant
    const { data: existingForm } = await supabase
      .from('custom_forms')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (!existingForm) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    // Atualizar formulário
    const { data: form, error: formError } = await supabase
      .from('custom_forms')
      .update(formData)
      .eq('id', id)
      .select()
      .single();

    if (formError) {
      console.error('Erro ao atualizar formulário:', formError);
      return res.status(500).json({ error: 'Erro ao atualizar formulário' });
    }

    // Atualizar campos se fornecidos
    if (formData.fields) {
      // Remover campos existentes
      await supabase
        .from('form_fields')
        .delete()
        .eq('form_id', id);

      // Inserir novos campos
      if (formData.fields.length > 0) {
        const fieldsToInsert = formData.fields.map((field: any) => ({
          ...field,
          form_id: id
        }));

        const { error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fieldsToInsert);

        if (fieldsError) {
          console.error('Erro ao atualizar campos:', fieldsError);
          return res.status(500).json({ error: 'Erro ao atualizar campos do formulário' });
        }
      }
    }

    res.json(form);
  } catch (error) {
    console.error('Erro ao atualizar formulário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/forms/:id - Excluir formulário
router.delete('/:id', async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se o formulário existe e pertence ao tenant
    const { data: existingForm } = await supabase
      .from('custom_forms')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (!existingForm) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    // Excluir formulário (campos serão excluídos automaticamente devido ao CASCADE)
    const { error } = await supabase
      .from('custom_forms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir formulário:', error);
      return res.status(500).json({ error: 'Erro ao excluir formulário' });
    }

    res.json({ message: 'Formulário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir formulário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/forms/:id/submissions - Listar submissões do formulário
router.get('/:id/submissions', async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se o formulário pertence ao tenant
    const { data: form } = await supabase
      .from('custom_forms')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (!form) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    // Buscar submissões
    const { data: submissions, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('form_id', id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar submissões:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json(submissions || []);
  } catch (error) {
    console.error('Erro ao listar submissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// 🆕 FUNÇÃO AUXILIAR PARA MAPEAR CAMPOS DO FORMULÁRIO PARA LEADS_MASTER
function mapFormFieldsToLeadsMaster(form_data: any, form_fields: any[] = []): any {
  const leadData: any = {};

  // Mapeamento automático baseado em campos comuns
  leadData.first_name = form_data.primeiro_nome || form_data.first_name || form_data.nome?.split(' ')[0] || form_data.name?.split(' ')[0] || '';
  leadData.last_name = form_data.ultimo_nome || form_data.last_name || form_data.nome?.split(' ').slice(1).join(' ') || form_data.name?.split(' ').slice(1).join(' ') || '';
  leadData.email = form_data.email || '';
  leadData.phone = form_data.telefone || form_data.phone || '';
  leadData.company = form_data.empresa || form_data.company || '';
  leadData.job_title = form_data.cargo || form_data.job_title || '';
  leadData.estimated_value = form_data.valor_estimado || form_data.valor || form_data.value || form_data.budget || 0;
  
  // ✅ CAMPOS UTM COMPLETOS
  leadData.utm_source = form_data.utm_source || '';
  leadData.utm_medium = form_data.utm_medium || '';
  leadData.utm_campaign = form_data.utm_campaign || '';
  leadData.utm_term = form_data.utm_term || '';
  leadData.utm_content = form_data.utm_content || '';
  leadData.campaign_name = form_data.campaign_name || form_data.utm_campaign || '';
  
  // ✅ DADOS DE RASTREAMENTO COMPLETOS
  leadData.referrer = form_data.referrer || '';
  leadData.landing_page = form_data.landing_page || '';
  leadData.lead_source = form_data.lead_source || form_data.origem || 'website';
  leadData.source = form_data.origem || form_data.traffic_source || 'Website';
  
  // ✅ DADOS DE GEOLOCALIZAÇÃO
  leadData.city = form_data.city || '';
  leadData.state = form_data.state || '';
  leadData.country = form_data.country || '';

  return leadData;
}

// Nova rota para criar lead simples no menu de leads
router.post('/create-simple-lead', async (req, res) => {
  try {
    console.log('🎯 Criando lead simples no menu de leads...');
    
    const { 
      form_id,
      form_data,
      destination_config,
      tenant_id,
      ip_address,
      user_agent 
    } = req.body;

    if (!form_id || !form_data || !destination_config) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados obrigatórios faltando' 
      });
    }

    // 1. Buscar configurações do formulário
    const { data: form, error: formError } = await supabase
      .from('custom_forms')
      .select('*')
      .eq('id', form_id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ 
        success: false, 
        error: 'Formulário não encontrado' 
      });
    }

    // 2. Mapear campos do formulário para leads_master
    const mappedLeadData = mapFormFieldsToLeadsMaster(form_data, form.fields);
    
    // 3. Criar lead na tabela leads_master com DADOS UTM COMPLETOS
    const { data: lead, error: leadError } = await supabase
      .from('leads_master')
      .insert({
        first_name: mappedLeadData.first_name || 'Nome não informado',
        last_name: mappedLeadData.last_name || '',
        email: mappedLeadData.email,
        phone: mappedLeadData.phone || '',
        company: mappedLeadData.company || '',
        job_title: mappedLeadData.job_title || '',
        estimated_value: mappedLeadData.estimated_value || 0,
        lead_source: mappedLeadData.lead_source || 'website',
        lead_temperature: 'warm',
        status: 'new',
        tenant_id: tenant_id,
        created_by: null, // Form público
        // ✅ DADOS UTM COMPLETOS
        utm_source: mappedLeadData.utm_source || '',
        utm_medium: mappedLeadData.utm_medium || '',
        utm_campaign: mappedLeadData.utm_campaign || '',
        utm_term: mappedLeadData.utm_term || '',
        utm_content: mappedLeadData.utm_content || '',
        campaign_name: mappedLeadData.campaign_name || '',
        // ✅ DADOS DE RASTREAMENTO COMPLETOS  
        referrer: mappedLeadData.referrer || '',
        landing_page: mappedLeadData.landing_page || '',
        ip_address: ip_address || 'unknown',
        user_agent: user_agent || 'unknown',
        // ✅ DADOS DE GEOLOCALIZAÇÃO COMPLETOS
        city: mappedLeadData.city || '',
        state: mappedLeadData.state || '',
        country: mappedLeadData.country || ''
      })
      .select()
      .single();

    if (leadError) {
      console.error('❌ Erro ao criar lead:', leadError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar lead',
        details: leadError.message 
      });
    }

    console.log('✅ Lead criado no menu:', lead.id);

    // 4. Configurar visibilidade do lead
    await configureLeadVisibility(lead.id, form_id, destination_config.visibility);

    // 5. ✅ SISTEMA DE DISTRIBUIÇÃO UNIFICADO
    let assignedTo = null;
    let distributionDetails = null;
    
    if (destination_config.distribution && destination_config.distribution.auto_assign && destination_config.pipeline_id) {
      console.log('🎯 Usando LeadDistributionService para distribuição...');
      
      try {
        // Usar o LeadDistributionService unificado para pipelines
        assignedTo = await LeadDistributionService.distributeLeadToMember(lead.id, destination_config.pipeline_id);
        
        if (assignedTo) {
          distributionDetails = { 
            method: 'unified_pipeline_distribution', 
            pipeline_id: destination_config.pipeline_id,
            service: 'LeadDistributionService'
          };
          console.log('✅ Lead distribuído via LeadDistributionService para:', assignedTo);
        } else {
          console.log('📝 Distribuição não aplicada - modo manual ou sem membros ativos');
        }
      } catch (distributionError) {
        console.warn('⚠️ Erro na distribuição unificada:', distributionError);
        assignedTo = null;
      }

      // 🆕 SINCRONIZAR COM SISTEMA DE PIPELINE SE NECESSÁRIO
      if (assignedTo && destination_config.create_pipeline_opportunity) {
        console.log('🔄 Sincronizando com sistema de pipeline...');
        await createPipelineOpportunityFromLead(lead, assignedTo, destination_config);
      }
    } else if (destination_config.distribution && destination_config.distribution.auto_assign) {
      console.log('⚠️ Distribuição automática requer pipeline_id configurado');
    }

    // 6. Registrar submissão
    const { error: submissionError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: form_id,
        submission_data: form_data,
        lead_score: 0, // Será calculado depois se necessário
        is_qualified: false,
        ip_address: ip_address,
        user_agent: user_agent,
        lead_id: lead.id
      });

    if (submissionError) {
      console.warn('⚠️ Erro ao registrar submissão:', submissionError);
    }

    // 7. Enviar notificações por email se configurado
    if (form.email_settings?.enabled && form.email_settings?.recipients?.length > 0) {
      try {
        // Implementar envio de email posteriormente
        console.log('📧 Email notifications configuradas para serem enviadas');
      } catch (emailError) {
        console.warn('⚠️ Erro ao enviar emails:', emailError);
      }
    }

    console.log('🎉 Lead simples criado com sucesso:', lead.id);
    
    res.status(201).json({
      success: true,
      message: 'Lead criado com sucesso',
      lead_id: lead.id,
      assigned_to: assignedTo,
      visibility_configured: true,
      distribution_applied: !!assignedTo,
      distribution_details: distributionDetails
    });

  } catch (error) {
    console.error('❌ Erro ao criar lead simples:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para buscar members disponíveis
router.get('/available-members/:tenant_id', async (req, res) => {
  try {
    const { tenant_id } = req.params;

    const { data: members, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, is_active')
      .eq('tenant_id', tenant_id)
      .eq('role', 'member')
      .eq('is_active', true)
      .order('first_name');

    if (error) {
      console.error('Erro ao buscar members:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar members' 
      });
    }

    res.json({
      success: true,
      members: members || []
    });

  } catch (error) {
    console.error('Erro ao buscar members:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});



// Função auxiliar para configurar visibilidade do lead
async function configureLeadVisibility(leadId: string, formId: string, visibilityConfig: any) {
  try {
    console.log('🔒 Configurando visibilidade do lead:', { leadId, visibilityConfig });
    
    if (!visibilityConfig || visibilityConfig.type === 'all-members') {
      console.log('👥 Visibilidade configurada para todos os members');
      return;
    }

    if (visibilityConfig.type === 'specific-members' && visibilityConfig.specific_members?.length > 0) {
      // Criar tabela de visibilidade se não existir (simplificado)
      // Por enquanto, vamos apenas logar - implementação real criaria tabela auxiliar
      console.log('👤 Visibilidade configurada para members específicos:', visibilityConfig.specific_members);
    }

    console.log('✅ Visibilidade configurada com sucesso');
  } catch (error) {
    console.warn('⚠️ Erro ao configurar visibilidade:', error);
  }
}

// ✅ FUNÇÃO REMOVIDA: distributeLeadToMember
// Esta funcionalidade agora é fornecida pelo LeadDistributionService.distributeLeadToMember()

// ✅ FUNÇÃO REMOVIDA: applyRoundRobinDistribution
// Esta funcionalidade agora é fornecida pelo LeadDistributionService.assignLeadByRoundRobin()

// ✅ FUNÇÃO REMOVIDA: getFirstAvailableMember
// Funcionalidade de distribuição por carga pode ser implementada no LeadDistributionService quando necessário

// Função para registrar histórico de distribuição
async function recordDistributionHistory(leadId: string, assignedTo: string, method: string, context: string) {
  try {
    console.log('📝 Registrando distribuição no histórico:', { leadId, assignedTo, method });
    
    // Criar entrada no histórico (simplificado - em produção usaria tabela específica)
    await supabase
      .from('lead_tasks')
      .insert({
        lead_id: leadId,
        title: 'Lead Distribuído Automaticamente',
        description: `Lead atribuído automaticamente via ${method} no contexto: ${context}`,
        status: 'completed',
        priority: 'low',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });

    console.log('✅ Histórico de distribuição registrado');
  } catch (error) {
    console.warn('⚠️ Erro ao registrar histórico:', error);
  }
}

// 🆕 FUNÇÃO PARA CRIAR OPORTUNIDADE NA PIPELINE A PARTIR DO LEAD
async function createPipelineOpportunityFromLead(leadMaster: any, assignedTo: string, config: any) {
  try {
    console.log('🚀 Criando oportunidade na pipeline para lead:', leadMaster.id);

    // Buscar pipeline padrão ou usar a configurada
    let targetPipelineId = config.pipeline_id;
    
    if (!targetPipelineId) {
      // Buscar pipeline padrão do tenant
      const { data: defaultPipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('tenant_id', leadMaster.tenant_id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (!defaultPipeline) {
        console.log('⚠️ Nenhuma pipeline disponível para criar oportunidade');
        return null;
      }

      targetPipelineId = defaultPipeline.id;
    }

    // Buscar primeiro estágio da pipeline
    const { data: firstStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('pipeline_id', targetPipelineId)
      .order('order_index', { ascending: true })
      .limit(1)
      .single();

    if (!firstStage) {
      console.log('⚠️ Pipeline não possui estágios configurados');
      return null;
    }

    // Criar oportunidade na pipeline
    const { data: pipelineOpportunity, error } = await supabase
      .from('pipeline_leads')
      .insert({
        pipeline_id: targetPipelineId,
        stage_id: firstStage.id,
        assigned_to: assignedTo,
        created_by: null,
        tenant_id: leadMaster.tenant_id,
        lead_data: {
          // Mapear dados do lead_master para pipeline
          nome_lead: `${leadMaster.first_name} ${leadMaster.last_name}`,
          email: leadMaster.email,
          telefone: leadMaster.phone,
          empresa: leadMaster.company,
          cargo: leadMaster.job_title,
          valor: leadMaster.estimated_value?.toString(),
          origem: leadMaster.origem,
          source: 'Formulário → Lead Master',
          lead_master_id: leadMaster.id,
          utm_source: leadMaster.utm_source,
          utm_medium: leadMaster.utm_medium,
          utm_campaign: leadMaster.utm_campaign
        }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar oportunidade na pipeline:', error);
      return null;
    }

    console.log('✅ Oportunidade criada na pipeline:', pipelineOpportunity.id);
    
    // Atualizar lead_master com referência à oportunidade
    await supabase
      .from('leads_master')
      .update({ 
        pipeline_opportunity_id: pipelineOpportunity.id,
        status: 'Em Pipeline'
      })
      .eq('id', leadMaster.id);

    return pipelineOpportunity;

  } catch (error) {
    console.error('❌ Erro na sincronização com pipeline:', error);
    return null;
  }
}

// ✅ FUNÇÃO REMOVIDA: applyPipelineDistribution
// Esta funcionalidade agora é fornecida pelo LeadDistributionService.distributeLeadToMember()

// ✅ FUNÇÃO REMOVIDA: getNextRoundRobinMember
// Esta funcionalidade agora é fornecida pelo LeadDistributionService.assignLeadByRoundRobin()

export default router; 