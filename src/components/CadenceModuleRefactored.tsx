import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  GitBranch,
  Settings,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  Clock,
  Users,
  Eye,
  FileText,
  X,
  Trash2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { useArrayState } from '../hooks/useArrayState';
import { useAsyncState } from '../hooks/useAsyncState';

// Importar subcomponentes
import { TaskManager, CadenceTask } from './Cadence/tasks';
import { ChannelConfig, ChannelTemplate, ChannelSettings } from './Cadence/channels';

// ============================================
// INTERFACES PRINCIPAIS
// ============================================

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

interface CadenceConfig {
  id?: string;
  pipeline_id: string;
  stage_name: string;
  stage_order: number;
  tasks: CadenceTask[];
  is_active: boolean;
  pipeline?: Pipeline;
}

// ============================================
// COMPONENTE PRINCIPAL REFATORADO
// ============================================

const CadenceModuleRefactored: React.FC = () => {
  const { user } = useAuth();
  
  // Estados principais com hooks reutilizáveis
  const {
    items: pipelines,
    replaceAll: setPipelines,
    isEmpty: hasNoPipelines
  } = useArrayState<Pipeline>([]);

  const {
    items: cadenceConfigs,
    replaceAll: setCadenceConfigs,
    addItem: addCadenceConfig,
    removeItem: removeCadenceConfig,
    updateItem: updateCadenceConfig
  } = useArrayState<CadenceConfig>([]);

  const {
    loading,
    execute: executeAsync,
    error: asyncError,
    isIdle
  } = useAsyncState();

  // Estados específicos do componente
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'configs' | 'templates' | 'channels'>('configs');

  // Estados para subcomponentes
  const [templates, setTemplates] = useState<ChannelTemplate[]>([]);
  const [channelSettings, setChannelSettings] = useState<ChannelSettings[]>([]);

  // Estados do modal principal
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

  // ============================================
  // CARREGAMENTO DE DADOS INICIAIS
  // ============================================

  useEffect(() => {
    const initializeData = async () => {
      try {
        if (user?.tenant_id) {
          await Promise.all([
            loadPipelines(),
            loadCadenceConfigs(),
            loadTemplates(),
            loadChannelSettings()
          ]);
        }
      } catch (error: any) {
        console.error('💥 Erro na inicialização dos dados:', error);
        setError(`Erro na inicialização: ${error.message}`);
      }
    };

    initializeData();
  }, [user]);

  // ============================================
  // FUNÇÕES DE CARREGAMENTO
  // ============================================

  const loadPipelines = async () => {
    if (!user?.tenant_id) return;

    try {
      setError('');
      
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select(`
          *,
          pipeline_stages(*)
        `)
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (pipelinesError) {
        throw new Error(`Erro ao carregar pipelines: ${pipelinesError.message}`);
      }

      setPipelines(pipelinesData || []);
      console.log('✅ Pipelines carregadas:', pipelinesData?.length || 0);
    } catch (error: any) {
      console.error('❌ Erro ao carregar pipelines:', error);
      setError(`Erro ao carregar pipelines: ${error.message}`);
    }
  };

  const loadCadenceConfigs = async () => {
    if (!user?.tenant_id) return;

    try {
      const { data: configsData, error: configsError } = await supabase
        .from('cadence_config')
        .select(`
          *,
          cadence_tasks(*)
        `)
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (configsError) {
        throw new Error(`Erro ao carregar configurações: ${configsError.message}`);
      }

      // Transformar dados para o formato esperado
      const transformedConfigs = (configsData || []).map(config => ({
        ...config,
        tasks: config.cadence_tasks || []
      }));

      setCadenceConfigs(transformedConfigs);
      console.log('✅ Configurações carregadas:', transformedConfigs.length);
    } catch (error: any) {
      console.error('❌ Erro ao carregar configurações:', error);
      setError(`Erro ao carregar configurações: ${error.message}`);
    }
  };

  const loadTemplates = async () => {
    // Implementar carregamento de templates do banco
    setTemplates([]);
  };

  const loadChannelSettings = async () => {
    // Implementar carregamento de configurações de canal do banco
    setChannelSettings([]);
  };

  // ============================================
  // FUNÇÕES DE MANIPULAÇÃO
  // ============================================

  const saveCadenceConfig = async () => {
    if (!modalForm.pipeline_id || !modalForm.stage_name) {
      setError('Pipeline e etapa são obrigatórios');
      return;
    }

    try {
      // Salvar configuração principal
      const { data: configData, error: configError } = await supabase
        .from('cadence_config')
        .upsert({
          id: editingConfig?.id,
          pipeline_id: modalForm.pipeline_id,
          stage_name: modalForm.stage_name,
          stage_order: modalForm.stage_order,
          is_active: modalForm.is_active,
          tenant_id: user?.tenant_id,
          created_by: user?.email || 'system'
        })
        .select()
        .single();

      if (configError) {
        throw new Error(`Erro ao salvar configuração: ${configError.message}`);
      }

      // Salvar tarefas se houver
      if (modalForm.tasks.length > 0) {
        // Primeiro, deletar tarefas existentes se estiver editando
        if (editingConfig?.id) {
          await supabase
            .from('cadence_tasks')
            .delete()
            .eq('cadence_config_id', editingConfig.id);
        }

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
    }
  };

  const deleteCadenceConfig = async (configId: string) => {

    try {
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
    }
  };

  // ============================================
  // FUNÇÕES DE MODAL
  // ============================================

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

  // ============================================
  // FUNÇÕES DE CALLBACK PARA SUBCOMPONENTES
  // ============================================

  const handleTasksChange = (tasks: CadenceTask[]) => {
    setModalForm(prev => ({ ...prev, tasks }));
  };

  const handleTaskError = (error: string) => {
    setError(error);
  };

  const handleTemplatesChange = (newTemplates: ChannelTemplate[]) => {
    setTemplates(newTemplates);
  };

  const handleChannelSettingsChange = (newSettings: ChannelSettings[]) => {
    setChannelSettings(newSettings);
  };

  // ============================================
  // UTILITÁRIAS
  // ============================================

  const filteredConfigs = cadenceConfigs.filter(config => 
    !selectedPipeline || config.pipeline_id === selectedPipeline
  );

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
        <p className="text-gray-600 mb-6">{error}</p>
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

  // Se há erro crítico
  if (error && !success) {
    return <ErrorFallback error={error} />;
  }

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  try {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <GitBranch className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cadências de Vendas</h1>
                <p className="text-gray-600">Gerencie sequências automáticas de follow-up</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Cadência</span>
            </button>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
            <button
              onClick={() => setSuccess('')}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navegação por Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('configs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'configs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <GitBranch className="w-4 h-4 inline mr-2" />
                Configurações ({cadenceConfigs.length})
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'templates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Templates ({templates.length})
              </button>
              <button
                onClick={() => setActiveTab('channels')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'channels'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Canais ({channelSettings.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: Configurações de Cadência */}
            {activeTab === 'configs' && (
              <div className="space-y-6">
                {/* Filtros */}
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <select
                      value={selectedPipeline}
                      onChange={(e) => setSelectedPipeline(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Todas as pipelines</option>
                      {pipelines.map(pipeline => (
                        <option key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Lista de Configurações */}
                {filteredConfigs.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma cadência configurada
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Crie sua primeira cadência de vendas automatizada
                    </p>
                    <button
                      onClick={openCreateModal}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Criar Primeira Cadência
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredConfigs.map(config => (
                      <div key={config.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {config.pipeline?.name || 'Pipeline não encontrada'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Etapa: {config.stage_name}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
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
                              <Eye className="w-4 h-4" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir esta configuração de cadência? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCadenceConfig(config.id!)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        {/* Preview de Tarefas */}
                        {config.tasks.length > 0 && (
                          <div className="border-t border-gray-200 pt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                              {config.tasks.length} tarefa(s) configurada(s)
                            </h4>
                            <div className="space-y-2">
                              {config.tasks
                                .sort((a, b) => a.day_offset - b.day_offset)
                                .slice(0, 3)
                                .map((task, index) => (
                                  <div key={index} className="text-xs text-gray-600 bg-white p-2 rounded">
                                    D+{task.day_offset}: {task.task_title}
                                  </div>
                                ))}
                              {config.tasks.length > 3 && (
                                <div className="text-xs text-gray-500 text-center">
                                  +{config.tasks.length - 3} tarefas adicionais
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Templates */}
            {activeTab === 'templates' && (
              <ChannelConfig
                templates={templates}
                settings={channelSettings}
                onTemplatesChange={handleTemplatesChange}
                onSettingsChange={handleChannelSettingsChange}
                onError={setError}
                onSuccess={setSuccess}
              />
            )}

            {/* Tab: Canais */}
            {activeTab === 'channels' && (
              <ChannelConfig
                templates={templates}
                settings={channelSettings}
                onTemplatesChange={handleTemplatesChange}
                onSettingsChange={handleChannelSettingsChange}
                onError={setError}
                onSuccess={setSuccess}
              />
            )}
          </div>
        </div>

        {/* Modal de Configuração de Cadência */}
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

                      <div className="space-y-4">
                        {/* Seleção de Pipeline */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pipeline *
                          </label>
                          <select
                            value={modalForm.pipeline_id}
                            onChange={(e) => setModalForm(prev => ({ ...prev, pipeline_id: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Selecione uma pipeline</option>
                            {pipelines.map(pipeline => (
                              <option key={pipeline.id} value={pipeline.id}>
                                {pipeline.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Seleção de Etapa */}
                        {modalForm.pipeline_id && (
                          <div>
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
                    </div>
                  </div>

                  {/* Coluna Direita - Gerenciador de Tarefas */}
                  <div className="space-y-6">
                    <TaskManager
                      tasks={modalForm.tasks}
                      onTasksChange={handleTasksChange}
                      onError={handleTaskError}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {modalForm.tasks.length > 0 && (
                    <span>✅ {modalForm.tasks.length} tarefa(s) configurada(s)</span>
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

export default CadenceModuleRefactored;
