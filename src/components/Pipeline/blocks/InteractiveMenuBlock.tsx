// =====================================================================================
// COMPONENT: InteractiveMenuBlock
// Autor: Claude (Arquiteto Sênior)  
// Descrição: Bloco 2 - Menu Interativo com conteúdo dinâmico
// =====================================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { AlertCircle, PlayCircle, Mail, MessageCircle, ThumbsUp, Calendar, Clock, CheckCircle, XCircle, Phone, MapPin, FileText, Activity, User, ThumbsDown, FolderOpen, ChevronRight, Check, Trash2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { useQueryClient } from '@tanstack/react-query';
import { Lead } from '../../../types/Pipeline';
import { useAuth } from '../../../providers/AuthProvider';
import { formatDate, getChannelColor, formatTaskDate, getTaskStatusInfo } from '../../../utils/leadDetailsUtils';
import { EnhancedGoogleCalendarTab } from '../../meetings/EnhancedGoogleCalendarTab';
import { useLeadTasksForCard } from '../../../hooks/useLeadTasksForCard';
import type { CombinedActivityView } from '../../../shared/types/cadenceTaskInstance';
import DocumentsTab from '../tabs/DocumentsTab';
import { AnnotationsTab } from '../../Annotations/AnnotationsTab';
import SimpleEmailForm from '../../Leads/SimpleEmailForm';

interface LeadTask {
  id: string;
  lead_id: string;
  pipeline_id: string;
  etapa_id: string;
  descricao: string;
  canal: 'email' | 'whatsapp' | 'ligacao' | 'sms' | 'tarefa' | 'visita';
  tipo: 'mensagem' | 'ligacao' | 'tarefa' | 'email_followup' | 'agendamento' | 'proposta';
  status: 'pendente' | 'concluida' | 'cancelada';
  data_programada: string;
  executed_at?: string;
  execution_notes?: string;
  template_content?: string;
  day_offset?: number;
  stage_name?: string;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
}

interface Feedback {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  message: string;
  comment?: string;
  created_at: string;
  feedback_type?: 'positive' | 'negative';
}

interface InteractiveMenuBlockProps {
  lead: Lead;
  activeInteractiveTab: string;
  setActiveInteractiveTab: (tab: string) => void;
  pipelineId: string; // ✅ NOVO: Necessário para DocumentsTab
  
  // Cadência (legado - mantido para compatibilidade)
  leadTasks: LeadTask[];
  cadenceLoading: boolean;
  loadLeadTasks: () => void;
  handleCompleteTask: (taskId: string, executionNotes?: string) => void;
  
  
  // Feedback
  feedbacks: Feedback[];
  feedbacksLoading: boolean;
  newFeedback: string;
  setNewFeedback: (feedback: string) => void;
  feedbackType: 'positive' | 'negative';
  setFeedbackType: (type: 'positive' | 'negative') => void;
  handleAddFeedbackWrapper: () => void;
  
  // Custom Activity Modal
  onOpenCustomActivity: () => void;
  
  // Email Modal - REMOVIDO: Agora usa EmailInlineComposer
  // onOpenEmailModal: () => void;
}

