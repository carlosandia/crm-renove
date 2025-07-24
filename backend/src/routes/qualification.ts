import express from 'express';
import { QualificationController } from '../controllers/qualificationController';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// AIDEV-NOTE: Aplicar middleware de autenticação e rate limiting em todas as rotas
router.use(authenticateToken);
router.use(rateLimiter);

/**
 * @route PUT /api/qualification/rules/:pipeline_id
 * @desc Salvar regras de qualificação para uma pipeline
 * @access Admin/Super Admin
 */
router.put('/rules/:pipeline_id', QualificationController.saveQualificationRules);

/**
 * @route GET /api/qualification/rules/:pipeline_id  
 * @desc Buscar regras de qualificação de uma pipeline
 * @access Admin/Super Admin/Member
 */
router.get('/rules/:pipeline_id', QualificationController.getQualificationRules);

/**
 * @route POST /api/qualification/evaluate/:pipeline_lead_id
 * @desc Avaliar regras de qualificação para um lead específico
 * @access Admin/Super Admin/Member
 */
router.post('/evaluate/:pipeline_lead_id', QualificationController.evaluateQualificationRules);

/**
 * @route GET /api/qualification/stats
 * @desc Obter estatísticas de qualificação
 * @access Admin/Super Admin/Member
 * @query pipeline_id (opcional) - filtrar por pipeline específica
 */
router.get('/stats', QualificationController.getQualificationStats);

/**
 * @route PUT /api/qualification/manual/:pipeline_lead_id
 * @desc Aplicar qualificação manual a um lead
 * @access Admin/Super Admin/Member
 */
router.put('/manual/:pipeline_lead_id', QualificationController.applyManualQualification);

export default router;