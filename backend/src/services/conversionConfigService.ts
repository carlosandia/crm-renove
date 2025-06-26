import { supabase } from '../config/supabase';

// =========================================================================
// CONVERSION CONFIG SERVICE - FACEBOOK PIXEL & GOOGLE ADS
// =========================================================================
// Este serviço gerencia configurações de conversão para empresas
// Criado como NOVO ARQUIVO sem alterar serviços existentes
// =========================================================================

export interface ConversionConfig {
  meta_pixel_id?: string;
  meta_app_id?: string;
  google_ads_customer_id?: string;
  google_ads_conversion_actions?: any;
  conversion_tracking_enabled: boolean;
  test_mode: boolean;
}

export interface EventMapping {
  id: string;
  company_id: string;
  stage_id: string;
  stage_name: string;
  event_name: string;
  event_type: 'meta' | 'google' | 'both';
  conversion_value: number;
  is_active: boolean;
}

export interface ConversionQueueItem {
  id: string;
  lead_id: string;
  company_id: string;
  stage_id: string;
  lead_data: any;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  platform: 'meta' | 'google';
  attempts: number;
  error_message?: string;
  created_at: string;
}

export class ConversionConfigService {
  
  /**
   * Obter configurações de conversão de uma empresa
   */
  static async getCompanyConfig(companyId: string): Promise<ConversionConfig | null> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select(`
          meta_pixel_id,
          meta_app_id,
          google_ads_customer_id,
          google_ads_conversion_actions,
          conversion_tracking_enabled,
          test_mode
        `)
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('Erro ao buscar configuração de conversão:', error);
        return null;
      }

      return {
        meta_pixel_id: data.meta_pixel_id,
        meta_app_id: data.meta_app_id,
        google_ads_customer_id: data.google_ads_customer_id,
        google_ads_conversion_actions: data.google_ads_conversion_actions || {},
        conversion_tracking_enabled: data.conversion_tracking_enabled || false,
        test_mode: data.test_mode !== false // Default true
      };

    } catch (error) {
      console.error('Erro no ConversionConfigService.getCompanyConfig:', error);
      return null;
    }
  }

  /**
   * Atualizar configurações de conversão de uma empresa
   */
  static async updateCompanyConfig(
    companyId: string, 
    config: Partial<ConversionConfig>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({
          meta_pixel_id: config.meta_pixel_id,
          meta_app_id: config.meta_app_id,
          google_ads_customer_id: config.google_ads_customer_id,
          google_ads_conversion_actions: config.google_ads_conversion_actions,
          conversion_tracking_enabled: config.conversion_tracking_enabled,
          test_mode: config.test_mode,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId);

      if (error) {
        console.error('Erro ao atualizar configuração de conversão:', error);
        return false;
      }

      console.log('✅ Configuração de conversão atualizada:', companyId);
      return true;

    } catch (error) {
      console.error('Erro no ConversionConfigService.updateCompanyConfig:', error);
      return false;
    }
  }

  /**
   * Obter mapeamentos de eventos de uma empresa
   */
  static async getEventMappings(companyId: string): Promise<EventMapping[]> {
    try {
      const { data, error } = await supabase
        .from('conversion_event_mappings')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('stage_name');

      if (error) {
        console.error('Erro ao buscar mapeamentos de eventos:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Erro no ConversionConfigService.getEventMappings:', error);
      return [];
    }
  }

  /**
   * Criar ou atualizar mapeamento de evento
   */
  static async upsertEventMapping(
    companyId: string,
    stageId: string,
    stageName: string,
    eventName: string,
    eventType: 'meta' | 'google' | 'both',
    conversionValue: number = 0
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversion_event_mappings')
        .upsert({
          company_id: companyId,
          stage_id: stageId,
          stage_name: stageName,
          event_name: eventName,
          event_type: eventType,
          conversion_value: conversionValue,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id,stage_id,event_type'
        });

      if (error) {
        console.error('Erro ao salvar mapeamento de evento:', error);
        return false;
      }

      console.log('✅ Mapeamento de evento salvo:', { stageId, eventName, eventType });
      return true;

    } catch (error) {
      console.error('Erro no ConversionConfigService.upsertEventMapping:', error);
      return false;
    }
  }

  /**
   * Desativar mapeamento de evento
   */
  static async deactivateEventMapping(
    companyId: string,
    stageId: string,
    eventType: 'meta' | 'google' | 'both'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversion_event_mappings')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId)
        .eq('stage_id', stageId)
        .eq('event_type', eventType);

      if (error) {
        console.error('Erro ao desativar mapeamento de evento:', error);
        return false;
      }

      console.log('✅ Mapeamento de evento desativado:', { stageId, eventType });
      return true;

    } catch (error) {
      console.error('Erro no ConversionConfigService.deactivateEventMapping:', error);
      return false;
    }
  }

  /**
   * Obter itens pendentes na fila de conversões
   */
  static async getPendingConversions(
    companyId?: string,
    platform?: 'meta' | 'google',
    limit: number = 50
  ): Promise<ConversionQueueItem[]> {
    try {
      let query = supabase
        .from('conversion_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at')
        .limit(limit);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar conversões pendentes:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Erro no ConversionConfigService.getPendingConversions:', error);
      return [];
    }
  }

  /**
   * Marcar conversão como processando
   */
  static async markConversionAsProcessing(conversionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversion_queue')
        .update({
          status: 'processing',
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversionId);

      if (error) {
        console.error('Erro ao marcar conversão como processando:', error);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Erro no ConversionConfigService.markConversionAsProcessing:', error);
      return false;
    }
  }

  /**
   * Marcar conversão como enviada com sucesso
   */
  static async markConversionAsSent(
    conversionId: string,
    responseData?: any
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversion_queue')
        .update({
          status: 'sent',
          response_data: responseData,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversionId);

      if (error) {
        console.error('Erro ao marcar conversão como enviada:', error);
        return false;
      }

      console.log('✅ Conversão marcada como enviada:', conversionId);
      return true;

    } catch (error) {
      console.error('Erro no ConversionConfigService.markConversionAsSent:', error);
      return false;
    }
  }

  /**
   * Marcar conversão como falhada
   */
  static async markConversionAsFailed(
    conversionId: string,
    errorMessage: string,
    responseData?: any
  ): Promise<boolean> {
    try {
      const { data: current } = await supabase
        .from('conversion_queue')
        .select('attempts')
        .eq('id', conversionId)
        .single();

      const attempts = (current?.attempts || 0) + 1;

      const { error } = await supabase
        .from('conversion_queue')
        .update({
          status: 'failed',
          attempts,
          error_message: errorMessage,
          response_data: responseData,
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversionId);

      if (error) {
        console.error('Erro ao marcar conversão como falhada:', error);
        return false;
      }

      console.log('❌ Conversão marcada como falhada:', { conversionId, attempts, errorMessage });
      return true;

    } catch (error) {
      console.error('Erro no ConversionConfigService.markConversionAsFailed:', error);
      return false;
    }
  }

  /**
   * Criar log de conversão
   */
  static async createConversionLog(
    leadId: string,
    companyId: string,
    platform: 'meta' | 'google',
    eventName: string,
    stageName: string,
    status: 'success' | 'failed' | 'pending',
    conversionValue?: number,
    requestPayload?: any,
    responseData?: any,
    errorMessage?: string,
    processingTimeMs?: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversion_logs')
        .insert({
          lead_id: leadId,
          company_id: companyId,
          platform,
          event_name: eventName,
          stage_name: stageName,
          status,
          conversion_value: conversionValue,
          request_payload: requestPayload,
          response_data: responseData,
          error_message: errorMessage,
          processing_time_ms: processingTimeMs,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao criar log de conversão:', error);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Erro no ConversionConfigService.createConversionLog:', error);
      return false;
    }
  }

  /**
   * Obter estatísticas de conversões de uma empresa
   */
  static async getConversionStats(
    companyId: string,
    days: number = 30
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    meta: number;
    google: number;
    successRate: number;
  }> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const { data, error } = await supabase
        .from('conversion_logs')
        .select('platform, status')
        .eq('company_id', companyId)
        .gte('created_at', dateFrom.toISOString());

      if (error) {
        console.error('Erro ao buscar estatísticas de conversão:', error);
        return { total: 0, success: 0, failed: 0, meta: 0, google: 0, successRate: 0 };
      }

      const logs = data || [];
      const total = logs.length;
      const success = logs.filter(l => l.status === 'success').length;
      const failed = logs.filter(l => l.status === 'failed').length;
      const meta = logs.filter(l => l.platform === 'meta').length;
      const google = logs.filter(l => l.platform === 'google').length;
      const successRate = total > 0 ? (success / total) * 100 : 0;

      return { total, success, failed, meta, google, successRate };

    } catch (error) {
      console.error('Erro no ConversionConfigService.getConversionStats:', error);
      return { total: 0, success: 0, failed: 0, meta: 0, google: 0, successRate: 0 };
    }
  }

  /**
   * Verificar se conversão está habilitada para uma empresa
   */
  static async isConversionEnabled(companyId: string): Promise<boolean> {
    try {
      const config = await this.getCompanyConfig(companyId);
      return config?.conversion_tracking_enabled === true;
    } catch (error) {
      console.error('Erro ao verificar se conversão está habilitada:', error);
      return false;
    }
  }

  /**
   * Obter Pixel ID do Meta para uma empresa
   */
  static async getMetaPixelId(companyId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('meta_pixel_id')
        .eq('company_id', companyId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.meta_pixel_id || null;
    } catch (error) {
      console.error('Erro ao obter Meta Pixel ID:', error);
      return null;
    }
  }

  /**
   * Obter Customer ID do Google Ads para uma empresa
   */
  static async getGoogleCustomerId(companyId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('google_ads_customer_id')
        .eq('company_id', companyId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.google_ads_customer_id || null;
    } catch (error) {
      console.error('Erro ao obter Google Customer ID:', error);
      return null;
    }
  }

  /**
   * Obter ação de conversão do Google Ads para um evento específico
   */
  static async getGoogleConversionAction(companyId: string, eventName: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('google_ads_conversion_actions')
        .eq('company_id', companyId)
        .single();

      if (error || !data) {
        return null;
      }

      const actions = data.google_ads_conversion_actions || {};
      return actions[eventName] || actions['default'] || null;
    } catch (error) {
      console.error('Erro ao obter Google Conversion Action:', error);
      return null;
    }
  }
} 