// FASE 4: Backend Endpoints para Sistema de Embed
// Endpoints conforme especificado no plano: render, submit, config, analytics

import express from 'express';
import { supabase } from '../config/supabase';
import cors from 'cors';

const router = express.Router();

// Configurações CORS específicas para embed
const embedCorsOptions = {
  origin: '*', // Permitir todos os domínios para embed público
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Form-Domain'],
  credentials: false
};

// GET /api/forms/:id/render - Renderizar HTML do formulário
router.get('/:id/render', cors(embedCorsOptions), async (req, res) => {
  try {
    const { id } = req.params;
    const domain = req.headers['x-form-domain'] as string;
    
    // Buscar formulário
    const { data: form, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error || !form) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    // Verificar restrições de domínio se configuradas
    if (form.embed_config?.domain_restrictions?.length > 0) {
      const allowedDomains = form.embed_config.domain_restrictions;
      const isAllowed = allowedDomains.some((allowedDomain: string) => 
        domain && (domain.includes(allowedDomain) || allowedDomain === '*')
      );
      
      if (!isAllowed) {
        return res.status(403).json({ error: 'Domínio não autorizado' });
      }
    }

    // Preparar dados públicos do formulário
    const publicFormData = {
      id: form.id,
      title: form.title,
      description: form.description,
      fields: form.fields,
      form_type: form.form_type || 'standard',
      type_config: form.type_config || {},
      styling: form.styling || {},
      success_config: form.success_config || { message: 'Obrigado!' },
      analytics_enabled: form.embed_config?.analytics_enabled || false,
      tracking_config: form.embed_config?.tracking_config || {}
    };

    // Gerar HTML baseado no tipo
    const formHTML = generateFormHTML(publicFormData);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(formHTML);

  } catch (error) {
    console.error('Erro ao renderizar formulário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/forms/:id/config - Configurações públicas
router.get('/:id/config', cors(embedCorsOptions), async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: form, error } = await supabase
      .from('forms')
      .select('form_type, type_config, embed_config, styling, success_config')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error || !form) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    const config = {
      form_type: form.form_type || 'standard',
      type_config: form.type_config || {},
      embed_config: form.embed_config || {},
      styling: form.styling || {},
      success_config: form.success_config || { message: 'Obrigado!' }
    };

    res.json(config);

  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/forms/:id/submit - Processar submissão
router.post('/:id/submit', cors(embedCorsOptions), async (req, res) => {
  try {
    const { id } = req.params;
    const { data: formData, metadata = {} } = req.body;
    
    // Buscar formulário
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    // Validar dados obrigatórios
    const requiredFields = form.fields.filter((field: any) => field.required);
    const missingFields = requiredFields.filter((field: any) => 
      !formData[field.name] || formData[field.name].trim() === ''
    );

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios não preenchidos',
        missing_fields: missingFields.map((f: any) => f.name)
      });
    }

    // Calcular scoring se configurado
    let totalScore = 0;
    if (form.scoring_rules && form.scoring_rules.length > 0) {
      totalScore = calculateFormScore(formData, form.scoring_rules, form.form_type);
    }

    // Determinar temperatura baseada no score
    const temperature = getTemperatureFromScore(totalScore);

    // Salvar submissão
    const { data: submission, error: submissionError } = await supabase
      .from('forms_submissions')
      .insert({
        form_id: id,
        tenant_id: form.tenant_id,
        data: formData,
        metadata: {
          ...metadata,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          referer: req.headers.referer,
          timestamp: new Date().toISOString(),
          score: totalScore,
          temperature
        },
        score: totalScore,
        temperature,
        status: 'new'
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Erro ao salvar submissão:', submissionError);
      return res.status(500).json({ error: 'Erro ao processar submissão' });
    }

    // Processar integrações (pipeline, cadência, etc.)
    await processFormIntegrations(form, submission, formData);

    // Retornar resposta de sucesso
    res.json({
      success: true,
      message: form.success_config?.message || 'Obrigado pelo envio!',
      redirect_url: form.success_config?.redirect_url,
      submission_id: submission.id
    });

  } catch (error) {
    console.error('Erro ao processar submissão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/analytics/form-view - Track visualizações
router.post('/analytics/form-view', cors(embedCorsOptions), async (req, res) => {
  try {
    const { form_id, metadata = {} } = req.body;
    
    if (!form_id) {
      return res.status(400).json({ error: 'form_id obrigatório' });
    }

    // Buscar formulário para validar
    const { data: form } = await supabase
      .from('forms')
      .select('tenant_id')
      .eq('id', form_id)
      .single();

    if (!form) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    // Registrar visualização
    await supabase
      .from('form_analytics')
      .insert({
        form_id,
        tenant_id: form.tenant_id,
        event_type: 'view',
        event_data: {
          ...metadata,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          referer: req.headers.referer,
          timestamp: new Date().toISOString()
        },
        date: new Date().toISOString().split('T')[0]
      });

    res.json({ success: true });

  } catch (error) {
    console.error('Erro ao registrar view:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/analytics/form-interaction - Track interações
router.post('/analytics/form-interaction', cors(embedCorsOptions), async (req, res) => {
  try {
    const { form_id, interaction_type, element_id, metadata = {} } = req.body;
    
    if (!form_id || !interaction_type) {
      return res.status(400).json({ error: 'form_id e interaction_type obrigatórios' });
    }

    // Buscar formulário para validar
    const { data: form } = await supabase
      .from('forms')
      .select('tenant_id')
      .eq('id', form_id)
      .single();

    if (!form) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    // Registrar interação
    await supabase
      .from('form_analytics')
      .insert({
        form_id,
        tenant_id: form.tenant_id,
        event_type: 'interaction',
        event_data: {
          interaction_type,
          element_id,
          ...metadata,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        },
        date: new Date().toISOString().split('T')[0]
      });

    res.json({ success: true });

  } catch (error) {
    console.error('Erro ao registrar interação:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// FUNÇÕES AUXILIARES

function generateFormHTML(formData: any): string {
  const { id, title, description, fields, form_type, type_config, styling } = formData;
  
  const fieldsHTML = fields.map((field: any) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return `
          <div class="crm-field">
            <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
            <input type="${field.type}" id="${field.name}" name="${field.name}" 
                   ${field.required ? 'required' : ''} 
                   placeholder="${field.placeholder || ''}"
                   class="crm-input">
          </div>
        `;
      case 'textarea':
        return `
          <div class="crm-field">
            <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
            <textarea id="${field.name}" name="${field.name}" 
                     ${field.required ? 'required' : ''}
                     placeholder="${field.placeholder || ''}"
                     class="crm-textarea"></textarea>
          </div>
        `;
      case 'select':
        const options = field.options?.map((opt: any) => 
          `<option value="${opt.value}">${opt.label}</option>`
        ).join('') || '';
        return `
          <div class="crm-field">
            <label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>
            <select id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''} class="crm-select">
              <option value="">Selecione...</option>
              ${options}
            </select>
          </div>
        `;
      default:
        return '';
    }
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
      <link rel="stylesheet" href="/form-styles.css">
    </head>
    <body>
      <div class="crm-form-container ${form_type}">
        <form id="crm-form-${id}" class="crm-form" data-form-id="${id}">
          <div class="crm-form-header">
            <h2>${title}</h2>
            ${description ? `<p>${description}</p>` : ''}
          </div>
          <div class="crm-form-fields">
            ${fieldsHTML}
          </div>
          <div class="crm-form-footer">
            <button type="submit" class="crm-submit-btn">Enviar</button>
          </div>
        </form>
      </div>
      <script src="/form-embed.js"></script>
    </body>
    </html>
  `;
}

function calculateFormScore(formData: any, scoringRules: any[], formType: string): number {
  let score = 0;
  
  // Score base por tipo de formulário
  const typeBonus = getFormTypeScore(formType);
  score += typeBonus;
  
  // Score por regras de campo
  scoringRules.forEach(rule => {
    const fieldValue = formData[rule.field_name];
    if (fieldValue && rule.condition && rule.points) {
      // Implementar lógica de scoring básica
      if (rule.condition === 'filled' && fieldValue) {
        score += rule.points;
      }
    }
  });
  
  return score;
}

function getFormTypeScore(formType: string): number {
  switch (formType) {
    case 'exit_intent': return 25;
    case 'scroll_trigger': return 15;
    case 'time_delayed': return 10;
    case 'multi_step': return 20;
    case 'smart_scheduling': return 30;
    case 'cadence_trigger': return 18;
    case 'whatsapp_integration': return 22;
    default: return 5;
  }
}

function getTemperatureFromScore(score: number): string {
  if (score >= 70) return 'hot';
  if (score >= 30) return 'warm';
  return 'cold';
}

async function processFormIntegrations(form: any, submission: any, formData: any) {
  try {
    // Processar pipeline integration
    if (form.pipeline_integration?.enabled) {
      await processPipelineIntegration(form, submission, formData);
    }
    
    // Processar cadence integration
    if (form.cadence_integration?.enabled) {
      await processCadenceIntegration(form, submission, formData);
    }
    
    // Processar calendar integration
    if (form.calendar_integration?.enabled) {
      await processCalendarIntegration(form, submission, formData);
    }
  } catch (error) {
    console.error('Erro ao processar integrações:', error);
  }
}

async function processPipelineIntegration(form: any, submission: any, formData: any) {
  const config = form.pipeline_integration;
  
  if (config.pipeline_id && config.auto_assign) {
    // Criar lead no pipeline
    await supabase
      .from('leads')
      .insert({
        name: formData.name || formData.nome || 'Lead sem nome',
        email: formData.email || formData.email,
        phone: formData.phone || formData.telefone,
        pipeline_id: config.pipeline_id,
        stage: config.initial_stage || 'lead',
        temperature: submission.metadata.temperature,
        source: 'form_embed',
        tenant_id: form.tenant_id,
        form_submission_id: submission.id,
        data: formData
      });
  }
}

async function processCadenceIntegration(form: any, submission: any, formData: any) {
  const config = form.cadence_integration;
  
  if (config.cadence_id && config.auto_trigger) {
    // Iniciar cadência automática
    // Esta função seria implementada conforme sistema de cadências existente
    console.log('Iniciando cadência:', config.cadence_id, 'para submission:', submission.id);
  }
}

async function processCalendarIntegration(form: any, submission: any, formData: any) {
  const config = form.calendar_integration;
  
  if (config.auto_schedule && formData.preferred_time) {
    // Agendar reunião automática
    // Esta função seria implementada conforme sistema de calendar existente
    console.log('Agendando reunião para:', formData.preferred_time);
  }
}

export default router; 