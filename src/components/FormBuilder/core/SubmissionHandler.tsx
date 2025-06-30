import { supabase } from '../../../lib/supabase';
import { FormField, ScoringRule } from '../../../types/Forms';

interface SubmissionData {
  formData: any;
  fields: FormField[];
  formValues: Record<string, any>;
  scoringRules: ScoringRule[];
}

interface SubmissionResult {
  success: boolean;
  message: string;
  score?: number;
  isSubmissionMQL?: boolean;
  redirectUrl?: string;
}

/**
 * Classe responsável por processar submissões de formulários
 * Extraída do PublicFormRenderer para melhor organização
 */
export class SubmissionHandler {
  
  /**
   * Captura parâmetros UTM da URL atual
   */
  static captureUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source') || '',
      utm_medium: urlParams.get('utm_medium') || '',
      utm_campaign: urlParams.get('utm_campaign') || '',
      utm_content: urlParams.get('utm_content') || '',
      utm_term: urlParams.get('utm_term') || '',
      referrer: document.referrer || '',
      landing_page: window.location.href
    };
  }

  /**
   * Processa origem do lead baseado nas configurações de rastreamento
   */
  static processLeadOrigin(formData: any, utmData: any) {
    const trackingConfig = formData?.lead_tracking || {};
    
    if (!trackingConfig.enabled) {
      return {
        origem: 'Website',
        lead_source: 'website',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        source_type: 'default'
      };
    }

    switch (trackingConfig.leadSource) {
      case 'utm':
        const sourceMappings = trackingConfig.utmTracking?.sourceMappings || {};
        const friendlySource = sourceMappings[utmData.utm_source?.toLowerCase()] || utmData.utm_source || 'Website';
        
        return {
          origem: friendlySource,
          lead_source: utmData.utm_source || 'website',
          utm_source: utmData.utm_source,
          utm_medium: utmData.utm_medium,
          utm_campaign: utmData.utm_campaign,
          utm_content: utmData.utm_content,
          utm_term: utmData.utm_term,
          source_type: 'utm_automatic',
          campaign_name: utmData.utm_campaign || 'Sem Campanha',
          traffic_source: friendlySource,
          referrer: utmData.referrer,
          landing_page: utmData.landing_page
        };
        
      case 'custom':
        return {
          origem: trackingConfig.customSourceName || 'Origem Personalizada',
          lead_source: trackingConfig.customSource || 'custom',
          utm_source: trackingConfig.customSource,
          utm_medium: trackingConfig.customMedium,
          utm_campaign: trackingConfig.customCampaign,
          source_type: 'custom_defined',
          campaign_name: trackingConfig.customSourceName,
          traffic_source: trackingConfig.customSourceName,
          referrer: utmData.referrer,
          landing_page: utmData.landing_page
        };
        
      case 'form':
        return {
          origem: formData.name || 'Formulário Web',
          lead_source: 'formulario-web',
          utm_source: 'website',
          utm_medium: 'form',
          utm_campaign: formData.slug || 'form-submission',
          source_type: 'form_based',
          campaign_name: formData.name,
          traffic_source: 'Website',
          referrer: utmData.referrer,
          landing_page: utmData.landing_page
        };
        
      default:
        return {
          origem: 'Website',
          lead_source: 'website',
          utm_source: '',
          utm_medium: '',
          utm_campaign: '',
          source_type: 'default'
        };
    }
  }

  /**
   * Calcula pontuação do lead baseado nas regras de scoring
   */
  static calculateScore(formValues: Record<string, any>, scoringRules: ScoringRule[]): number {
    let totalScore = 0;

    scoringRules.forEach(rule => {
      const fieldValue = formValues[rule.field_id];
      if (!fieldValue) return;

      let ruleMatches = false;

      switch (rule.condition) {
        case 'equals':
          ruleMatches = String(fieldValue).toLowerCase() === rule.value.toLowerCase();
          break;
        case 'contains':
          ruleMatches = String(fieldValue).toLowerCase().includes(rule.value.toLowerCase());
          break;
        case 'greater_than':
          ruleMatches = Number(fieldValue) > Number(rule.value);
          break;
        case 'less_than':
          ruleMatches = Number(fieldValue) < Number(rule.value);
          break;
        case 'not_empty':
          ruleMatches = Boolean(fieldValue) && String(fieldValue).trim() !== '';
          break;
        case 'range':
          const [min, max] = rule.value.split('-').map(Number);
          const numValue = Number(fieldValue);
          ruleMatches = numValue >= min && numValue <= max;
          break;
        default:
          ruleMatches = false;
      }

      if (ruleMatches) {
        totalScore += rule.points;
      }
    });

    return Math.max(0, Math.min(100, totalScore));
  }

  /**
   * Obtém IP do cliente
   */
  static async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Processa submissão completa do formulário
   */
  static async processSubmission(data: SubmissionData): Promise<SubmissionResult> {
    const { formData, fields, formValues, scoringRules } = data;
    
    try {
      // Capturar dados UTM e origem
      const utmData = this.captureUTMParameters();
      const leadOrigin = this.processLeadOrigin(formData, utmData);
      
      // Calcular pontuação
      const score = this.calculateScore(formValues, scoringRules);
      const mqlThreshold = formData?.qualification_rules?.mql_threshold || 70;
      const isSubmissionMQL = score >= mqlThreshold;
      
      // Obter IP do cliente
      const clientIP = await this.getClientIP();
      
      // Preparar dados da submissão
      const submissionData = {
        form_id: formData.id,
        submission_data: formValues,
        lead_score: score,
        is_mql: isSubmissionMQL,
        utm_source: leadOrigin.utm_source,
        utm_medium: leadOrigin.utm_medium,
        utm_campaign: leadOrigin.utm_campaign,
        utm_term: leadOrigin.utm_term,
        utm_content: leadOrigin.utm_content,
        ip_address: clientIP,
        user_agent: navigator.userAgent,
        referrer: leadOrigin.referrer,
        landing_page: leadOrigin.landing_page
      };

      // Salvar submissão no banco
      const { data: submission, error: submissionError } = await supabase
        .from('form_submissions')
        .insert([submissionData])
        .select()
        .single();

      if (submissionError) {
        console.error('Erro ao salvar submissão:', submissionError);
        return {
          success: false,
          message: 'Erro ao processar formulário. Tente novamente.'
        };
      }

      // Criar lead no sistema principal se configurado
      if (formData.pipeline_id) {
        await this.createLeadInPipeline(formData, formValues, leadOrigin, score, isSubmissionMQL);
      }

      // Enviar notificações se configurado
      if (formData.settings?.email_notifications?.enabled) {
        await this.sendEmailNotifications(formData, formValues, leadOrigin);
      }

      // Atualizar analytics
      await this.updateFormAnalytics(formData.id);

      return {
        success: true,
        message: isSubmissionMQL 
          ? 'Formulário enviado! Você é um lead qualificado e nossa equipe entrará em contato em breve.' 
          : 'Formulário enviado com sucesso! Obrigado pelo seu interesse.',
        score,
        isSubmissionMQL,
        redirectUrl: formData.redirect_url
      };

    } catch (error) {
      console.error('Erro no processamento da submissão:', error);
      return {
        success: false,
        message: 'Erro interno do servidor. Tente novamente mais tarde.'
      };
    }
  }

  /**
   * Cria lead no pipeline configurado
   */
  private static async createLeadInPipeline(
    formData: any, 
    formValues: Record<string, any>, 
    leadOrigin: any, 
    score: number, 
    isMQL: boolean
  ) {
    try {
      // Extrair dados básicos do lead
      const leadData = {
        name: formValues.nome || formValues.name || 'Lead sem nome',
        email: formValues.email || '',
        phone: formValues.telefone || formValues.phone || '',
        company: formValues.empresa || formValues.company || '',
        pipeline_id: formData.pipeline_id,
        stage_id: null, // Será determinado pelo backend
        assigned_to: formData.assigned_to,
        lead_score: score,
        is_mql: isMQL,
        source: leadOrigin.origem,
        utm_source: leadOrigin.utm_source,
        utm_campaign: leadOrigin.utm_campaign,
        custom_data: formValues,
        tenant_id: formData.tenant_id
      };

      const { error } = await supabase
        .from('leads_master')
        .insert([leadData]);

      if (error) {
        console.error('Erro ao criar lead:', error);
      }
    } catch (error) {
      console.error('Erro ao processar lead:', error);
    }
  }

  /**
   * Envia notificações por email
   */
  private static async sendEmailNotifications(
    formData: any, 
    formValues: Record<string, any>, 
    leadOrigin: any
  ) {
    try {
      const emailConfig = formData.settings?.email_notifications;
      if (!emailConfig?.enabled || !emailConfig?.recipients?.length) return;

      // Aqui você implementaria a integração com seu serviço de email
      // Por exemplo, usando o backend API
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: emailConfig.recipients,
          subject: emailConfig.subject || `Nova submissão - ${formData.name}`,
          formData: formValues,
          leadOrigin,
          formName: formData.name
        }),
      });

      if (!response.ok) {
        console.error('Erro ao enviar notificação por email');
      }
    } catch (error) {
      console.error('Erro no envio de notificações:', error);
    }
  }

  /**
   * Atualiza analytics do formulário
   */
  private static async updateFormAnalytics(formId: string) {
    try {
      const { error } = await supabase.rpc('increment_form_submissions', {
        form_id: formId
      });

      if (error) {
        console.error('Erro ao atualizar analytics:', error);
      }
    } catch (error) {
      console.error('Erro no analytics:', error);
    }
  }
} 