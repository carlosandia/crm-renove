import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiRequest, API_CONFIG } from '../config/api';
import { 
  Plus, 
  Edit, 
  Trash2, 
  PlayCircle, 
  Clock, 
  Users, 
  GitBranch,
  Mail,
  MessageCircle,
  Phone,
  FileText,
  Calendar,
  Target,
  Eye,
  Settings,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

// Interfaces
interface Pipeline {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  pipeline_stages?: PipelineStage[];
}

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  color: string;
}

interface CadenceTask {
  id?: string;
  day_offset: number;
  task_order: number;
  channel: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  action_type: 'mensagem' | 'ligacao' | 'tarefa' | 'email_followup' | 'agendamento' | 'proposta';
  task_title: string;
  task_description: string;
  template_content?: string;
  is_active: boolean;
}

interface CadenceConfig {
  id?: string;
  pipeline_id: string;
  stage_name: string;
  stage_order: number;
  tasks: CadenceTask[];
  is_active: boolean;
  pipeline?: Pipeline;
}

// Constantes
const CHANNEL_OPTIONS = [
  { value: 'email', label: '📧 E-mail', icon: Mail },
  { value: 'whatsapp', label: '📱 WhatsApp', icon: MessageCircle },
  { value: 'ligacao', label: '📞 Ligação', icon: Phone },
  { value: 'sms', label: '💬 SMS', icon: MessageCircle },
  { value: 'tarefa', label: '📋 Tarefa', icon: FileText },
  { value: 'visita', label: '🏢 Visita', icon: Users },
];

const ACTION_TYPE_OPTIONS = [
  { value: 'mensagem', label: '💬 Enviar Mensagem', icon: MessageCircle },
  { value: 'ligacao', label: '📞 Fazer Ligação', icon: Phone },
  { value: 'tarefa', label: '📋 Criar Tarefa', icon: FileText },
  { value: 'email_followup', label: '📧 Follow-up Email', icon: Mail },
  { value: 'agendamento', label: '📅 Agendar Reunião', icon: Calendar },
  { value: 'proposta', label: '📝 Enviar Proposta', icon: Target },
];

