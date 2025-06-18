import express from 'express';
import ConversionController from '../controllers/conversionController';

const router = express.Router();

// ============================================
// ROTAS DE CONVERSÕES
// ============================================

/**
 * POST /api/conversions/process-queue
 * Processar fila de conversões manualmente
 * 
 * Body: { limit?: number }
 */
router.post('/process-queue', ConversionController.processQueue);

/**
 * POST /api/conversions/test-tokens
 * Testar tokens de integração
 * 
 * Body: { meta_token?: string, google_token?: string }
 */
router.post('/test-tokens', ConversionController.testTokens);

/**
 * PUT /api/conversions/leads/:lead_id/status
 * Atualizar status do lead (trigger para conversões)
 * 
 * Body: { status: 'active' | 'won' | 'lost', conversion_value?: number }
 */
router.put('/leads/:lead_id/status', ConversionController.updateLeadStatus);

/**
 * GET /api/conversions/logs
 * Buscar logs de conversão (apenas admins)
 * 
 * Query: { page?, limit?, platform?, status?, lead_id? }
 */
router.get('/logs', ConversionController.getConversionLogs);

/**
 * POST /api/conversions/manual-send
 * Enviar conversão manual para um lead específico
 * 
 * Body: { lead_id: string, platform: 'meta' | 'google', event_name?: string, force?: boolean }
 */
router.post('/manual-send', ConversionController.manualSend);

/**
 * GET /api/conversions/stats
 * Estatísticas de conversões por empresa
 * 
 * Query: { company_id: string, days?: number }
 */
router.get('/stats', ConversionController.getStats);

/**
 * DELETE /api/conversions/logs/:log_id
 * Remover log de conversão (apenas para testes)
 */
router.delete('/logs/:log_id', ConversionController.deleteLog);

// ============================================
// MIDDLEWARE DE VALIDAÇÃO (futuro)
// ============================================

// TODO: Adicionar middleware de autenticação
// TODO: Adicionar middleware de autorização por role
// TODO: Adicionar rate limiting para APIs externas

export default router; 