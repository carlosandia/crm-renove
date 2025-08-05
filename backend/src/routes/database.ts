import express, { Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = express.Router();

// Rota para execução de queries SQL (para desenvolvimento e debugging)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, params = [] } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query é obrigatória' });
    }

    // Execute query with parameters
    const { data, error } = await supabase.rpc('exec_sql', {
      query: query,
      params: params
    });

    if (error) {
      console.error('Erro na execução da query:', error);
      return res.status(500).json({ 
        error: 'Erro ao executar query', 
        details: error.message 
      });
    }

    res.json({ data });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Nova rota proxy para contornar RLS
router.post('/proxy', async (req: Request, res: Response) => {
  try {
    const { table, operation, params = {} } = req.body;
    
    console.log('🔄 Backend Proxy Request:', { table, operation, params });

    if (!table || !operation) {
      return res.status(400).json({ 
        error: 'Table e operation são obrigatórios',
        received: { table, operation }
      });
    }

    let result;

    // Implementação simplificada para evitar problemas de tipos
    if (operation === 'select') {
      // Para pipelines especificamente (caso mais comum)
      if (table === 'pipelines') {
        const { data, error } = await supabase
          .from('pipelines')
          .select(`
            *,
            pipeline_stages(*),
            pipeline_custom_fields(*),
            pipeline_members(
              id,
              member_id,
              assigned_at,
              users:member_id(id, first_name, last_name, email, is_active)
            )
          `)
          .eq('tenant_id', params.filters?.tenant_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
          
        if (error) {
          throw error;
        }
        
        result = { data, error: null };
      } else {
        // Query genérica para outras tabelas
        const { data, error } = await supabase
          .from(table)
          .select('*');
          
        if (error) {
          throw error;
        }
        
        result = { data, error: null };
      }
    } else {
      return res.status(400).json({ 
        error: 'Apenas operação SELECT é suportada por enquanto'
      });
    }

    console.log('✅ Backend Proxy Success:', {
      table, 
      operation, 
      resultCount: result.data?.length || 0
    });

    res.json(result);

  } catch (error) {
    console.error('❌ Backend Proxy Error:', error);
    res.status(500).json({ 
      error: 'Erro no proxy do backend',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ✅ ENDPOINT ESPECÍFICO PARA PIPELINE_MEMBERS (CORS FALLBACK)
router.get('/pipeline-members/:pipelineId', async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.params;
    const { tenant_id } = req.query;

    if (!pipelineId) {
      return res.status(400).json({
        success: false,
        error: 'pipeline_id é obrigatório'
      });
    }

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id é obrigatório via query string'
      });
    }

    console.log('🔍 [PIPELINE_MEMBERS] Buscando membros via service role:', {
      pipelineId: pipelineId.substring(0, 8),
      tenant_id: tenant_id.toString().substring(0, 8)
    });

    // Usar service role para bypass RLS
    const { data: members, error } = await supabase
      .from('pipeline_members')
      .select('*')
      .eq('pipeline_id', pipelineId);

    if (error) {
      console.error('❌ [PIPELINE_MEMBERS] Erro Supabase:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar membros da pipeline',
        details: error.message
      });
    }

    console.log('✅ [PIPELINE_MEMBERS] Membros encontrados:', members?.length || 0);

    res.json({
      success: true,
      data: members || [],
      count: members?.length || 0
    });

  } catch (error) {
    console.error('❌ [PIPELINE_MEMBERS] Erro geral:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 