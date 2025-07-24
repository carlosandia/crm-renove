import express from 'express';
import { CadenceService } from '../services/cadenceService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/cadence/save
 * Salvar configuração de cadência para uma pipeline
 */
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const {
      pipeline_id,
      cadence_configs,
      tenant_id,
      created_by
    } = req.body;

    // Validação básica
    if (!pipeline_id || !cadence_configs || !tenant_id) {
      return res.status(400).json({
        error: 'Campos obrigatórios: pipeline_id, cadence_configs, tenant_id'
      });
    }

    if (!Array.isArray(cadence_configs)) {
      return res.status(400).json({
        error: 'cadence_configs deve ser um array'
      });
    }

    const result = await CadenceService.saveCadenceConfig(
      pipeline_id,
      cadence_configs,
      tenant_id,
      created_by || 'system'
    );

    if (result.success) {
      res.json({
        message: result.message,
        configs: result.configs
      });
    } else {
      res.status(500).json({
        error: result.message
      });
    }

  } catch (error: any) {
    console.error('Erro na rota /cadence/save:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/cadence/load/:pipeline_id
 * Carregar configurações de cadência de uma pipeline
 */
router.get('/load/:pipeline_id', authenticateToken, async (req, res) => {
  try {
    const { pipeline_id } = req.params;
    const { tenant_id } = req.query;

    if (!pipeline_id || !tenant_id) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: pipeline_id, tenant_id'
      });
    }

    const result = await CadenceService.loadCadenceConfig(
      pipeline_id,
      tenant_id as string
    );

    if (result.success) {
      res.json({
        message: result.message,
        configs: result.configs || []
      });
    } else {
      res.status(500).json({
        error: result.message
      });
    }

  } catch (error: any) {
    console.error('Erro na rota /cadence/load:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * DELETE /api/cadence/delete/:pipeline_id
 * Deletar configurações de cadência de uma pipeline
 */
router.delete('/delete/:pipeline_id', authenticateToken, async (req, res) => {
  try {
    const { pipeline_id } = req.params;
    const { tenant_id } = req.query;

    if (!pipeline_id || !tenant_id) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: pipeline_id, tenant_id'
      });
    }

    const result = await CadenceService.deleteCadenceConfig(
      pipeline_id,
      tenant_id as string
    );

    if (result.success) {
      res.json({
        message: result.message
      });
    } else {
      res.status(500).json({
        error: result.message
      });
    }

  } catch (error: any) {
    console.error('Erro na rota /cadence/delete:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/cadence/stage/:pipeline_id/:stage_name
 * Buscar configuração de cadência para uma etapa específica
 */
router.get('/stage/:pipeline_id/:stage_name', authenticateToken, async (req, res) => {
  try {
    const { pipeline_id, stage_name } = req.params;
    const { tenant_id } = req.query;

    if (!pipeline_id || !stage_name || !tenant_id) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: pipeline_id, stage_name, tenant_id'
      });
    }

    const result = await CadenceService.getCadenceConfigForStage(
      pipeline_id,
      decodeURIComponent(stage_name),
      tenant_id as string
    );

    if (result.success) {
      res.json({
        config: result.config,
        tasks: result.tasks || []
      });
    } else {
      res.status(404).json({
        error: 'Configuração de cadência não encontrada para esta etapa'
      });
    }

  } catch (error: any) {
    console.error('Erro na rota /cadence/stage:', error);
    res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/cadence/test
 * Endpoint para testar a funcionalidade
 */
router.post('/test', async (req, res) => {
  try {
    const testData = {
      pipeline_id: 'test-pipeline-id',
      cadence_configs: [
        {
          pipeline_id: 'test-pipeline-id',
          stage_name: 'Novo Lead',
          stage_order: 0,
          tasks: [
            {
              day_offset: 0,
              task_order: 1,
              channel: 'email' as const,
              action_type: 'mensagem' as const,
              task_title: 'E-mail de boas-vindas',
              task_description: 'Enviar e-mail de boas-vindas para o lead',
              template_content: 'Olá {{nome}}, bem-vindo!',
              is_active: true
            },
            {
              day_offset: 1,
              task_order: 1,
              channel: 'whatsapp' as const,
              action_type: 'mensagem' as const,
              task_title: 'WhatsApp follow-up',
              task_description: 'Fazer contato via WhatsApp',
              template_content: 'Oi {{nome}}, vamos conversar?',
              is_active: true
            }
          ],
          is_active: true,
          tenant_id: 'test-tenant-id'
        }
      ],
      tenant_id: 'test-tenant-id',
      created_by: 'test-user'
    };

    const result = await CadenceService.saveCadenceConfig(
      testData.pipeline_id,
      testData.cadence_configs,
      testData.tenant_id,
      testData.created_by
    );

    res.json({
      message: 'Teste de cadência executado',
      result,
      test_data: testData
    });

  } catch (error: any) {
    console.error('Erro no teste de cadência:', error);
    res.status(500).json({
      error: error.message || 'Erro no teste'
    });
  }
});

export default router; 