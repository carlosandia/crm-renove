import express, { Router, Request, Response } from 'express';
import { PipelineController } from '../controllers/PipelineController';
import { CustomFieldController } from '../controllers/customFieldController';
import { LeadController } from '../controllers/leadController';
import { supabase, createUserSupabaseClient } from '../config/supabase';
// FASE 1: Cache Integration (simplified)
import { cacheMiddlewares } from '../middleware/cacheMiddleware';
import { authenticateToken } from '../middleware/auth';
// ✅ IMPORTAR SISTEMA DE DISTRIBUIÇÃO UNIFICADO
import { LeadDistributionService } from '../services/leadDistributionService';

const supabaseAdmin = supabase;
const router = express.Router();

// ============================================
// ROTAS PRINCIPAIS DE PIPELINES
// ============================================

// GET /api/pipelines/validate-name - Validar nome de pipeline em tempo real
router.get('/validate-name', authenticateToken, PipelineController.validatePipelineName);

// GET /api/pipelines - Listar pipelines do tenant
router.get('/', (req, res, next) => {
  console.log('🔍 [PIPELINE ROUTE] Rota acessada');
  console.log('🔍 [PIPELINE ROUTE] Headers:', req.headers.authorization);
  next();
}, authenticateToken, cacheMiddlewares.pipeline(), PipelineController.getPipelines);

