import express from 'express';
import { LeadTasksService } from '../services/leadTasksService';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Aplicar middleware de autenticação a todas as rotas
router.use(authMiddleware);

/**
 * GET /api/lead-tasks/lead/:leadId
 * Buscar tarefas de um lead específico
 */
router.get('/lead/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const tasks = await LeadTasksService.getTasksByLead(leadId);
    res.json({ tasks });
  } catch (error: any) {
    console.error('Erro ao buscar tarefas do lead:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/lead-tasks/user/:userId
 * Buscar tarefas pendentes de um vendedor
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { tenant_id } = req.query;
    
    const tasks = await LeadTasksService.getPendingTasksByUser(
      userId, 
      tenant_id as string
    );
    
    res.json({ tasks });
  } catch (error: any) {
    console.error('Erro ao buscar tarefas do usuário:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/lead-tasks/pipeline/:pipelineId
 * Buscar tarefas de uma pipeline
 */
router.get('/pipeline/:pipelineId', async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const tasks = await LeadTasksService.getTasksByPipeline(pipelineId);
    res.json({ tasks });
  } catch (error: any) {
    console.error('Erro ao buscar tarefas da pipeline:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/lead-tasks/stage/:stageId
 * Buscar tarefas de uma etapa
 */
router.get('/stage/:stageId', async (req, res) => {
  try {
    const { stageId } = req.params;
    const tasks = await LeadTasksService.getTasksByStage(stageId);
    res.json({ tasks });
  } catch (error: any) {
    console.error('Erro ao buscar tarefas da etapa:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/lead-tasks
 * Criar nova tarefa
 */
router.post('/', async (req, res) => {
  try {
    const taskData = req.body;
    const task = await LeadTasksService.createTask(taskData);
    res.status(201).json({ task });
  } catch (error: any) {
    console.error('Erro ao criar tarefa:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/lead-tasks/:id
 * Atualizar tarefa
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const task = await LeadTasksService.updateTask(id, updateData);
    res.json({ task });
  } catch (error: any) {
    console.error('Erro ao atualizar tarefa:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/lead-tasks/:id/complete
 * Marcar tarefa como concluída
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { execution_notes } = req.body;
    
    const task = await LeadTasksService.completeTask(id, execution_notes);
    res.json({ task });
  } catch (error: any) {
    console.error('Erro ao concluir tarefa:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/lead-tasks/:id/cancel
 * Cancelar tarefa
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const task = await LeadTasksService.cancelTask(id, reason);
    res.json({ task });
  } catch (error: any) {
    console.error('Erro ao cancelar tarefa:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/lead-tasks/:id
 * Deletar tarefa
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await LeadTasksService.deleteTask(id);
    res.json({ message: 'Tarefa excluída com sucesso' });
  } catch (error: any) {
    console.error('Erro ao excluir tarefa:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/lead-tasks/generate
 * Gerar tarefas automáticas para um lead em uma etapa
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      lead_id,
      pipeline_id,
      stage_id,
      stage_name,
      assigned_to,
      tenant_id
    } = req.body;

    const tasksCreated = await LeadTasksService.generateTasksForLeadStageEntry(
      lead_id,
      pipeline_id,
      stage_id,
      stage_name,
      assigned_to,
      tenant_id
    );

    res.json({ 
      message: `${tasksCreated} tarefas geradas com sucesso`,
      tasks_created: tasksCreated 
    });
  } catch (error: any) {
    console.error('Erro ao gerar tarefas automáticas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/lead-tasks/stats
 * Buscar estatísticas de tarefas
 */
router.get('/stats', async (req, res) => {
  try {
    const { user_id, tenant_id } = req.query;
    
    const stats = await LeadTasksService.getTaskStats(
      user_id as string, 
      tenant_id as string
    );
    
    res.json({ stats });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/lead-tasks/overdue
 * Buscar tarefas vencidas
 */
router.get('/overdue', async (req, res) => {
  try {
    const { user_id, tenant_id } = req.query;
    
    const tasks = await LeadTasksService.getOverdueTasks(
      user_id as string, 
      tenant_id as string
    );
    
    res.json({ tasks });
  } catch (error: any) {
    console.error('Erro ao buscar tarefas vencidas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/lead-tasks/date-range
 * Buscar tarefas por período
 */
router.get('/date-range', async (req, res) => {
  try {
    const { start_date, end_date, user_id, tenant_id } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'start_date e end_date são obrigatórios' 
      });
    }
    
    const tasks = await LeadTasksService.getTasksByDateRange(
      start_date as string,
      end_date as string,
      user_id as string,
      tenant_id as string
    );
    
    res.json({ tasks });
  } catch (error: any) {
    console.error('Erro ao buscar tarefas por período:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 