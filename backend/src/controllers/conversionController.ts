import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import ConversionService from '../services/conversionService';

export class ConversionController {
  
  /**
   * POST /api/conversions/process-queue
   * Processar fila de conversões manualmente
   */
  static async processQueue(req: Request, res: Response) {
    try {
      const { limit = 10 } = req.body;
      
      await ConversionService.processConversionsQueue(limit);
      
      res.json({
        success: true,
        message: 'Fila de conversões processada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao processar fila:', error);
      res.status(500).json({
        error: 'Erro ao processar fila de conversões',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * POST /api/conversions/test-tokens
   * Testar tokens de integração
   */
  static async testTokens(req: Request, res: Response) {
    try {
      const { meta_token, google_token } = req.body;
      
      const results: any = {};
      
      if (meta_token) {
        results.meta_valid = await ConversionService.testMetaToken(meta_token);
      }
      
      if (google_token) {
        results.google_valid = await ConversionService.testGoogleToken(google_token);
      }
      
      res.json({
        success: true,
        results
      });
    } catch (error) {
      console.error('Erro ao testar tokens:', error);
      res.status(500).json({
        error: 'Erro ao testar tokens',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * PUT /api/leads/:lead_id/status
   * Atualizar status do lead (trigger para conversões)
   */
  static async updateLeadStatus(req: Request, res: Response) {
    try {
      const { lead_id } = req.params;
      const { status, conversion_value } = req.body;
      
      if (!lead_id) {
        return res.status(400).json({ error: 'lead_id é obrigatório' });
      }
      
      if (!status || !['active', 'won', 'lost'].includes(status)) {
        return res.status(400).json({ 
          error: 'Status deve ser: active, won ou lost' 
        });
      }
      
      // Atualizar status do lead (trigger automático irá processar conversão)
      const { data: lead, error } = await supabase
        .from('pipeline_leads')
        .update({
          status,
          conversion_value: conversion_value || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead_id)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar status do lead:', error);
        return res.status(500).json({
          error: 'Erro ao atualizar status do lead',
          details: error.message
        });
      }
      
      res.json({
        success: true,
        message: `Status do lead atualizado para ${status}`,
        lead
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /api/conversions/logs
   * Buscar logs de conversão (apenas admins)
   */
  static async getConversionLogs(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        platform, 
        status,
        lead_id 
      } = req.query;
      
      const offset = (Number(page) - 1) * Number(limit);
      
      let query = supabase
        .from('conversion_logs')
        .select(`
          *,
          pipeline_leads!inner(
            id,
            custom_data,
            pipelines!inner(
              tenant_id
            )
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);
      
      if (platform) {
        query = query.eq('platform', platform);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (lead_id) {
        query = query.eq('lead_id', lead_id);
      }
      
      const { data: logs, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar logs:', error);
        return res.status(500).json({
          error: 'Erro ao buscar logs de conversão',
          details: error.message
        });
      }
      
      res.json({
        success: true,
        logs: logs || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: logs?.length || 0
        }
      });
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * POST /api/conversions/manual-send
   * Enviar conversão manual para um lead específico
   */
  static async manualSend(req: Request, res: Response) {
    try {
      const { 
        lead_id, 
        platform, 
        event_name = 'Lead',
        force = false 
      } = req.body;
      
      if (!lead_id || !platform) {
        return res.status(400).json({
          error: 'lead_id e platform são obrigatórios'
        });
      }
      
      if (!['meta', 'google'].includes(platform)) {
        return res.status(400).json({
          error: 'Platform deve ser meta ou google'
        });
      }
      
      // Verificar se pode enviar conversão
      const { data: conversionCheck, error: checkError } = await supabase
        .rpc('can_send_conversion', { p_lead_id: lead_id });
      
      if (checkError) {
        return res.status(500).json({
          error: 'Erro ao verificar elegibilidade',
          details: checkError.message
        });
      }
      
      const check = conversionCheck[0];
      
      if (!check.can_convert && !force) {
        return res.status(400).json({
          error: 'Lead não elegível para conversão',
          reason: check.reason,
          lead_source: check.lead_source
        });
      }
      
      // Criar log de conversão manual
      const { data: logId, error: logError } = await supabase
        .rpc('log_conversion_attempt', {
          p_lead_id: lead_id,
          p_platform: platform,
          p_event_name: event_name,
          p_event_time: new Date().toISOString(),
          p_request_payload: check.lead_data,
          p_status: 'pending'
        });
      
      if (logError) {
        return res.status(500).json({
          error: 'Erro ao criar log de conversão',
          details: logError.message
        });
      }
      
      res.json({
        success: true,
        message: 'Conversão manual agendada',
        log_id: logId,
        lead_id,
        platform,
        event_name
      });
    } catch (error) {
      console.error('Erro no envio manual:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * GET /api/conversions/stats
   * Estatísticas de conversões por empresa
   */
  static async getStats(req: Request, res: Response) {
    try {
      const { company_id, days = 30 } = req.query;
      
      if (!company_id) {
        return res.status(400).json({
          error: 'company_id é obrigatório'
        });
      }
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));
      
      // Buscar estatísticas
      const { data: stats, error } = await supabase
        .from('conversion_logs')
        .select(`
          platform,
          status,
          event_name,
          created_at,
          pipeline_leads!inner(
            pipelines!inner(
              tenant_id
            )
          )
        `)
        .eq('pipeline_leads.pipelines.tenant_id', company_id)
        .gte('created_at', startDate.toISOString());
      
      if (error) {
        return res.status(500).json({
          error: 'Erro ao buscar estatísticas',
          details: error.message
        });
      }
      
      // Processar estatísticas
      const summary = {
        total: stats?.length || 0,
        sent: stats?.filter(s => s.status === 'sent').length || 0,
        failed: stats?.filter(s => s.status === 'failed').length || 0,
        pending: stats?.filter(s => s.status === 'pending').length || 0,
        by_platform: {
          meta: stats?.filter(s => s.platform === 'meta').length || 0,
          google: stats?.filter(s => s.platform === 'google').length || 0
        },
        success_rate: stats?.length ? 
          Math.round((stats.filter(s => s.status === 'sent').length / stats.length) * 100) : 0
      };
      
      res.json({
        success: true,
        period_days: Number(days),
        summary,
        details: stats || []
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * DELETE /api/conversions/logs/:log_id
   * Remover log de conversão (apenas para testes)
   */
  static async deleteLog(req: Request, res: Response) {
    try {
      const { log_id } = req.params;
      
      if (!log_id) {
        return res.status(400).json({ error: 'log_id é obrigatório' });
      }
      
      const { error } = await supabase
        .from('conversion_logs')
        .delete()
        .eq('id', log_id);
      
      if (error) {
        return res.status(500).json({
          error: 'Erro ao remover log',
          details: error.message
        });
      }
      
      res.json({
        success: true,
        message: 'Log removido com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover log:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

export default ConversionController; 