// GET /api/pipelines/available - Listar pipelines disponíveis para conexão com formulários
router.get('/available', cacheMiddlewares.pipeline(), async (req, res) => {
  try {
    const { data: pipelines, error } = await supabase
      .from('pipelines')
      .select(`
        id,
        name,
        description,
        is_active,
        created_at,
        pipeline_stages(
          id,
          name,
          order_index,
          is_default,
          color
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar pipelines disponíveis:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao carregar pipelines disponíveis',
        details: error.message 
      });
    }

    // Formatar resposta
    const formattedPipelines = pipelines.map(pipeline => ({
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      is_active: pipeline.is_active,
      stages: pipeline.pipeline_stages.map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        order_index: stage.order_index,
        is_default: stage.is_default || false,
        color: stage.color
      })).sort((a: any, b: any) => a.order_index - b.order_index)
    }));

    res.json(formattedPipelines);
  } catch (error) {
    console.error('Erro interno ao carregar pipelines:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/pipelines/:id/details - Detalhes completos de uma pipeline para formulários
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar pipeline com estágios
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select(`
        id,
        name,
        description,
        is_active,
        pipeline_stages(
          id,
          name,
          order_index,
          is_default,
          color
        )
      `)
      .eq('id', id)
      .single();

    if (pipelineError || !pipeline) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pipeline não encontrada',
        details: pipelineError?.message 
      });
    }

    // Buscar campos customizados da pipeline
    const { data: customFields, error: fieldsError } = await supabase
      .from('pipeline_custom_fields')
      .select('*')
      .eq('pipeline_id', id)
      .order('field_order');

    if (fieldsError) {
      console.error('Erro ao carregar campos customizados:', fieldsError);
    }

    // Definir campos padrão do sistema
    const systemFields = [
      { name: 'name', label: 'Nome', type: 'text', is_required: true, is_custom: false },
      { name: 'email', label: 'Email', type: 'email', is_required: false, is_custom: false },
      { name: 'phone', label: 'Telefone', type: 'tel', is_required: false, is_custom: false },
      { name: 'company', label: 'Empresa', type: 'text', is_required: false, is_custom: false },
      { name: 'position', label: 'Cargo', type: 'text', is_required: false, is_custom: false },
      { name: 'estimated_value', label: 'Valor Estimado', type: 'number', is_required: false, is_custom: false },
      { name: 'description', label: 'Descrição', type: 'textarea', is_required: false, is_custom: false },
      { name: 'source', label: 'Origem', type: 'text', is_required: false, is_custom: false },
    ];

    // Converter campos customizados para formato padrão
    const customFieldsFormatted = (customFields || []).map(field => ({
      name: field.field_name,
      label: field.field_label,
      type: field.field_type,
      is_required: field.is_required,
      is_custom: true,
      options: field.field_options
    }));

    // Combinar campos do sistema com campos customizados
    const allFields = [...systemFields, ...customFieldsFormatted];

    // Ordenar estágios
    const sortedStages = pipeline.pipeline_stages.sort((a: any, b: any) => a.order_index - b.order_index);

    res.json({
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      is_active: pipeline.is_active,
      stages: sortedStages,
      fields: allFields
    });
  } catch (error) {
    console.error('Erro interno ao carregar detalhes da pipeline:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/pipelines/:id - Buscar pipeline específica
router.get('/:id', authenticateToken, PipelineController.getPipelineById);

// POST /api/pipelines - Criar nova pipeline
router.post('/', PipelineController.createPipeline);

// POST /api/pipelines/complete - Criar pipeline com etapas e campos customizados  
router.post('/complete', PipelineController.createPipelineWithStagesAndFields);

// POST /api/pipelines/complete-old - BACKUP da implementação inline anterior
router.post('/complete-old', async (req, res) => {
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

    // ✅ BUGFIX CRÍTICO: Garantir criação das etapas do sistema
    console.log('🔄 [POST /complete] Criando etapas do sistema...');
    const { error: ensureStagesError } = await supabaseAdmin.rpc('ensure_pipeline_stages', {
      pipeline_id_param: pipelineId
    });

    if (ensureStagesError) {
      console.error('❌ [POST /complete] Erro ao criar etapas do sistema:', ensureStagesError);
      // Não falhar completamente, mas registrar o erro
    } else {
      console.log('✅ [POST /complete] Etapas do sistema criadas');
    }

    console.log('✅ Pipeline completa criada com sucesso');

    res.status(201).json({ 
      success: true,
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
router.put('/:id', authenticateToken, PipelineController.updatePipeline);

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
    const { name, color = '#3B82F6' } = req.body;

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
router.get('/:pipeline_id/custom-fields', authenticateToken, CustomFieldController.getCustomFields);

// POST /api/pipelines/:pipeline_id/custom-fields - Criar campo customizado
router.post('/:pipeline_id/custom-fields', authenticateToken, CustomFieldController.createCustomField);

// PUT /api/pipelines/:pipeline_id/custom-fields/:field_id - Atualizar campo
router.put('/:pipeline_id/custom-fields/:field_id', authenticateToken, CustomFieldController.updateCustomField);

// DELETE /api/pipelines/:pipeline_id/custom-fields/:field_id - Excluir campo
router.delete('/:pipeline_id/custom-fields/:field_id', authenticateToken, CustomFieldController.deleteCustomField);

// PUT /api/pipelines/:pipeline_id/custom-fields/reorder - Reordenar campos
router.put('/:pipeline_id/custom-fields/reorder', authenticateToken, CustomFieldController.reorderFields);

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

// ============================================
// ROTA DE MÉTRICAS ESPECÍFICAS DA PIPELINE
// ============================================
// GET /api/pipelines/:pipeline_id/metrics - Obter métricas específicas de uma pipeline
router.get('/:pipeline_id/metrics', async (req, res) => {
  try {
    const { pipeline_id } = req.params;
    const { tenant_id } = req.query;

    console.log('📊 [getMetricsByPipeline] Buscando métricas:', {
      pipeline_id,
      tenant_id
    });

    if (!pipeline_id) {
      return res.status(400).json({ error: 'pipeline_id é obrigatório' });
    }

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id é obrigatório' });
    }

    // Buscar informações da pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, name, tenant_id')
      .eq('id', pipeline_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (pipelineError || !pipeline) {
      console.error('❌ [getMetricsByPipeline] Pipeline não encontrada:', pipelineError);
      return res.status(404).json({ error: 'Pipeline não encontrada' });
    }

    // Buscar métricas dos leads da pipeline
    const { data: leads, error: leadsError } = await supabase
      .from('pipeline_leads')
      .select('id, stage_id, lead_master_id, created_at, updated_at, custom_data, pipeline_stages(name, stage_type)')
      .eq('pipeline_id', pipeline_id)
      .eq('tenant_id', tenant_id);

    if (leadsError) {
      console.error('❌ [getMetricsByPipeline] Erro ao buscar leads:', leadsError);
      return res.status(500).json({ error: 'Erro ao buscar dados da pipeline' });
    }

    // ✅ CORREÇÃO: Calcular métricas corretamente
    const totalOpportunityCards = leads?.length || 0; // Total de cards/oportunidades
    const uniqueLeadsCount = leads?.length > 0 ? 
      new Set(leads.map(lead => lead.lead_master_id).filter(Boolean)).size : 0; // Leads únicos
    const qualifiedLeads = leads?.filter(lead => lead.custom_data?.is_qualified === true).length || 0;
    
    // Contar leads por tipo de stage
    const wonDeals = leads?.filter(lead => {
      // AIDEV-NOTE: Corrigir acesso ao stage - pode ser objeto ou array
      const stage = Array.isArray(lead.pipeline_stages) ? lead.pipeline_stages[0] : lead.pipeline_stages;
      return stage?.stage_type === 'won' || stage?.name === 'Ganho';
    }).length || 0;
    
    const lostDeals = leads?.filter(lead => {
      // AIDEV-NOTE: Corrigir acesso ao stage - pode ser objeto ou array
      const stage = Array.isArray(lead.pipeline_stages) ? lead.pipeline_stages[0] : lead.pipeline_stages;
      return stage?.stage_type === 'lost' || stage?.name === 'Perdido';
    }).length || 0;
    
    const activeOpportunities = totalOpportunityCards - wonDeals - lostDeals;
    
    // Calcular receita total (assumindo que está no custom_data.valor)
    const totalRevenue = leads?.reduce((sum, lead) => {
      const value = parseFloat(lead.custom_data?.valor || '0');
      // AIDEV-NOTE: Corrigir acesso ao stage - pode ser objeto ou array
      const stage = Array.isArray(lead.pipeline_stages) ? lead.pipeline_stages[0] : lead.pipeline_stages;
      if (stage?.stage_type === 'won' || stage?.name === 'Ganho') {
        return sum + value;
      }
      return sum;
    }, 0) || 0;
    
    // Calcular métricas derivadas
    const averageDealSize = wonDeals > 0 ? totalRevenue / wonDeals : 0;
    const conversionRate = totalOpportunityCards > 0 ? (wonDeals / totalOpportunityCards) * 100 : 0;
    const winRate = (wonDeals + lostDeals) > 0 ? (wonDeals / (wonDeals + lostDeals)) * 100 : 0;
    const lossRate = (wonDeals + lostDeals) > 0 ? (lostDeals / (wonDeals + lostDeals)) * 100 : 0;
    
    // Calcular tempo médio de ciclo (simplificado)
    const averageCycleTime = leads?.filter(lead => {
      // AIDEV-NOTE: Corrigir acesso ao stage - pode ser objeto ou array
      const stage = Array.isArray(lead.pipeline_stages) ? lead.pipeline_stages[0] : lead.pipeline_stages;
      return stage?.stage_type === 'won';
    }).reduce((sum, lead) => {
      const createdDate = new Date(lead.created_at);
      const updatedDate = new Date(lead.updated_at || lead.created_at);
      const daysDiff = Math.abs(updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return sum + daysDiff;
    }, 0) || 0;
    
    const avgCycleTimeFinal = wonDeals > 0 ? averageCycleTime / wonDeals : 0;

    const metricsData = {
      pipeline_name: pipeline.name,
      // ✅ CORREÇÃO: Adicionar campos esperados pelo frontend
      unique_leads_count: uniqueLeadsCount, // Leads únicos (leads_master)
      total_opportunity_cards: totalOpportunityCards, // Total de cards/oportunidades
      total_leads: totalOpportunityCards, // Manter compatibilidade
      qualified_leads: qualifiedLeads,
      won_deals: wonDeals,
      lost_deals: lostDeals,
      total_revenue: totalRevenue,
      average_deal_size: averageDealSize,
      conversion_rate: conversionRate,
      win_rate: winRate,
      loss_rate: lossRate,
      average_cycle_time: avgCycleTimeFinal,
      active_opportunities: activeOpportunities,
      pending_follow_ups: 0, // Implementar quando houver tabela de follow-ups
      overdue_tasks: 0 // Implementar quando houver tabela de tasks
    };

    console.log('✅ [getMetricsByPipeline] Métricas calculadas:', {
      pipeline_id,
      pipeline_name: pipeline.name,
      unique_leads_count: uniqueLeadsCount,
      total_opportunity_cards: totalOpportunityCards,
      won_deals: wonDeals,
      total_revenue: totalRevenue,
      conversion_rate: conversionRate.toFixed(2) + '%'
    });

    res.json({
      success: true,
      data: metricsData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [getMetricsByPipeline] Erro interno:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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

// ============================================
// ROTAS PARA CONEXÃO COM FORMULÁRIOS
// ============================================

// POST /api/pipelines/:id/connect-form - Conectar formulário à pipeline
router.post('/:id/connect-form', async (req, res) => {
  try {
    const { id: pipeline_id } = req.params;
    const { 
      form_id, 
      stage_id, 
      field_mappings = [], 
      auto_assign = true,
      create_task = true,
      task_description = 'Novo lead captado via formulário',
      task_due_days = 1,
      use_score_for_stage = false,
      score_stage_mapping = {},
      notification_settings = {}
    } = req.body;

    if (!form_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID do formulário é obrigatório' 
      });
    }

    // Verificar se pipeline existe
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('id', pipeline_id)
      .single();

    if (pipelineError || !pipeline) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pipeline não encontrada' 
      });
    }

    // Salvar configuração de conexão (você pode criar uma tabela para isso)
    const connectionConfig = {
      form_id,
      pipeline_id,
      stage_id,
      field_mappings,
      auto_assign,
      create_task,
      task_description,
      task_due_days,
      use_score_for_stage,
      score_stage_mapping,
      notification_settings,
      created_at: new Date().toISOString()
    };

    // Por enquanto, vamos simular salvamento bem-sucedido
    // Em produção, você criaria uma tabela 'form_pipeline_connections'
    console.log('Configuração de conexão salva:', connectionConfig);

    res.json({
      success: true,
      message: 'Formulário conectado à pipeline com sucesso',
      connection: connectionConfig
    });
  } catch (error) {
    console.error('Erro ao conectar formulário à pipeline:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// 🆕 FUNÇÃO AUXILIAR PARA MAPEAR CAMPOS DO FORMULÁRIO
function mapFormFieldsToLead(form_data: any, field_mappings: any[] = []): any {
  const leadData: any = {
    source: 'Formulário',
    origem: 'Formulário'
  };

  // Aplicar mapeamentos de campos se fornecidos
  if (field_mappings && field_mappings.length > 0) {
    field_mappings.forEach((mapping: any) => {
      const formValue = form_data[mapping.form_field_id];
      if (formValue !== undefined && formValue !== null && formValue !== '') {
        leadData[mapping.pipeline_field_name] = formValue;
      }
    });
  } else {
    // Mapeamento automático padrão se não há mapeamentos específicos
    leadData.nome_lead = form_data.nome || form_data.name || form_data.first_name || 'Nome não informado';
    leadData.email = form_data.email;
    leadData.telefone = form_data.telefone || form_data.phone;
    leadData.empresa = form_data.empresa || form_data.company;
    leadData.cargo = form_data.cargo || form_data.job_title;
    leadData.valor = form_data.valor || form_data.value || form_data.budget;
    
    // Campos UTM
    leadData.utm_source = form_data.utm_source;
    leadData.utm_medium = form_data.utm_medium;
    leadData.utm_campaign = form_data.utm_campaign;
    leadData.campaign_name = form_data.campaign_name;
  }

  return leadData;
}

// POST /api/pipelines/create-lead-from-form - Criar lead diretamente na pipeline via formulário
router.post('/create-lead-from-form', async (req, res) => {
  try {
    const {
      pipeline_id,
      stage_id,
      form_data,
      field_mappings = [],
      lead_score = 0,
      is_mql = false,
      auto_assign = true,
      create_task = true,
      task_description = 'Novo lead captado via formulário',
      task_due_days = 1,
      form_name = 'Formulário',
      tenant_id,
      form_id
    } = req.body;

    if (!pipeline_id || !form_data) {
      return res.status(400).json({ 
        success: false, 
        error: 'Pipeline ID e dados do formulário são obrigatórios' 
      });
    }

    console.log('🔄 Criando lead na pipeline via formulário:', pipeline_id);

    // 1. Mapear campos do formulário
    const mappedData = mapFormFieldsToLead(form_data, field_mappings);

    // 2. 🆕 PRIMEIRO CRIAR NO LEADS_MASTER PARA PADRONIZAÇÃO
    let leadMaster = null;
    if (tenant_id) {
      console.log('📝 Criando registro no leads_master para padronização...');
      
      const { data: masterLead, error: masterError } = await supabase
        .from('leads_master')
        .insert({
          first_name: mappedData.nome_lead?.split(' ')[0] || 'Nome não informado',
          last_name: mappedData.nome_lead?.split(' ').slice(1).join(' ') || '',
          email: mappedData.email || '',
          phone: mappedData.telefone || '',
          company: mappedData.empresa || '',
          job_title: mappedData.cargo || '',
          estimated_value: mappedData.valor ? parseFloat(mappedData.valor) : 0,
          lead_source: 'Form',
          lead_temperature: mappedData.temperatura || 'Frio',
          status: 'Em Pipeline',
          origem: mappedData.origem || 'Formulário',
          tenant_id: tenant_id,
          created_by: null,
          utm_source: mappedData.utm_source,
          utm_medium: mappedData.utm_medium,
          utm_campaign: mappedData.utm_campaign,
          campaign_name: mappedData.campaign_name
        })
        .select()
        .single();

      if (!masterError && masterLead) {
        leadMaster = masterLead;
        console.log('✅ Lead master criado:', leadMaster.id);
        
        // 🆕 ADICIONAR REFERÊNCIA AO LEAD_MASTER NO LEAD_DATA
        mappedData.lead_master_id = leadMaster.id;
        mappedData.source = 'Formulário → Lead Master';
      }
    }

    // 3. Buscar configurações da pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*, pipeline_stages(*)')
      .eq('id', pipeline_id)
      .single();

    if (pipelineError || !pipeline) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pipeline não encontrada' 
      });
    }

    // 4. Determinar estágio inicial
    let targetStageId = stage_id;
    if (!targetStageId) {
      // Buscar primeiro estágio (provavelmente "Lead" ou "Novos leads")
      const firstStage = pipeline.pipeline_stages
        ?.sort((a: any, b: any) => a.order_index - b.order_index)[0];
      
      if (!firstStage) {
      return res.status(400).json({ 
        success: false, 
          error: 'Pipeline não possui estágios configurados' 
        });
      }
      
      targetStageId = firstStage.id;
    }

    // 6. Criar lead na pipeline (inicialmente sem atribuição)
    const { data: pipelineLead, error: leadError } = await supabase
      .from('pipeline_leads')
      .insert({
        pipeline_id: pipeline_id,
        stage_id: targetStageId,
        lead_data: mappedData,
        assigned_to: null, // Será definido pela distribuição
        created_by: null, // Formulário público
        tenant_id: tenant_id || pipeline.tenant_id,
        lead_score: lead_score,
        is_qualified: is_mql,
        source: 'form',
        form_id: form_id
      })
      .select()
      .single();

    if (leadError) {
      console.error('❌ Erro ao criar lead na pipeline:', leadError);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao criar lead na pipeline',
        details: leadError.message 
      });
    }

    // 7. ✅ APLICAR SISTEMA DE DISTRIBUIÇÃO UNIFICADO
    let assignedTo = null;
    let distributionApplied = false;
    
    if (auto_assign) {
      console.log('🎯 Aplicando sistema de distribuição unificado na pipeline...');
      
      try {
        // Usar o LeadDistributionService para aplicar distribuição
        assignedTo = await LeadDistributionService.distributeLeadToMember(pipelineLead.id, pipeline_id);
        distributionApplied = !!assignedTo;
        
        if (assignedTo) {
          console.log('✅ Lead distribuído via LeadDistributionService:', assignedTo);
          
          // Atualizar o lead com a atribuição
          await supabase
            .from('pipeline_leads')
            .update({ assigned_to: assignedTo })
            .eq('id', pipelineLead.id);
        } else {
          console.log('⚠️ Distribuição não aplicada - modo manual ou sem membros ativos');
        }
      } catch (distributionError) {
        console.warn('⚠️ Erro na distribuição unificada:', distributionError);
        assignedTo = null;
        distributionApplied = false;
      }
    }

    // 8. 🆕 ATUALIZAR LEADS_MASTER COM REFERÊNCIA À PIPELINE
    if (leadMaster) {
      await supabase
        .from('leads_master')
        .update({ 
          pipeline_opportunity_id: pipelineLead.id,
          status: 'Em Pipeline'
        })
        .eq('id', leadMaster.id);
    }

    // 9. Criar tarefa automática se configurado
    if (create_task && assignedTo) {
      console.log('📝 Criando tarefa automática...');
      
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + task_due_days);

      const { error: taskError } = await supabase
        .from('tasks')
          .insert({
          title: `Follow-up: ${mappedData.nome_lead || 'Novo lead'}`,
          description: task_description,
          assigned_to: assignedTo,
          lead_relationship_id: pipelineLead.id,
          lead_relationship_type: 'pipeline_lead',
            due_date: dueDate.toISOString(),
            status: 'pending',
          priority: 'medium',
          created_by: assignedTo,
          tenant_id: tenant_id || pipeline.tenant_id
        });

      if (taskError) {
        console.warn('⚠️ Erro ao criar tarefa:', taskError);
      } else {
        console.log('✅ Tarefa criada com sucesso');
      }
    }

    // 10. Registrar histórico de entrada
    await supabase
      .from('pipeline_lead_history')
      .insert({
        lead_id: pipelineLead.id,
        stage_id: targetStageId,
        action: 'created',
        user_id: assignedTo,
        notes: `Lead criado via ${form_name}`,
        tenant_id: tenant_id || pipeline.tenant_id
      });

    console.log('🎉 Lead criado na pipeline com sucesso:', pipelineLead.id);

    // 11. Resposta integrada
    res.status(201).json({
      success: true,
      message: 'Lead criado na pipeline com sucesso',
      data: {
        pipeline_lead_id: pipelineLead.id,
        leads_master_id: leadMaster?.id || null,
        pipeline_id: pipeline_id,
        stage_id: targetStageId,
        assigned_to: assignedTo,
        distribution_applied: distributionApplied,
        task_created: create_task && !!assignedTo,
        synchronized: !!leadMaster
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar lead na pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ✅ FUNÇÃO REMOVIDA: applyPipelineDistribution
// Esta funcionalidade agora é fornecida pelo LeadDistributionService.distributeLeadToMember()

// ✅ FUNÇÃO REMOVIDA: getNextRoundRobinMember
// Esta funcionalidade agora é fornecida pelo LeadDistributionService.assignLeadByRoundRobin()

// 🆕 ENDPOINT PARA GERENCIAR REGRAS DE DISTRIBUIÇÃO
// POST /api/pipelines/:pipelineId/distribution-rule - Salvar regra de distribuição
router.post('/:pipelineId/distribution-rule', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.params;
    const { mode, is_active, working_hours_only, skip_inactive_members, fallback_to_manual } = req.body;

    console.log('💾 Salvando regra de distribuição:', {
      pipelineId,
      mode,
      is_active,
      working_hours_only,
      skip_inactive_members,
      fallback_to_manual
    });

    // Validar dados obrigatórios
    if (!pipelineId || !mode) {
      return res.status(400).json({
        success: false,
        error: 'Pipeline ID e modo são obrigatórios'
      });
    }

    // Verificar se a pipeline existe e o usuário tem permissão
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id, name, tenant_id')
      .eq('id', pipelineId)
      .single();

    if (pipelineError || !pipeline) {
      console.error('Pipeline não encontrada:', pipelineError);
      return res.status(404).json({
        success: false,
        error: 'Pipeline não encontrada'
      });
    }

    // Preparar dados para inserção/atualização
    const distributionRuleData = {
      pipeline_id: pipelineId,
      tenant_id: pipeline.tenant_id, // ✅ BUGFIX: Incluir tenant_id para multi-tenant
      mode: mode || 'manual',
      is_active: is_active ?? true,
      working_hours_only: working_hours_only ?? false,
      skip_inactive_members: skip_inactive_members ?? true,
      fallback_to_manual: fallback_to_manual ?? true,
      updated_at: new Date().toISOString()
    };

    // Tentar atualizar regra existente primeiro
    const { data: updatedRule, error: updateError } = await supabase
      .from('pipeline_distribution_rules')
      .upsert(distributionRuleData, { 
        onConflict: 'pipeline_id',
        ignoreDuplicates: false 
          })
          .select()
          .single();

    if (updateError) {
      console.error('Erro ao salvar regra de distribuição:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar regra de distribuição',
        details: updateError.message
      });
    }

    console.log('✅ Regra de distribuição salva:', updatedRule);

    res.status(200).json({
      success: true,
      data: updatedRule,
      message: `Regra de distribuição ${mode} configurada com sucesso`
    });

  } catch (error) {
    console.error('Erro ao salvar regra de distribuição:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/pipelines/:pipelineId/distribution-rule - Buscar regra de distribuição
router.get('/:pipelineId/distribution-rule', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.params;

    console.log('🔍 Buscando regra de distribuição para pipeline:', pipelineId);

    // Buscar regra existente
    const { data: distributionRule, error: ruleError } = await supabase
      .from('pipeline_distribution_rules')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .single();

    if (ruleError && ruleError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erro ao buscar regra de distribuição:', ruleError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar regra de distribuição'
      });
    }

    // Se não encontrou, retornar regra padrão
    if (!distributionRule) {
      const defaultRule = {
        pipeline_id: pipelineId,
        mode: 'manual',
        is_active: true,
        working_hours_only: false,
        skip_inactive_members: true,
        fallback_to_manual: true
      };

      console.log('📋 Retornando regra padrão para pipeline:', pipelineId);

      return res.status(200).json({
      success: true,
        data: defaultRule,
        message: 'Regra de distribuição padrão (não configurada ainda)'
      });
    }

    console.log('✅ Regra de distribuição encontrada:', distributionRule);

    res.status(200).json({
      success: true,
      data: distributionRule,
      message: 'Regra de distribuição carregada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao buscar regra de distribuição:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/pipelines/:pipelineId/distribution-stats - Estatísticas de distribuição
router.get('/:pipelineId/distribution-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.params;

    console.log('📊 Buscando estatísticas de distribuição para pipeline:', pipelineId);

    // Buscar estatísticas da regra de distribuição
    const { data: distributionRule, error: ruleError } = await supabase
      .from('pipeline_distribution_rules')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .single();

    // Buscar histórico de atribuições
    const { data: assignmentHistory, error: historyError } = await supabase
      .from('lead_assignment_history')
      .select(`
        id,
        assigned_to,
        assignment_method,
        round_robin_position,
        total_eligible_members,
        status,
        created_at,
        users!assigned_to (
          first_name,
          last_name,
          email
        )
      `)
      .eq('pipeline_id', pipelineId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Calcular estatísticas
    const stats = {
      rule: distributionRule || null,
      total_assignments: distributionRule?.total_assignments || 0,
      successful_assignments: distributionRule?.successful_assignments || 0,
      failed_assignments: distributionRule?.failed_assignments || 0,
      last_assignment_at: distributionRule?.last_assignment_at || null,
      recent_assignments: assignmentHistory || [],
      assignment_success_rate: distributionRule?.total_assignments > 0 
        ? Math.round((distributionRule.successful_assignments / distributionRule.total_assignments) * 100)
        : 0
    };

    console.log('✅ Estatísticas de distribuição:', {
      pipelineId,
      totalAssignments: stats.total_assignments,
      successRate: stats.assignment_success_rate
    });

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Estatísticas de distribuição carregadas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas de distribuição:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/pipelines/:pipelineId/distribution-test - Testar distribuição
router.post('/:pipelineId/distribution-test', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.params;

    console.log('🧪 Testando distribuição para pipeline:', pipelineId);

    // Buscar regra de distribuição
    const { data: distributionRule, error: ruleError } = await supabase
      .from('pipeline_distribution_rules')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .single();

    if (ruleError || !distributionRule) {
      return res.status(404).json({
        success: false,
        error: 'Regra de distribuição não encontrada'
      });
    }

    if (!distributionRule.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Distribuição não está ativa para esta pipeline'
      });
    }

    if (distributionRule.mode === 'manual') {
      return res.status(200).json({
        success: false,
        message: 'Distribuição está em modo manual - teste não aplicável'
      });
    }

    // Buscar membros da pipeline para rodízio
    const { data: pipelineMembers, error: membersError } = await supabase
      .from('pipeline_members')
      .select(`
        member_id,
        users!member_id (
          id,
          first_name,
          last_name,
          email,
          is_active
        )
      `)
      .eq('pipeline_id', pipelineId);

    if (membersError || !pipelineMembers || pipelineMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum membro encontrado na pipeline'
      });
    }

    // Filtrar membros ativos se configurado
    const eligibleMembers = distributionRule.skip_inactive_members 
      ? pipelineMembers.filter(pm => {
          const user = pm.users as any;
          return user?.is_active !== false;
        })
      : pipelineMembers;

    if (eligibleMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum membro elegível encontrado para distribuição'
      });
    }

    // Simular próxima atribuição
    const lastAssignedIndex = distributionRule.last_assigned_member_id 
      ? eligibleMembers.findIndex(m => m.member_id === distributionRule.last_assigned_member_id)
      : -1;
    
    const nextIndex = (lastAssignedIndex + 1) % eligibleMembers.length;
    const nextMember = eligibleMembers[nextIndex];

    // Registrar teste no histórico
    await supabase
      .from('lead_assignment_history')
      .insert({
        pipeline_id: pipelineId,
        assigned_to: nextMember.member_id,
        assignment_method: 'test_simulation',
        round_robin_position: nextIndex,
        total_eligible_members: eligibleMembers.length,
        status: 'test'
      });

    res.status(200).json({
      success: true,
      assigned_to: nextMember.member_id,
      member_name: `${(nextMember.users as any)?.first_name || ''} ${(nextMember.users as any)?.last_name || ''}`.trim(),
      message: `Teste realizado: próximo lead seria atribuído a ${(nextMember.users as any)?.first_name || 'Membro'}`
    });

    console.log('✅ Teste de distribuição realizado com sucesso:', {
      pipelineId,
      nextMember: nextMember.member_id,
      position: nextIndex
    });

  } catch (error) {
    console.error('Erro no teste de distribuição:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ============================================
// ROTAS DE CONFIGURAÇÃO DE TEMPERATURA
// ============================================

// GET /api/pipelines/:pipelineId/temperature-config - Buscar configuração de temperatura
router.get('/:pipelineId/temperature-config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.params;
    const tenantId = req.user?.tenant_id;

    console.log('🌡️ Buscando configuração de temperatura:', { pipelineId, tenantId });

    // Buscar configuração existente
    const { data: config, error } = await supabase
      .from('temperature_config')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!config) {
      // Retornar configuração padrão se não existir
      const defaultConfig = {
        pipeline_id: pipelineId,
        tenant_id: tenantId,
        hot_threshold: 24,
        warm_threshold: 72,
        cold_threshold: 168,
        hot_color: '#ef4444',
        warm_color: '#f97316',
        cold_color: '#3b82f6',
        frozen_color: '#6b7280',
        hot_icon: '🔥',
        warm_icon: '🌡️',
        cold_icon: '❄️',
        frozen_icon: '🧊'
      };

      return res.status(200).json({
        success: true,
        data: defaultConfig,
        message: 'Configuração padrão retornada - ainda não salva'
      });
    }

    res.status(200).json({
      success: true,
      data: config,
      message: 'Configuração de temperatura encontrada'
    });

  } catch (error) {
    console.error('Erro ao buscar configuração de temperatura:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/pipelines/:pipelineId/temperature-config - Criar/Atualizar configuração de temperatura
router.post('/:pipelineId/temperature-config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.params;
    const tenantId = req.user?.tenant_id;
    const {
      hot_threshold,
      warm_threshold,
      cold_threshold,
      hot_color,
      warm_color,
      cold_color,
      frozen_color,
      hot_icon,
      warm_icon,
      cold_icon,
      frozen_icon
    } = req.body;

    console.log('🌡️ Salvando configuração de temperatura:', { 
      pipelineId, 
      tenantId,
      config: req.body
    });

    // Validar se tenantId existe
    if (!tenantId) {
      console.error('❌ tenantId não encontrado no token do usuário');
      return res.status(400).json({
        success: false,
        error: 'tenantId não encontrado no token'
      });
    }

    // Validar sequência lógica
    if (hot_threshold >= warm_threshold || warm_threshold >= cold_threshold) {
      return res.status(400).json({
        success: false,
        error: 'Os períodos devem seguir ordem crescente: Quente < Morno < Frio'
      });
    }

    // Validar se o usuário tem acesso a esta pipeline
    console.log('🔐 Validando acesso do usuário à pipeline');
    const { data: pipelineAccess, error: pipelineError } = await supabase
      .from('pipelines')
      .select('tenant_id')
      .eq('id', pipelineId)
      .eq('tenant_id', tenantId)
      .single();

    if (pipelineError || !pipelineAccess) {
      console.error('❌ Usuário não tem acesso a esta pipeline:', { pipelineId, tenantId, error: pipelineError });
      return res.status(403).json({
        success: false,
        error: 'Acesso negado à pipeline'
      });
    }

    console.log('✅ Acesso à pipeline validado');

    // Verificar se já existe configuração (usando service role mas com validação manual)
    const { data: existingConfig } = await supabase
      .from('temperature_config')
      .select('id')
      .eq('pipeline_id', pipelineId)
      .eq('tenant_id', tenantId)
      .single();

    const configData = {
      pipeline_id: pipelineId,
      tenant_id: tenantId,
      hot_threshold: hot_threshold || 24,
      warm_threshold: warm_threshold || 72,
      cold_threshold: cold_threshold || 168,
      hot_color: hot_color || '#ef4444',
      warm_color: warm_color || '#f97316',
      cold_color: cold_color || '#3b82f6',
      frozen_color: frozen_color || '#6b7280',
      hot_icon: hot_icon || '🔥',
      warm_icon: warm_icon || '🌡️',
      cold_icon: cold_icon || '❄️',
      frozen_icon: frozen_icon || '🧊'
    };

    let result;
    if (existingConfig) {
      // Atualizar existente (usando service role - validação manual feita acima)
      result = await supabase
        .from('temperature_config')
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single();
    } else {
      // Criar novo (usando service role - validação manual feita acima)
      result = await supabase
        .from('temperature_config')
        .insert(configData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Erro no Supabase ao salvar temperatura:', result.error);
      throw result.error;
    }

    console.log('✅ Configuração de temperatura salva:', result.data);

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Configuração de temperatura salva com sucesso'
    });

  } catch (error) {
    console.error('Erro ao salvar configuração de temperatura:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// DELETE /api/pipelines/:pipelineId/temperature-config - Deletar configuração de temperatura
router.delete('/:pipelineId/temperature-config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.params;
    const tenantId = req.user?.tenant_id;

    console.log('🌡️ Deletando configuração de temperatura:', { pipelineId, tenantId });

    const { error } = await supabase
      .from('temperature_config')
      .delete()
      .eq('pipeline_id', pipelineId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Configuração de temperatura deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar configuração de temperatura:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ============================================
// ✅ FASE 1.3: ROTAS DE ARQUIVAMENTO DE PIPELINES
// ============================================

// POST /api/pipelines/:id/duplicate - Duplicar pipeline
router.post('/:id/duplicate', authenticateToken, PipelineController.duplicatePipeline);

// POST /api/pipelines/:id/archive - Arquivar pipeline
router.post('/:id/archive', authenticateToken, PipelineController.archivePipeline);

// POST /api/pipelines/:id/unarchive - Desarquivar pipeline
router.post('/:id/unarchive', authenticateToken, PipelineController.unarchivePipeline);

// GET /api/pipelines/archived - Listar pipelines arquivadas
router.get('/archived', authenticateToken, PipelineController.getArchivedPipelines);

export default router;