// =====================================================================================
// ROUTES: Pipeline Metrics Preferences
// Autor: Claude (Arquiteto Sênior)
// Descrição: Endpoints para gerenciar preferências de métricas por pipeline
// =====================================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabase-admin';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

// Schemas de validação
import {
  PipelineMetricsPreferencesSchema,
  UpdatePipelineMetricsPreferencesSchema,
  GetPipelineMetricsPreferencesSchema,
  MultiplePipelineMetricsPreferencesSchema,
  createDefaultPipelineMetricsPreferences,
  validateMetricsSelection,
  MAX_SELECTED_METRICS,
  MIN_SELECTED_METRICS
} from '../shared/schemas/pipeline-metrics-preferences';

const router = Router();

// ============================================
// MIDDLEWARE ESPECÍFICO
// ============================================

// Middleware para validar UUID de pipeline
const validatePipelineId = (req: Request, res: Response, next: Function) => {
  const { pipeline_id } = req.params;
  
  if (!pipeline_id || !z.string().uuid().safeParse(pipeline_id).success) {
    return res.status(400).json({
      success: false,
      message: 'Pipeline ID inválido'
    });
  }
  
  next();
};

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Buscar preferências existentes do usuário
 */
const getUserPreferences = async (userId: string, tenantId: string) => {
  const { data, error } = await supabaseAdmin
    .getClient()
    .from('user_preferences')
    .select('preferences')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    logger.error('Erro ao buscar preferências do usuário:', error);
    throw error;
  }
  
  return data?.preferences || {};
};

/**
 * Salvar preferências do usuário
 */
const saveUserPreferences = async (userId: string, tenantId: string, preferences: any) => {
  const { error } = await supabaseAdmin
    .getClient()
    .from('user_preferences')
    .upsert({
      user_id: userId,
      tenant_id: tenantId,
      preferences,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,tenant_id'
    });
    
  if (error) {
    logger.error('Erro ao salvar preferências do usuário:', error);
    throw error;
  }
};

// ============================================
// ENDPOINTS
// ============================================

/**
 * GET /pipeline-metrics-preferences/:pipeline_id
 * Buscar preferências de métricas para uma pipeline específica
 */
