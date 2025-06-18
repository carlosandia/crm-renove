import { supabase } from '../index';
import crypto from 'crypto';
import axios from 'axios';

interface ConversionData {
  log_id: string;
  lead_id: string;
  platform: 'meta' | 'google';
  event_name: string;
  event_time: string;
  request_payload: any;
  retry_count: number;
  company_id: string;
  access_token: string;
}

interface MetaConversionPayload {
  data: Array<{
    event_name: string;
    event_time: number;
    action_source: string;
    event_source_url?: string;
    user_data: {
      em?: string[];
      ph?: string[];
      fn?: string[];
      ln?: string[];
    };
    custom_data: {
      campaign_id?: string;
      adset_id?: string;
      ad_id?: string;
      lead_id: string;
      company_id: string;
      value?: number;
      currency?: string;
    };
  }>;
}

interface GoogleConversionPayload {
  conversions: Array<{
    gclid: string;
    conversion_action: string;
    conversion_date_time: string;
    conversion_value?: number;
    currency_code?: string;
    order_id?: string;
  }>;
}

export class ConversionService {
  
  /**
   * Processar fila de conversões pendentes
   */
  static async processConversionsQueue(limit: number = 10): Promise<void> {
    try {
      console.log('🔄 Iniciando processamento da fila de conversões...');
      
      // Buscar conversões pendentes
      const { data: conversions, error } = await supabase
        .rpc('get_pending_conversions', { p_limit: limit });

      if (error) {
        console.error('❌ Erro ao buscar conversões pendentes:', error);
        return;
      }

      if (!conversions || conversions.length === 0) {
        console.log('✅ Nenhuma conversão pendente na fila');
        return;
      }

      console.log(`📋 Processando ${conversions.length} conversões pendentes`);

      // Processar cada conversão
      for (const conversion of conversions) {
        await this.processConversion(conversion);
        
        // Aguardar um pouco entre requisições para evitar rate limit
        await this.delay(1000);
      }

      console.log('✅ Processamento da fila concluído');
    } catch (error) {
      console.error('❌ Erro no processamento da fila:', error);
    }
  }

