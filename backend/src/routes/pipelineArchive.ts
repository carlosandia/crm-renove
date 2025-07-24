import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';
import { supabase } from '../config/supabase';

const router = express.Router();

// Schema de validação para arquivamento
const archiveSchema = z.object({
  pipelineId: z.string().uuid('ID da pipeline deve ser um UUID válido'),
  shouldArchive: z.boolean(),
});

// POST /api/pipelines/archive - Arquivar/desarquivar pipeline
router.post('/archive', authenticateToken, async (req, res) => {
  try {
    console.log('🗃️ [Archive] Requisição de arquivamento recebida:', req.body);
    
    // Validar dados de entrada
    const validationResult = archiveSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationResult.error.issues
      });
    }

    const { pipelineId, shouldArchive } = validationResult.data;
    const user = req.user;

    // Verificar se usuário está autenticado
    if (!user) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        message: 'Token de acesso requerido'
      });
    }

    // Verificar se é admin
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Apenas administradores podem arquivar pipelines'
      });
    }

    console.log('🔍 [Archive] Usuário autorizado:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    });

    // Buscar pipeline atual para validações
    const { data: currentPipeline, error: fetchError } = await supabase
      .from('pipelines')
      .select('id, name, description, tenant_id, is_active')
      .eq('id', pipelineId)
      .single();

    if (fetchError) {
      console.error('❌ [Archive] Erro ao buscar pipeline:', fetchError);
      return res.status(404).json({
        error: 'Pipeline não encontrada',
        details: fetchError.message
      });
    }

    // Verificar se pipeline pertence ao tenant do usuário (exceto super_admin)
    if (user.role !== 'super_admin' && currentPipeline.tenant_id !== user.tenant_id) {
      return res.status(403).json({
        error: 'Você não tem permissão para modificar esta pipeline'
      });
    }

    console.log('✅ [Archive] Pipeline validada:', {
      id: currentPipeline.id,
      name: currentPipeline.name,
      currentStatus: currentPipeline.is_active
    });

    // Preparar metadados de arquivamento
    const archiveMetadata = shouldArchive 
      ? `[ARCHIVED:${new Date().toISOString()}:${user.email || user.id}]`
      : '';
    
    // Limpar metadata anterior se existe
    let cleanDescription = currentPipeline.description || '';
    const archiveRegex = /\[ARCHIVED:[^\]]+\]\s*/g;
    cleanDescription = cleanDescription.replace(archiveRegex, '');
    
    const newDescription = shouldArchive 
      ? `${archiveMetadata} ${cleanDescription}`.trim()
      : cleanDescription;

    // Usar Service Role para contornar RLS
    const updateData = {
      is_active: !shouldArchive, // is_active = false quando arquivada
      description: newDescription,
      updated_at: new Date().toISOString()
    };

    console.log('🔄 [Archive] Aplicando update:', updateData);

    // Executar update com Service Role (backend sempre usa service role)
    const { data: updateResult, error: updateError } = await supabase
      .from('pipelines')
      .update(updateData)
      .eq('id', pipelineId)
      .select();

    if (updateError) {
      console.error('❌ [Archive] Erro no update:', updateError);
      return res.status(500).json({
        error: 'Erro ao atualizar pipeline',
        details: updateError.message
      });
    }

    if (!updateResult || updateResult.length === 0) {
      console.error('❌ [Archive] Nenhum registro afetado');
      return res.status(500).json({
        error: 'Nenhum registro foi atualizado'
      });
    }

    const actionText = shouldArchive ? 'arquivada' : 'desarquivada';
    console.log(`✅ [Archive] Pipeline ${actionText} com sucesso:`, updateResult[0]);

    res.json({
      success: true,
      message: `Pipeline ${actionText} com sucesso`,
      data: updateResult[0]
    });

  } catch (error) {
    console.error('❌ [Archive] Erro geral:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;