router.get('/:pipeline_id', 
  authenticateToken,
  validatePipelineId,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }
      
      const { pipeline_id } = req.params;
      const { tenant_id } = req.query;
      const userId = req.user.id;
      
      // Validar tenant_id
      if (tenant_id !== req.user.tenant_id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado ao tenant'
        });
      }

      logger.info(`Buscando preferências de métricas - Pipeline: ${pipeline_id.substring(0, 8)}...`);

      // Buscar preferências existentes
      const userPreferences = await getUserPreferences(userId, req.user.tenant_id);
      const pipelineMetricsPrefs = userPreferences?.pipeline_metrics?.[pipeline_id];

      if (!pipelineMetricsPrefs) {
        // Retornar preferências padrão se não existir
        const defaultPrefs = createDefaultPipelineMetricsPreferences(pipeline_id);
        
        logger.info(`Preferências não encontradas, retornando padrão - Pipeline: ${pipeline_id.substring(0, 8)}...`);
        
        return res.json({
          success: true,
          data: defaultPrefs,
          message: 'Preferências padrão (não salvas)',
          updated_at: defaultPrefs.updated_at
        });
      }

      // Validar e retornar preferências salvas
      const parsedPrefs = PipelineMetricsPreferencesSchema.parse({
        ...pipelineMetricsPrefs,
        pipeline_id
      });

      logger.info(`Preferências encontradas - Pipeline: ${pipeline_id.substring(0, 8)}..., Métricas: ${parsedPrefs.visible_metrics.length}`);

      res.json({
        success: true,
        data: parsedPrefs,
        message: 'Preferências carregadas com sucesso',
        updated_at: parsedPrefs.updated_at
      });

    } catch (error: any) {
      logger.error('Erro ao buscar preferências de métricas:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /pipeline-metrics-preferences/:pipeline_id
 * Atualizar preferências de métricas para uma pipeline específica
 */
router.put('/:pipeline_id',
  authenticateToken,
  validatePipelineId,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }
      
      const { pipeline_id } = req.params;
      const { tenant_id } = req.query;
      const userId = req.user.id;
      
      // Validar tenant_id
      if (tenant_id !== req.user.tenant_id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado ao tenant'
        });
      }

      // Validar payload
      const updateData = UpdatePipelineMetricsPreferencesSchema.parse(req.body);
      
      // Validação adicional
      if (!validateMetricsSelection(updateData.visible_metrics)) {
        return res.status(400).json({
          success: false,
          message: `Seleção inválida: deve ter entre ${MIN_SELECTED_METRICS} e ${MAX_SELECTED_METRICS} métricas`
        });
      }

      logger.info(`Atualizando preferências de métricas - Pipeline: ${pipeline_id.substring(0, 8)}..., Métricas: ${updateData.visible_metrics.length}`);

      // Buscar preferências existentes
      const userPreferences = await getUserPreferences(userId, req.user.tenant_id);
      
      // Preparar novas preferências
      const newPipelinePrefs = {
        pipeline_id,
        visible_metrics: updateData.visible_metrics,
        metrics_order: updateData.metrics_order,
        updated_at: new Date().toISOString(),
        created_at: userPreferences?.pipeline_metrics?.[pipeline_id]?.created_at || new Date().toISOString()
      };

      // Atualizar preferências no objeto completo
      const updatedPreferences = {
        ...userPreferences,
        pipeline_metrics: {
          ...userPreferences?.pipeline_metrics,
          [pipeline_id]: newPipelinePrefs
        }
      };

      // Salvar no banco
      await saveUserPreferences(userId, req.user.tenant_id, updatedPreferences);

      // Validar resposta
      const responseData = PipelineMetricsPreferencesSchema.parse(newPipelinePrefs);

      logger.info(`Preferências atualizadas com sucesso - Pipeline: ${pipeline_id.substring(0, 8)}...`);

      res.json({
        success: true,
        data: responseData,
        message: 'Preferências atualizadas com sucesso',
        updated_at: responseData.updated_at
      });

    } catch (error: any) {
      logger.error('Erro ao atualizar preferências de métricas:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /pipeline-metrics-preferences/multiple
 * Buscar preferências de múltiplas pipelines
 */
router.post('/multiple',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }
      
      const { tenant_id } = req.query;
      const userId = req.user.id;
      
      // Validar tenant_id
      if (tenant_id !== req.user.tenant_id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado ao tenant'
        });
      }

      // Validar payload
      const requestData = MultiplePipelineMetricsPreferencesSchema.parse(req.body);

      logger.info(`Buscando preferências de múltiplas pipelines - Count: ${requestData.pipeline_ids.length}`);

      // Buscar preferências existentes
      const userPreferences = await getUserPreferences(userId, req.user.tenant_id);
      const pipelineMetricsPrefs = userPreferences?.pipeline_metrics || {};

      // Construir resposta
      const result: Record<string, any> = {};
      
      for (const pipelineId of requestData.pipeline_ids) {
        const pipelinePrefs = pipelineMetricsPrefs[pipelineId];
        
        if (pipelinePrefs) {
          // Preferências salvas existem
          result[pipelineId] = PipelineMetricsPreferencesSchema.parse({
            ...pipelinePrefs,
            pipeline_id: pipelineId
          });
        } else {
          // Usar preferências padrão
          result[pipelineId] = createDefaultPipelineMetricsPreferences(pipelineId);
        }
      }

      logger.info(`Preferências de múltiplas pipelines carregadas - Found: ${Object.keys(result).length}`);

      res.json({
        success: true,
        data: result,
        message: 'Preferências carregadas com sucesso',
        count: Object.keys(result).length
      });

    } catch (error: any) {
      logger.error('Erro ao buscar preferências de múltiplas pipelines:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * DELETE /pipeline-metrics-preferences/:pipeline_id
 * Remover preferências de uma pipeline (resetar para padrão)
 */
router.delete('/:pipeline_id',
  authenticateToken,
  validatePipelineId,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }
      
      const { pipeline_id } = req.params;
      const { tenant_id } = req.query;
      const userId = req.user.id;
      
      // Validar tenant_id
      if (tenant_id !== req.user.tenant_id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado ao tenant'
        });
      }

      logger.info(`Removendo preferências de métricas - Pipeline: ${pipeline_id.substring(0, 8)}...`);

      // Buscar preferências existentes
      const userPreferences = await getUserPreferences(userId, req.user.tenant_id);
      
      // Remover preferências da pipeline
      if (userPreferences?.pipeline_metrics?.[pipeline_id]) {
        delete userPreferences.pipeline_metrics[pipeline_id];
        
        // Salvar preferências atualizadas
        await saveUserPreferences(userId, req.user.tenant_id, userPreferences);
      }

      logger.info(`Preferências removidas com sucesso - Pipeline: ${pipeline_id.substring(0, 8)}...`);

      res.json({
        success: true,
        message: 'Preferências removidas com sucesso (resetadas para padrão)'
      });

    } catch (error: any) {
      logger.error('Erro ao remover preferências de métricas:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;