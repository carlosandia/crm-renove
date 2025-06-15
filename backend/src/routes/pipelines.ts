import express from 'express';
import { supabase } from '../index';

const router = express.Router();

// ============================================
// ROTAS PARA PIPELINES
// ============================================

// GET /api/pipelines - Listar todas as pipelines do tenant
router.get('/', async (req, res) => {
  try {
    const { tenant_id } = req.query;

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    // Buscar pipelines
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false });

    if (pipelinesError) {
      console.error('Erro ao buscar pipelines:', pipelinesError);
      return res.status(500).json({ error: 'Erro ao buscar pipelines', details: pipelinesError.message });
    }

    // Para cada pipeline, buscar membros e etapas
    const pipelinesWithDetails = await Promise.all(
      (pipelines || []).map(async (pipeline) => {
        // Buscar membros
        const { data: pipelineMembers } = await supabase
          .from('pipeline_members')
          .select('*')
          .eq('pipeline_id', pipeline.id);

        // Buscar dados dos usuários membros
        const membersWithUserData = await Promise.all(
          (pipelineMembers || []).map(async (pm) => {
            const { data: userData } = await supabase
              .from('users')
              .select('id, first_name, last_name, email')
              .eq('id', pm.member_id)
              .single();

            return {
              ...pm,
              member: userData
            };
          })
        );

        // Buscar etapas
        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', pipeline.id)
          .order('order_index');

        return {
          ...pipeline,
          pipeline_members: membersWithUserData || [],
          pipeline_stages: stages || []
        };
      })
    );

    res.json({ pipelines: pipelinesWithDetails });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' });
  }
});

// GET /api/pipelines/:id - Buscar pipeline específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .select(`
        *,
        created_by_user:users!pipelines_created_by_fkey(first_name, last_name, email),
        pipeline_members(
          id,
          assigned_at,
          member:users!pipeline_members_member_id_fkey(id, first_name, last_name, email)
        ),
        pipeline_stages(
          *,
          follow_ups(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar pipeline:', error);
      return res.status(500).json({ error: 'Erro ao buscar pipeline' });
    }

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline não encontrada' });
    }

    res.json({ pipeline });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/pipelines - Criar nova pipeline
router.post('/', async (req, res) => {
  try {
    const { name, description, tenant_id, created_by, member_ids = [] } = req.body;

    if (!name || !tenant_id || !created_by) {
      return res.status(400).json({ 
        error: 'Nome, tenant_id e created_by são obrigatórios' 
      });
    }

    // Criar a pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({
        name,
        description,
        tenant_id,
        created_by
      })
      .select()
      .single();

    if (pipelineError) {
      console.error('Erro ao criar pipeline:', pipelineError);
      return res.status(500).json({ error: 'Erro ao criar pipeline' });
    }

    // Adicionar membros se fornecidos
    if (member_ids.length > 0) {
      const memberInserts = member_ids.map((member_id: string) => ({
        pipeline_id: pipeline.id,
        member_id
      }));

      const { error: membersError } = await supabase
        .from('pipeline_members')
        .insert(memberInserts);

      if (membersError) {
        console.error('Erro ao adicionar membros:', membersError);
        // Não falha a criação da pipeline por causa dos membros
      }
    }

    res.status(201).json({ 
      message: 'Pipeline criada com sucesso',
      pipeline 
    });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/pipelines/:id - Atualizar pipeline
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar pipeline:', error);
      return res.status(500).json({ error: 'Erro ao atualizar pipeline' });
    }

    res.json({ 
      message: 'Pipeline atualizada com sucesso',
      pipeline 
    });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/pipelines/:id - Excluir pipeline
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('pipelines')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir pipeline:', error);
      return res.status(500).json({ error: 'Erro ao excluir pipeline' });
    }

    res.json({ message: 'Pipeline excluída com sucesso' });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================================
// ROTAS PARA MEMBROS DA PIPELINE
// ============================================

