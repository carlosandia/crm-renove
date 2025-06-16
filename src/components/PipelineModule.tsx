import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import '../styles/PipelineModule.css';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface PipelineMember {
  id: string;
  assigned_at: string;
  member_id: string;
  member: User;
}

interface FollowUp {
  id: string;
  day_offset: number;
  note: string;
  is_active: boolean;
}

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  temperature_score: number;
  max_days_allowed: number;
  color: string;
  follow_ups: FollowUp[];
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  pipeline_members?: PipelineMember[];
  pipeline_stages?: PipelineStage[];
}

// Novas interfaces para criação completa
interface CustomFieldForm {
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
}

interface StageForm {
  name: string;
  temperature_score: number;
  max_days_allowed: number;
  color: string;
  order_index: number;
}

// Novas interfaces para edição completa
interface CustomField {
  id?: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
}

interface EditableStage {
  id?: string;
  name: string;
  temperature_score: number;
  max_days_allowed: number;
  color: string;
  order_index: number;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PipelineModule: React.FC = () => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  // Estados para formulários
  const [pipelineForm, setPipelineForm] = useState({
    name: '',
    description: '',
    member_ids: [] as string[]
  });

  // Novos estados para criação completa
  const [stages, setStages] = useState<StageForm[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldForm[]>([]);
  const [showStageForm, setShowStageForm] = useState(false);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  // Estados para formulários inline
  const [newStage, setNewStage] = useState<StageForm>({
    name: '',
    temperature_score: 50,
    max_days_allowed: 7,
    color: '#3B82F6',
    order_index: 0
  });

  const [newField, setNewField] = useState<CustomFieldForm>({
    field_name: '',
    field_label: '',
    field_type: 'text',
    field_options: [],
    is_required: false,
    field_order: 0,
    placeholder: ''
  });

  const [fieldOptions, setFieldOptions] = useState<string>(''); // Para campos select

  const [stageForm, setStageForm] = useState({
    name: '',
    temperature_score: 50,
    max_days_allowed: 7,
    color: '#3B82F6'
  });

  const [followUpForm, setFollowUpForm] = useState({
    stage_id: '',
    day_offset: 1,
    note: ''
  });

  // Novos estados para edição completa
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    member_ids: [] as string[]
  });
  const [editStages, setEditStages] = useState<EditableStage[]>([]);
  const [editCustomFields, setEditCustomFields] = useState<CustomField[]>([]);
  const [activeEditTab, setActiveEditTab] = useState<'info' | 'stages' | 'fields'>('info');

  // ============================================
  // EFEITOS E CARREGAMENTO DE DADOS
  // ============================================

  useEffect(() => {
    logger.info('👤 Estado do usuário:', user);
    logger.info('🔑 Role do usuário:', user?.role);
    logger.info('🏢 Tenant ID:', user?.tenant_id);
    
    if (user && user.role === 'admin') {
      logger.info('✅ Usuário é admin, carregando dados...');
      loadPipelines();
      loadMembers();
    } else {
      logger.info('❌ Usuário não é admin ou não está logado');
    }
  }, [user]);

  const loadPipelines = async () => {
    try {
      logger.info('🔍 Carregando pipelines para tenant:', user?.tenant_id);
      
      // 1. Carregar pipelines básicas
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false });

      if (pipelinesError) {
        throw pipelinesError;
      }

      if (!pipelinesData || pipelinesData.length === 0) {
        logger.info('✅ Nenhuma pipeline encontrada');
        setPipelines([]);
        return;
      }

      // 2. Para cada pipeline, carregar membros e etapas
      const enrichedPipelines = await Promise.all(
        pipelinesData.map(async (pipeline) => {
          // Carregar membros - abordagem simplificada
          const { data: pipelineMembers, error: membersError } = await supabase
            .from('pipeline_members')
            .select('id, assigned_at, member_id')
            .eq('pipeline_id', pipeline.id);

          if (membersError) {
            logger.error('❌ Erro ao carregar membros da pipeline:', membersError);
          }

          // Buscar dados dos usuários separadamente
          const members = [];
          if (pipelineMembers && pipelineMembers.length > 0) {
            const memberIds = pipelineMembers.map(pm => pm.member_id);
            const { data: usersData } = await supabase
              .from('users')
              .select('id, first_name, last_name, email')
              .in('id', memberIds);

            // Combinar os dados
            for (const pipelineMember of pipelineMembers) {
              const userData = usersData?.find(u => u.id === pipelineMember.member_id);
              members.push({
                id: pipelineMember.id,
                assigned_at: pipelineMember.assigned_at,
                member_id: pipelineMember.member_id,
                member: userData || {
                  id: pipelineMember.member_id,
                  first_name: 'Usuário',
                  last_name: 'Desconhecido',
                  email: 'N/A'
                }
              });
            }
          }

          logger.info(`👥 Membros carregados para pipeline ${pipeline.name}:`, members.length);

          // Carregar etapas
          const { data: stages } = await supabase
            .from('pipeline_stages')
            .select(`
              id,
              name,
              order_index,
              temperature_score,
              max_days_allowed,
              color
            `)
            .eq('pipeline_id', pipeline.id)
            .order('order_index', { ascending: true });

          // Carregar follow-ups para cada etapa
          const stagesWithFollowUps = await Promise.all(
            (stages || []).map(async (stage) => {
              const { data: followUps } = await supabase
                .from('follow_ups')
                .select('*')
                .eq('stage_id', stage.id)
                .order('day_offset', { ascending: true });

              return {
                ...stage,
                follow_ups: followUps || []
              };
            })
          );

          return {
            ...pipeline,
            pipeline_members: members,
            pipeline_stages: stagesWithFollowUps
          };
        })
      );

      logger.info('✅ Pipelines carregadas:', enrichedPipelines.length);
      setPipelines(enrichedPipelines);
    } catch (error) {
      logger.error('💥 Erro ao carregar pipelines:', error);
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role', 'member')
        .eq('tenant_id', user?.tenant_id)
        .order('first_name', { ascending: true });

      if (error) {
        logger.error('❌ Erro ao carregar membros:', error);
        setMembers([]);
      } else {
        logger.info('✅ Membros carregados:', users?.length || 0);
        setMembers(users || []);
      }
    } catch (error) {
      logger.error('💥 Erro ao carregar membros:', error);
      setMembers([]);
    }
  };

  // ============================================
  // FUNÇÕES AUXILIARES PARA ETAPAS E CAMPOS
  // ============================================

  const addStage = () => {
    if (!newStage.name.trim()) {
      alert('Nome da etapa é obrigatório');
      return;
    }

    const stage: StageForm = {
      ...newStage,
      order_index: stages.length
    };

    if (editingStageIndex !== null) {
      const updatedStages = [...stages];
      updatedStages[editingStageIndex] = stage;
      setStages(updatedStages);
      setEditingStageIndex(null);
    } else {
      setStages([...stages, stage]);
    }

    setNewStage({
      name: '',
      temperature_score: 50,
      max_days_allowed: 7,
      color: '#3B82F6',
      order_index: 0
    });
    setShowStageForm(false);
  };

  const editStage = (index: number) => {
    setNewStage(stages[index]);
    setEditingStageIndex(index);
    setShowStageForm(true);
  };

  const removeStage = (index: number) => {
    const updatedStages = stages.filter((_, i) => i !== index);
    // Reordenar índices
    const reorderedStages = updatedStages.map((stage, i) => ({
      ...stage,
      order_index: i
    }));
    setStages(reorderedStages);
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;

    const updatedStages = [...stages];
    [updatedStages[index], updatedStages[newIndex]] = [updatedStages[newIndex], updatedStages[index]];
    
    // Atualizar order_index
    updatedStages.forEach((stage, i) => {
      stage.order_index = i;
    });

    setStages(updatedStages);
  };

  const addCustomField = () => {
    if (!newField.field_name.trim() || !newField.field_label.trim()) {
      alert('Nome e rótulo do campo são obrigatórios');
      return;
    }

    // Processar opções para campos select
    let processedOptions: string[] = [];
    if (newField.field_type === 'select' && fieldOptions.trim()) {
      processedOptions = fieldOptions.split(',').map(opt => opt.trim()).filter(opt => opt);
    }

    const field: CustomFieldForm = {
      ...newField,
      field_options: processedOptions.length > 0 ? processedOptions : undefined,
      field_order: customFields.length
    };

    if (editingFieldIndex !== null) {
      const updatedFields = [...customFields];
      updatedFields[editingFieldIndex] = field;
      setCustomFields(updatedFields);
      setEditingFieldIndex(null);
    } else {
      setCustomFields([...customFields, field]);
    }

    setNewField({
      field_name: '',
      field_label: '',
      field_type: 'text',
      field_options: [],
      is_required: false,
      field_order: 0,
      placeholder: ''
    });
    setFieldOptions('');
    setShowFieldForm(false);
  };

  const editCustomField = (index: number) => {
    const field = customFields[index];
    setNewField(field);
    setFieldOptions(field.field_options?.join(', ') || '');
    setEditingFieldIndex(index);
    setShowFieldForm(true);
  };

  const removeCustomField = (index: number) => {
    const updatedFields = customFields.filter((_, i) => i !== index);
    // Reordenar índices
    const reorderedFields = updatedFields.map((field, i) => ({
      ...field,
      field_order: i
    }));
    setCustomFields(reorderedFields);
  };

  const moveCustomField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= customFields.length) return;

    const updatedFields = [...customFields];
    [updatedFields[index], updatedFields[newIndex]] = [updatedFields[newIndex], updatedFields[index]];
    
    // Atualizar field_order
    updatedFields.forEach((field, i) => {
      field.field_order = i;
    });

    setCustomFields(updatedFields);
  };

  // ============================================
  // FUNÇÕES DE PIPELINE
  // ============================================

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!pipelineForm.name.trim()) {
      alert('Nome da pipeline é obrigatório');
      return;
    }

    if (stages.length === 0) {
      alert('É necessário criar pelo menos uma etapa para a pipeline');
      return;
    }

    try {
      logger.info('🚀 Criando pipeline completa...');
      
      // 1. Criar a pipeline
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipelines')
        .insert([{
          name: pipelineForm.name,
          description: pipelineForm.description,
          tenant_id: user?.tenant_id,
          created_by: user?.email
        }])
        .select()
        .single();

      if (pipelineError) {
        throw new Error(`Erro ao criar pipeline: ${pipelineError.message}`);
      }

      logger.info('✅ Pipeline criada:', pipelineData);

      // 2. Criar as etapas
      let stagesCreated = 0;
      for (const stage of stages) {
        const { error: stageError } = await supabase
          .from('pipeline_stages')
          .insert([{
            pipeline_id: pipelineData.id,
            name: stage.name,
            order_index: stage.order_index,
            temperature_score: stage.temperature_score,
            max_days_allowed: stage.max_days_allowed,
            color: stage.color
          }]);

        if (!stageError) {
          stagesCreated++;
        } else {
          logger.error('❌ Erro ao criar etapa:', stageError);
        }
      }

      // 3. Atribuir membros
      let membersAssigned = 0;
      logger.info('🔗 Atribuindo membros:', pipelineForm.member_ids);
      
      for (const memberId of pipelineForm.member_ids) {
        logger.info('👤 Atribuindo membro ID:', memberId);
        
        const { data: memberData, error: memberError } = await supabase
          .from('pipeline_members')
          .insert([{
            pipeline_id: pipelineData.id,
            member_id: memberId,
            assigned_at: new Date().toISOString()
          }])
          .select();

        if (!memberError) {
          membersAssigned++;
          logger.info('✅ Membro atribuído com sucesso:', memberData);
        } else {
          logger.error('❌ Erro ao atribuir membro:', memberError);
        }
      }
        
        // Resetar formulários
        setPipelineForm({ name: '', description: '', member_ids: [] });
        setStages([]);
        setCustomFields([]);
        setActiveTab('list');
        loadPipelines();
        
      alert(`Pipeline criada com sucesso!\n- ${stagesCreated} etapas criadas\n- ${membersAssigned} membros atribuídos`);
    } catch (error) {
      logger.error('❌ Erro ao criar pipeline:', error);
      alert(`Erro ao criar pipeline: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleEditPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPipeline) return;

    try {
      const { error } = await supabase
        .from('pipelines')
        .update({
          name: pipelineForm.name,
          description: pipelineForm.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPipeline.id)
        .eq('tenant_id', user?.tenant_id);

      if (error) {
        throw new Error(`Erro ao atualizar pipeline: ${error.message}`);
      }

        setActiveTab('list');
        setSelectedPipeline(null);
        setPipelineForm({ name: '', description: '', member_ids: [] });
        loadPipelines();
        alert('Pipeline atualizada com sucesso!');
    } catch (error) {
      logger.error('❌ Erro ao atualizar pipeline:', error);
      alert(`Erro ao atualizar pipeline: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleDeletePipeline = async (pipelineId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pipeline?')) return;

    try {
      // Primeiro, deletar as dependências (stages, members, follow-ups)
      const { error: followUpsError } = await supabase
        .from('follow_ups')
        .delete()
        .in('stage_id', 
          pipelines.find(p => p.id === pipelineId)?.pipeline_stages?.map(s => s.id) || []
        );

      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('pipeline_id', pipelineId);

      const { error: membersError } = await supabase
        .from('pipeline_members')
        .delete()
        .eq('pipeline_id', pipelineId);

      // Depois, deletar a pipeline
      const { error: pipelineError } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', pipelineId)
        .eq('tenant_id', user?.tenant_id);

      if (pipelineError) {
        throw new Error(`Erro ao excluir pipeline: ${pipelineError.message}`);
      }

        loadPipelines();
        alert('Pipeline excluída com sucesso!');
    } catch (error) {
      logger.error('❌ Erro ao excluir pipeline:', error);
      alert(`Erro ao excluir pipeline: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // ============================================
  // FUNÇÕES DE MEMBROS
  // ============================================

  const handleAddMember = async (pipelineId: string, memberId: string) => {
    try {
      const { error } = await supabase
        .from('pipeline_members')
        .insert([{
          pipeline_id: pipelineId,
          member_id: memberId,
          assigned_at: new Date().toISOString()
        }]);

      if (error) {
        throw new Error(`Erro ao adicionar membro: ${error.message}`);
      }

        loadPipelines();
        alert('Membro adicionado com sucesso!');
    } catch (error) {
      logger.error('❌ Erro ao adicionar membro:', error);
      alert(`Erro ao adicionar membro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleRemoveMember = async (pipelineId: string, memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    try {
      const { error } = await supabase
        .from('pipeline_members')
        .delete()
        .eq('pipeline_id', pipelineId)
        .eq('member_id', memberId);

      if (error) {
        throw new Error(`Erro ao remover membro: ${error.message}`);
      }

        loadPipelines();
        alert('Membro removido com sucesso!');
    } catch (error) {
      logger.error('❌ Erro ao remover membro:', error);
      alert(`Erro ao remover membro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // ============================================
  // FUNÇÕES DE ETAPAS
  // ============================================

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPipeline) return;

    try {
      // Buscar a próxima ordem (order_index)
      const { data: existingStages } = await supabase
        .from('pipeline_stages')
        .select('order_index')
        .eq('pipeline_id', selectedPipeline.id)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = (existingStages?.[0]?.order_index || 0) + 1;

      const { error } = await supabase
        .from('pipeline_stages')
        .insert([{
          pipeline_id: selectedPipeline.id,
          name: stageForm.name,
          temperature_score: stageForm.temperature_score,
          max_days_allowed: stageForm.max_days_allowed,
          color: stageForm.color,
          order_index: nextOrderIndex
        }]);

      if (error) {
        throw new Error(`Erro ao criar etapa: ${error.message}`);
      }

        setStageForm({ name: '', temperature_score: 50, max_days_allowed: 7, color: '#3B82F6' });
        setShowStageModal(false);
        loadPipelines();
        alert('Etapa criada com sucesso!');
    } catch (error) {
      logger.error('❌ Erro ao criar etapa:', error);
      alert(`Erro ao criar etapa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleDeleteStage = async (pipelineId: string, stageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta etapa?')) return;

    try {
      // Primeiro, deletar os follow-ups da etapa
      const { error: followUpsError } = await supabase
        .from('follow_ups')
        .delete()
        .eq('stage_id', stageId);

      // Depois, deletar a etapa
      const { error: stageError } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId)
        .eq('pipeline_id', pipelineId);

      if (stageError) {
        throw new Error(`Erro ao excluir etapa: ${stageError.message}`);
      }

        loadPipelines();
        alert('Etapa excluída com sucesso!');
    } catch (error) {
      logger.error('❌ Erro ao excluir etapa:', error);
      alert(`Erro ao excluir etapa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // ============================================
  // FUNÇÕES DE FOLLOW-UP
  // ============================================

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPipeline) return;

    try {
      const { error } = await supabase
        .from('follow_ups')
        .insert([{
          stage_id: followUpForm.stage_id,
          day_offset: followUpForm.day_offset,
          note: followUpForm.note,
          is_active: true
        }]);

      if (error) {
        throw new Error(`Erro ao criar follow-up: ${error.message}`);
      }

        setFollowUpForm({ stage_id: '', day_offset: 1, note: '' });
        setShowFollowUpModal(false);
        loadPipelines();
        alert('Follow-up criado com sucesso!');
    } catch (error) {
      logger.error('❌ Erro ao criar follow-up:', error);
      alert(`Erro ao criar follow-up: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const startEditPipeline = (pipeline: Pipeline) => {
    loadPipelineForEdit(pipeline);
  };

  const openStageModal = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setShowStageModal(true);
  };

  const openFollowUpModal = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setShowFollowUpModal(true);
  };

  // Função para carregar dados completos da pipeline para edição
  const loadPipelineForEdit = async (pipeline: Pipeline) => {
    try {
      logger.info('📝 Carregando dados completos da pipeline para edição:', pipeline.id);
      
      // Carregar etapas
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .order('order_index', { ascending: true });

      if (stagesError) {
        throw stagesError;
      }

      // Carregar campos customizados
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .order('field_order', { ascending: true });

      if (fieldsError) {
        throw fieldsError;
      }

      // Configurar estados de edição
      setEditingPipeline(pipeline);
      setEditForm({
        name: pipeline.name,
        description: pipeline.description || '',
        member_ids: (pipeline.pipeline_members || []).map(pm => pm.member?.id || pm.member_id)
      });
      setEditStages(stagesData || []);
      setEditCustomFields(fieldsData || []);
      setActiveEditTab('info');
      setShowEditModal(true);

      logger.info('✅ Dados carregados para edição');
    } catch (error) {
      logger.error('❌ Erro ao carregar dados para edição:', error);
      alert('Erro ao carregar dados da pipeline para edição');
    }
  };

  // Funções para gerenciar etapas na edição
  const addEditStage = () => {
    const newStage: EditableStage = {
      name: '',
      temperature_score: 50,
      max_days_allowed: 7,
      color: '#3B82F6',
      order_index: editStages.length
    };
    setEditStages([...editStages, newStage]);
  };

  const updateEditStage = (index: number, field: keyof EditableStage, value: any) => {
    const updatedStages = [...editStages];
    updatedStages[index] = { ...updatedStages[index], [field]: value };
    setEditStages(updatedStages);
  };

  const removeEditStage = (index: number) => {
    const updatedStages = editStages.filter((_, i) => i !== index);
    // Reordenar índices
    updatedStages.forEach((stage, i) => {
      stage.order_index = i;
    });
    setEditStages(updatedStages);
  };

  const moveEditStage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editStages.length) return;

    const updatedStages = [...editStages];
    [updatedStages[index], updatedStages[newIndex]] = [updatedStages[newIndex], updatedStages[index]];
    
    // Atualizar order_index
    updatedStages.forEach((stage, i) => {
      stage.order_index = i;
    });
    
    setEditStages(updatedStages);
  };

  // Funções para gerenciar campos customizados na edição
  const addEditCustomField = () => {
    const newField: CustomField = {
      field_name: '',
      field_label: '',
      field_type: 'text',
      field_options: [],
      is_required: false,
      field_order: editCustomFields.length,
      placeholder: ''
    };
    setEditCustomFields([...editCustomFields, newField]);
  };

  const updateEditCustomField = (index: number, field: keyof CustomField, value: any) => {
    const updatedFields = [...editCustomFields];
    updatedFields[index] = { ...updatedFields[index], [field]: value };
    setEditCustomFields(updatedFields);
  };

  const removeEditCustomField = (index: number) => {
    const updatedFields = editCustomFields.filter((_, i) => i !== index);
    // Reordenar índices
    updatedFields.forEach((field, i) => {
      field.field_order = i;
    });
    setEditCustomFields(updatedFields);
  };

  const moveEditCustomField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editCustomFields.length) return;

    const updatedFields = [...editCustomFields];
    [updatedFields[index], updatedFields[newIndex]] = [updatedFields[newIndex], updatedFields[index]];
    
    // Atualizar field_order
    updatedFields.forEach((field, i) => {
      field.field_order = i;
    });
    
    setEditCustomFields(updatedFields);
  };

  // Função para salvar todas as alterações
  const handleSaveCompleteEdit = async () => {
    try {
      if (!editingPipeline) return;

      logger.info('💾 Salvando edição completa da pipeline:', editingPipeline.id);

      // 1. Atualizar informações básicas da pipeline
      const { error: pipelineError } = await supabase
        .from('pipelines')
        .update({
          name: editForm.name,
          description: editForm.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPipeline.id);

      if (pipelineError) {
        throw pipelineError;
      }

      // 2. Atualizar etapas
      // Primeiro, deletar etapas existentes que não estão mais na lista
      const existingStageIds = editStages.filter(s => s.id).map(s => s.id);
      if (editingPipeline.pipeline_stages) {
        const stagesToDelete = editingPipeline.pipeline_stages
          .filter(s => !existingStageIds.includes(s.id))
          .map(s => s.id);

        if (stagesToDelete.length > 0) {
          const { error: deleteStagesError } = await supabase
            .from('pipeline_stages')
            .delete()
            .in('id', stagesToDelete);

          if (deleteStagesError) {
            throw deleteStagesError;
          }
        }
      }

      // Inserir/atualizar etapas
      for (const stage of editStages) {
        if (stage.id) {
          // Atualizar etapa existente
          const { error: updateStageError } = await supabase
            .from('pipeline_stages')
            .update({
              name: stage.name,
              temperature_score: stage.temperature_score,
              max_days_allowed: stage.max_days_allowed,
              color: stage.color,
              order_index: stage.order_index
            })
            .eq('id', stage.id);

          if (updateStageError) {
            throw updateStageError;
          }
        } else {
          // Criar nova etapa
          const { error: insertStageError } = await supabase
            .from('pipeline_stages')
            .insert({
              pipeline_id: editingPipeline.id,
              name: stage.name,
              temperature_score: stage.temperature_score,
              max_days_allowed: stage.max_days_allowed,
              color: stage.color,
              order_index: stage.order_index
            });

          if (insertStageError) {
            throw insertStageError;
          }
        }
      }

      // 3. Atualizar campos customizados
      // Primeiro, deletar campos existentes que não estão mais na lista
      const existingFieldIds = editCustomFields.filter(f => f.id).map(f => f.id);
      const { data: currentFields } = await supabase
        .from('pipeline_custom_fields')
        .select('id')
        .eq('pipeline_id', editingPipeline.id);

      if (currentFields) {
        const fieldsToDelete = currentFields
          .filter(f => !existingFieldIds.includes(f.id))
          .map(f => f.id);

        if (fieldsToDelete.length > 0) {
          const { error: deleteFieldsError } = await supabase
            .from('pipeline_custom_fields')
            .delete()
            .in('id', fieldsToDelete);

          if (deleteFieldsError) {
            throw deleteFieldsError;
          }
        }
      }

      // Inserir/atualizar campos customizados
      for (const field of editCustomFields) {
        if (field.id) {
          // Atualizar campo existente
          const { error: updateFieldError } = await supabase
            .from('pipeline_custom_fields')
            .update({
              field_name: field.field_name,
              field_label: field.field_label,
              field_type: field.field_type,
              field_options: field.field_options,
              is_required: field.is_required,
              field_order: field.field_order,
              placeholder: field.placeholder
            })
            .eq('id', field.id);

          if (updateFieldError) {
            throw updateFieldError;
          }
        } else {
          // Criar novo campo
          const { error: insertFieldError } = await supabase
            .from('pipeline_custom_fields')
            .insert({
              pipeline_id: editingPipeline.id,
              field_name: field.field_name,
              field_label: field.field_label,
              field_type: field.field_type,
              field_options: field.field_options,
              is_required: field.is_required,
              field_order: field.field_order,
              placeholder: field.placeholder
            });

          if (insertFieldError) {
            throw insertFieldError;
          }
        }
      }

      logger.info('✅ Pipeline editada com sucesso');
      alert('✅ Pipeline editada com sucesso!');
      
      // Recarregar dados e fechar modal
      setShowEditModal(false);
      loadPipelines();
    } catch (error) {
      logger.error('❌ Erro ao salvar edição:', error);
      alert('❌ Erro ao salvar alterações. Tente novamente.');
    }
  };

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  if (loading) {
    return (
      <div className="pipeline-module">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>🔄 Carregando pipelines...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pipeline-module">
        <div className="error-state">
          <p>❌ Usuário não encontrado. Faça login novamente.</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="pipeline-module">
        <div className="error-state">
          <p>🚫 Acesso negado. Apenas administradores podem gerenciar pipelines.</p>
          <p>Seu role atual: <strong>{user.role}</strong></p>
        </div>
      </div>
    );
  }

  logger.info('🎯 Renderizando PipelineModule com ' + pipelines.length + ' pipelines');

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="pipeline-module">
      <div className="module-header">
        <h3>🔄 Criador de Pipeline</h3>
        <div className="header-actions">
          <button 
            onClick={() => setActiveTab('list')}
            className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          >
            📋 Lista
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          >
            ➕ Criar Pipeline
          </button>
        </div>
      </div>

      {/* LISTA DE PIPELINES */}
      {activeTab === 'list' && (
        <div className="pipelines-list">
          {pipelines.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma pipeline criada ainda.</p>
              <button onClick={() => setActiveTab('create')} className="create-button">
                Criar primeira pipeline
              </button>
            </div>
          ) : (
            <div className="pipelines-grid">
              {pipelines.map((pipeline) => (
                <div key={pipeline.id} className="pipeline-card">
                  <div className="pipeline-header">
                    <h4>{pipeline.name}</h4>
                    <div className="pipeline-actions">
                      <button 
                        onClick={() => startEditPipeline(pipeline)}
                        className="edit-button"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeletePipeline(pipeline.id)}
                        className="delete-button"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <p className="pipeline-description">
                    {pipeline.description || 'Sem descrição'}
                  </p>
                  
                  <div className="pipeline-info">
                    <p><strong>Criado por:</strong> {pipeline.created_by || 'Sistema'}</p>
                    <p><strong>Data:</strong> {new Date(pipeline.created_at).toLocaleDateString()}</p>
                    <p><strong>Etapas:</strong> {pipeline.pipeline_stages?.length || 0}</p>
                  </div>

                  <div className="pipeline-members">
                    <h5>👥 Vendedores ({pipeline.pipeline_members?.length || 0})</h5>
                    <div className="members-list">
                      {(pipeline.pipeline_members || []).map((pm) => (
                        <div key={pm.id} className="member-item">
                          <span>{pm.member ? `${pm.member.first_name} ${pm.member.last_name}` : 'N/A'}</span>
                          <button 
                            onClick={() => handleRemoveMember(pipeline.id, pm.member_id)}
                            className="remove-member-button"
                            title="Remover"
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="add-member-section">
                      <select 
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMember(pipeline.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="member-select"
                      >
                        <option value="">+ Adicionar vendedor</option>
                        {members
                          .filter(member => !(pipeline.pipeline_members || []).some(pm => pm.member_id === member.id))
                          .map(member => (
                            <option key={member.id} value={member.id}>
                              {member.first_name} {member.last_name}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  <div className="pipeline-stages-section">
                    <div className="stages-header">
                      <h5>🎯 Etapas do Funil</h5>
                      <button 
                        onClick={() => openStageModal(pipeline)}
                        className="add-stage-button"
                      >
                        + Etapa
                      </button>
                    </div>
                    
                    <div className="stages-list">
                      {(pipeline.pipeline_stages || [])
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((stage) => (
                          <div key={stage.id} className="stage-item">
                            <div className="stage-info">
                              <div 
                                className="stage-color" 
                                style={{ backgroundColor: stage.color }}
                              ></div>
                              <div className="stage-details">
                                <strong>{stage.name}</strong>
                                <div className="stage-meta">
                                  <span>🌡️ {stage.temperature_score}%</span>
                                  <span>⏰ {stage.max_days_allowed} dias</span>
                                  <span>📋 {stage.follow_ups?.length || 0} follow-ups</span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteStage(pipeline.id, stage.id)}
                              className="delete-stage-button"
                              title="Excluir etapa"
                            >
                              🗑️
                            </button>
                          </div>
                        ))
                      }
                    </div>

                    <button 
                      onClick={() => openFollowUpModal(pipeline)}
                      className="add-followup-button"
                    >
                      📅 Adicionar Follow-up
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FORMULÁRIO DE CRIAÇÃO EXPANDIDO */}
      {activeTab === 'create' && (
        <div className="create-pipeline-form">
          <h4>➕ Criar Nova Pipeline</h4>
          <form onSubmit={handleCreatePipeline}>
            
            {/* SEÇÃO BÁSICA */}
            <div className="form-section">
              <h5>📋 Informações Básicas</h5>
              
              <div className="form-group">
                <label>Nome da Pipeline *</label>
                <input
                  type="text"
                  value={pipelineForm.name}
                  onChange={(e) => setPipelineForm({...pipelineForm, name: e.target.value})}
                  required
                  placeholder="Ex: Pipeline Vendas B2B"
                />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={pipelineForm.description}
                  onChange={(e) => setPipelineForm({...pipelineForm, description: e.target.value})}
                  placeholder="Descreva o objetivo desta pipeline..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Vendedores</label>
                <div className="members-checkboxes">
                  {members.map((member) => (
                    <label key={member.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={pipelineForm.member_ids.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPipelineForm({
                              ...pipelineForm,
                              member_ids: [...pipelineForm.member_ids, member.id]
                            });
                          } else {
                            setPipelineForm({
                              ...pipelineForm,
                              member_ids: pipelineForm.member_ids.filter(id => id !== member.id)
                            });
                          }
                        }}
                      />
                      {member.first_name} {member.last_name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* SEÇÃO DE ETAPAS */}
            <div className="form-section">
              <div className="section-header">
                <h5>🎯 Etapas do Funil *</h5>
                <button 
                  type="button" 
                  onClick={() => setShowStageForm(true)}
                  className="add-button"
                >
                  + Adicionar Etapa
                </button>
              </div>

              {stages.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhuma etapa criada. Adicione pelo menos uma etapa para continuar.</p>
                </div>
              ) : (
                <div className="stages-list">
                  {stages.map((stage, index) => (
                    <div key={index} className="stage-item">
                      <div className="stage-info">
                        <div 
                          className="stage-color" 
                          style={{ backgroundColor: stage.color }}
                        ></div>
                        <div className="stage-details">
                          <strong>{stage.name}</strong>
                          <div className="stage-meta">
                            <span>🌡️ {stage.temperature_score}%</span>
                            <span>⏰ {stage.max_days_allowed} dias</span>
                            <span>📍 Posição {index + 1}</span>
                          </div>
                        </div>
                      </div>
                      <div className="stage-actions">
                        <button 
                          type="button"
                          onClick={() => moveStage(index, 'up')}
                          disabled={index === 0}
                          className="move-button"
                          title="Mover para cima"
                        >
                          ⬆️
                        </button>
                        <button 
                          type="button"
                          onClick={() => moveStage(index, 'down')}
                          disabled={index === stages.length - 1}
                          className="move-button"
                          title="Mover para baixo"
                        >
                          ⬇️
                        </button>
                        <button 
                          type="button"
                          onClick={() => editStage(index)}
                          className="edit-button"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button 
                          type="button"
                          onClick={() => removeStage(index)}
                          className="delete-button"
                          title="Remover"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* FORMULÁRIO INLINE DE ETAPA */}
              {showStageForm && (
                <div className="inline-form">
                  <h6>{editingStageIndex !== null ? '✏️ Editar Etapa' : '➕ Nova Etapa'}</h6>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nome da Etapa *</label>
                      <input
                        type="text"
                        value={newStage.name}
                        onChange={(e) => setNewStage({...newStage, name: e.target.value})}
                        placeholder="Ex: Contato Inicial"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Temperatura (0-100%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newStage.temperature_score}
                        onChange={(e) => setNewStage({...newStage, temperature_score: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Máximo de Dias</label>
                      <input
                        type="number"
                        min="1"
                        value={newStage.max_days_allowed}
                        onChange={(e) => setNewStage({...newStage, max_days_allowed: parseInt(e.target.value)})}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Cor</label>
                      <input
                        type="color"
                        value={newStage.color}
                        onChange={(e) => setNewStage({...newStage, color: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="inline-form-actions">
                    <button type="button" onClick={addStage} className="save-button">
                      {editingStageIndex !== null ? 'Salvar' : 'Adicionar'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowStageForm(false);
                        setEditingStageIndex(null);
                        setNewStage({
                          name: '',
                          temperature_score: 50,
                          max_days_allowed: 7,
                          color: '#3B82F6',
                          order_index: 0
                        });
                      }}
                      className="cancel-button"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO DE CAMPOS CUSTOMIZADOS */}
            <div className="form-section">
              <div className="section-header">
                <h5>📝 Campos Customizados</h5>
                <button 
                  type="button" 
                  onClick={() => setShowFieldForm(true)}
                  className="add-button"
                >
                  + Adicionar Campo
                </button>
              </div>

              {customFields.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhum campo customizado criado. Os campos aparecerão nos cards do kanban.</p>
                </div>
              ) : (
                <div className="fields-list">
                  {customFields.map((field, index) => (
                    <div key={index} className="field-item">
                      <div className="field-info">
                        <div className="field-details">
                          <strong>{field.field_label}</strong>
                          <div className="field-meta">
                            <span>🏷️ {field.field_name}</span>
                            <span>📝 {field.field_type}</span>
                            {field.is_required && <span>⚠️ Obrigatório</span>}
                            {field.field_options && <span>📋 {field.field_options.length} opções</span>}
                          </div>
                        </div>
                      </div>
                      <div className="field-actions">
                        <button 
                          type="button"
                          onClick={() => moveCustomField(index, 'up')}
                          disabled={index === 0}
                          className="move-button"
                          title="Mover para cima"
                        >
                          ⬆️
                        </button>
                        <button 
                          type="button"
                          onClick={() => moveCustomField(index, 'down')}
                          disabled={index === customFields.length - 1}
                          className="move-button"
                          title="Mover para baixo"
                        >
                          ⬇️
                        </button>
                        <button 
                          type="button"
                          onClick={() => editCustomField(index)}
                          className="edit-button"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button 
                          type="button"
                          onClick={() => removeCustomField(index)}
                          className="delete-button"
                          title="Remover"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* FORMULÁRIO INLINE DE CAMPO */}
              {showFieldForm && (
                <div className="inline-form">
                  <h6>{editingFieldIndex !== null ? '✏️ Editar Campo' : '➕ Novo Campo'}</h6>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nome do Campo *</label>
                      <input
                        type="text"
                        value={newField.field_name}
                        onChange={(e) => setNewField({...newField, field_name: e.target.value})}
                        placeholder="Ex: nome_cliente"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Rótulo do Campo *</label>
                      <input
                        type="text"
                        value={newField.field_label}
                        onChange={(e) => setNewField({...newField, field_label: e.target.value})}
                        placeholder="Ex: Nome do Cliente"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Tipo do Campo</label>
                      <select
                        value={newField.field_type}
                        onChange={(e) => setNewField({...newField, field_type: e.target.value as any})}
                      >
                        <option value="text">Texto</option>
                        <option value="email">E-mail</option>
                        <option value="phone">Telefone</option>
                        <option value="textarea">Área de Texto</option>
                        <option value="select">Seleção</option>
                        <option value="number">Número</option>
                        <option value="date">Data</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={newField.is_required}
                          onChange={(e) => setNewField({...newField, is_required: e.target.checked})}
                        />
                        Campo Obrigatório
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Placeholder</label>
                    <input
                      type="text"
                      value={newField.placeholder}
                      onChange={(e) => setNewField({...newField, placeholder: e.target.value})}
                      placeholder="Ex: Digite o nome completo..."
                    />
                  </div>

                  {newField.field_type === 'select' && (
                    <div className="form-group">
                      <label>Opções (separadas por vírgula)</label>
                      <input
                        type="text"
                        value={fieldOptions}
                        onChange={(e) => setFieldOptions(e.target.value)}
                        placeholder="Ex: Opção 1, Opção 2, Opção 3"
                      />
                    </div>
                  )}

                  <div className="inline-form-actions">
                    <button type="button" onClick={addCustomField} className="save-button">
                      {editingFieldIndex !== null ? 'Salvar' : 'Adicionar'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowFieldForm(false);
                        setEditingFieldIndex(null);
                        setNewField({
                          field_name: '',
                          field_label: '',
                          field_type: 'text',
                          field_options: [],
                          is_required: false,
                          field_order: 0,
                          placeholder: ''
                        });
                        setFieldOptions('');
                      }}
                      className="cancel-button"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">
                🚀 Criar Pipeline Completa
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setActiveTab('list');
                  // Resetar formulários
                  setPipelineForm({ name: '', description: '', member_ids: [] });
                  setStages([]);
                  setCustomFields([]);
                }}
                className="cancel-button"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE EDIÇÃO COMPLETA */}
      {showEditModal && editingPipeline && (
        <div className="edit-pipeline-form">
          <div>
          <h4>✏️ Editar Pipeline</h4>
            <div className="edit-tabs">
            <button 
              onClick={() => setActiveEditTab('info')}
              className={`edit-tab ${activeEditTab === 'info' ? 'active' : ''}`}
            >
              Informações
            </button>
            <button 
              onClick={() => setActiveEditTab('stages')}
              className={`edit-tab ${activeEditTab === 'stages' ? 'active' : ''}`}
            >
              Etapas
            </button>
            <button 
              onClick={() => setActiveEditTab('fields')}
              className={`edit-tab ${activeEditTab === 'fields' ? 'active' : ''}`}
            >
              Campos
            </button>
          </div>
          {activeEditTab === 'info' && (
            <div className="edit-section">
              <h5>📋 Informações Básicas</h5>
            <div className="form-group">
              <label>Nome da Pipeline *</label>
              <input
                type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                rows={3}
              />
            </div>
            </div>
          )}
          {activeEditTab === 'stages' && (
            <div className="edit-section">
              <h5>🎯 Etapas do Funil</h5>
              <div className="stages-list">
                {editStages.map((stage, index) => (
                  <div key={index} className="stage-item">
                    <div className="stage-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Nome da Etapa</label>
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) => updateEditStage(index, 'name', e.target.value)}
                            placeholder="Ex: Contato Inicial"
                          />
                        </div>
                        <div className="form-group">
                          <label>Temperatura (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={stage.temperature_score}
                            onChange={(e) => updateEditStage(index, 'temperature_score', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Máx. Dias</label>
                          <input
                            type="number"
                            min="1"
                            value={stage.max_days_allowed}
                            onChange={(e) => updateEditStage(index, 'max_days_allowed', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="form-group">
                          <label>Cor</label>
                          <input
                            type="color"
                            value={stage.color}
                            onChange={(e) => updateEditStage(index, 'color', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="stage-actions">
                      <button 
                        type="button"
                        onClick={() => moveEditStage(index, 'up')}
                        disabled={index === 0}
                        className="move-button"
                        title="Mover para cima"
                      >
                        ⬆️
              </button>
              <button 
                type="button" 
                        onClick={() => moveEditStage(index, 'down')}
                        disabled={index === editStages.length - 1}
                        className="move-button"
                        title="Mover para baixo"
                      >
                        ⬇️
                      </button>
                      <button 
                        type="button"
                        onClick={() => removeEditStage(index)}
                        className="delete-button"
                        title="Remover"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                type="button" 
                onClick={addEditStage}
                className="add-button"
              >
                + Adicionar Etapa
              </button>
            </div>
          )}
          {activeEditTab === 'fields' && (
            <div className="edit-section">
              <h5>📝 Campos Customizados</h5>
              <div className="fields-list">
                {editCustomFields.map((field, index) => (
                  <div key={index} className="field-item">
                    <div className="field-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Nome do Campo</label>
                          <input
                            type="text"
                            value={field.field_name}
                            onChange={(e) => updateEditCustomField(index, 'field_name', e.target.value)}
                            placeholder="Ex: nome_cliente"
                          />
                        </div>
                        <div className="form-group">
                          <label>Rótulo</label>
                          <input
                            type="text"
                            value={field.field_label}
                            onChange={(e) => updateEditCustomField(index, 'field_label', e.target.value)}
                            placeholder="Ex: Nome do Cliente"
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Tipo</label>
                          <select
                            value={field.field_type}
                            onChange={(e) => updateEditCustomField(index, 'field_type', e.target.value)}
                          >
                            <option value="text">Texto</option>
                            <option value="email">Email</option>
                            <option value="phone">Telefone</option>
                            <option value="textarea">Texto Longo</option>
                            <option value="select">Lista de Opções</option>
                            <option value="number">Número</option>
                            <option value="date">Data</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={field.is_required}
                              onChange={(e) => updateEditCustomField(index, 'is_required', e.target.checked)}
                            />
                            Obrigatório
                          </label>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Placeholder</label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => updateEditCustomField(index, 'placeholder', e.target.value)}
                          placeholder="Texto de ajuda para o campo"
                        />
                      </div>
                      {field.field_type === 'select' && (
                        <div className="form-group">
                          <label>Opções (uma por linha)</label>
                          <textarea
                            value={(field.field_options || []).join('\n')}
                            onChange={(e) => updateEditCustomField(index, 'field_options', e.target.value.split('\n').filter(opt => opt.trim()))}
                            placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                    <div className="field-actions">
                      <button 
                        type="button"
                        onClick={() => moveEditCustomField(index, 'up')}
                        disabled={index === 0}
                        className="move-button"
                        title="Mover para cima"
                      >
                        ⬆️
                      </button>
                      <button 
                        type="button"
                        onClick={() => moveEditCustomField(index, 'down')}
                        disabled={index === editCustomFields.length - 1}
                        className="move-button"
                        title="Mover para baixo"
                      >
                        ⬇️
                      </button>
                      <button 
                        type="button"
                        onClick={() => removeEditCustomField(index)}
                        className="delete-button"
                        title="Remover"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                type="button" 
                onClick={addEditCustomField}
                className="add-button"
              >
                + Adicionar Campo
              </button>
            </div>
          )}
          <div className="edit-actions">
            <button 
              type="button"
              onClick={handleSaveCompleteEdit}
              className="submit-button"
            >
              💾 Salvar Todas as Alterações
            </button>
            <button 
              type="button" 
              onClick={() => setShowEditModal(false)}
                className="cancel-button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ETAPA */}
      {showStageModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h4>➕ Adicionar Etapa</h4>
              <button 
                onClick={() => setShowStageModal(false)}
                className="close-button"
              >
                ❌
              </button>
            </div>
            
            <form onSubmit={handleCreateStage}>
              <div className="form-group">
                <label>Nome da Etapa *</label>
                <input
                  type="text"
                  value={stageForm.name}
                  onChange={(e) => setStageForm({...stageForm, name: e.target.value})}
                  required
                  placeholder="Ex: Contato Inicial"
                />
              </div>

              <div className="form-group">
                <label>Temperatura (0-100%) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={stageForm.temperature_score}
                  onChange={(e) => setStageForm({...stageForm, temperature_score: parseInt(e.target.value)})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Máximo de Dias *</label>
                <input
                  type="number"
                  min="1"
                  value={stageForm.max_days_allowed}
                  onChange={(e) => setStageForm({...stageForm, max_days_allowed: parseInt(e.target.value)})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Cor</label>
                <input
                  type="color"
                  value={stageForm.color}
                  onChange={(e) => setStageForm({...stageForm, color: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  Criar Etapa
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowStageModal(false)}
                  className="cancel-button"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FOLLOW-UP */}
      {showFollowUpModal && selectedPipeline && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h4>📅 Adicionar Follow-up</h4>
              <button 
                onClick={() => setShowFollowUpModal(false)}
                className="close-button"
              >
                ❌
              </button>
            </div>
            
            <form onSubmit={handleCreateFollowUp}>
              <div className="form-group">
                <label>Etapa *</label>
                <select
                  value={followUpForm.stage_id}
                  onChange={(e) => setFollowUpForm({...followUpForm, stage_id: e.target.value})}
                  required
                >
                  <option value="">Selecione uma etapa</option>
                  {(selectedPipeline.pipeline_stages || [])
                    .sort((a, b) => a.order_index - b.order_index)
                    .map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="form-group">
                <label>Dias após entrada na etapa *</label>
                <input
                  type="number"
                  min="1"
                  value={followUpForm.day_offset}
                  onChange={(e) => setFollowUpForm({...followUpForm, day_offset: parseInt(e.target.value)})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Nota/Lembrete</label>
                <textarea
                  value={followUpForm.note}
                  onChange={(e) => setFollowUpForm({...followUpForm, note: e.target.value})}
                  placeholder="Ex: Enviar proposta comercial"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  Criar Follow-up
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowFollowUpModal(false)}
                  className="cancel-button"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineModule;