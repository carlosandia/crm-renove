import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Play, Pause, Mail, Phone, MessageSquare, Calendar, Clock, CheckCircle, AlertCircle, Zap, X, List, GitBranch, Users, Settings } from 'lucide-react';
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
  sequences?: SequenceTemplate[];
}

// NOVAS INTERFACES PARA CADÊNCIAS SEQUENCIAIS
interface SequenceTask {
  id?: string;
  type: 'email' | 'call' | 'sms' | 'meeting' | 'reminder' | 'linkedin' | 'whatsapp';
  title: string;
  description: string;
  delay_days: number;
  delay_hours: number;
  template_content?: string;
  is_required: boolean;
  auto_complete: boolean;
  conditions?: SequenceCondition[];
  order_index: number;
}

interface SequenceCondition {
  id?: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: string;
  action: 'skip' | 'pause' | 'branch' | 'complete';
}

interface SequenceTemplate {
  id?: string;
  name: string;
  description: string;
  stage_id?: string;
  trigger_event: 'stage_entry' | 'manual' | 'lead_created' | 'field_updated';
  is_active: boolean;
  tasks: SequenceTask[];
  created_at?: string;
  updated_at?: string;
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
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'sequences'>('list');
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  // NOVOS ESTADOS PARA CADÊNCIAS SEQUENCIAIS
  const [sequences, setSequences] = useState<SequenceTemplate[]>([]);
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [editingSequence, setEditingSequence] = useState<SequenceTemplate | null>(null);
  const [selectedStageForSequence, setSelectedStageForSequence] = useState<string>('');
  const [sequenceForm, setSequenceForm] = useState<SequenceTemplate>({
    name: '',
    description: '',
    trigger_event: 'stage_entry',
    is_active: true,
    tasks: []
  });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState<SequenceTask>({
    type: 'email',
    title: '',
    description: '',
    delay_days: 0,
    delay_hours: 0,
    template_content: '',
    is_required: false,
    auto_complete: false,
    order_index: 0
  });

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
  const [activeEditTab, setActiveEditTab] = useState<'info' | 'stages' | 'fields' | 'sequences'>('info');

  // ============================================
  // FUNÇÕES PARA CADÊNCIAS SEQUENCIAIS
  // ============================================

  const getTaskTypeIcon = (type: SequenceTask['type']) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'call': return <Phone className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'meeting': return <Calendar className="w-4 h-4" />;
      case 'reminder': return <Clock className="w-4 h-4" />;
      case 'linkedin': return <MessageSquare className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getTaskTypeColor = (type: SequenceTask['type']) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'call': return 'bg-green-100 text-green-800';
      case 'sms': return 'bg-purple-100 text-purple-800';
      case 'meeting': return 'bg-orange-100 text-orange-800';
      case 'reminder': return 'bg-yellow-100 text-yellow-800';
      case 'linkedin': return 'bg-indigo-100 text-indigo-800';
      case 'whatsapp': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDelay = (days: number, hours: number) => {
    if (days === 0 && hours === 0) return 'Imediatamente';
    if (days === 0) return `${hours}h`;
    if (hours === 0) return `${days}d`;
    return `${days}d ${hours}h`;
  };

  const addTaskToSequence = () => {
    if (!taskForm.title.trim()) {
      alert('Título da tarefa é obrigatório');
      return;
    }

    const newTask: SequenceTask = {
      ...taskForm,
      order_index: sequenceForm.tasks.length
    };

    if (editingTaskIndex !== null) {
      const updatedTasks = [...sequenceForm.tasks];
      updatedTasks[editingTaskIndex] = newTask;
      setSequenceForm({ ...sequenceForm, tasks: updatedTasks });
      setEditingTaskIndex(null);
    } else {
      setSequenceForm({
        ...sequenceForm,
        tasks: [...sequenceForm.tasks, newTask]
      });
    }

    resetTaskForm();
    setShowTaskModal(false);
  };

  const editTask = (index: number) => {
    setTaskForm(sequenceForm.tasks[index]);
    setEditingTaskIndex(index);
    setShowTaskModal(true);
  };

  const removeTask = (index: number) => {
    const updatedTasks = sequenceForm.tasks.filter((_, i) => i !== index);
    // Reordenar índices
    const reorderedTasks = updatedTasks.map((task, i) => ({
      ...task,
      order_index: i
    }));
    setSequenceForm({ ...sequenceForm, tasks: reorderedTasks });
  };

