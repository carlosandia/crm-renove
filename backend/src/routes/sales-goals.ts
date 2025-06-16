import express from 'express';
import { supabase } from '../index';

const router = express.Router();

// GET /api/sales-goals - Listar metas por tenant ou usuário
router.get('/', async (req, res) => {
  try {
    const { tenant_id, user_id } = req.query;

    if (!tenant_id) {
      return res.status(400).json({ message: 'tenant_id é obrigatório' });
    }

    console.log('🎯 Buscando metas para tenant:', tenant_id, user_id ? `e usuário: ${user_id}` : '');

    let query = supabase
      .from('sales_goals')
      .select(`
        id,
        goal_type,
        goal_value,
        current_value,
        period,
        target_date,
        status,
        created_at,
        user_id,
        users!inner(first_name, last_name, email)
      `)
      .eq('tenant_id', tenant_id);

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: goals, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar metas:', error);
      return res.status(500).json({ message: 'Erro ao buscar metas', error: error.message });
    }

    console.log(`✅ Encontradas ${goals?.length || 0} metas`);

    res.json({
      success: true,
      goals: goals || []
    });

  } catch (error) {
    console.error('💥 Erro no endpoint de metas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// POST /api/sales-goals - Criar nova meta
router.post('/', async (req, res) => {
  try {
    const { 
      user_id, 
      tenant_id, 
      goal_type, 
      goal_value, 
      period, 
      target_date, 
      created_by 
    } = req.body;

    if (!user_id || !tenant_id || !goal_type || !goal_value || !period || !target_date) {
      return res.status(400).json({ 
        message: 'Campos obrigatórios: user_id, tenant_id, goal_type, goal_value, period, target_date' 
      });
    }

    console.log('🎯 Criando meta:', { user_id, goal_type, goal_value, period, target_date });

    // Verificar se já existe meta similar
    const { data: existingGoal, error: checkError } = await supabase
      .from('sales_goals')
      .select('id')
      .eq('user_id', user_id)
      .eq('goal_type', goal_type)
      .eq('period', period)
      .eq('target_date', target_date)
      .single();

    if (existingGoal) {
      return res.status(400).json({ 
        message: 'Já existe uma meta deste tipo para este período e data' 
      });
    }

    // Criar meta
    const { data: newGoal, error } = await supabase
      .from('sales_goals')
      .insert([{
        user_id,
        tenant_id,
        goal_type,
        goal_value: parseFloat(goal_value),
        current_value: 0,
        period,
        target_date,
        status: 'ativa',
        created_by
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar meta:', error);
      return res.status(500).json({ message: 'Erro ao criar meta', error: error.message });
    }

    console.log('✅ Meta criada com sucesso:', newGoal.id);

    res.status(201).json({
      success: true,
      message: 'Meta criada com sucesso',
      goal: newGoal
    });

  } catch (error) {
    console.error('💥 Erro ao criar meta:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// PUT /api/sales-goals/:id - Atualizar meta
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { goal_value, current_value, target_date, status } = req.body;

    console.log('✏️ Atualizando meta:', id);

    const updateData: any = {};
    
    if (goal_value !== undefined) updateData.goal_value = parseFloat(goal_value);
    if (current_value !== undefined) updateData.current_value = parseFloat(current_value);
    if (target_date) updateData.target_date = target_date;
    if (status) updateData.status = status;

    const { data: updatedGoal, error } = await supabase
      .from('sales_goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar meta:', error);
      return res.status(500).json({ message: 'Erro ao atualizar meta', error: error.message });
    }

    if (!updatedGoal) {
      return res.status(404).json({ message: 'Meta não encontrada' });
    }

    console.log('✅ Meta atualizada com sucesso');

    res.json({
      success: true,
      message: 'Meta atualizada com sucesso',
      goal: updatedGoal
    });

  } catch (error) {
    console.error('💥 Erro ao atualizar meta:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// PATCH /api/sales-goals/:id/progress - Atualizar progresso da meta
router.patch('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { current_value } = req.body;

    if (current_value === undefined) {
      return res.status(400).json({ message: 'current_value é obrigatório' });
    }

    console.log('📈 Atualizando progresso da meta:', id, 'para:', current_value);

    const { data: updatedGoal, error } = await supabase
      .from('sales_goals')
      .update({ current_value: parseFloat(current_value) })
      .eq('id', id)
      .select('id, goal_value, current_value, status')
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar progresso:', error);
      return res.status(500).json({ message: 'Erro ao atualizar progresso', error: error.message });
    }

    if (!updatedGoal) {
      return res.status(404).json({ message: 'Meta não encontrada' });
    }

    // Verificar se meta foi atingida
    const progress = (updatedGoal.current_value / updatedGoal.goal_value) * 100;
    let newStatus = updatedGoal.status;

    if (progress >= 100 && updatedGoal.status === 'ativa') {
      newStatus = 'concluida';
      await supabase
        .from('sales_goals')
        .update({ status: 'concluida' })
        .eq('id', id);
    }

    console.log(`✅ Progresso atualizado: ${progress.toFixed(1)}%`);

    res.json({
      success: true,
      message: 'Progresso atualizado com sucesso',
      progress: progress,
      status: newStatus,
      goal_achieved: progress >= 100
    });

  } catch (error) {
    console.error('💥 Erro ao atualizar progresso:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// DELETE /api/sales-goals/:id - Excluir meta
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Excluindo meta:', id);

    const { error } = await supabase
      .from('sales_goals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao excluir meta:', error);
      return res.status(500).json({ message: 'Erro ao excluir meta', error: error.message });
    }

    console.log('✅ Meta excluída com sucesso');

    res.json({
      success: true,
      message: 'Meta excluída com sucesso'
    });

  } catch (error) {
    console.error('💥 Erro ao excluir meta:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// GET /api/sales-goals/report/:user_id - Relatório de metas do vendedor
router.get('/report/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { period } = req.query;

    console.log('📊 Gerando relatório de metas para usuário:', user_id);

    let query = supabase
      .from('sales_goals')
      .select('*')
      .eq('user_id', user_id);

    if (period) {
      query = query.eq('period', period);
    }

    const { data: goals, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      return res.status(500).json({ message: 'Erro ao gerar relatório', error: error.message });
    }

    // Calcular estatísticas
    const stats = {
      total_goals: goals?.length || 0,
      active_goals: goals?.filter(g => g.status === 'ativa').length || 0,
      completed_goals: goals?.filter(g => g.status === 'concluida').length || 0,
      average_progress: 0,
      goals_by_type: {} as any
    };

    if (goals && goals.length > 0) {
      const totalProgress = goals.reduce((sum, goal) => {
        const progress = (goal.current_value / goal.goal_value) * 100;
        return sum + Math.min(progress, 100);
      }, 0);
      
      stats.average_progress = totalProgress / goals.length;

      // Agrupar por tipo
      goals.forEach(goal => {
        if (!stats.goals_by_type[goal.goal_type]) {
          stats.goals_by_type[goal.goal_type] = {
            count: 0,
            completed: 0,
            total_value: 0,
            current_value: 0
          };
        }
        
        stats.goals_by_type[goal.goal_type].count++;
        stats.goals_by_type[goal.goal_type].total_value += goal.goal_value;
        stats.goals_by_type[goal.goal_type].current_value += goal.current_value;
        
        if (goal.status === 'concluida') {
          stats.goals_by_type[goal.goal_type].completed++;
        }
      });
    }

    console.log('✅ Relatório gerado com sucesso');

    res.json({
      success: true,
      goals: goals || [],
      statistics: stats
    });

  } catch (error) {
    console.error('💥 Erro ao gerar relatório:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router;