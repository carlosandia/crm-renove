// =====================================================================================
// COMPONENT: TopActivitiesDropdown (Nova Arquitetura)
// Autor: Claude (Arquiteto Sênior)
// Data: 2025-01-24
// Descrição: Dropdown das top 3 atividades pendentes conforme especificação
// AIDEV-NOTE: Ordenação por prioridade - vencidas primeiro, depois por data
// =====================================================================================

import React, { useState } from 'react';
import { 
  ChevronDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  Mail,
  Phone,
  MessageCircle,
  FileText,
  MapPin,
  Users,
  Video,
  X,
  MoreHorizontal
} from 'lucide-react';
import { useLeadTasksForCard } from '../../hooks/useLeadTasksForCard';
import type { CombinedActivityView } from '../../shared/types/cadenceTaskInstance';

// ===================================
// INTERFACES
// ===================================

interface TopActivitiesDropdownProps {
  leadId: string;
  maxItems?: number;
  onActivityAction?: (actionType: string, taskId: string, data?: any) => void;
  compact?: boolean;
  className?: string;
}

interface ActivityActionMenuProps {
  activity: CombinedActivityView;
  onAction: (actionType: string, data?: any) => void;
  onClose: () => void;
}

// ===================================
// UTILITÁRIOS
// ===================================

const getActivityIcon = (activityType: string, channel: string) => {
  switch (activityType) {
    case 'call':
      return <Phone className="w-4 h-4" />;
    case 'email':
      return <Mail className="w-4 h-4" />;
    case 'meeting':
      return channel === 'video_call' ? <Video className="w-4 h-4" /> : <Users className="w-4 h-4" />;
    case 'whatsapp':
      return <MessageCircle className="w-4 h-4" />;
    case 'note':
    case 'task':
      return <FileText className="w-4 h-4" />;
    case 'visit':
      return <MapPin className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getUrgencyColor = (activity: CombinedActivityView): string => {
  if (activity.is_overdue) {
    return 'text-red-600 bg-red-50 border-red-200';
  }
  
  const scheduledDate = new Date(activity.scheduled_at);
  const now = new Date();
  const hoursUntil = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntil <= 2) {
    return 'text-orange-600 bg-orange-50 border-orange-200';
  } else if (hoursUntil <= 24) {
    return 'text-amber-600 bg-amber-50 border-amber-200';
  }
  
  return 'text-blue-600 bg-blue-50 border-blue-200';
};

const formatActivityDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (diffHours < -24) {
    return `${Math.abs(Math.floor(diffHours / 24))}d atrás`;
  } else if (diffHours < -1) {
    return `${Math.abs(Math.floor(diffHours))}h atrás`;
  } else if (diffHours < 0) {
    return 'Vencida';
  } else if (diffHours < 1) {
    return 'Agora';
  } else if (diffHours < 24) {
    return `Em ${Math.floor(diffHours)}h`;
  } else {
    return `Em ${Math.floor(diffHours / 24)}d`;
  }
};

// ===================================
// COMPONENTE: MENU DE AÇÕES
// ===================================