const InteractiveMenuBlock: React.FC<InteractiveMenuBlockProps> = ({
  lead,
  activeInteractiveTab,
  setActiveInteractiveTab,
  pipelineId, // ✅ NOVO: Para DocumentsTab
  leadTasks,
  cadenceLoading,
  loadLeadTasks,
  handleCompleteTask,
  feedbacks,
  feedbacksLoading,
  newFeedback,
  setNewFeedback,
  feedbackType,
  setFeedbackType,
  handleAddFeedbackWrapper,
  onOpenCustomActivity
  // onOpenEmailModal - REMOVIDO
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // ✅ NOVO: Estado para controle de confirmação de exclusão de atividades
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);
  
  // ✅ NOVO: Estado para controlar grupos expandidos por etapa
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  
  // ✅ NOVO: Hook para atividades combinadas (cadence_task_instances + manual activities)
  const { 
    tasks: combinedActivities, 
    loading: activitiesLoading, 
    error: activitiesError,
    pendingCount,
    overdueCount,
    completeTask,
    deleteTask // ✅ NOVO: Função de deletar do hook
  } = useLeadTasksForCard(lead.id);

  // ✅ OTIMIZADO: Log simplificado das atividades (apenas mudanças significativas)
  const prevActivitiesCountRef = React.useRef(0);
  React.useEffect(() => {
    const currentCount = combinedActivities?.length || 0;
    const hasSignificantChange = Math.abs(currentCount - prevActivitiesCountRef.current) > 0;
    
    if (hasSignificantChange && !activitiesLoading) {
      console.log('📋 [InteractiveMenuBlock] Atividades atualizadas:', {
        leadId: lead.id.substring(0, 8),
        count: currentCount,
        pending: pendingCount,
        overdue: overdueCount
      });
      prevActivitiesCountRef.current = currentCount;
    }
  }, [combinedActivities?.length, activitiesLoading, lead.id, pendingCount, overdueCount]);

  // ✅ NOVO: Definir cores por etapa (igual ao TasksDropdown)
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

  // ✅ NOVO: Agrupar atividades por stage_name
  const activityGroups = useMemo(() => {
    if (!combinedActivities || combinedActivities.length === 0) return [];

    const groups = new Map<string, CombinedActivityView[]>();
    
    // Agrupar por stage_name
    combinedActivities.forEach(activity => {
      const stageName = activity.stage_name || 'Sem Etapa';
      if (!groups.has(stageName)) {
        groups.set(stageName, []);
      }
      groups.get(stageName)!.push(activity);
    });

    // Converter para array e ordenar
    const groupsArray = Array.from(groups.entries()).map(([stageName, groupActivities], index) => {
      const pendingCount = groupActivities.filter(a => a.status === 'pending').length;
      const completedCount = groupActivities.filter(a => a.status === 'completed').length;
      
      return {
        stageName,
        activities: groupActivities.sort((a, b) => {
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
  }, [combinedActivities]);

  // ✅ NOVO: Expansão automática de grupos com atividades pendentes
  React.useEffect(() => {
    if (activityGroups.length > 0 && expandedGroups.size === 0) {
      const groupsWithPending = activityGroups
        .filter(group => group.pendingCount > 0)
        .map(group => group.stageName);
      
      if (groupsWithPending.length > 0) {
        setExpandedGroups(new Set(groupsWithPending));
      }
    }
  }, [activityGroups.length]);

  // ✅ NOVO: Função para alternar expansão de grupo
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

  // ✅ NOVO: Função para refresh das atividades
  const refreshActivities = useCallback(() => {
    // Invalidar queries usando mesmo padrão do useLeadTasksForCard
    queryClient.invalidateQueries({ 
      queryKey: ['card-tasks', lead.id, user?.tenant_id],
      refetchType: 'active'
    });
    queryClient.invalidateQueries({ 
      queryKey: ['activities', 'combined', lead.id],
      refetchType: 'active'
    });
    queryClient.invalidateQueries({ 
      queryKey: ['leadTasks', lead.id],
      refetchType: 'active'
    });
  }, [queryClient, lead.id, user?.tenant_id]);


  // Função para renderizar ícone do canal (legado)
  const renderChannelIcon = (canal: string) => {
    switch (canal) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      case 'ligacao': return <Phone className="w-4 h-4" />;
      case 'sms': return <MessageCircle className="w-4 h-4" />;
      case 'tarefa': return <FileText className="w-4 h-4" />;
      case 'visita': return <MapPin className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // ✅ NOVO: Função para renderizar ícone das atividades combinadas
  const renderActivityIcon = (activityType: string, channel: string) => {
    switch (activityType) {
      case 'call':
        return <Phone className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'meeting':
        return <Calendar className="w-4 h-4" />;
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4" />;
      case 'note':
      case 'task':
        return <FileText className="w-4 h-4" />;
      case 'visit':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // ✅ NOVO: Função para obter cor baseada na urgência
  const getActivityUrgencyColor = (activity: CombinedActivityView): string => {
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

  // ✅ NOVO: Função para formatar data de atividade
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

  // Função para renderizar badge de status
  const getStatusBadge = (task: LeadTask) => {
    const statusInfo = getTaskStatusInfo(task);
    if (!statusInfo) return null;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Menu superior do bloco
  const menuItems = [
    { 
      id: 'anotacoes', 
      label: 'Anotações', 
      icon: BookOpen, 
      count: 0
    },
    { 
      id: 'cadencia', 
      label: 'Atividades', 
      icon: Activity, 
      count: combinedActivities?.length || 0,
      urgentCount: overdueCount || 0  // ✅ NOVO: Contagem de vencidas
    },
    { id: 'documentos', label: 'Documentos', icon: FolderOpen, count: 0 }, // ✅ NOVO: Aba Documentos
    { id: 'email', label: 'E-mail', icon: Mail, count: 0 },
    { id: 'feedback', label: 'Feedback', icon: ThumbsUp, count: feedbacks?.length || 0 },
    { id: 'google-calendar', label: 'Agenda', icon: Calendar, count: 0 }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header do Bloco */}
      <div className="border-b border-gray-200 pb-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Menu</h3>
      </div>

      {/* Menu Superior - Layout em linha única com espaço máximo */}
      <div className="flex gap-2 bg-gray-50 p-3 rounded-lg overflow-x-auto mb-4">
        {menuItems.map(item => {
          const IconComponent = item.icon;
          const isActive = activeInteractiveTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveInteractiveTab(item.id)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <IconComponent className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              {item.count > 0 && (
                <div className="flex items-center space-x-1">
                  <span className={`px-1 py-0.5 text-xs rounded-full font-bold flex-shrink-0 ${
                    isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {item.count}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo Dinâmico - Apenas esta área tem scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ATIVIDADES */}
        {activeInteractiveTab === 'cadencia' && (
          <div className="space-y-4 flex flex-col min-h-0">
            {/* Header das Atividades */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Activity className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="text-md font-medium text-gray-900">Atividades do Lead</h4>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Abrindo modal de atividade personalizada para lead:', lead.id);
                    onOpenCustomActivity();
                  }}
                  className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors"
                  title="Adicionar atividade personalizada"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={loadLeadTasks}
                  disabled={cadenceLoading}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                  title="Recarregar tarefas"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ✅ CORREÇÃO: Estatísticas das atividades em linha única */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-600">Total</span>
                  <span className="text-lg font-bold text-blue-900">{combinedActivities?.length || 0}</span>
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-yellow-600">Pendentes</span>
                  <span className="text-lg font-bold text-yellow-900">{pendingCount || 0}</span>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-red-600">Vencidas</span>
                  <span className="text-lg font-bold text-red-900">{overdueCount || 0}</span>
                </div>
              </div>
            </div>

            {/* ✅ NOVO: Lista de atividades agrupadas por etapa (igual ao TasksDropdown) */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {activitiesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">Carregando atividades...</p>
                </div>
              ) : activitiesError ? (
                <div className="text-center py-8">
                  <XCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
                  <h4 className="text-md font-medium text-gray-900 mb-1">Erro ao carregar atividades</h4>
                  <p className="text-sm text-gray-600">
                    {activitiesError}
                  </p>
                </div>
              ) : activityGroups.length === 0 ? (
                <div className="text-center py-8">
                  <PlayCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-md font-medium text-gray-900 mb-1">Nenhuma atividade encontrada</h4>
                  <p className="text-sm text-gray-600">
                    Este lead ainda não possui atividades de cadência ou manuais.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activityGroups.map((group) => (
                    <Collapsible.Root
                      key={group.stageName}
                      open={expandedGroups.has(group.stageName)}
                      onOpenChange={() => toggleGroup(group.stageName)}
                    >
                      {/* Header do grupo da etapa */}
                      <Collapsible.Trigger
                        className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${group.stageColor} border-l-4`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {expandedGroups.has(group.stageName) ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="font-medium text-sm text-gray-900">
                              {group.stageName}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({group.activities.length})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {group.pendingCount > 0 && (
                            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
                              {group.pendingCount} pendente{group.pendingCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {group.completedCount > 0 && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                              {group.completedCount} concluída{group.completedCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </Collapsible.Trigger>
                      
                      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down">
                        <div className="bg-gray-25">
                          {group.activities.map((activity) => (
                            <div
                              key={activity.id}
                              className={`group/activity flex items-start gap-3 px-4 py-2.5 ml-6 hover:bg-white transition-colors border-l-2 border-transparent hover:${group.stageColor.replace('border-l-', 'border-l-').replace('-300', '-200')} ${
                                activity.is_overdue ? 'bg-red-50' : ''
                              }`}
                            >
                              {/* Status da atividade */}
                              <div className="flex-shrink-0 mt-0.5">
                                {activity.status === 'completed' ? (
                                  <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center">
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </div>
                                ) : (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await completeTask(activity.id, '');
                                    }}
                                    className="w-4 h-4 border-2 border-gray-300 rounded hover:border-green-500 transition-colors"
                                    title="Marcar como concluída"
                                  />
                                )}
                              </div>

                              {/* Conteúdo da atividade */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`flex items-center gap-1 ${
                                    activity.is_overdue ? 'text-red-600' :
                                    activity.status === 'completed' ? 'text-green-600' :
                                    'text-amber-600'
                                  }`}>
                                    {renderActivityIcon(activity.activity_type, activity.channel)}
                                    {activity.is_overdue && <AlertCircle className="w-3 h-3" />}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {formatActivityDate(activity.scheduled_at)}
                                  </span>
                                  {activity.day_offset !== undefined && (
                                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                      D+{activity.day_offset}
                                    </span>
                                  )}
                                  {activity.is_manual_activity && (
                                    <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                                      Manual
                                    </span>
                                  )}
                                </div>
                                
                                <p className={`text-sm leading-tight ${
                                  activity.status === 'completed' 
                                    ? 'text-gray-500 line-through' 
                                    : 'text-gray-900'
                                }`}>
                                  {activity.title}
                                </p>
                                
                                {activity.description && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {activity.description.substring(0, 100)}
                                    {activity.description.length > 100 && '...'}
                                  </p>
                                )}
                              </div>

                              {/* ✅ NOVO: Botão de deletar (aparece no hover) */}
                              {deleteTask && (
                                <div className="flex-shrink-0 ml-auto opacity-0 group-hover/activity:opacity-100 transition-opacity">
                                  {activityToDelete === activity.id ? (
                                    // Confirmação de exclusão
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            console.log('🗑️ Deletando atividade:', activity.id.substring(0, 8));
                                            if (deleteTask) {
                                              const success = await deleteTask(activity.id);
                                              if (success) {
                                                console.log('✅ Atividade deletada com sucesso');
                                              }
                                            }
                                          } catch (error) {
                                            console.error('❌ Erro ao deletar atividade:', error);
                                          } finally {
                                            setActivityToDelete(null);
                                          }
                                        }}
                                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                        title="Confirmar exclusão"
                                      >
                                        Sim
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActivityToDelete(null);
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
                                        setActivityToDelete(activity.id);
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                      title="Excluir atividade"
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
                  
                  {/* Mensagem quando nenhuma categoria está expandida */}
                  {expandedGroups.size === 0 && activityGroups.length > 0 && (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <span className="text-xs text-gray-400 italic">
                        Clique em qualquer categoria acima para ver as atividades
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCUMENTOS */}
        {activeInteractiveTab === 'documentos' && (
          <DocumentsTab 
            lead={lead} 
            pipelineId={pipelineId}
          />
        )}

        {/* E-MAIL */}
        {activeInteractiveTab === 'email' && (
          <div className="space-y-4">


            {/* ✅ NOVO: SimpleEmailForm - Interface ultra simples sem complexidade */}
            <SimpleEmailForm
              lead={lead}
              onEmailSent={(success, message) => {
                // Callback para feedback de envio
                console.log(success ? '✅ E-mail enviado:' : '❌ Erro no e-mail:', message);
              }}
            />

            {/* Histórico de e-mails (placeholder para futura implementação) */}
            <div className="border-t pt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Histórico de E-mails</h5>
              <div className="text-center py-4">
                <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Nenhum e-mail enviado ainda</p>
              </div>
            </div>
          </div>
        )}


        {/* FEEDBACK */}
        {activeInteractiveTab === 'feedback' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900">Feedback</h4>
              <div className="flex items-center space-x-2">
                <ThumbsUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500">{(feedbacks || []).length} feedback(s)</span>
              </div>
            </div>

            {/* Adicionar feedback (Member e Admin) */}
            {(user?.role === 'member' || user?.role === 'admin') && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Deixar Feedback</h5>
                
                {/* Seleção de tipo de feedback */}
                <div className="flex space-x-2 mb-3">
                  <button
                    onClick={() => setFeedbackType('positive')}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-lg border-2 transition-all text-xs ${
                      feedbackType === 'positive'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>Positivo</span>
                  </button>
                  <button
                    onClick={() => setFeedbackType('negative')}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-lg border-2 transition-all text-xs ${
                      feedbackType === 'negative'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-red-300'
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                    <span>Negativo</span>
                  </button>
                </div>

                <textarea
                  value={newFeedback}
                  onChange={(e) => setNewFeedback(e.target.value)}
                  placeholder="Descreva seu feedback sobre este lead..."
                  className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddFeedbackWrapper}
                    disabled={!newFeedback.trim() || feedbacksLoading}
                    className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {feedbacksLoading ? 'Enviando...' : 'Enviar Feedback'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de feedbacks - Altura limitada */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(feedbacks || []).length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <ThumbsUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Nenhum feedback ainda</p>
                </div>
              ) : (
                (feedbacks || []).map(feedback => (
                  <div key={feedback.id} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          (feedback as any).feedback_type === 'negative' 
                            ? 'bg-red-500' 
                            : 'bg-green-500'
                        }`}>
                          {(feedback as any).feedback_type === 'negative' ? (
                            <ThumbsDown className="w-3 h-3 text-white" />
                          ) : (
                            <ThumbsUp className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900">{feedback.user_name}</p>
                          <p className="text-xs text-gray-500">
                            {(feedback as any).feedback_type === 'negative' ? 'Negativo' : 'Positivo'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(feedback.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{feedback.message || (feedback as any).comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ANOTAÇÕES */}
        {activeInteractiveTab === 'anotacoes' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <AnnotationsTab
              leadId={lead.id}
              leadType="pipeline_lead"
              leadName={lead.first_name || lead.last_name || 'Lead'}
              companyName={lead.company}
              className="h-full"
            />
          </div>
        )}

        {/* GOOGLE CALENDAR */}
        {activeInteractiveTab === 'google-calendar' && (
          <EnhancedGoogleCalendarTab
            lead={lead}
            onClose={() => setActiveInteractiveTab('anotacoes')}
          />
        )}
      </div>
    </div>
  );
};

export default InteractiveMenuBlock;