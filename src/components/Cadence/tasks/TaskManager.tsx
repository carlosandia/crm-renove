import React, { useState, useCallback } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  Mail,
  MessageCircle,
  Phone,
  FileText,
  Calendar,
  Target,
  Users
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
} from '../../ui/alert-dialog';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface CadenceTask {
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

export interface TaskManagerProps {
  tasks: CadenceTask[];
  onTasksChange: (tasks: CadenceTask[]) => void;
  onError?: (error: string) => void;
}

// ============================================
// CONSTANTES PARA CONFIGURAÇÃO DE CANAIS E AÇÕES
// ============================================

export const CHANNEL_OPTIONS = [
  { value: 'email', label: '📧 E-mail', icon: Mail },
  { value: 'whatsapp', label: '📱 WhatsApp', icon: MessageCircle },
  { value: 'ligacao', label: '📞 Ligação', icon: Phone },
  { value: 'sms', label: '💬 SMS', icon: MessageCircle },
  { value: 'tarefa', label: '📋 Tarefa', icon: FileText },
  { value: 'visita', label: '🏢 Visita', icon: Users },
];

export const ACTION_TYPE_OPTIONS = [
  { value: 'mensagem', label: '💬 Enviar Mensagem', icon: MessageCircle },
  { value: 'ligacao', label: '📞 Fazer Ligação', icon: Phone },
  { value: 'tarefa', label: '📋 Criar Tarefa', icon: FileText },
  { value: 'email_followup', label: '📧 Follow-up Email', icon: Mail },
  { value: 'agendamento', label: '📅 Agendar Reunião', icon: Calendar },
  { value: 'proposta', label: '📝 Enviar Proposta', icon: Target },
];

// ============================================
// HOOK PERSONALIZADO
// ============================================

export const useTaskManager = ({ tasks, onTasksChange, onError }: TaskManagerProps) => {
  // Estados do formulário de tarefa
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
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

  // ============================================
  // FUNÇÕES DE GERENCIAMENTO DE TAREFAS
  // ============================================

  const resetTaskForm = useCallback(() => {
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
  }, []);

  const openTaskForm = useCallback((taskIndex: number | null = null) => {
    if (taskIndex !== null) {
      setTaskForm(tasks[taskIndex]);
      setEditingTaskIndex(taskIndex);
    } else {
      resetTaskForm();
    }
    setShowTaskForm(true);
  }, [tasks, resetTaskForm]);

  const closeTaskForm = useCallback(() => {
    setShowTaskForm(false);
    setEditingTaskIndex(null);
    resetTaskForm();
  }, [resetTaskForm]);

  const saveTask = useCallback(() => {
    if (!taskForm.task_title.trim()) {
      onError?.('Título da tarefa é obrigatório');
      return;
    }

    const updatedTasks = [...tasks];
    
    if (editingTaskIndex !== null) {
      updatedTasks[editingTaskIndex] = taskForm;
    } else {
      updatedTasks.push(taskForm);
    }

    onTasksChange(updatedTasks);
    closeTaskForm();
  }, [taskForm, tasks, editingTaskIndex, onTasksChange, closeTaskForm, onError]);

  const deleteTask = useCallback((taskIndex: number) => {
    setTaskToDelete(taskIndex);
  }, []);

  const confirmDeleteTask = useCallback(() => {
    if (taskToDelete !== null) {
      const updatedTasks = tasks.filter((_, index) => index !== taskToDelete);
      onTasksChange(updatedTasks);
      setTaskToDelete(null);
    }
  }, [taskToDelete, tasks, onTasksChange]);

  const getTasksStats = useCallback(() => {
    const totalTasks = tasks.length;
    const activeTasks = tasks.filter(t => t.is_active).length;
    const channels = new Set(tasks.map(t => t.channel));
    const maxDayOffset = Math.max(...tasks.map(t => t.day_offset), 0);
    
    return {
      totalTasks,
      activeTasks,
      inactiveTasks: totalTasks - activeTasks,
      uniqueChannels: channels.size,
      totalDuration: maxDayOffset
    };
  }, [tasks]);

  return {
    showTaskForm,
    editingTaskIndex,
    taskToDelete,
    setTaskToDelete,
    taskForm,
    setTaskForm,
    openTaskForm,
    closeTaskForm,
    saveTask,
    deleteTask,
    confirmDeleteTask,
    resetTaskForm,
    getTasksStats
  };
};

// ============================================
// COMPONENTE WRAPPER
// ============================================

export const TaskManager: React.FC<TaskManagerProps> = (props) => {
  const {
    showTaskForm,
    editingTaskIndex,
    taskToDelete,
    setTaskToDelete,
    taskForm,
    setTaskForm,
    openTaskForm,
    closeTaskForm,
    saveTask,
    deleteTask,
    confirmDeleteTask,
    getTasksStats
  } = useTaskManager(props);
  
  const stats = getTasksStats();

  const TaskForm = () => (
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
            Título da Tarefa *
          </label>
          <input
            type="text"
            value={taskForm.task_title}
            onChange={(e) => setTaskForm(prev => ({ ...prev, task_title: e.target.value }))}
            placeholder="Ex: Enviar email de boas-vindas"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição da Tarefa
          </label>
          <textarea
            value={taskForm.task_description}
            onChange={(e) => setTaskForm(prev => ({ ...prev, task_description: e.target.value }))}
            placeholder="Descreva em detalhes o que deve ser feito nesta tarefa"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>

        {(taskForm.channel === 'email' || taskForm.channel === 'whatsapp' || taskForm.channel === 'sms') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template de Conteúdo
            </label>
            <textarea
              value={taskForm.template_content || ''}
              onChange={(e) => setTaskForm(prev => ({ ...prev, template_content: e.target.value }))}
              placeholder="Digite o conteúdo da mensagem que será enviada..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
            />
          </div>
        )}

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
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-yellow-200">
        <button
          onClick={closeTaskForm}
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
  );

  return (
    <div className="space-y-6">
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-green-900 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Tarefas da Cadência ({stats.totalTasks})
          </h3>
          {!showTaskForm && props.tasks.length > 0 && (
            <button
              onClick={() => openTaskForm()}
              className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Tarefa
            </button>
          )}
        </div>

        {/* Estatísticas */}
        {stats.totalTasks > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-3 bg-white rounded-lg border border-green-200">
            <div className="text-center">
              <div className="text-lg font-bold text-green-700">{stats.totalTasks}</div>
              <div className="text-xs text-green-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-700">{stats.activeTasks}</div>
              <div className="text-xs text-green-600">Ativas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-700">{stats.uniqueChannels}</div>
              <div className="text-xs text-green-600">Canais</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-700">{stats.totalDuration}d</div>
              <div className="text-xs text-green-600">Duração</div>
            </div>
          </div>
        )}

        {/* Formulário de Nova Tarefa */}
        {showTaskForm && <TaskForm />}

        {/* Lista de Tarefas ou Estado Vazio */}
        {props.tasks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-green-300 rounded-lg">
            <Clock className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-green-700 font-medium mb-2">Nenhuma tarefa configurada</p>
            <p className="text-green-600 text-sm mb-4">
              Adicione tarefas para criar sua sequência automática
            </p>
            <button
              onClick={() => openTaskForm()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Primeira Tarefa
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {props.tasks
              .sort((a, b) => a.day_offset - b.day_offset || a.task_order - b.task_order)
              .map((task, index) => {
                const channelOption = CHANNEL_OPTIONS.find(c => c.value === task.channel);
                const actionOption = ACTION_TYPE_OPTIONS.find(a => a.value === task.action_type);
                const originalIndex = props.tasks.findIndex(t => t === task);
                
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
                          {!task.is_active && (
                            <div className="text-xs text-red-500 mt-1 font-medium">
                              Tarefa inativa
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => openTaskForm(originalIndex)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Editar tarefa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Excluir tarefa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTask(originalIndex)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskManager;