const ActivityActionMenu: React.FC<ActivityActionMenuProps> = ({
  activity,
  onAction,
  onClose
}) => {
  return (
    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
      <div className="py-1">
        <button
          onClick={() => {
            onAction('complete', { 
              outcome: 'neutral',
              notes: 'Completada via dropdown'
            });
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 text-green-600" />
          Marcar como concluída
        </button>
        
        <button
          onClick={() => {
            const newDate = prompt('Nova data/hora (YYYY-MM-DD HH:mm):');
            if (newDate) {
              onAction('reschedule', { 
                newScheduledAt: new Date(newDate).toISOString(),
                reason: 'Reagendada via dropdown'
              });
            }
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <Calendar className="w-4 h-4 text-blue-600" />
          Reagendar
        </button>
        
        <button
          onClick={() => {
            const reason = prompt('Motivo para pular esta tarefa:');
            if (reason) {
              onAction('skip', { reason });
            }
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <X className="w-4 h-4 text-gray-600" />
          Pular tarefa
        </button>
      </div>
    </div>
  );
};

// ===================================
// COMPONENTE PRINCIPAL
// ===================================

export const TopActivitiesDropdown: React.FC<TopActivitiesDropdownProps> = ({
  leadId,
  maxItems = 3,
  onActivityAction,
  compact = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const { 
    tasks, 
    loading, 
    error, 
    pendingCount, 
    overdueCount,
    completeTask 
  } = useLeadTasksForCard(leadId);

  // Filtrar e ordenar top atividades
  const topActivities = React.useMemo(() => {
    if (!tasks) return [];

    return tasks
      .filter(task => task.status === 'pending')
      .sort((a, b) => {
        // Prioridade 1: Vencidas primeiro
        const aOverdue = a.is_overdue ? 1 : 0;
        const bOverdue = b.is_overdue ? 1 : 0;
        
        if (aOverdue !== bOverdue) {
          return bOverdue - aOverdue; // Vencidas primeiro
        }
        
        // Prioridade 2: Por data de agendamento
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      })
      .slice(0, maxItems);
  }, [tasks, maxItems]);

  // Handler para ações nas atividades
  const handleActivityAction = async (
    actionType: string, 
    taskId: string, 
    data?: any
  ) => {
    try {
      switch (actionType) {
        case 'complete':
          await completeTask(taskId, data?.notes);
          break;
        case 'reschedule':
          // TODO: Implementar reschedule via API
          console.log('Reschedule:', taskId, data);
          break;
        case 'skip':
          // TODO: Implementar skip via API
          console.log('Skip:', taskId, data);
          break;
      }
      
      // Callback externo
      if (onActivityAction) {
        onActivityAction(actionType, taskId, data);
      }
    } catch (error) {
      console.error('Erro ao executar ação:', error);
    }
  };

  // Badge do dropdown
  const getBadgeContent = () => {
    if (overdueCount > 0) {
      return {
        count: overdueCount,
        color: 'bg-red-500 text-white',
        title: `${overdueCount} atividade(s) vencida(s)`
      };
    }
    if (pendingCount > 0) {
      return {
        count: Math.min(pendingCount, maxItems),
        color: 'bg-amber-500 text-white',
        title: `${pendingCount} atividade(s) pendente(s)`
      };
    }
    return null;
  };

  const badgeContent = getBadgeContent();

  if (loading || error || topActivities.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Botão do dropdown */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        title="Ver próximas atividades"
      >
        <div className="relative">
          <Clock className="w-4 h-4" />
          {badgeContent && (
            <div className={`absolute -top-1 -right-1 min-w-[16px] h-4 ${badgeContent.color} rounded-full flex items-center justify-center text-xs font-bold`}>
              {badgeContent.count > 9 ? '9+' : badgeContent.count}
            </div>
          )}
        </div>
        
        {!compact && <span>Próximas</span>}
        
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown das atividades */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-40 max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <h4 className="font-medium text-gray-900 text-sm">
              Próximas Atividades
            </h4>
            <p className="text-xs text-gray-500">
              {overdueCount > 0 && `${overdueCount} vencida${overdueCount > 1 ? 's' : ''} • `}
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </p>
          </div>

          <div className="py-2">
            {topActivities.map((activity, index) => (
              <div
                key={activity.id}
                className={`px-3 py-3 hover:bg-gray-50 border-l-3 ${
                  activity.is_overdue ? 'border-red-400' : 'border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Ícone da atividade */}
                  <div className={`flex-shrink-0 p-2 rounded-lg border ${getUrgencyColor(activity)}`}>
                    {getActivityIcon(activity.activity_type, activity.channel)}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </h5>
                      
                      {/* Menu de ações */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === activity.id ? null : activity.id);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {activeMenuId === activity.id && (
                          <ActivityActionMenu
                            activity={activity}
                            onAction={(actionType, data) => handleActivityAction(actionType, activity.id, data)}
                            onClose={() => setActiveMenuId(null)}
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        {activity.is_overdue && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        {formatActivityDate(activity.scheduled_at)}
                      </span>
                      
                      {!activity.is_manual_activity && (
                        <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          D+{activity.day_offset}
                        </span>
                      )}
                      
                      {activity.is_manual_activity && (
                        <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                          Manual
                        </span>
                      )}
                    </div>
                    
                    {activity.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé com link para ver todas */}
          <div className="p-2 border-t border-gray-100 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Abrir modal de timeline completa
                console.log('Abrir timeline completa para:', leadId);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todas as atividades →
            </button>
          </div>
        </div>
      )}

      {/* Overlay para fechar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setIsOpen(false);
            setActiveMenuId(null);
          }}
        />
      )}
    </div>
  );
};

export default TopActivitiesDropdown;