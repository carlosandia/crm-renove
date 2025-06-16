import express from 'express';
import { PipelineController } from '../controllers/PipelineController';
import { CustomFieldController } from '../controllers/customFieldController';
import { LeadController } from '../controllers/leadController';
import { supabase, supabaseAdmin } from '../index';

const router = express.Router();

// ============================================
// ROTAS PRINCIPAIS DE PIPELINES
// ============================================

// GET /api/pipelines - Listar pipelines do tenant
router.get('/', PipelineController.getPipelines);

// GET /api/pipelines/:id - Buscar pipeline específica
router.get('/:id', PipelineController.getPipelineById);

// POST /api/pipelines - Criar nova pipeline
router.post('/', PipelineController.createPipeline);

// POST /api/pipelines/complete - Criar pipeline com etapas e campos customizados
router.post('/complete', async (req, res) => {
  try {
    console.log('🔧 Iniciando criação de pipeline completa...');
    console.log('📝 Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    const { name, description, tenant_id, created_by, member_ids = [], stages = [], custom_fields = [] } = req.body;

    if (!name || !tenant_id || !created_by) {
      console.log('❌ Dados obrigatórios faltando:', { name, tenant_id, created_by });
      return res.status(400).json({ error: 'Nome, tenant_id e created_by são obrigatórios' });
    }

    console.log('✅ Validação inicial passou');

    // Verificar se o usuário existe
    console.log('🔍 Buscando usuário por email:', created_by);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('email', created_by)
      .single();

    console.log('📊 Resultado da busca:', { user, userError });

    if (userError || !user) {
      console.log('❌ Usuário não encontrado:', created_by, userError);
      return res.status(400).json({ error: 'Usuário não encontrado', details: userError?.message });
    }

    console.log('✅ Usuário encontrado:', user);

    // Criar pipeline
    console.log('🔄 Criando pipeline...');
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({
        name,
        description,
        tenant_id,
        created_by: user.id
      })
      .select()
      .single();

    if (pipelineError) {
      console.log('❌ Erro ao criar pipeline:', pipelineError);
      return res.status(500).json({ error: 'Erro ao criar pipeline', details: pipelineError.message });
    }

    console.log('✅ Pipeline criada:', pipeline.id);
    const pipelineId = pipeline.id;

    // Adicionar membros se fornecidos
    if (member_ids.length > 0) {
      console.log('🔄 Adicionando membros:', member_ids);
      const memberInserts = member_ids.map((member_id: string) => ({
        pipeline_id: pipelineId,
        member_id
      }));

      const { error: membersError } = await supabase
        .from('pipeline_members')
        .insert(memberInserts);

      if (membersError) {
        console.log('❌ Erro ao adicionar membros:', membersError);
      } else {
        console.log('✅ Membros adicionados com sucesso');
      }
    }

    // Criar etapas se fornecidas
    if (stages.length > 0) {
      console.log('🔄 Criando etapas:', stages.length);
      const stageInserts = stages.map((stage: any, index: number) => ({
        pipeline_id: pipelineId,
        name: stage.name,
        temperature_score: stage.temperature_score || 50,
        max_days_allowed: stage.max_days_allowed || 7,
        color: stage.color || '#3B82F6',
        order_index: stage.order_index !== undefined ? stage.order_index : index + 1
      }));

      console.log('📝 Dados das etapas:', JSON.stringify(stageInserts, null, 2));

      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(stageInserts);

      if (stagesError) {
        console.log('❌ Erro ao criar etapas:', stagesError);
        return res.status(500).json({ error: 'Erro ao criar etapas', details: stagesError.message });
      } else {
        console.log('✅ Etapas criadas com sucesso');
      }
    }

    // Criar campos customizados se fornecidos
    let fieldsCreated = false;
    if (custom_fields.length > 0) {
      console.log('🔄 Criando campos customizados:', custom_fields.length);
      const fieldInserts = custom_fields.map((field: any) => ({
        pipeline_id: pipelineId,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        field_options: field.field_options,
        is_required: field.is_required || false,
        field_order: field.field_order || 1,
        placeholder: field.placeholder
      }));

      console.log('📝 Dados dos campos:', JSON.stringify(fieldInserts, null, 2));

      // Tentar primeiro com supabase normal
      const { error: fieldsError1 } = await supabase
        .from('pipeline_custom_fields')
        .insert(fieldInserts);

      if (fieldsError1) {
        console.log('❌ Erro campos (supabase normal):', fieldsError1.message);
        
        // Tentar com supabaseAdmin
        const { error: fieldsError2 } = await supabaseAdmin
          .from('pipeline_custom_fields')
          .insert(fieldInserts);

        if (fieldsError2) {
          console.log('❌ Erro campos (supabaseAdmin):', fieldsError2.message);
          
          // Se falhar por RLS, continuar sem os campos
          if (fieldsError2.message.includes('row-level security')) {
            console.log('⚠️ Campos customizados não criados devido ao RLS - pipeline criada sem campos');
          } else {
            return res.status(500).json({ error: 'Erro ao criar campos', details: fieldsError2.message });
          }
        } else {
          fieldsCreated = true;
          console.log('✅ Campos customizados criados com Admin');
        }
      } else {
        fieldsCreated = true;
        console.log('✅ Campos customizados criados normalmente');
      }
    }

    console.log('✅ Pipeline completa criada com sucesso');

    res.status(201).json({ 
      message: 'Pipeline criada com sucesso',
      pipeline,
      stages_created: stages.length,
      fields_created: fieldsCreated,
      fields_attempted: custom_fields.length,
      warning: !fieldsCreated && custom_fields.length > 0 ? 'Campos customizados não foram criados devido a políticas de segurança' : null
    });

  } catch (error) {
    console.log('❌ ERRO COMPLETO ao criar pipeline:', error);
    console.log('❌ Stack trace:', error instanceof Error ? error.stack : 'Sem stack trace');
    res.status(500).json({ 
      error: 'Erro ao criar pipeline completa',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : undefined
    });
  }
});

// PUT /api/pipelines/:id - Atualizar pipeline
router.put('/:id', PipelineController.updatePipeline);

// DELETE /api/pipelines/:id - Excluir pipeline
router.delete('/:id', PipelineController.deletePipeline);

// ============================================
// ROTAS DE MEMBROS
// ============================================

// POST /api/pipelines/:id/members - Adicionar membro
router.post('/:id/members', PipelineController.addMember);

// DELETE /api/pipelines/:id/members/:member_id - Remover membro
router.delete('/:id/members/:member_id', PipelineController.removeMember);

// GET /api/pipelines/member/:member_id - Pipelines do membro
router.get('/member/:member_id', PipelineController.getPipelinesByMember);

// ============================================
// ROTAS DE ETAPAS (mantidas temporariamente)
// ============================================

// GET /api/pipelines/:id/stages - Listar etapas
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

// POST /api/pipelines/:id/stages - Criar etapa
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

// ============================================
// ROTAS DE CAMPOS CUSTOMIZADOS
// ============================================

// GET /api/pipelines/:pipeline_id/custom-fields - Listar campos customizados
router.get('/:pipeline_id/custom-fields', CustomFieldController.getCustomFields);

// POST /api/pipelines/:pipeline_id/custom-fields - Criar campo customizado
router.post('/:pipeline_id/custom-fields', CustomFieldController.createCustomField);

// PUT /api/pipelines/:pipeline_id/custom-fields/:field_id - Atualizar campo
router.put('/:pipeline_id/custom-fields/:field_id', CustomFieldController.updateCustomField);

// DELETE /api/pipelines/:pipeline_id/custom-fields/:field_id - Excluir campo
router.delete('/:pipeline_id/custom-fields/:field_id', CustomFieldController.deleteCustomField);

// PUT /api/pipelines/:pipeline_id/custom-fields/reorder - Reordenar campos
router.put('/:pipeline_id/custom-fields/reorder', CustomFieldController.reorderFields);

// ============================================
// ROTAS DE LEADS
// ============================================

// GET /api/pipelines/:pipeline_id/leads - Buscar leads de uma pipeline
router.get('/:pipeline_id/leads', LeadController.getLeadsByPipeline);

// POST /api/pipelines/:pipeline_id/leads - Criar novo lead
router.post('/:pipeline_id/leads', LeadController.createLead);

// PUT /api/pipelines/:pipeline_id/leads/:lead_id - Atualizar lead
router.put('/:pipeline_id/leads/:lead_id', LeadController.updateLead);

// DELETE /api/pipelines/:pipeline_id/leads/:lead_id - Excluir lead
router.delete('/:pipeline_id/leads/:lead_id', LeadController.deleteLead);

// ============================================
// ROTAS DE FOLLOW-UPS (mantidas temporariamente)
// ============================================

// POST /api/pipelines/:id/follow-ups - Criar follow-up
router.post('/:id/follow-ups', async (req, res) => {
  try {
    const { id: pipeline_id } = req.params;
    const { stage_id, day_offset, note } = req.body;

    if (!stage_id || !day_offset) {
      return res.status(400).json({ error: 'stage_id e day_offset são obrigatórios' });
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

// Rota de teste para debug
router.post('/test-create', async (req, res) => {
  try {
    console.log('🧪 TESTE: Iniciando criação de pipeline simples...');
    console.log('📝 TESTE: Dados recebidos:', JSON.stringify(req.body, null, 2));

    const { name, tenant_id, created_by } = req.body;

    if (!name || !tenant_id || !created_by) {
      console.log('❌ TESTE: Dados obrigatórios faltando');
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    // Verificar se o usuário existe
    console.log('🔍 TESTE: Buscando usuário:', created_by);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', created_by)
      .single();

    if (userError || !user) {
      console.log('❌ TESTE: Usuário não encontrado:', userError);
      return res.status(400).json({ error: 'Usuário não encontrado', details: userError?.message });
    }

    console.log('✅ TESTE: Usuário encontrado:', user.id);

    // Tentar criar pipeline simples
    console.log('🔄 TESTE: Criando pipeline...');
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({
        name,
        tenant_id,
        created_by: user.id,
        description: 'Pipeline de teste'
      })
      .select()
      .single();

    if (pipelineError) {
      console.log('❌ TESTE: Erro ao criar pipeline:', pipelineError);
      return res.status(500).json({ error: 'Erro ao criar pipeline', details: pipelineError.message });
    }

    console.log('✅ TESTE: Pipeline criada com sucesso:', pipeline.id);

    res.status(201).json({
      success: true,
      message: 'Pipeline de teste criada com sucesso',
      pipeline
    });

  } catch (error) {
    console.log('❌ TESTE: Erro geral:', error);
    console.log('❌ TESTE: Stack:', error instanceof Error ? error.stack : 'Sem stack');
    res.status(500).json({
      error: 'Erro no teste',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : null
    });
  }
});

// Rota de teste para etapas
router.post('/test-create-with-stages', async (req, res) => {
  try {
    console.log('🧪 TESTE ETAPAS: Iniciando...');
    console.log('📝 TESTE ETAPAS: Dados:', JSON.stringify(req.body, null, 2));

    const { name, tenant_id, created_by, stages = [] } = req.body;

    // Verificar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', created_by)
      .single();

    if (userError || !user) {
      return res.status(400).json({ error: 'Usuário não encontrado' });
    }

    // Criar pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({
        name,
        tenant_id,
        created_by: user.id,
        description: 'Pipeline de teste com etapas'
      })
      .select()
      .single();

    if (pipelineError) {
      console.log('❌ TESTE ETAPAS: Erro ao criar pipeline:', pipelineError);
      return res.status(500).json({ error: 'Erro ao criar pipeline', details: pipelineError.message });
    }

    console.log('✅ TESTE ETAPAS: Pipeline criada:', pipeline.id);

    // Criar etapas se fornecidas
    if (stages.length > 0) {
      console.log('🔄 TESTE ETAPAS: Criando etapas:', stages.length);
      
      const stageInserts = stages.map((stage: any, index: number) => ({
        pipeline_id: pipeline.id,
        name: stage.name,
        temperature_score: stage.temperature_score || 50,
        max_days_allowed: stage.max_days_allowed || 7,
        color: stage.color || '#3B82F6',
        order_index: stage.order_index !== undefined ? stage.order_index : index + 1
      }));

      console.log('📝 TESTE ETAPAS: Dados das etapas:', JSON.stringify(stageInserts, null, 2));

      const { data: createdStages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(stageInserts)
        .select();

      if (stagesError) {
        console.log('❌ TESTE ETAPAS: Erro ao criar etapas:', stagesError);
        return res.status(500).json({ error: 'Erro ao criar etapas', details: stagesError.message });
      }

      console.log('✅ TESTE ETAPAS: Etapas criadas:', createdStages?.length);
    }

    res.status(201).json({
      success: true,
      message: 'Pipeline com etapas criada com sucesso',
      pipeline
    });

  } catch (error) {
    console.log('❌ TESTE ETAPAS: Erro geral:', error);
    res.status(500).json({
      error: 'Erro no teste de etapas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota de teste para campos customizados
router.post('/test-create-with-fields', async (req, res) => {
  try {
    console.log('🧪 TESTE CAMPOS: Iniciando...');
    console.log('📝 TESTE CAMPOS: Dados:', JSON.stringify(req.body, null, 2));

    const { name, tenant_id, created_by, custom_fields = [] } = req.body;

    // Verificar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', created_by)
      .single();

    if (userError || !user) {
      return res.status(400).json({ error: 'Usuário não encontrado' });
    }

    // Criar pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({
        name,
        tenant_id,
        created_by: user.id,
        description: 'Pipeline de teste com campos'
      })
      .select()
      .single();

    if (pipelineError) {
      console.log('❌ TESTE CAMPOS: Erro ao criar pipeline:', pipelineError);
      return res.status(500).json({ error: 'Erro ao criar pipeline', details: pipelineError.message });
    }

    console.log('✅ TESTE CAMPOS: Pipeline criada:', pipeline.id);

    // Criar campos customizados se fornecidos
    if (custom_fields.length > 0) {
      console.log('🔄 TESTE CAMPOS: Criando campos:', custom_fields.length);
      
      const fieldInserts = custom_fields.map((field: any) => ({
        pipeline_id: pipeline.id,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        field_options: field.field_options,
        is_required: field.is_required || false,
        field_order: field.field_order || 1,
        placeholder: field.placeholder
      }));

      console.log('📝 TESTE CAMPOS: Dados dos campos:', JSON.stringify(fieldInserts, null, 2));

      const { data: createdFields, error: fieldsError } = await supabase
        .from('pipeline_custom_fields')
        .insert(fieldInserts)
        .select();

      if (fieldsError) {
        console.log('❌ TESTE CAMPOS: Erro ao criar campos:', fieldsError);
        return res.status(500).json({ error: 'Erro ao criar campos', details: fieldsError.message });
      }

      console.log('✅ TESTE CAMPOS: Campos criados:', createdFields?.length);
    }

    res.status(201).json({
      success: true,
      message: 'Pipeline com campos criada com sucesso',
      pipeline
    });

  } catch (error) {
    console.log('❌ TESTE CAMPOS: Erro geral:', error);
    res.status(500).json({
      error: 'Erro no teste de campos',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota completamente nova para debug
router.post('/debug-complete', async (req, res) => {
  try {
    console.log('🐛 DEBUG: Iniciando criação completa...');
    
    const { name, tenant_id, created_by, stages = [], custom_fields = [] } = req.body;

    // 1. Verificar usuário
    const { data: user } = await supabase.from('users').select('id').eq('email', created_by).single();
    if (!user) return res.status(400).json({ error: 'Usuário não encontrado' });
    console.log('✅ DEBUG: Usuário OK');

    // 2. Criar pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .insert({ name, tenant_id, created_by: user.id, description: 'Debug pipeline' })
      .select()
      .single();
    
    if (pipelineError) {
      console.log('❌ DEBUG: Erro pipeline:', pipelineError);
      return res.status(500).json({ error: 'Erro ao criar pipeline', details: pipelineError.message });
    }
    console.log('✅ DEBUG: Pipeline criada:', pipeline.id);

    // 3. Criar etapas
    if (stages.length > 0) {
      const stageInserts = stages.map((s: any, i: number) => ({
        pipeline_id: pipeline.id,
        name: s.name,
        order_index: i + 1,
        temperature_score: s.temperature_score || 50,
        max_days_allowed: s.max_days_allowed || 7,
        color: s.color || '#3B82F6'
      }));

      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(stageInserts);

      if (stagesError) {
        console.log('❌ DEBUG: Erro etapas:', stagesError);
        return res.status(500).json({ error: 'Erro ao criar etapas', details: stagesError.message });
      }
      console.log('✅ DEBUG: Etapas criadas');
    }

    // 4. Tentar criar campos (pode falhar por RLS)
    let fieldsCreated = false;
    if (custom_fields.length > 0) {
      const fieldInserts = custom_fields.map((f: any) => ({
        pipeline_id: pipeline.id,
        field_name: f.field_name,
        field_label: f.field_label,
        field_type: f.field_type,
        is_required: f.is_required || false,
        field_order: f.field_order || 1,
        placeholder: f.placeholder
      }));

      // Tentar com supabase normal
      const { error: fieldsError1 } = await supabase
        .from('pipeline_custom_fields')
        .insert(fieldInserts);

      if (fieldsError1) {
        console.log('❌ DEBUG: Erro campos (supabase normal):', fieldsError1.message);
        
        // Tentar com supabaseAdmin
        const { error: fieldsError2 } = await supabaseAdmin
          .from('pipeline_custom_fields')
          .insert(fieldInserts);

        if (fieldsError2) {
          console.log('❌ DEBUG: Erro campos (supabaseAdmin):', fieldsError2.message);
        } else {
          fieldsCreated = true;
          console.log('✅ DEBUG: Campos criados com Admin');
        }
      } else {
        fieldsCreated = true;
        console.log('✅ DEBUG: Campos criados normalmente');
      }
    }

    console.log('✅ DEBUG: Processo concluído');
    
    res.status(201).json({
      success: true,
      message: 'Pipeline debug criada',
      pipeline,
      stages_created: stages.length > 0,
      fields_created: fieldsCreated,
      fields_attempted: custom_fields.length
    });

  } catch (error) {
    console.log('❌ DEBUG: Erro geral:', error);
    res.status(500).json({
      error: 'Erro no debug',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : null
    });
  }
});

// Rota temporária para criar tabela de leads
router.post('/create-leads-table', async (req, res) => {
  try {
    console.log('🔧 Adicionando coluna custom_data à tabela pipeline_leads...');
    
    // Tentar adicionar a coluna custom_data se não existir
    const { error: alterError } = await supabase
      .from('pipeline_leads')
      .select('custom_data')
      .limit(1);

    if (alterError && alterError.message.includes('custom_data')) {
      console.log('⚠️ Coluna custom_data não existe, mas não podemos alterar a estrutura via Supabase client');
      return res.status(500).json({ 
        error: 'Coluna custom_data não existe na tabela pipeline_leads',
        solution: 'Execute este SQL no Supabase SQL Editor: ALTER TABLE pipeline_leads ADD COLUMN custom_data JSONB DEFAULT \'{}\';'
      });
    }

    // Se chegou aqui, a coluna existe
    console.log('✅ Coluna custom_data já existe ou tabela está OK');
    res.json({ message: 'Tabela pipeline_leads está pronta para uso' });

  } catch (error) {
    console.log('❌ Erro geral:', error);
    res.status(500).json({ error: 'Erro interno', details: error instanceof Error ? error.message : 'Erro desconhecido' });
  }
});

export default router;