// POST /api/pipelines/:id/members - Adicionar membro à pipeline
router.post('/:id/members', async (req, res) => {
  try {
    const { id: pipeline_id } = req.params;
    const { member_id } = req.body;

    if (!member_id) {
      return res.status(400).json({ error: 'member_id é obrigatório' });
    }

    const { data, error } = await supabase
      .from('pipeline_members')
      .insert({ pipeline_id, member_id })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar membro:', error);
      return res.status(500).json({ error: 'Erro ao adicionar membro' });
    }

    // Buscar dados do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('id', member_id)
      .single();

    const memberWithUserData = {
      ...data,
      member: userData
    };

    res.status(201).json({ 
      message: 'Membro adicionado com sucesso',
      member: memberWithUserData 
    });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/pipelines/:id/members/:member_id - Remover membro da pipeline
router.delete('/:id/members/:member_id', async (req, res) => {
  try {
    const { id: pipeline_id, member_id } = req.params;

    const { error } = await supabase
      .from('pipeline_members')
      .delete()
      .eq('pipeline_id', pipeline_id)
      .eq('member_id', member_id);

    if (error) {
      console.error('Erro ao remover membro:', error);
      return res.status(500).json({ error: 'Erro ao remover membro' });
    }

    res.json({ message: 'Membro removido com sucesso' });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================================
// ROTAS PARA ETAPAS DA PIPELINE
// ============================================

// GET /api/pipelines/:id/stages - Listar etapas da pipeline
router.get('/:id/stages', async (req, res) => {
  try {
    const { id: pipeline_id } = req.params;

    const { data: stages, error } = await supabase
      .from('pipeline_stages')
      .select(`
        *,
        follow_ups(*)
      `)
      .eq('pipeline_id', pipeline_id)
      .order('order_index');

    if (error) {
      console.error('Erro ao buscar etapas:', error);
      return res.status(500).json({ error: 'Erro ao buscar etapas' });
    }

    res.json({ stages: stages || [] });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/pipelines/:id/stages - Criar nova etapa
router.post('/:id/stages', async (req, res) => {
  try {
    const { id: pipeline_id } = req.params;
    const { name, temperature_score, max_days_allowed, color = '#3B82F6' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome da etapa é obrigatório' });
    }

    // Buscar próximo order_index
    const { data: lastStage } = await supabase
      .from('pipeline_stages')
      .select('order_index')
      .eq('pipeline_id', pipeline_id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const order_index = (lastStage?.order_index || 0) + 1;

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .insert({
        pipeline_id,
        name,
        order_index,
        temperature_score,
        max_days_allowed,
        color
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar etapa:', error);
      return res.status(500).json({ error: 'Erro ao criar etapa' });
    }

    res.status(201).json({ 
      message: 'Etapa criada com sucesso',
      stage 
    });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/pipelines/:id/stages/:stage_id - Atualizar etapa
router.put('/:id/stages/:stage_id', async (req, res) => {
  try {
    const { stage_id } = req.params;
    const { name, temperature_score, max_days_allowed, color } = req.body;

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .update({ name, temperature_score, max_days_allowed, color })
      .eq('id', stage_id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar etapa:', error);
      return res.status(500).json({ error: 'Erro ao atualizar etapa' });
    }

    res.json({ 
      message: 'Etapa atualizada com sucesso',
      stage 
    });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/pipelines/:id/stages/:stage_id - Excluir etapa
router.delete('/:id/stages/:stage_id', async (req, res) => {
  try {
    const { stage_id } = req.params;

    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', stage_id);

    if (error) {
      console.error('Erro ao excluir etapa:', error);
      return res.status(500).json({ error: 'Erro ao excluir etapa' });
    }

    res.json({ message: 'Etapa excluída com sucesso' });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/pipelines/:id/stages/reorder - Reordenar etapas
router.put('/:id/stages/reorder', async (req, res) => {
  try {
    const { id: pipeline_id } = req.params;
    const { stages } = req.body; // Array de { id, order_index }

    if (!Array.isArray(stages)) {
      return res.status(400).json({ error: 'Stages deve ser um array' });
    }

    // Atualizar ordem das etapas
    const updates = stages.map(stage => 
      supabase
        .from('pipeline_stages')
        .update({ order_index: stage.order_index })
        .eq('id', stage.id)
        .eq('pipeline_id', pipeline_id)
    );

    await Promise.all(updates);

    res.json({ message: 'Etapas reordenadas com sucesso' });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================================
// ROTAS PARA FOLLOW-UPS
// ============================================

// POST /api/pipelines/:id/follow-ups - Criar follow-up
router.post('/:id/follow-ups', async (req, res) => {
  try {
    const { id: pipeline_id } = req.params;
    const { stage_id, day_offset, note } = req.body;

    if (!stage_id || !day_offset) {
      return res.status(400).json({ 
        error: 'stage_id e day_offset são obrigatórios' 
      });
    }

    const { data: followUp, error } = await supabase
      .from('follow_ups')
      .insert({
        pipeline_id,
        stage_id,
        day_offset,
        note
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar follow-up:', error);
      return res.status(500).json({ error: 'Erro ao criar follow-up' });
    }

    res.status(201).json({ 
      message: 'Follow-up criado com sucesso',
      followUp 
    });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/pipelines/:id/follow-ups/:follow_up_id - Excluir follow-up
router.delete('/:id/follow-ups/:follow_up_id', async (req, res) => {
  try {
    const { follow_up_id } = req.params;

    const { error } = await supabase
      .from('follow_ups')
      .delete()
      .eq('id', follow_up_id);

    if (error) {
      console.error('Erro ao excluir follow-up:', error);
      return res.status(500).json({ error: 'Erro ao excluir follow-up' });
    }

    res.json({ message: 'Follow-up excluído com sucesso' });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});



// GET /api/pipelines/member/:member_id - Listar pipelines do membro
router.get('/member/:member_id', async (req, res) => {
  try {
    const { member_id } = req.params;

    if (!member_id) {
      return res.status(400).json({ error: 'member_id é obrigatório' });
    }

    // Buscar pipelines onde o membro está vinculado
    const { data: pipelineMembers, error: membersError } = await supabase
      .from('pipeline_members')
      .select('pipeline_id')
      .eq('member_id', member_id);

    if (membersError) {
      console.error('Erro ao buscar pipeline_members:', membersError);
      return res.status(500).json({ error: 'Erro ao buscar pipeline_members' });
    }

    if (!pipelineMembers || pipelineMembers.length === 0) {
      return res.json({ pipelines: [] });
    }

    const pipelineIds = pipelineMembers.map(pm => pm.pipeline_id);

    // Buscar detalhes das pipelines
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('*')
      .in('id', pipelineIds)
      .order('created_at', { ascending: false });

    if (pipelinesError) {
      console.error('Erro ao buscar pipelines:', pipelinesError);
      return res.status(500).json({ error: 'Erro ao buscar pipelines' });
    }

    // Para cada pipeline, buscar etapas
    const pipelinesWithStages = await Promise.all(
      (pipelines || []).map(async (pipeline) => {
        // Buscar etapas
        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', pipeline.id)
          .order('order_index');

        return {
          ...pipeline,
          pipeline_stages: stages || []
        };
      })
    );

    res.json({ pipelines: pipelinesWithStages });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;