// ✅ MIGRAÇÃO CONCLUÍDA: Sistema usando autenticação básica Supabase
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { createPortal } from 'react-dom';
import { 
  CheckCircle, 
  ClipboardList, 
  MessageCircle, 
  Mail, 
  Phone, 
  AlertCircle,
  RotateCcw,
  Plus,
  Trash2
} from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import ActivityGroupHeader from './ActivityGroupHeader';
import CustomActivityModal from './CustomActivityModal';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  channel: 'email' | 'whatsapp' | 'phone' | 'task';
  scheduled_at: string;
  is_overdue: boolean;
  stage_name?: string;
  day_offset?: number;
}

interface TaskGroup {
  stageName: string;
  tasks: Task[];
  pendingCount: number;
  completedCount: number;
  stageIndex: number;
  stageColor: string;
}

interface TasksDropdownProps {
  tasks: Task[];
  tasksLoading: boolean;
  tasksPending: number;
  tasksOverdue: number;
  isGeneratingTasks: boolean;
  completeTask: (taskId: string, notes?: string) => Promise<boolean>;
  deleteTask?: (taskId: string) => Promise<boolean>; // ✅ NOVO: Função para deletar tarefa
  forceRefreshCache: () => void;
  leadId: string; // Necessário para criar atividades personalizadas
  pipelineId?: string; // ✅ NOVO: Necessário para AddManualActivityModal
  leadName?: string; // ✅ NOVO: Nome do lead para exibição no modal
  progressBadge: {
    text: string;
    color: string;
    title: string;
    onClick?: (e: React.MouseEvent) => void;
  };
}

