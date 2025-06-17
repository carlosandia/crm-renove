import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { 
  Plus, Edit, Trash2, ArrowUp, ArrowDown, Play, Pause, Mail, Phone, 
  MessageSquare, Calendar, Clock, CheckCircle, AlertCircle, Zap, X,
  Building, Users, Target
} from 'lucide-react';

// ============================================
// INTERFACES PARA CADÊNCIAS SEQUENCIAIS
// ============================================

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
  pipeline_id?: string;
  trigger_event: 'stage_entry' | 'manual' | 'lead_created' | 'field_updated';
  is_active: boolean;
  tasks: SequenceTask[];
  created_at?: string;
  updated_at?: string;
}

interface Pipeline {
  id: string;
  name: string;
  pipeline_stages?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const SequenceModule: React.FC = () => {
  const { user } = useAuth();
  const [sequences, setSequences] = useState<SequenceTemplate[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados dos modais
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingSequence, setEditingSequence] = useState<SequenceTemplate | null>(null);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  
  // Estados dos formulários
  const [sequenceForm, setSequenceForm] = useState<SequenceTemplate>({
    name: '',
    description: '',
    trigger_event: 'stage_entry',
    is_active: true,
    tasks: []
  });
  
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

  const [selectedStageForSequence, setSelectedStageForSequence] = useState<string>('');
  const [selectedPipelineForSequence, setSelectedPipelineForSequence] = useState<string>('');

  // ============================================
  // EFEITOS E CARREGAMENTO DE DADOS
  // ============================================

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPipelines(),
        loadSequences()
      ]);
    } catch (error) {
      logger.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPipelines = async () => {
    try {
      const { data: pipelinesData, error } = await supabase
        .from('pipelines')
        .select(`
          id,
          name,
          pipeline_stages (
            id,
            name,
            color,
            order_index
          )
        `)
        .eq('tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPipelines(pipelinesData || []);
    } catch (error) {
      logger.error('Erro ao carregar pipelines:', error);
      // Dados mock para demonstração
      setPipelines([
        {
          id: 'pipeline-1',
          name: 'Pipeline de Vendas',
          pipeline_stages: [
            { id: 'stage-1', name: 'Novos Leads', color: '#3b82f6' },
            { id: 'stage-2', name: 'Qualificados', color: '#10b981' },
            { id: 'stage-3', name: 'Proposta Enviada', color: '#f59e0b' }
          ]
        }
      ]);
    }
  };

  const loadSequences = async () => {
    setLoading(true);
    try {
      // Dados simulados para demonstração
      const mockSequences: SequenceTemplate[] = [
        {
          id: 'seq-1',
          name: 'Nutrição Lead Qualificado',
          description: 'Sequência automatizada para leads que entram na etapa de qualificados',
          trigger_event: 'stage_entry',
          is_active: true,
          tasks: [
            {
              id: 'task-1',
              type: 'email',
              title: 'Email de Boas-vindas',
              description: 'Enviar email de boas-vindas personalizado',
              delay_days: 0,
              delay_hours: 0,
              template_content: 'Olá {{nome}}, obrigado pelo seu interesse!',
              is_required: true,
              auto_complete: true,
              order_index: 0
            },
            {
              id: 'task-2',
              type: 'call',
              title: 'Ligação de Qualificação',
              description: 'Ligar para qualificar o lead',
              delay_days: 1,
              delay_hours: 0,
              is_required: true,
              auto_complete: false,
              order_index: 1
            },
            {
              id: 'task-3',
              type: 'email',
              title: 'Envio de Proposta',
              description: 'Enviar proposta comercial',
              delay_days: 2,
              delay_hours: 0,
              template_content: 'Segue nossa proposta comercial.',
              is_required: false,
              auto_complete: false,
              order_index: 2
            }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setSequences(mockSequences);
    } catch (error) {
      logger.error('Erro ao carregar sequências:', error);
      setSequences([]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FUNÇÕES AUXILIARES
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

  const getTriggerEventLabel = (event: SequenceTemplate['trigger_event']) => {
    switch (event) {
      case 'stage_entry': return 'Entrada na etapa';
      case 'manual': return 'Ativação manual';
      case 'lead_created': return 'Lead criado';
      case 'field_updated': return 'Campo atualizado';
      default: return event;
    }
  };

  // ============================================
  // FUNÇÕES DE MANIPULAÇÃO DE SEQUÊNCIAS
  // ============================================

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
    setSelectedPipelineForSequence('');
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
      
      const newSequence: SequenceTemplate = {
        id: editingSequence?.id || `seq_${Date.now()}`,
        ...sequenceForm,
        pipeline_id: selectedPipelineForSequence || undefined,
        stage_id: selectedStageForSequence || undefined,
        created_at: editingSequence?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (editingSequence) {
        // Atualizar sequência existente
        const updatedSequences = sequences.map(seq => 
          seq.id === editingSequence.id ? newSequence : seq
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
• Disparada por: ${getTriggerEventLabel(newSequence.trigger_event)}
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
    setSelectedPipelineForSequence(sequence.pipeline_id || '');
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
  // FUNÇÕES DE MANIPULAÇÃO DE TAREFAS
  // ============================================

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

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
        <p className="text-gray-600">Apenas administradores podem acessar este módulo.</p>
      </div>
    );
  }

  const stats = {
    total_sequences: sequences.length,
    active_sequences: sequences.filter(s => s.is_active).length,
    total_tasks: sequences.reduce((total, seq) => total + seq.tasks.length, 0),
    pipelines_with_sequences: new Set(sequences.map(s => s.pipeline_id).filter(Boolean)).size
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_sequences}</div>
              <div className="text-sm text-gray-500">Sequências Criadas</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.active_sequences}</div>
              <div className="text-sm text-gray-500">Sequências Ativas</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_tasks}</div>
              <div className="text-sm text-gray-500">Tarefas Configuradas</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pipelines_with_sequences}</div>
              <div className="text-sm text-gray-500">Pipelines Automatizadas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Header com botão de ação */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cadências Sequenciais</h2>
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
      </div>

      {/* Lista de Sequências */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Sequências Configuradas ({sequences.length})
          </h2>
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
          <div className="divide-y divide-gray-200">
            {sequences.map((sequence) => (
              <div key={sequence.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{sequence.name}</h3>
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
                    </div>
                    
                    <p className="text-gray-600 mb-3">{sequence.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <Zap className="w-4 h-4" />
                        <span>{getTriggerEventLabel(sequence.trigger_event)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>{sequence.tasks.length} tarefas</span>
                      </div>
                      {sequence.pipeline_id && (
                        <div className="flex items-center space-x-1">
                          <Building className="w-4 h-4" />
                          <span>Pipeline configurada</span>
                        </div>
                      )}
                    </div>

                    {/* Preview das Tarefas */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Timeline de Tarefas:</h4>
                      <div className="flex space-x-2 overflow-x-auto pb-2">
                        {sequence.tasks
                          .sort((a, b) => a.order_index - b.order_index)
                          .slice(0, 4)
                          .map((task, index) => (
                            <div key={index} className="flex-shrink-0 flex items-center space-x-2 bg-gray-50 rounded-lg p-2 min-w-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getTaskTypeColor(task.type)}`}>
                                {getTaskTypeIcon(task.type)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-gray-900 truncate">{task.title}</div>
                                <div className="text-xs text-gray-500">{formatDelay(task.delay_days, task.delay_hours)}</div>
                              </div>
                            </div>
                          ))
                        }
                        {sequence.tasks.length > 4 && (
                          <div className="flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-lg p-2 text-xs text-gray-500">
                            +{sequence.tasks.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => editSequence(sequence)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Editar sequência"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => deleteSequence(sequence.id!)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Excluir sequência"
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

      {/* Modais aqui - vou adicionar em seguida */}
    </div>
  );
};

export default SequenceModule; 