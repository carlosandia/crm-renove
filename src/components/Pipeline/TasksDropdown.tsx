import React, { useState, useMemo, useCallback } from 'react';
import { 
  ClipboardList,
  Check,
  Clock,
  AlertCircle,
  Mail,
  MessageCircle,
  Phone,
  Smartphone,
  MapPin,
  Calendar,
  ChevronDown,
  Loader2,
  Minus,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
// AIDEV-NOTE: Migrar para nova arquitetura baseada em cadence_task_instances
import { useLeadTasksForCard } from '../../hooks/useLeadTasksForCard';
import type { CombinedActivityView } from '../../shared/types/cadenceTaskInstance';

interface TasksDropdownProps {
  leadId: string;
  onTaskCompleted?: () => void;
}

/**
 * Dropdown de tarefas para o LeadCard
 * Exibe lista de tarefas pendentes e concluídas com funcionalidade de checkbox
 */
export const TasksDropdown: React.FC<TasksDropdownProps> = ({ 
  leadId, 
  onTaskCompleted 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  
  const { 
    tasks, 
    loading, 
    pendingCount, 
    overdueCount, 
    completeTask 
  } = useLeadTasksForCard(leadId);

  // Função memoizada para obter ícone do canal
  const getChannelIcon = useCallback((canal: string) => {
    switch (canal) {
      case 'email': return <Mail className="w-3 h-3" aria-label="Email" />;
      case 'whatsapp': return <MessageCircle className="w-3 h-3" aria-label="WhatsApp" />;
      case 'ligacao': return <Phone className="w-3 h-3" aria-label="Ligação" />;
      case 'sms': return <Smartphone className="w-3 h-3" aria-label="SMS" />;
      case 'tarefa': return <ClipboardList className="w-3 h-3" aria-label="Tarefa" />;
      case 'visita': return <MapPin className="w-3 h-3" aria-label="Visita" />;
      default: return <Clock className="w-3 h-3" aria-label="Outros" />;
    }
  }, []);

  // AIDEV-NOTE: Função memoizada para cores de status
  const getStatusColor = useCallback((task: CombinedActivityView): string => {
    if (task.is_overdue) return 'text-red-600';
    if (task.status === 'completed') return 'text-green-600';
    if (task.status === 'skipped') return 'text-gray-500';
    return 'text-amber-600';
  }, []);

  // Função memoizada para marcar tarefa como concluída
  const handleCompleteTask = useCallback(async (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    setCompletingTaskId(taskId);
    const success = await completeTask(taskId, '');
    
    if (success) {
      onTaskCompleted?.();
    }
    
    setCompletingTaskId(null);
  }, [completeTask, onTaskCompleted]);

  // AIDEV-NOTE: Função memoizada de formatação de data
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays === -1) return 'Ontem';
    if (diffDays < 0) return `${Math.abs(diffDays)}d atrás`;
    return `Em ${diffDays}d`;
  }, []);

  // Badge de contador memoizado
  const getBadgeContent = useMemo(() => {
    if (overdueCount > 0) {
      return {
        count: overdueCount,
        color: 'bg-red-500 text-white',
        title: `${overdueCount} tarefa(s) vencida(s)`
      };
    }
    if (pendingCount > 0) {
      return {
        count: pendingCount,
        color: 'bg-amber-500 text-white',
        title: `${pendingCount} tarefa(s) pendente(s)`
      };
    }
    return null;
  }, [overdueCount, pendingCount]);

  const badgeContent = getBadgeContent;

  return (
    <div className="relative">
      {/* Botão do dropdown */}
      <div
        className="flex items-center cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={badgeContent?.title || 'Ver tarefas'}
        role="button"
        aria-label={badgeContent?.title || 'Ver tarefas'}
        aria-expanded={isOpen}
        aria-haspopup="true"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="relative">
          <ClipboardList 
            className={`h-4 w-4 transition-colors ${
              overdueCount > 0 
                ? 'text-red-500 hover:text-red-600' 
                : pendingCount > 0 
                  ? 'text-amber-500 hover:text-amber-600'
                  : 'text-gray-400 hover:text-gray-600'
            }`}
          />
          
          {/* Badge de contador */}
          {badgeContent && (
            <div 
              className={`absolute -top-1 -right-1 min-w-[16px] h-4 ${badgeContent.color} rounded-full flex items-center justify-center text-xs font-bold leading-none`}
            >
              {badgeContent.count > 9 ? '9+' : badgeContent.count}
            </div>
          )}
        </div>
        
        <ChevronDown 
          className={`h-3 w-3 ml-1 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Dropdown de tarefas */}
      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          role="menu"
          aria-label="Lista de tarefas e atividades"
        >
          <div className="p-3 border-b border-gray-100">
            <h4 className="font-medium text-gray-900 text-sm">
              Tarefas & Atividades
            </h4>
            <p className="text-xs text-gray-500">
              {pendingCount} pendente(s) • {overdueCount} vencida(s)
            </p>
          </div>

          <div className="py-2">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Carregando...</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex items-center justify-center py-4" role="status" aria-label="Nenhuma tarefa encontrada">
                <ClipboardList className="h-4 w-4 text-gray-300" aria-hidden="true" />
                <span className="ml-2 text-sm text-gray-500">Nenhuma tarefa</span>
              </div>
            ) : (
              tasks.slice(0, 10).map((task, index) => {
                const isCompleting = completingTaskId === task.id;
                
                return (
                  <div
                    key={`task-${task.id}-${index}`}
                    className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 border-l-2 border-transparent hover:border-blue-200"
                    role="menuitem"
                    aria-label={`Tarefa: ${task.title}`}
                  >
                    {/* Checkbox/Status */}
                    <div className="flex-shrink-0 mt-0.5">
                      {task.status === 'completed' ? (
                        <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      ) : task.status === 'skipped' ? (
                        <div className="w-4 h-4 bg-gray-400 rounded flex items-center justify-center">
                          <Minus className="w-3 h-3 text-white" />
                        </div>
                      ) : isCompleting ? (
                        <div className="w-4 h-4 border-2 border-gray-300 rounded flex items-center justify-center">
                          <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleCompleteTask(task.id, e)}
                          className="w-4 h-4 border-2 border-gray-300 rounded hover:border-green-500 transition-colors"
                          title="Marcar como concluída"
                          aria-label={`Marcar tarefa "${task.title}" como concluída`}
                          type="button"
                        />
                      )}
                    </div>

                    {/* Conteúdo da tarefa */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`flex items-center gap-1 ${getStatusColor(task)}`}>
                          {getChannelIcon(task.channel)}
                          {task.is_overdue && <AlertCircle className="w-3 h-3" />}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(task.scheduled_at)}
                        </span>
                        {/* AIDEV-NOTE: Badge para identificar origem */}
                        <span className={`text-xs px-1 py-0.5 rounded ${
                          task.is_manual_activity 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {task.is_manual_activity ? 'Manual' : `D+${task.day_offset}`}
                        </span>
                      </div>
                      
                      <p className={`text-sm leading-tight ${
                        task.status === 'completed' 
                          ? 'text-gray-500 line-through' 
                          : task.status === 'skipped'
                          ? 'text-gray-400 line-through'
                          : 'text-gray-900'
                      }`}>
                        {task.title}
                      </p>
                      
                      {task.execution_notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          "{task.execution_notes}"
                        </p>
                      )}
                      
                      {/* AIDEV-NOTE: Mostrar outcome se disponível */}
                      {task.outcome && (
                        <div className={`text-xs mt-1 flex items-center gap-1 ${
                          task.outcome === 'positive' ? 'text-green-600' :
                          task.outcome === 'negative' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {task.outcome === 'positive' && <ThumbsUp className="w-3 h-3" />}
                          {task.outcome === 'negative' && <ThumbsDown className="w-3 h-3" />}
                          {task.outcome === 'neutral' && <Minus className="w-3 h-3" />}
                          <span className="capitalize">{task.outcome}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {tasks.length > 10 && (
            <div className="p-2 border-t border-gray-100 text-center">
              <span className="text-xs text-gray-500">
                +{tasks.length - 10} tarefas adicionais
              </span>
            </div>
          )}
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};