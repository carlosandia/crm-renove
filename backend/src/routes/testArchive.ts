import express from 'express';
import { supabase } from '../config/supabase';

const router = express.Router();

// POST /api/test/archive - Endpoint de teste para arquivamento (sem autenticação)
router.post('/archive', async (req, res) => {
  try {
    console.log('🧪 [TestArchive] Endpoint de teste chamado:', req.body);
    
    const { pipelineName = 'teste-simplificado' } = req.body;
    
    // Buscar pipeline por nome
    const { data: pipeline, error: fetchError } = await supabase
      .from('pipelines')
      .select('id, name, is_active, description')
      .eq('name', pipelineName)
      .single();
      
    if (fetchError) {
      console.error('❌ [TestArchive] Erro ao buscar pipeline:', fetchError);
      return res.status(404).json({
        error: 'Pipeline não encontrada',
        details: fetchError.message
      });
    }
    
    console.log('✅ [TestArchive] Pipeline encontrada:', pipeline);
    
    // Aplicar arquivamento
    const shouldArchive = true;
    const archiveMetadata = `[ARCHIVED:${new Date().toISOString()}:test-user]`;
    
    // Limpar metadata anterior se existe
    let cleanDescription = pipeline.description || '';
    const archiveRegex = /\[ARCHIVED:[^\]]+\]\s*/g;
    cleanDescription = cleanDescription.replace(archiveRegex, '');
    
    const newDescription = `${archiveMetadata} ${cleanDescription}`.trim();
    
    const updateData = {
      is_active: false,
      description: newDescription,
      updated_at: new Date().toISOString()
    };
    
    console.log('🔄 [TestArchive] Aplicando update:', updateData);
    
    const { data: updateResult, error: updateError } = await supabase
      .from('pipelines')
      .update(updateData)
      .eq('id', pipeline.id)
      .select();
      
    if (updateError) {
      console.error('❌ [TestArchive] Erro no update:', updateError);
      return res.status(500).json({
        error: 'Erro ao arquivar pipeline',
        details: updateError.message
      });
    }
    
    if (!updateResult || updateResult.length === 0) {
      console.error('❌ [TestArchive] Nenhum registro afetado');
      return res.status(500).json({
        error: 'Nenhum registro foi atualizado'
      });
    }
    
    console.log('✅ [TestArchive] Pipeline arquivada com sucesso:', updateResult[0]);
    
    res.json({
      success: true,
      message: 'Pipeline arquivada com sucesso',
      before: pipeline,
      after: updateResult[0]
    });
    
  } catch (error) {
    console.error('❌ [TestArchive] Erro geral:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;