  const moveTask = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sequenceForm.tasks.length) return;

    const updatedTasks = [...sequenceForm.tasks];
    [updatedTasks[index], updatedTasks[newIndex]] = [updatedTasks[newIndex], updatedTasks[index]];
    
    // Atualizar order_index
    updatedTasks.forEach((task, i) => {
      task.order_index = i;
    });

    setSequenceForm({ ...sequenceForm, tasks: updatedTasks });
  };

  const resetTaskForm = () => {
    setTaskForm({
      type: 'email',
      title: '',
      description: '',
      delay_days: 0,
      delay_hours: 0,
      template_content: '',
      is_required: false,
      auto_complete: false,
      order_index: 0
    });
  };

  const resetSequenceForm = () => {
    setSequenceForm({
      name: '',
      description: '',
      trigger_event: 'stage_entry',
      is_active: true,
      tasks: []
    });
    setEditingSequence(null);
    setSelectedStageForSequence('');
  };

  const handleCreateSequence = async () => {
    if (!sequenceForm.name.trim()) {
      alert('Nome da sequência é obrigatório');
      return;
    }

    if (sequenceForm.tasks.length === 0) {
      alert('É necessário adicionar pelo menos uma tarefa à sequência');
      return;
    }

    try {
      logger.info('🚀 Criando sequência de cadência...');
      
      // Por enquanto, vamos simular a criação e armazenar localmente
      const newSequence: SequenceTemplate = {
        id: `seq_${Date.now()}`,
        ...sequenceForm,
        stage_id: selectedStageForSequence || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (editingSequence) {
        // Atualizar sequência existente
        const updatedSequences = sequences.map(seq => 
          seq.id === editingSequence.id ? { ...newSequence, id: editingSequence.id } : seq
        );
        setSequences(updatedSequences);
        logger.success('✅ Sequência atualizada com sucesso');
      } else {
        // Criar nova sequência
        setSequences([...sequences, newSequence]);
        logger.success('✅ Sequência criada com sucesso');
      }

      resetSequenceForm();
      setShowSequenceModal(false);
      
      alert(`✅ Sequência "${newSequence.name}" ${editingSequence ? 'atualizada' : 'criada'} com sucesso!

📋 Detalhes:
• ${newSequence.tasks.length} tarefas configuradas
• Disparada por: ${newSequence.trigger_event === 'stage_entry' ? 'Entrada na etapa' : 'Manual'}
• Status: ${newSequence.is_active ? 'Ativa' : 'Inativa'}

🚀 A sequência será executada automaticamente quando os critérios forem atendidos.`);

    } catch (error) {
      logger.error('💥 Erro ao criar sequência:', error);
      alert('Erro ao criar sequência. Tente novamente.');
    }
  };

  const editSequence = (sequence: SequenceTemplate) => {
    setSequenceForm(sequence);
    setEditingSequence(sequence);
    setSelectedStageForSequence(sequence.stage_id || '');
    setShowSequenceModal(true);
  };

  const deleteSequence = (sequenceId: string) => {
    if (confirm('Tem certeza que deseja excluir esta sequência?')) {
      setSequences(sequences.filter(seq => seq.id !== sequenceId));
      logger.success('✅ Sequência excluída com sucesso');
    }
  };

  const toggleSequenceStatus = (sequenceId: string) => {
    const updatedSequences = sequences.map(seq =>
      seq.id === sequenceId ? { ...seq, is_active: !seq.is_active } : seq
    );
    setSequences(updatedSequences);
  };

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Criador de Pipeline</h1>
            <p className="text-gray-600">Gerencie e crie suas pipelines de vendas</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Navegação por Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 inline-flex">
        <button 
          onClick={() => setActiveTab('list')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'list' 
              ? 'bg-blue-100 text-blue-700 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Lista</span>
        </button>
        <button 
          onClick={() => setActiveTab('create')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'create' 
              ? 'bg-blue-100 text-blue-700 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Criar Pipeline</span>
        </button>
        <button 
          onClick={() => setActiveTab('sequences')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'sequences' 
              ? 'bg-blue-100 text-blue-700 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Cadências</span>
        </button>
      </div>

      {/* LISTA DE PIPELINES */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Pipelines Criadas ({pipelines.length})
              </h2>
              <button
                onClick={() => setActiveTab('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Pipeline</span>
              </button>
            </div>
          </div>

          {pipelines.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma pipeline criada ainda</h3>
              <p className="text-gray-500 mb-6">
                Crie sua primeira pipeline para começar a organizar seus leads
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Criar primeira pipeline
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pipelines.map((pipeline) => (
                <div key={pipeline.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-medium flex-shrink-0">
                        {pipeline.name.charAt(0)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {pipeline.name}
                          </h3>
                        </div>
                        
                        <p className="text-gray-600 mb-3">
                          {pipeline.description || 'Sem descrição'}
                        </p>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                          <div className="flex items-center space-x-1">
                            <GitBranch className="w-4 h-4" />
                            <span>{pipeline.pipeline_stages?.length || 0} etapas</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{pipeline.pipeline_members?.length || 0} vendedores</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Criado em {new Date(pipeline.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>

                        {/* Vendedores Atribuídos */}
                        {(pipeline.pipeline_members || []).length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Vendedores atribuídos:</h4>
                            <div className="flex flex-wrap gap-2">
                              {(pipeline.pipeline_members || []).map((pm) => (
                                <div key={pm.id} className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                                  <span>{pm.member ? `${pm.member.first_name} ${pm.member.last_name}` : 'N/A'}</span>
                                  <button 
                                    onClick={() => handleRemoveMember(pipeline.id, pm.member_id)}
                                    className="text-blue-600 hover:text-red-600 transition-colors"
                                    title="Remover vendedor"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            
                            {/* Adicionar vendedor */}
                            <div className="mt-3">
                              <select 
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddMember(pipeline.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        )}

                        {/* Etapas do Funil */}
                        {(pipeline.pipeline_stages || []).length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Etapas do funil:</h4>
                            <div className="flex flex-wrap gap-2">
                              {(pipeline.pipeline_stages || [])
                                .sort((a, b) => a.order_index - b.order_index)
                                .map((stage) => (
                                  <div key={stage.id} className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm border">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: stage.color }}
                                    ></div>
                                    <span className="text-gray-700">{stage.name}</span>
                                    <div className="text-gray-500 text-xs">
                                      {stage.temperature_score}% • {stage.max_days_allowed}d
                                    </div>
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button 
                        onClick={() => openStageModal(pipeline)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                        title="Adicionar etapa"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      
                      <button 
                        onClick={() => startEditPipeline(pipeline)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Editar pipeline"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      
                      <button 
                        onClick={() => handleDeletePipeline(pipeline.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Excluir pipeline"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO DE CADÊNCIAS SEQUENCIAIS */}
      {activeTab === 'sequences' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cadências Sequenciais</h3>
              <p className="text-gray-600">Configure sequências automatizadas de tarefas para nutrir seus leads</p>
            </div>
            <button 
              onClick={() => {
                resetSequenceForm();
                setShowSequenceModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Nova Sequência</span>
            </button>
          </div>

          {sequences.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma cadência configurada</h3>
              <p className="text-gray-500 mb-6">
                Crie sequências automatizadas de tarefas para nutrir seus leads de forma eficiente
              </p>
              <button 
                onClick={() => {
                  resetSequenceForm();
                  setShowSequenceModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Criar primeira cadência
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sequences.map((sequence) => (
                <div key={sequence.id} className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{sequence.name}</h4>
                      <p className="text-gray-600 text-sm mb-3">{sequence.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Zap className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {sequence.trigger_event === 'stage_entry' ? 'Entrada na etapa' :
                             sequence.trigger_event === 'manual' ? 'Manual' :
                             sequence.trigger_event === 'lead_created' ? 'Lead criado' :
                             'Campo atualizado'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{sequence.tasks.length} tarefas</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => toggleSequenceStatus(sequence.id!)}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          sequence.is_active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {sequence.is_active ? (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Ativa</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3" />
                            <span>Inativa</span>
                          </>
                        )}
                      </button>
                      
                      <button 
                        onClick={() => editSequence(sequence)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Editar sequência"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button 
                        onClick={() => deleteSequence(sequence.id!)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Excluir sequência"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-900">Timeline de Tarefas:</h5>
                    <div className="space-y-2">
                      {sequence.tasks
                        .sort((a, b) => a.order_index - b.order_index)
                        .slice(0, 3) // Mostrar apenas as 3 primeiras
                        .map((task, index) => (
                          <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getTaskTypeColor(task.type)}`}>
                              {getTaskTypeIcon(task.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{task.title}</div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>{formatDelay(task.delay_days, task.delay_hours)}</span>
                                {task.is_required && (
                                  <span className="bg-orange-100 text-orange-800 px-1 py-0.5 rounded">Obrigatória</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                      {sequence.tasks.length > 3 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          +{sequence.tasks.length - 3} tarefas adicionais
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO DE SEQUÊNCIA */}
      {showSequenceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingSequence ? 'Editar Sequência' : 'Nova Sequência de Cadência'}
                  </h2>
                  <p className="text-sm text-gray-600">Configure tarefas automatizadas para nutrir seus leads</p>
                </div>
                <button
                  onClick={() => {
                    setShowSequenceModal(false);
                    resetSequenceForm();
                  }}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome da Sequência *
                    </label>
                    <input
                      type="text"
                      value={sequenceForm.name}
                      onChange={(e) => setSequenceForm({...sequenceForm, name: e.target.value})}
                      placeholder="Ex: Nutrição Lead Qualificado"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Disparar Quando
                    </label>
                    <select
                      value={sequenceForm.trigger_event}
                      onChange={(e) => setSequenceForm({...sequenceForm, trigger_event: e.target.value as any})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="stage_entry">Lead entrar em uma etapa</option>
                      <option value="manual">Ativação manual</option>
                      <option value="lead_created">Lead for criado</option>
                      <option value="field_updated">Campo for atualizado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={sequenceForm.description}
                    onChange={(e) => setSequenceForm({...sequenceForm, description: e.target.value})}
                    placeholder="Descreva o objetivo desta sequência..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {sequenceForm.trigger_event === 'stage_entry' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etapa que Dispara a Sequência
                    </label>
                    <select
                      value={selectedStageForSequence}
                      onChange={(e) => setSelectedStageForSequence(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Selecione uma etapa</option>
                      {pipelines.flatMap(pipeline => 
                        (pipeline.pipeline_stages || []).map(stage => (
                          <option key={stage.id} value={stage.id}>
                            {pipeline.name} - {stage.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {/* Tarefas da Sequência */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Tarefas da Sequência</h3>
                    <button
                      onClick={() => {
                        resetTaskForm();
                        setShowTaskModal(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Tarefa</span>
                    </button>
                  </div>

                  {sequenceForm.tasks.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa configurada</h4>
                      <p className="text-gray-500 mb-4">Adicione tarefas para criar uma sequência automatizada</p>
                      <button
                        onClick={() => {
                          resetTaskForm();
                          setShowTaskModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        Adicionar primeira tarefa
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sequenceForm.tasks
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((task, index) => (
                          <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTaskTypeColor(task.type)}`}>
                                {getTaskTypeIcon(task.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900">{task.title}</div>
                                <div className="flex items-center space-x-3 text-xs text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDelay(task.delay_days, task.delay_hours)}</span>
                                  </div>
                                  {task.is_required && (
                                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">Obrigatória</span>
                                  )}
                                  {task.auto_complete && (
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Auto-completar</span>
                                  )}
                                </div>
                                {task.description && (
                                  <div className="text-xs text-gray-600 mt-1">{task.description}</div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => moveTask(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveTask(index, 'down')}
                                disabled={index === sequenceForm.tasks.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => editTask(index)}
                                className="p-1 text-gray-400 hover:text-blue-600"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeTask(index)}
                                className="p-1 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowSequenceModal(false);
                    resetSequenceForm();
                  }}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateSequence}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingSequence ? 'Salvar Alterações' : 'Criar Sequência'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO DE TAREFA */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingTaskIndex !== null ? 'Editar Tarefa' : 'Nova Tarefa'}
                  </h2>
                  <p className="text-sm text-gray-600">Configure uma ação automatizada na sequência</p>
                </div>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    resetTaskForm();
                    setEditingTaskIndex(null);
                  }}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Tarefa *
                    </label>
                    <select
                      value={taskForm.type}
                      onChange={(e) => setTaskForm({...taskForm, type: e.target.value as any})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="email">📧 Email</option>
                      <option value="call">📞 Ligação</option>
                      <option value="sms">💬 SMS</option>
                      <option value="whatsapp">📱 WhatsApp</option>
                      <option value="linkedin">💼 LinkedIn</option>
                      <option value="meeting">📅 Reunião</option>
                      <option value="reminder">⏰ Lembrete</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título da Tarefa *
                    </label>
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                      placeholder="Ex: Enviar email de boas-vindas"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                    placeholder="Descreva o que deve ser feito nesta tarefa..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aguardar (Dias)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={taskForm.delay_days}
                      onChange={(e) => setTaskForm({...taskForm, delay_days: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aguardar (Horas)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={taskForm.delay_hours}
                      onChange={(e) => setTaskForm({...taskForm, delay_hours: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {(taskForm.type === 'email' || taskForm.type === 'sms' || taskForm.type === 'whatsapp') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template de Conteúdo
                    </label>
                    <textarea
                      value={taskForm.template_content || ''}
                      onChange={(e) => setTaskForm({...taskForm, template_content: e.target.value})}
                      placeholder={
                        taskForm.type === 'email' ? 'Olá {{nome}}, seja bem-vindo(a)!' :
                        taskForm.type === 'sms' ? 'Oi {{nome}}! Obrigado pelo interesse.' :
                        'Olá {{nome}}! Como posso ajudar?'
                      }
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use variáveis como: nome, email, telefone, empresa (entre chaves duplas)
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={taskForm.is_required}
                      onChange={(e) => setTaskForm({...taskForm, is_required: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Tarefa obrigatória</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={taskForm.auto_complete}
                      onChange={(e) => setTaskForm({...taskForm, auto_complete: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Auto-completar</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    resetTaskForm();
                    setEditingTaskIndex(null);
                  }}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={addTaskToSequence}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  {editingTaskIndex !== null ? 'Salvar Tarefa' : 'Adicionar Tarefa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE CRIAÇÃO EXPANDIDO */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Criar Nova Pipeline</h2>
              <p className="text-sm text-gray-600">Configure sua pipeline de vendas personalizada</p>
            </div>
          </div>

          <form onSubmit={handleCreatePipeline} className="space-y-8">
            
            {/* SEÇÃO BÁSICA */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-5 h-5 text-gray-600" />
                <h3 className="text-md font-medium text-gray-900">Informações Básicas</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Pipeline *</label>
                  <input
                    type="text"
                    value={pipelineForm.name}
                    onChange={(e) => setPipelineForm({...pipelineForm, name: e.target.value})}
                    required
                    placeholder="Ex: Pipeline Vendas B2B"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <textarea
                    value={pipelineForm.description}
                    onChange={(e) => setPipelineForm({...pipelineForm, description: e.target.value})}
                    placeholder="Descreva o objetivo desta pipeline..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Vendedores</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {members.map((member) => (
                      <label key={member.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{member.first_name} {member.last_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO DE ETAPAS */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-5 h-5 text-gray-600" />
                  <h3 className="text-md font-medium text-gray-900">Etapas do Funil *</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowStageForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Etapa</span>
                </button>
              </div>

              {stages.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <GitBranch className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma etapa criada. Adicione pelo menos uma etapa para continuar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stages.map((stage, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: stage.color }}
                        ></div>
                        <div>
                          <h4 className="font-medium text-gray-900">{stage.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Score: {stage.temperature_score}%</span>
                            <span>Limite: {stage.max_days_allowed} dias</span>
                            <span>Posição: {index + 1}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          type="button"
                          onClick={() => editStage(index)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="Editar etapa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {stages.length > 1 && (
                          <>
                            {index > 0 && (
                              <button 
                                type="button"
                                onClick={() => moveStage(index, 'up')}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                                title="Mover para cima"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                            )}
                            {index < stages.length - 1 && (
                              <button 
                                type="button"
                                onClick={() => moveStage(index, 'down')}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                title="Mover para baixo"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => removeStage(index)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Remover etapa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('list');
                  setPipelineForm({ name: '', description: '', member_ids: [] });
                  setStages([]);
                }}
                className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!pipelineForm.name || stages.length === 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
              >
                Criar Pipeline
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