const CadenceModule: React.FC = () => {
  const { user } = useAuth();
  
  // Estados principais
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [cadenceConfigs, setCadenceConfigs] = useState<CadenceConfig[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Estados do modal
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CadenceConfig | null>(null);
  const [modalForm, setModalForm] = useState<{
    pipeline_id: string;
    stage_name: string;
    stage_order: number;
    tasks: CadenceTask[];
    is_active: boolean;
  }>({
    pipeline_id: '',
    stage_name: '',
    stage_order: 0,
    tasks: [],
    is_active: true
  });

  // Estados para o formulário de tarefa inline
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState<CadenceTask>({
    day_offset: 0,
    task_order: 1,
    channel: 'email',
    action_type: 'mensagem',
    task_title: '',
    task_description: '',
    template_content: '',
    is_active: true
  });

  // Verificar se está em modo desenvolvimento
  const isDevelopment = import.meta.env.DEV;

  // Carregar dados iniciais com proteção de erro
  useEffect(() => {
    const initializeData = async () => {
      try {
        if (user?.tenant_id) {
          await Promise.all([
            loadPipelines(),
            loadCadenceConfigs()
          ]);
        }
      } catch (error: any) {
        console.error('💥 Erro na inicialização dos dados:', error);
        setError(`Erro na inicialização: ${error.message}`);
      }
    };

    initializeData();
  }, [user]);

  // Atualizar configurações quando pipelines forem carregadas
  useEffect(() => {
    if (pipelines.length > 0 && cadenceConfigs.length > 0) {
      console.log('🔄 [DEBUG] Atualizando configurações com dados das pipelines');
      
      const updatedConfigs = cadenceConfigs.map(config => ({
        ...config,
        pipeline: pipelines.find(p => p.id === config.pipeline_id)
      }));
      
      // Só atualizar se realmente mudou algo
      const hasChanges = updatedConfigs.some((config, index) => 
        config.pipeline !== cadenceConfigs[index]?.pipeline
      );
      
      if (hasChanges) {
        setCadenceConfigs(updatedConfigs);
      }
    }
  }, [pipelines.length]); // Usar apenas o length para evitar loop

  // Carregar pipelines do usuário
  const loadPipelines = async () => {
    if (!user?.tenant_id) {
      console.warn('Usuário ou tenant_id não encontrado');
      return;
    }

    try {
      setLoading(true);
      setError(''); // Limpar erros anteriores
      
      console.log('🔍 Carregando pipelines para tenant:', user.tenant_id);
      
      // Primeiro, carregar as pipelines
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('id, name, description, created_at')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (pipelinesError) {
        console.error('❌ Erro ao carregar pipelines:', pipelinesError);
        throw pipelinesError;
      }

      console.log('📊 Pipelines encontradas:', pipelinesData?.length || 0);

      if (!pipelinesData || pipelinesData.length === 0) {
        console.log('⚠️ Nenhuma pipeline encontrada para o tenant:', user.tenant_id);
        
        // Em desenvolvimento, tentar buscar todas as pipelines para debug
        if (isDevelopment) {
          console.log('🔧 Modo desenvolvimento: tentando buscar todas as pipelines...');
          
          const { data: allPipelines, error: allError } = await supabase
            .from('pipelines')
            .select('id, name, description, created_at, tenant_id')
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (!allError && allPipelines?.length > 0) {
            console.log('🔍 Total de pipelines no banco:', allPipelines.length);
            console.log('🏢 Tenants encontrados:', [...new Set(allPipelines.map(p => p.tenant_id))]);
            
            // Usar a primeira pipeline encontrada para teste
            const testPipeline = allPipelines[0];
            console.log('🧪 Usando pipeline de teste:', testPipeline);
            
            setPipelines([{
              id: testPipeline.id,
              name: `${testPipeline.name} (DEBUG)`,
              description: testPipeline.description,
              created_at: testPipeline.created_at,
              pipeline_stages: []
            }]);
            
            setSuccess(`Modo debug: ${allPipelines.length} pipelines encontradas no banco`);
            return;
          }
        }
        
        setPipelines([]);
        setError('Nenhuma pipeline encontrada. Crie uma pipeline primeiro.');
        return;
      }

      // Depois, carregar as etapas das pipelines
      const pipelineIds = pipelinesData.map(p => p.id);
      console.log('🔗 Carregando etapas para pipelines:', pipelineIds);
      
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id, name, order_index, color, pipeline_id')
        .in('pipeline_id', pipelineIds)
        .order('order_index', { ascending: true });

      if (stagesError) {
        console.warn('⚠️ Erro ao carregar etapas das pipelines:', stagesError);
        // Não falhar se não conseguir carregar as etapas
      }

      console.log('📋 Etapas encontradas:', stagesData?.length || 0);

      // Combinar pipelines com suas etapas
      const pipelinesWithStages: Pipeline[] = pipelinesData.map(pipeline => ({
        ...pipeline,
        pipeline_stages: stagesData?.filter(stage => stage.pipeline_id === pipeline.id) || []
      }));

      console.log('✅ Pipelines processadas:', pipelinesWithStages.length);
      console.log('📊 Primeira pipeline:', pipelinesWithStages[0]);

      setPipelines(pipelinesWithStages);
      
      if (pipelinesWithStages.length > 0) {
        setSuccess(`${pipelinesWithStages.length} pipeline(s) carregada(s) com sucesso`);
      }

    } catch (error: any) {
      console.error('💥 Erro geral ao carregar pipelines:', error);
      setError(`Erro ao carregar pipelines: ${error.message || 'Erro desconhecido'}`);
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar configurações de cadência
  const loadCadenceConfigs = async () => {
    if (!user?.tenant_id) return;

    try {
      console.log('🔍 [DEBUG] Carregando cadências para tenant:', user.tenant_id);
      
      // Buscar configurações
      const { data: configs, error: configError } = await supabase
        .from('cadence_config')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });
      
      console.log('📊 [DEBUG] Configurações encontradas:', configs?.length || 0, configs);

      if (configError) throw configError;

      if (!configs || configs.length === 0) {
        setCadenceConfigs([]);
        return;
      }

      // Buscar todas as tarefas para essas configurações
      const configIds = configs.map(c => c.id);
      const { data: tasks, error: tasksError } = await supabase
        .from('cadence_tasks')
        .select('*')
        .in('cadence_config_id', configIds)
        .order('day_offset', { ascending: true })
        .order('task_order', { ascending: true });

      if (tasksError) throw tasksError;

      // Processar dados - associar tarefas às configurações
      const configsWithTasks: CadenceConfig[] = configs.map(config => ({
        id: config.id,
        pipeline_id: config.pipeline_id,
        stage_name: config.stage_name,
        stage_order: config.stage_order,
        tasks: (tasks || [])
          .filter(task => task.cadence_config_id === config.id)
          .map(task => ({
            id: task.id,
            day_offset: task.day_offset,
            task_order: task.task_order,
            channel: task.channel,
            action_type: task.action_type,
            task_title: task.task_title,
            task_description: task.task_description,
            template_content: task.template_content,
            is_active: task.is_active
          })),
        is_active: config.is_active,
        pipeline: undefined // Será definido após carregar pipelines
      }));

      console.log('✅ [DEBUG] Configurações processadas:', configsWithTasks.length);
      setCadenceConfigs(configsWithTasks);
    } catch (error: any) {
      setError(`Erro ao carregar configurações: ${error.message}`);
    }
  };

  // Salvar configuração de cadência
  const saveCadenceConfig = async () => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      setError('');

      // Primeiro, remover configurações existentes para esta pipeline/etapa
      const { error: deleteError } = await supabase
        .from('cadence_config')
        .delete()
        .eq('pipeline_id', modalForm.pipeline_id)
        .eq('stage_name', modalForm.stage_name)
        .eq('tenant_id', user.tenant_id);

      if (deleteError) {
        throw new Error(`Erro ao remover configuração existente: ${deleteError.message}`);
      }

      // Se não há tarefas, ainda salvamos a configuração (pode adicionar tarefas depois)
      // if (modalForm.tasks.length === 0) {
      //   setSuccess('Configuração removida com sucesso!');
      //   setShowModal(false);
      //   resetModalForm();
      //   loadCadenceConfigs();
      //   return;
      // }

      // Inserir nova configuração
      console.log('💾 [DEBUG] Salvando configuração:', {
        pipeline_id: modalForm.pipeline_id,
        stage_name: modalForm.stage_name,
        stage_order: modalForm.stage_order,
        is_active: modalForm.is_active,
        tenant_id: user.tenant_id,
        created_by: user.email || 'system'
      });
      
      const { data: configData, error: configError } = await supabase
        .from('cadence_config')
        .insert({
          pipeline_id: modalForm.pipeline_id,
          stage_name: modalForm.stage_name,
          stage_order: modalForm.stage_order,
          is_active: modalForm.is_active,
          tenant_id: user.tenant_id,
          created_by: user.email || 'system'
        })
        .select()
        .single();
      
      console.log('✅ [DEBUG] Configuração salva:', configData);

      if (configError) {
        throw new Error(`Erro ao salvar configuração: ${configError.message}`);
      }

      // Inserir tarefas da configuração (se houver)
      if (modalForm.tasks.length > 0) {
        const tasksToInsert = modalForm.tasks.map(task => ({
          cadence_config_id: configData.id,
          day_offset: task.day_offset,
          task_order: task.task_order,
          channel: task.channel,
          action_type: task.action_type,
          task_title: task.task_title,
          task_description: task.task_description,
          template_content: task.template_content,
          is_active: task.is_active
        }));

        const { error: tasksError } = await supabase
          .from('cadence_tasks')
          .insert(tasksToInsert);

        if (tasksError) {
          throw new Error(`Erro ao salvar tarefas: ${tasksError.message}`);
        }
      }

      setSuccess('Configuração de cadência salva com sucesso!');
      setShowModal(false);
      resetModalForm();
      loadCadenceConfigs();
    } catch (error: any) {
      setError(`Erro ao salvar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Deletar configuração
  const deleteCadenceConfig = async (configId: string, pipelineId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta configuração de cadência?')) return;

    try {
      setLoading(true);
      
      // Deletar configuração (as tarefas serão deletadas automaticamente por CASCADE)
      const { error } = await supabase
        .from('cadence_config')
        .delete()
        .eq('id', configId)
        .eq('tenant_id', user?.tenant_id || '');

      if (error) {
        throw new Error(`Erro ao deletar configuração: ${error.message}`);
      }

      setSuccess('Configuração deletada com sucesso!');
      loadCadenceConfigs();
    } catch (error: any) {
      setError(`Erro ao deletar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Funções do modal
  const openCreateModal = () => {
    resetModalForm();
    setEditingConfig(null);
    setShowModal(true);
  };

  const openEditModal = (config: CadenceConfig) => {
    setModalForm({
      pipeline_id: config.pipeline_id,
      stage_name: config.stage_name,
      stage_order: config.stage_order,
      tasks: config.tasks,
      is_active: config.is_active
    });
    setEditingConfig(config);
    setShowModal(true);
  };

  const resetModalForm = () => {
    setModalForm({
      pipeline_id: '',
      stage_name: '',
      stage_order: 0,
      tasks: [],
      is_active: true
    });
  };

  // Funções de tarefa
  const openTaskForm = (taskIndex: number | null = null) => {
    if (taskIndex !== null) {
      setTaskForm(modalForm.tasks[taskIndex]);
      setEditingTaskIndex(taskIndex);
    } else {
      setTaskForm({
        day_offset: 0,
        task_order: 1,
        channel: 'email',
        action_type: 'mensagem',
        task_title: '',
        task_description: '',
        template_content: '',
        is_active: true
      });
      setEditingTaskIndex(null);
    }
    setShowTaskForm(true);
  };

  const saveTask = () => {
    if (!taskForm.task_title.trim()) {
      setError('Título da tarefa é obrigatório');
      return;
    }

    const updatedTasks = [...modalForm.tasks];
    
    if (editingTaskIndex !== null) {
      updatedTasks[editingTaskIndex] = taskForm;
    } else {
      updatedTasks.push(taskForm);
    }

    setModalForm(prev => ({ ...prev, tasks: updatedTasks }));
    setShowTaskForm(false);
    setEditingTaskIndex(null);
  };

  const deleteTask = (taskIndex: number) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      const updatedTasks = modalForm.tasks.filter((_, index) => index !== taskIndex);
      setModalForm(prev => ({ ...prev, tasks: updatedTasks }));
    }
  };

  // Filtrar configurações por pipeline selecionada
  const filteredConfigs = cadenceConfigs.filter(config => 
    !selectedPipeline || config.pipeline_id === selectedPipeline
  );

  // Debug log para entender o problema
  console.log('🔍 [DEBUG] Estado atual:', {
    cadenceConfigs: cadenceConfigs.length,
    filteredConfigs: filteredConfigs.length,
    selectedPipeline,
    configs: cadenceConfigs
  });

  // Componente de fallback para erros críticos
  const ErrorFallback = ({ error }: { error: string }) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Erro no Módulo Cadências
        </h2>
        <p className="text-gray-600 mb-6">
          {error}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Recarregar Página
          </button>
          <button
            onClick={() => setError('')}
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    </div>
  );

  // Se não há usuário autenticado
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se há erro crítico que impede o funcionamento
  const criticalErrors = [
    'ReferenceError',
    'TypeError: Cannot read',
    'process is not defined',
    'Uncaught'
  ];

  if (error && criticalErrors.some(critical => error.includes(critical))) {
    return <ErrorFallback error={error} />;
  }

  // Renderização principal protegida
  try {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <PlayCircle className="w-8 h-8 mr-3 text-blue-600" />
              Cadências Automáticas
            </h1>
            <p className="text-gray-600 mt-1">
              Configure sequências automáticas de tarefas para seus leads ({pipelines.length} pipelines encontradas)
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadPipelines}
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center disabled:opacity-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              {loading ? 'Carregando...' : 'Recarregar Pipelines'}
            </button>
            {isDevelopment && (
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    console.log('🔧 Executando debug: carregando todas as pipelines...');
                    
                    const { data: allPipelines, error } = await supabase
                      .from('pipelines')
                      .select('id, name, description, created_at, tenant_id')
                      .order('created_at', { ascending: false });
                    
                    if (error) throw error;
                    
                    console.log('🔍 Debug: pipelines encontradas:', allPipelines?.length || 0);
                    
                    const pipelinesWithStages = allPipelines?.map(p => ({
                      ...p,
                      name: `${p.name} (${p.tenant_id.substring(0, 8)}...)`,
                      pipeline_stages: []
                    })) || [];
                    
                    setPipelines(pipelinesWithStages);
                    setSuccess(`Carregadas ${pipelinesWithStages.length} pipelines (modo debug)`);
                  } catch (error: any) {
                    console.error('❌ Erro no modo debug:', error);
                    setError(`Erro no modo debug: ${error.message}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center disabled:opacity-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Debug: Todas as Pipelines
              </button>
            )}
            <button
              onClick={openCreateModal}
              disabled={pipelines.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Cadência
            </button>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-700">{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Debug Info - Remover em produção */}
        {isDevelopment && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">🔍 Debug Info:</h4>
            <div className="text-xs text-yellow-700 space-y-1">
              <div>Tenant ID: {user?.tenant_id || 'N/A'}</div>
              <div>Pipelines carregadas: {pipelines.length}</div>
              <div>Configurações carregadas: {cadenceConfigs.length}</div>
              <div>Configurações filtradas: {filteredConfigs.length}</div>
              <div>Pipeline selecionada: {selectedPipeline || 'Todas'}</div>
              <div>Loading: {loading ? 'Sim' : 'Não'}</div>
              {pipelines.length > 0 && (
                <div>
                  Pipelines: {pipelines.map(p => `${p.name} (${p.pipeline_stages?.length || 0} etapas)`).join(', ')}
                </div>
              )}
              {cadenceConfigs.length > 0 && (
                <div>
                  Cadências: {cadenceConfigs.map(c => `${c.stage_name} (${c.tasks.length} tarefas)`).join(', ')}
                </div>
              )}
              {error && <div className="text-red-600">Erro: {error}</div>}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Pipeline
              </label>
              <select
                value={selectedPipeline}
                onChange={(e) => setSelectedPipeline(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas as Pipelines</option>
                {pipelines.map(pipeline => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500">
              {filteredConfigs.length} configuração(ões) encontrada(s)
            </div>
          </div>
        </div>

        {/* Lista de Configurações */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Carregando configurações...</p>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma cadência configurada
              </h3>
              <p className="text-gray-500 mb-4">
                Comece criando sua primeira configuração de cadência
              </p>
              <button
                onClick={openCreateModal}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Criar Primeira Cadência
              </button>
            </div>
          ) : (
            filteredConfigs.map(config => {
              const pipeline = pipelines.find(p => p.id === config.pipeline_id);
              return (
                <div key={config.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <GitBranch className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {pipeline?.name || 'Pipeline não encontrada'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Etapa: {config.stage_name} • {config.tasks.length} tarefa(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        config.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {config.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                      <button
                        onClick={() => openEditModal(config)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCadenceConfig(config.id!, config.pipeline_id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Timeline de Tarefas */}
                  {config.tasks.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Timeline de Tarefas:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {config.tasks
                          .sort((a, b) => a.day_offset - b.day_offset || a.task_order - b.task_order)
                          .map((task, index) => {
                            const channelOption = CHANNEL_OPTIONS.find(c => c.value === task.channel);
                            const actionOption = ACTION_TYPE_OPTIONS.find(a => a.value === task.action_type);
                            return (
                              <div key={index} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center space-x-2 mb-2">
                                  <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                                    D+{task.day_offset}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {channelOption?.label}
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-gray-900 mb-1">
                                  {task.task_title}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {actionOption?.label}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal de Configuração */}
        {/* Modal Principal - Design Unificado */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingConfig ? 'Editar Cadência' : 'Nova Cadência'}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure a pipeline, etapa e sequência de tarefas automáticas
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                  {/* Coluna Esquerda - Configurações Básicas */}
                  <div className="space-y-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        Configurações da Cadência
                      </h3>

                      {/* Seleção de Pipeline */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pipeline * 
                          <span className="text-xs text-gray-500 ml-2">
                            ({pipelines.length} pipelines encontradas)
                          </span>
                        </label>
                        <select
                          value={modalForm.pipeline_id}
                          onChange={(e) => setModalForm(prev => ({ ...prev, pipeline_id: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">
                            {pipelines.length === 0 ? 'Nenhuma pipeline encontrada' : 'Selecione uma pipeline'}
                          </option>
                          {pipelines.map(pipeline => (
                            <option key={pipeline.id} value={pipeline.id}>
                              {pipeline.name} ({pipeline.pipeline_stages?.length || 0} etapas)
                            </option>
                          ))}
                        </select>
                        {pipelines.length === 0 && (
                          <p className="text-sm text-red-600 mt-1">
                            Nenhuma pipeline encontrada. Crie uma pipeline primeiro no "Criador de Pipeline".
                          </p>
                        )}
                      </div>

                      {/* Seleção de Etapa */}
                      {modalForm.pipeline_id && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Etapa *
                          </label>
                          <select
                            value={modalForm.stage_name}
                            onChange={(e) => {
                              const selectedStage = pipelines
                                .find(p => p.id === modalForm.pipeline_id)
                                ?.pipeline_stages?.find(s => s.name === e.target.value);
                              setModalForm(prev => ({ 
                                ...prev, 
                                stage_name: e.target.value,
                                stage_order: selectedStage?.order_index || 0
                              }));
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Selecione uma etapa</option>
                            {pipelines
                              .find(p => p.id === modalForm.pipeline_id)
                              ?.pipeline_stages?.map(stage => (
                                <option key={stage.id} value={stage.name}>
                                  {stage.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {/* Status */}
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={modalForm.is_active}
                            onChange={(e) => setModalForm(prev => ({ ...prev, is_active: e.target.checked }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Cadência ativa</span>
                        </label>
                      </div>
                    </div>

                    {/* Formulário de Nova Tarefa */}
                    {showTaskForm && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="text-lg font-medium text-yellow-900 mb-4 flex items-center">
                          <Plus className="w-5 h-5 mr-2" />
                          {editingTaskIndex !== null ? 'Editar Tarefa' : 'Nova Tarefa'}
                        </h4>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dias de Atraso *
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={taskForm.day_offset}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, day_offset: parseInt(e.target.value) || 0 }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ordem no Dia
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={taskForm.task_order}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, task_order: parseInt(e.target.value) || 1 }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Título da Tarefa *
                            </label>
                            <input
                              type="text"
                              value={taskForm.task_title}
                              onChange={(e) => setTaskForm(prev => ({ ...prev, task_title: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Ex: Enviar e-mail de boas-vindas"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Canal *
                              </label>
                              <select
                                value={taskForm.channel}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, channel: e.target.value as CadenceTask['channel'] }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {CHANNEL_OPTIONS.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Ação *
                              </label>
                              <select
                                value={taskForm.action_type}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, action_type: e.target.value as CadenceTask['action_type'] }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {ACTION_TYPE_OPTIONS.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Descrição
                            </label>
                            <textarea
                              value={taskForm.task_description}
                              onChange={(e) => setTaskForm(prev => ({ ...prev, task_description: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={2}
                              placeholder="Descreva o que deve ser feito..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Template de Conteúdo
                            </label>
                            <textarea
                              value={taskForm.template_content}
                              onChange={(e) => setTaskForm(prev => ({ ...prev, template_content: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                              placeholder="Template da mensagem/email (use {{nome}} para personalizar)..."
                            />
                          </div>

                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={taskForm.is_active}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, is_active: e.target.checked }))}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Tarefa ativa</span>
                            </label>
                          </div>

                          <div className="flex justify-end space-x-3 pt-4 border-t border-yellow-200">
                            <button
                              onClick={() => {
                                setShowTaskForm(false);
                                setEditingTaskIndex(null);
                              }}
                              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={saveTask}
                              disabled={!taskForm.task_title.trim()}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {editingTaskIndex !== null ? 'Atualizar Tarefa' : 'Adicionar Tarefa'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coluna Direita - Lista de Tarefas */}
                  <div className="space-y-6">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-green-900 flex items-center">
                          <Clock className="w-5 h-5 mr-2" />
                          Tarefas da Cadência ({modalForm.tasks.length})
                        </h3>
                        {!showTaskForm && (
                          <button
                            onClick={() => {
                              setTaskForm({
                                day_offset: 0,
                                task_order: 1,
                                channel: 'email',
                                action_type: 'mensagem',
                                task_title: '',
                                task_description: '',
                                template_content: '',
                                is_active: true
                              });
                              setEditingTaskIndex(null);
                              setShowTaskForm(true);
                            }}
                            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar Tarefa
                          </button>
                        )}
                      </div>

                      {modalForm.tasks.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-green-300 rounded-lg">
                          <Clock className="w-12 h-12 text-green-400 mx-auto mb-4" />
                          <p className="text-green-700 font-medium mb-2">Nenhuma tarefa configurada</p>
                          <p className="text-green-600 text-sm mb-4">
                            Adicione tarefas para criar sua sequência automática
                          </p>
                          {!showTaskForm && (
                            <button
                              onClick={() => {
                                setTaskForm({
                                  day_offset: 0,
                                  task_order: 1,
                                  channel: 'email',
                                  action_type: 'mensagem',
                                  task_title: '',
                                  task_description: '',
                                  template_content: '',
                                  is_active: true
                                });
                                setEditingTaskIndex(null);
                                setShowTaskForm(true);
                              }}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Plus className="w-4 h-4 inline mr-2" />
                              Primeira Tarefa
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {modalForm.tasks
                            .sort((a, b) => a.day_offset - b.day_offset || a.task_order - b.task_order)
                            .map((task, index) => {
                              const channelOption = CHANNEL_OPTIONS.find(c => c.value === task.channel);
                              const actionOption = ACTION_TYPE_OPTIONS.find(a => a.value === task.action_type);
                              return (
                                <div key={index} className="bg-white border border-green-200 rounded-lg p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3 flex-1">
                                      <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-medium whitespace-nowrap">
                                        D+{task.day_offset}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate">{task.task_title}</div>
                                        <div className="text-sm text-gray-500 mt-1">
                                          {channelOption?.label} • {actionOption?.label}
                                        </div>
                                        {task.task_description && (
                                          <div className="text-xs text-gray-400 mt-2 line-clamp-2">
                                            {task.task_description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                      <button
                                        onClick={() => {
                                          setTaskForm(task);
                                          setEditingTaskIndex(index);
                                          setShowTaskForm(true);
                                        }}
                                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Editar tarefa"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => deleteTask(index)}
                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                        title="Excluir tarefa"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {modalForm.tasks.length > 0 && (
                    <span>
                      ✅ {modalForm.tasks.length} tarefa(s) configurada(s)
                    </span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveCadenceConfig}
                    disabled={loading || !modalForm.pipeline_id || !modalForm.stage_name}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Salvar Cadência
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error: any) {
    console.error('💥 Erro ao renderizar o componente:', error);
    return <ErrorFallback error={error.message || 'Erro ao renderizar o componente'} />;
  }
};

export default CadenceModule;