  /**
   * Processar uma conversão individual
   */
  static async processConversion(conversion: ConversionData): Promise<void> {
    try {
      console.log(`🎯 Processando conversão ${conversion.log_id} - ${conversion.platform} - ${conversion.event_name}`);

      let success = false;
      let responseData: any = null;
      let errorMessage: string | null = null;

      if (conversion.platform === 'meta') {
        const result = await this.sendMetaConversion(conversion);
        success = result.success;
        responseData = result.response;
        errorMessage = result.error;
      } else if (conversion.platform === 'google') {
        const result = await this.sendGoogleConversion(conversion);
        success = result.success;
        responseData = result.response;
        errorMessage = result.error;
      }

      // Atualizar status do log
      const newStatus = success ? 'sent' : 
        (conversion.retry_count >= 2 ? 'failed' : 'retry');

      await supabase.rpc('update_conversion_log', {
        p_log_id: conversion.log_id,
        p_status: newStatus,
        p_response_data: responseData,
        p_error_message: errorMessage
      });

      if (success) {
        console.log(`✅ Conversão ${conversion.log_id} enviada com sucesso`);
        
        // Registrar no histórico do lead
        await this.registerConversionHistory(
          conversion.lead_id,
          conversion.platform,
          conversion.event_name,
          'sent'
        );
      } else {
        console.log(`❌ Falha na conversão ${conversion.log_id}: ${errorMessage}`);
        
        if (newStatus === 'failed') {
          await this.registerConversionHistory(
            conversion.lead_id,
            conversion.platform,
            conversion.event_name,
            'failed',
            errorMessage
          );
        }
      }

    } catch (error) {
      console.error(`❌ Erro ao processar conversão ${conversion.log_id}:`, error);
      
      // Marcar como retry ou failed
      const newStatus = conversion.retry_count >= 2 ? 'failed' : 'retry';
      
      await supabase.rpc('update_conversion_log', {
        p_log_id: conversion.log_id,
        p_status: newStatus,
        p_response_data: null,
        p_error_message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Enviar conversão para Meta Ads
   */
  static async sendMetaConversion(conversion: ConversionData): Promise<{
    success: boolean;
    response?: any;
    error?: string;
  }> {
    try {
      const payload = conversion.request_payload;
      const leadData = payload.custom_data || {};
      
      // Construir payload para Meta Conversion API
      const metaPayload: MetaConversionPayload = {
        data: [{
          event_name: conversion.event_name,
          event_time: Math.floor(new Date(conversion.event_time).getTime() / 1000),
          action_source: 'website',
          event_source_url: `https://app.crm.com/pipeline/${payload.pipeline_id}`,
          user_data: this.buildMetaUserData(leadData),
          custom_data: {
            campaign_id: leadData.campaign_id,
            adset_id: leadData.adset_id,
            ad_id: leadData.ad_id,
            lead_id: conversion.lead_id,
            company_id: conversion.company_id,
            value: leadData.conversion_value || 0,
            currency: 'BRL'
          }
        }]
      };

      // Fazer requisição para Meta Conversion API
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${this.getMetaPixelId(conversion.company_id)}/events`,
        metaPayload,
        {
          headers: {
            'Authorization': `Bearer ${conversion.access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.events_received > 0) {
        return {
          success: true,
          response: response.data
        };
      } else {
        return {
          success: false,
          error: 'Nenhum evento foi recebido pelo Meta',
          response: response.data
        };
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Erro na API do Meta',
        response: error.response?.data
      };
    }
  }

  /**
   * Enviar conversão para Google Ads
   */
  static async sendGoogleConversion(conversion: ConversionData): Promise<{
    success: boolean;
    response?: any;
    error?: string;
  }> {
    try {
      const payload = conversion.request_payload;
      const leadData = payload.custom_data || {};
      
      if (!leadData.click_id) {
        return {
          success: false,
          error: 'GCLID não encontrado para conversão Google'
        };
      }

      // Construir payload para Google Ads Offline Conversions
      const googlePayload: GoogleConversionPayload = {
        conversions: [{
          gclid: leadData.click_id,
          conversion_action: this.getGoogleConversionAction(conversion.company_id, conversion.event_name),
          conversion_date_time: new Date(conversion.event_time).toISOString(),
          conversion_value: leadData.conversion_value || 0,
          currency_code: 'BRL',
          order_id: conversion.lead_id
        }]
      };

      // Fazer requisição para Google Ads API
      const response = await axios.post(
        `https://googleads.googleapis.com/v14/customers/${this.getGoogleCustomerId(conversion.company_id)}/conversionUploads:upload`,
        googlePayload,
        {
          headers: {
            'Authorization': `Bearer ${conversion.access_token}`,
            'Content-Type': 'application/json',
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN
          },
          timeout: 30000
        }
      );

      if (response.data && !response.data.partialFailureError) {
        return {
          success: true,
          response: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.partialFailureError?.message || 'Erro na conversão Google',
          response: response.data
        };
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Erro na API do Google',
        response: error.response?.data
      };
    }
  }

  /**
   * Construir dados do usuário para Meta (com hash SHA256)
   */
  static buildMetaUserData(leadData: any): any {
    const userData: any = {};
    
    if (leadData.email) {
      userData.em = [this.hashSHA256(leadData.email.toLowerCase().trim())];
    }
    
    if (leadData.phone) {
      const cleanPhone = leadData.phone.replace(/\D/g, '');
      userData.ph = [this.hashSHA256(cleanPhone)];
    }
    
    if (leadData.first_name || leadData.Nome) {
      const firstName = leadData.first_name || leadData.Nome;
      userData.fn = [this.hashSHA256(firstName.toLowerCase().trim())];
    }
    
    if (leadData.last_name) {
      userData.ln = [this.hashSHA256(leadData.last_name.toLowerCase().trim())];
    }
    
    return userData;
  }

  /**
   * Hash SHA256
   */
  static hashSHA256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Registrar conversão no histórico do lead
   */
  static async registerConversionHistory(
    leadId: string,
    platform: string,
    eventName: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase.rpc('register_lead_history', {
        p_lead_id: leadId,
        p_action: `conversion_${status}`,
        p_performed_by: null,
        p_role: 'system',
        p_context: `Conversão ${eventName} para ${platform}: ${status}${errorMessage ? ` - ${errorMessage}` : ''}`,
        p_old_values: {},
        p_new_values: {
          platform,
          event_name: eventName,
          status,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Erro ao registrar histórico de conversão:', error);
    }
  }

  /**
   * Obter Pixel ID do Meta para a empresa (placeholder)
   */
  static getMetaPixelId(companyId: string): string {
    // TODO: Implementar busca do Pixel ID por empresa
    // Por enquanto, usar um valor padrão ou configurável
    return process.env.META_PIXEL_ID || 'YOUR_PIXEL_ID';
  }

  /**
   * Obter Customer ID do Google para a empresa (placeholder)
   */
  static getGoogleCustomerId(companyId: string): string {
    // TODO: Implementar busca do Customer ID por empresa
    // Por enquanto, usar um valor padrão ou configurável
    return process.env.GOOGLE_CUSTOMER_ID || 'YOUR_CUSTOMER_ID';
  }

  /**
   * Obter ação de conversão do Google (placeholder)
   */
  static getGoogleConversionAction(companyId: string, eventName: string): string {
    // TODO: Implementar mapeamento de ações por empresa
    // Por enquanto, usar um valor padrão
    return process.env.GOOGLE_CONVERSION_ACTION || 'customers/YOUR_CUSTOMER_ID/conversionActions/YOUR_ACTION_ID';
  }

  /**
   * Delay para evitar rate limiting
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Testar token Meta Ads
   */
  static async testMetaToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(
        'https://graph.facebook.com/v18.0/me',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          timeout: 10000
        }
      );
      
      return response.status === 200 && response.data.id;
    } catch (error) {
      console.error('Erro ao testar token Meta:', error);
      return false;
    }
  }

  /**
   * Testar token Google Ads
   */
  static async testGoogleToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v1/tokeninfo',
        {
          params: {
            access_token: accessToken
          },
          timeout: 10000
        }
      );
      
      return response.status === 200 && response.data.scope;
    } catch (error) {
      console.error('Erro ao testar token Google:', error);
      return false;
    }
  }

  /**
   * Iniciar processamento automático da fila
   */
  static startConversionProcessor(): void {
    console.log('🚀 Iniciando processador automático de conversões...');
    
    // Processar a cada 30 segundos
    setInterval(async () => {
      try {
        await this.processConversionsQueue(5);
      } catch (error) {
        console.error('❌ Erro no processador automático:', error);
      }
    }, 30000);
    
    console.log('✅ Processador automático iniciado (intervalo: 30s)');
  }
}

export default ConversionService; 