export const TasksDropdown: React.FC<TasksDropdownProps> = ({
  tasks,
  tasksLoading,
  tasksPending,
  tasksOverdue,
  isGeneratingTasks,
  completeTask,
  deleteTask,
  forceRefreshCache,
  leadId,
  pipelineId,
  leadName,
  progressBadge
}) => {
  const [showTasksDropdown, setShowTasksDropdown] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showCustomActivityModal, setShowCustomActivityModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null); // ✅ NOVO: Controle de confirmação de exclusão

  // Calcular posição do dropdown
  const calculateDropdownPosition = useCallback(() => {
    if (!badgeRef.current) return;
    
    const badgeRect = badgeRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dropdownWidth = 320; // w-80 = 320px
    const dropdownMaxHeight = 400;
    
    let top = badgeRect.bottom + 4; // mt-1 = 4px
    let left = badgeRect.right - dropdownWidth; // right-aligned
    
    // Ajustar se sair da viewport
    if (left < 8) left = 8;
    if (left + dropdownWidth > viewportWidth - 8) {
      left = viewportWidth - dropdownWidth - 8;
    }
    
    // Se não couber abaixo, posicionar acima
    if (top + dropdownMaxHeight > viewportHeight - 8) {
      top = badgeRect.top - dropdownMaxHeight - 4;
      if (top < 8) {
        top = Math.max(8, (viewportHeight - dropdownMaxHeight) / 2);
      }
    }
    
    setDropdownPosition({ top, left });
  }, []);

  // Recalcular posição quando dropdown abre
  useEffect(() => {
    if (showTasksDropdown) {
      calculateDropdownPosition();
      
      const handleResize = () => calculateDropdownPosition();
      window.addEventListener('resize', handleResize);
      
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [showTasksDropdown, calculateDropdownPosition]);

  // Definir cores por etapa
  const stageColors = {
    'Lead': 'border-l-blue-300',
    'teste13': 'border-l-green-300', 
    'teste33': 'border-l-amber-300',
    'teste44': 'border-l-purple-300',
    'Ganho': 'border-l-emerald-300',
    'Perdido': 'border-l-red-300',
    'Personalizada': 'border-l-pink-300',
    'default': 'border-l-gray-300'
  } as const;

  // Agrupar tasks por stage_name
  const taskGroups = useMemo((): TaskGroup[] => {
    if (!tasks || tasks.length === 0) return [];

    const groups = new Map<string, Task[]>();
    
    // Agrupar por stage_name
    tasks.forEach(task => {
      const stageName = task.stage_name || 'Sem Etapa';
      if (!groups.has(stageName)) {
        groups.set(stageName, []);
      }
      groups.get(stageName)!.push(task);
    });

    // Converter para array e ordenar
    const groupsArray = Array.from(groups.entries()).map(([stageName, groupTasks], index) => {
      const pendingCount = groupTasks.filter(t => t.status === 'pending').length;
      const completedCount = groupTasks.filter(t => t.status === 'completed').length;
      
      return {
        stageName,
        tasks: groupTasks.sort((a, b) => {
          // Ordenar por day_offset, depois por scheduled_at
          if (a.day_offset !== b.day_offset) {
            return (a.day_offset || 0) - (b.day_offset || 0);
          }
          return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
        }),
        pendingCount,
        completedCount,
        stageIndex: index + 1,
        stageColor: stageColors[stageName as keyof typeof stageColors] || stageColors.default
      };
    });

    // Ordenar grupos por ordem lógica (Lead primeiro, depois outros)
    return groupsArray.sort((a, b) => {
      const order = ['Lead', 'teste13', 'teste33', 'teste44', 'Ganho', 'Perdido'];
      const aIndex = order.indexOf(a.stageName);
      const bIndex = order.indexOf(b.stageName);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.stageName.localeCompare(b.stageName);
    });
  }, [tasks]);

  // ✅ CORREÇÃO: Expansão automática apenas na primeira vez, depois permite minimizar tudo
  useEffect(() => {
    // Só expandir na primeira renderização se não há estado salvo
    if (taskGroups.length > 0 && expandedGroups.size === 0) {
      const groupsWithPending = taskGroups
        .filter(group => group.pendingCount > 0)
        .map(group => group.stageName);
      
      // Se há grupos com pendentes, expandir apenas eles
      if (groupsWithPending.length > 0) {
        setExpandedGroups(new Set(groupsWithPending));
      }
      // ✅ CORREÇÃO: Remover fallback que forçava expansão do primeiro grupo
      // Agora permite começar sem nenhum grupo expandido
    }
  }, [taskGroups.length]); // ✅ CORREÇÃO: Dependência apenas do length para evitar loops

  const toggleGroup = useCallback((stageName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageName)) {
        newSet.delete(stageName);
      } else {
        newSet.add(stageName);
      }
      return newSet;
    });
  }, []);


  // ✅ NOVO: Função para confirmar exclusão de tarefa
  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!deleteTask) {
      console.warn('⚠️ Função deleteTask não foi fornecida');
      return;
    }

    try {
      console.log('🗑️ Deletando tarefa:', taskId.substring(0, 8));
      const success = await deleteTask(taskId);
      
      if (success) {
        forceRefreshCache();
        console.log('✅ Tarefa deletada com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro ao deletar tarefa:', error);
    } finally {
      setTaskToDelete(null); // Limpar confirmação
    }
  }, [deleteTask, forceRefreshCache]);

  // ✅ CORREÇÃO: Hook de autenticação segura
  const { user } = useAuth();

  // ✅ NOVO: Handler para salvar atividade personalizada
  const handleSaveCustomActivity = useCallback(async (activity: any) => {
    try {
      // ✅ CORREÇÃO: Usar autenticação básica Supabase diretamente via API
      // AIDEV-NOTE: Migração para padrão básico - usar fetch direto com autenticação manual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      const response = await fetch('/api/activities/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          lead_id: leadId,
          pipeline_id: pipelineId,
          title: activity.title,
          channel: activity.channel,
          scheduled_at: activity.scheduled_at,
          description: activity.description || '',
          status: 'pending'
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao criar atividade personalizada');
      }

      console.log('✅ Atividade personalizada criada com sucesso');
      
      // Atualizar cache
      forceRefreshCache();
      
    } catch (error) {
      console.error('❌ Erro ao salvar atividade personalizada:', error);
      throw error;
    }
  }, [leadId, pipelineId, forceRefreshCache]);

  // ✅ DEBUG REMOVIDO: Logs eliminados para evitar spam no console
  // TasksDropdown agora funciona sem logs de debug desnecessários

  return (
    <div className="flex-shrink-0 relative overflow-hidden">
      <div
        ref={badgeRef}
        className={`px-1.5 py-0.5 rounded-full text-[10px] font-normal cursor-pointer transition-all overflow-hidden ${progressBadge.color}`}
        title={progressBadge.title}
        onClick={(e) => {
          e.stopPropagation();
          
          // Se tem onClick customizado, executar ao invés de abrir dropdown
          if (progressBadge.onClick) {
            progressBadge.onClick(e);
            return;
          }
          
          // Comportamento padrão: abrir/fechar dropdown
          if (!showTasksDropdown) {
            calculateDropdownPosition();
          }
          setShowTasksDropdown(!showTasksDropdown);
        }}
      >
        {progressBadge.text}
      </div>
      
      {/* Dropdown de tarefas quando clicado - USANDO PORTAL */}
      {showTasksDropdown && createPortal(
        <>
          <style>{`
            .tasks-dropdown-content::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div 
            className="fixed w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[32rem] overflow-hidden flex flex-col"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
            role="menu"
            aria-label="Lista de tarefas e atividades"
          >
            <div 
              className="p-3 border-b border-gray-100 flex justify-between items-start flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation(); // ✅ CORREÇÃO: Impedir propagação para não abrir LeadDetailsModal
              }}
            >
              <div>
                <h4 className="font-medium text-gray-900 text-sm cursor-default">
                  Tarefas & Atividades
                </h4>
                <p className="text-xs text-gray-500 cursor-default">
                  {tasksPending} pendente(s) • {tasksOverdue} vencida(s)
                </p>
              </div>
              {/* Debug: Botão temporário para forçar refresh */}
              {import.meta.env.DEV && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    forceRefreshCache();
                  }}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                  title="Debug: Forçar refresh do cache"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* ✅ CORREÇÃO: Conteúdo principal scrollável, altura fixa */}
            <div 
              className="flex-1 overflow-y-auto tasks-dropdown-content" 
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                maxHeight: '24rem', // Reduzir altura para dar espaço ao footer
              }}
            >
              {tasksLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-500">Carregando...</span>
                </div>
              ) : taskGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <ClipboardList className="h-8 w-8 text-gray-300 mb-2" />
                  <span className="text-sm text-gray-500 mb-1">Nenhuma atividade encontrada</span>
                  <span className="text-xs text-gray-400">Use o botão abaixo para criar uma nova</span>
                </div>
              ) : (
                // ✅ CORREÇÃO: Sempre mostrar headers das categorias, independente do estado expandido
                <div className="divide-y divide-gray-100">
                  {taskGroups.map((group) => (
                    <Collapsible.Root
                      key={group.stageName}
                      open={expandedGroups.has(group.stageName)}
                      onOpenChange={() => toggleGroup(group.stageName)}
                    >
                      <ActivityGroupHeader
                        stageName={group.stageName}
                        totalTasks={group.tasks.length}
                        pendingTasks={group.pendingCount}
                        completedTasks={group.completedCount}
                        isExpanded={expandedGroups.has(group.stageName)}
                        onToggle={() => toggleGroup(group.stageName)}
                        stageColor={group.stageColor}
                        stageIndex={group.stageIndex}
                      />
                      
                      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down">
                        <div className="bg-gray-25">
                          {group.tasks.map((task, index) => (
                            <div
                              key={`task-${task.id}-${index}`}
                              className={`group/task flex items-start gap-3 px-4 py-2.5 ml-6 hover:bg-white transition-colors border-l-2 border-transparent hover:${group.stageColor.replace('border-l-', 'border-l-').replace('-300', '-200')}`}
                            >
                              {/* Checkbox/Status */}
                              <div className="flex-shrink-0 mt-0.5">
                                {task.status === 'completed' ? (
                                  <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center">
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </div>
                                ) : (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await completeTask(task.id, '');
                                    }}
                                    className="w-4 h-4 border-2 border-gray-300 rounded hover:border-green-500 transition-colors"
                                    title="Marcar como concluída"
                                  />
                                )}
                              </div>

                              {/* Conteúdo da tarefa */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`flex items-center gap-1 ${
                                    task.is_overdue ? 'text-red-600' :
                                    task.status === 'completed' ? 'text-green-600' :
                                    'text-amber-600'
                                  }`}>
                                    {task.channel === 'email' && <Mail className="w-3 h-3" />}
                                    {task.channel === 'whatsapp' && <MessageCircle className="w-3 h-3" />}
                                    {task.channel === 'phone' && <Phone className="w-3 h-3" />}
                                    {task.channel === 'task' && <ClipboardList className="w-3 h-3" />}
                                    {task.is_overdue && <AlertCircle className="w-3 h-3" />}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {new Date(task.scheduled_at).toLocaleDateString('pt-BR')}
                                  </span>
                                  {task.day_offset !== undefined && (
                                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                      D+{task.day_offset}
                                    </span>
                                  )}
                                </div>
                                
                                <p className={`text-sm leading-tight ${
                                  task.status === 'completed' 
                                    ? 'text-gray-500 line-through' 
                                    : 'text-gray-900'
                                }`}>
                                  {task.title}
                                </p>
                              </div>

                              {/* ✅ NOVO: Botão de deletar (aparece no hover) */}
                              {deleteTask && (
                                <div className="flex-shrink-0 ml-auto opacity-0 group-hover/task:opacity-100 transition-opacity">
                                  {taskToDelete === task.id ? (
                                    // Confirmação de exclusão
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTask(task.id);
                                        }}
                                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                        title="Confirmar exclusão"
                                      >
                                        Sim
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTaskToDelete(null);
                                        }}
                                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                        title="Cancelar"
                                      >
                                        Não
                                      </button>
                                    </div>
                                  ) : (
                                    // Botão de delete normal
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTaskToDelete(task.id);
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                      title="Excluir tarefa"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </Collapsible.Content>
                    </Collapsible.Root>
                  ))}
                  
                  {/* ✅ NOVO: Mensagem sutil quando nenhuma categoria está expandida */}
                  {expandedGroups.size === 0 && (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <span className="text-xs text-gray-400 italic">
                        Clique em qualquer categoria acima para ver as atividades
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ✅ CORREÇÃO: Footer fixo separado - sempre visível mesmo quando tudo minimizado */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCustomActivityModal(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 bg-white hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300 shadow-sm"
              >
                <Plus className="h-3 w-3" />
                Nova Atividade
              </button>
            </div>

            {/* Contador removido - dropdown agora é ilimitado */}
          </div>
          
          {/* Overlay para fechar dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setShowTasksDropdown(false);
            }}
          />
        </>,
        document.body
      )}

      {/* Modal de atividade personalizada */}
      <CustomActivityModal
        isOpen={showCustomActivityModal}
        onClose={() => setShowCustomActivityModal(false)}
        onSave={handleSaveCustomActivity}
        leadId={leadId}
      />
    </div>
  );
};

export default TasksDropdown;