// =====================================================================================
// COMPONENT: InteractiveMenuBlock
// Autor: Claude (Arquiteto Sênior)  
// Descrição: Bloco 2 - Menu Interativo com conteúdo dinâmico
// =====================================================================================

import React from 'react';
import { PlayCircle, Mail, MessageCircle, ThumbsUp, Calendar, Clock, CheckCircle, XCircle, Phone, MapPin, FileText, Activity, User, ThumbsDown } from 'lucide-react';
import { Lead } from '../../../types/Pipeline';
import { useAuth } from '../../../contexts/AuthContext';
import { formatDate, getChannelColor, formatTaskDate, getTaskStatusInfo } from '../../../utils/leadDetailsUtils';
import { EnhancedGoogleCalendarTab } from '../../meetings/EnhancedGoogleCalendarTab';

interface LeadTask {
  id: string;
  lead_id: string;
  pipeline_id: string;
  etapa_id: string;
  descricao: string;
  canal: string;
  tipo: string;
  status: 'pendente' | 'concluida';
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
  
  // Cadência
  leadTasks: LeadTask[];
  cadenceLoading: boolean;
  loadLeadTasks: () => void;
  handleCompleteTask: (taskId: string, executionNotes?: string) => void;
  
  // Comentários
  comments: Comment[];
  commentsLoading: boolean;
  newComment: string;
  setNewComment: (comment: string) => void;
  handleAddCommentWrapper: () => void;
  
  // Feedback
  feedbacks: Feedback[];
  feedbacksLoading: boolean;
  newFeedback: string;
  setNewFeedback: (feedback: string) => void;
  feedbackType: 'positive' | 'negative';
  setFeedbackType: (type: 'positive' | 'negative') => void;
  handleAddFeedbackWrapper: () => void;
}

const InteractiveMenuBlock: React.FC<InteractiveMenuBlockProps> = ({
  lead,
  activeInteractiveTab,
  setActiveInteractiveTab,
  leadTasks,
  cadenceLoading,
  loadLeadTasks,
  handleCompleteTask,
  comments,
  commentsLoading,
  newComment,
  setNewComment,
  handleAddCommentWrapper,
  feedbacks,
  feedbacksLoading,
  newFeedback,
  setNewFeedback,
  feedbackType,
  setFeedbackType,
  handleAddFeedbackWrapper
}) => {
  const { user } = useAuth();

  // Função para renderizar ícone do canal
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
    { id: 'cadencia', label: 'Cadência', icon: PlayCircle, count: leadTasks?.length || 0 },
    { id: 'email', label: 'E-mail', icon: Mail, count: 0 },
    { id: 'comentarios', label: 'Comentários', icon: MessageCircle, count: comments?.length || 0 },
    { id: 'feedback', label: 'Feedback', icon: ThumbsUp, count: feedbacks?.length || 0 },
    { id: 'google-calendar', label: 'Google Calendar', icon: Calendar, count: 0 }
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header do Bloco */}
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-900">Menu Interativo</h3>
        <p className="text-sm text-gray-500">Ações e ferramentas do lead</p>
      </div>

      {/* Menu Superior - Layout em linha única com espaço máximo */}
      <div className="flex gap-2 bg-gray-50 p-3 rounded-lg overflow-x-auto">
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
                <span className={`px-1 py-0.5 text-xs rounded-full font-bold flex-shrink-0 ${
                  isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo Dinâmico - Usa altura completa sem scroll */}
      <div className="flex-1 h-full overflow-hidden">
        {/* CADÊNCIA */}
        {activeInteractiveTab === 'cadencia' && (
          <div className="space-y-4">
            {/* Header da Cadência */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <PlayCircle className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="text-md font-medium text-gray-900">Tarefas de Cadência</h4>
                  <p className="text-xs text-gray-500">
                    Tarefas automáticas geradas para este lead
                  </p>
                </div>
              </div>
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

            {/* Estatísticas rápidas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs font-medium text-blue-600">Total</div>
                <div className="text-lg font-bold text-blue-900">{(leadTasks || []).length}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs font-medium text-yellow-600">Pendentes</div>
                <div className="text-lg font-bold text-yellow-900">
                  {(leadTasks || []).filter(task => task.status === 'pendente').length}
                </div>
              </div>
            </div>

            {/* Lista de tarefas - Usa altura restante */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {cadenceLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">Carregando tarefas...</p>
                </div>
              ) : (leadTasks || []).length === 0 ? (
                <div className="text-center py-8">
                  <PlayCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-md font-medium text-gray-900 mb-1">Nenhuma tarefa de cadência</h4>
                  <p className="text-sm text-gray-600">
                    Este lead ainda não possui tarefas automáticas geradas.
                  </p>
                </div>
              ) : (
                (leadTasks || []).map(task => (
                  <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                    {/* Header da tarefa */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {/* Ícone do canal */}
                        <div className={`p-1.5 rounded-lg ${getChannelColor(task.canal)}`}>
                          {renderChannelIcon(task.canal)}
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-900">{task.descricao}</h5>
                          <p className="text-xs text-gray-500">
                            {task.stage_name} • {task.tipo}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getStatusBadge(task)}
                      </div>
                    </div>

                    {/* Informações da tarefa */}
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>{formatTaskDate(task.data_programada)}</span>
                      </div>
                      {task.day_offset !== undefined && (
                        <div className="flex items-center space-x-1 text-xs text-gray-600">
                          <Calendar className="w-3 h-3" />
                          <span>D+{task.day_offset}</span>
                        </div>
                      )}
                    </div>

                    {/* Template de conteúdo */}
                    {task.template_content && (
                      <div className="bg-gray-50 rounded-lg p-2 mb-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Conteúdo:</p>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{task.template_content}</p>
                      </div>
                    )}

                    {/* Ações */}
                    {task.status === 'pendente' && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            const notes = prompt('Adicione notas sobre a execução desta tarefa (opcional):');
                            if (notes !== null) {
                              handleCompleteTask(task.id, notes || undefined);
                            }
                          }}
                          className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Concluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* E-MAIL */}
        {activeInteractiveTab === 'email' && (
          <div className="text-center py-8">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-md font-medium text-gray-900 mb-1">Integração de E-mail</h4>
            <p className="text-sm text-gray-600">
              Em breve integração com SMTP será implementada para envio e recebimento de e-mails diretamente do CRM.
            </p>
          </div>
        )}

        {/* COMENTÁRIOS */}
        {activeInteractiveTab === 'comentarios' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900">Comentários</h4>
              <span className="text-xs text-gray-500">{comments.length} comentário(s)</span>
            </div>

            {/* Adicionar comentário */}
            <div className="bg-gray-50 rounded-lg p-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddCommentWrapper}
                  disabled={!newComment.trim() || commentsLoading}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {commentsLoading ? 'Enviando...' : 'Comentar'}
                </button>
              </div>
            </div>

            {/* Lista de comentários - Altura limitada */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(comments || []).length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Nenhum comentário ainda</p>
                </div>
              ) : (
                (comments || []).map(comment => (
                  <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {comment.user_name ? comment.user_name.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900">{comment.user_name}</p>
                          <p className="text-xs text-gray-500 capitalize">{comment.user_role}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.message}</p>
                  </div>
                ))
              )}
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

        {/* GOOGLE CALENDAR */}
        {activeInteractiveTab === 'google-calendar' && (
          <EnhancedGoogleCalendarTab
            lead={lead}
            onClose={() => setActiveInteractiveTab('cadencia')}
          />
        )}
      </div>
    </div>
  );
};

export default InteractiveMenuBlock;