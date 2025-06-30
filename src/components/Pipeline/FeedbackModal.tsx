import React, { useState, useEffect } from 'react';
import { X, ThumbsUp, ThumbsDown, Send, User, Clock, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { logger } from '../../utils/logger';

interface Feedback {
  id: string;
  lead_id: string;
  user_id: string;
  feedback_type: 'positive' | 'negative';
  comment: string;
  created_at: string;
  user_name: string;
  user_role: string;
  user_avatar?: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  pipelineId?: string;
  pipelineName?: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  pipelineId,
  pipelineName
}) => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [newFeedback, setNewFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative'>('positive');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && leadId) {
      loadFeedbacks();
    }
  }, [isOpen, leadId]);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      if (import.meta.env.VITE_LOG_LEVEL === 'debug') {
        logger.debug('FeedbackModal carregando feedbacks para lead', leadId);
      }
      
      // Tentar carregar do banco primeiro
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('lead_feedback')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (feedbackError) {
        logger.debug('FeedbackModal tabela lead_feedback não existe ou erro no banco', feedbackError.message);
        logger.debug('FeedbackModal usando dados simulados temporariamente');
        
        // Fallback para dados simulados se a tabela não existir
        const mockFeedbacks = [
          {
            id: '1',
            lead_id: leadId,
            user_id: user?.id || '',
            feedback_type: 'positive' as 'positive' | 'negative',
            comment: 'Lead muito interessado no produto, respondeu rapidamente ao WhatsApp!',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            user_name: 'Carlos Mendes',
            user_role: 'member',
            user_avatar: undefined
          },
          {
            id: '2',
            lead_id: leadId,
            user_id: user?.id || '',
            feedback_type: 'negative' as 'positive' | 'negative',
            comment: 'Lead não respondeu após várias tentativas de contato por email e telefone.',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            user_name: 'Ana Silva',
            user_role: 'member',
            user_avatar: undefined
          }
        ];
        
        setFeedbacks(mockFeedbacks);
        return;
      }

      // Se chegou aqui, a tabela existe - processar dados
      if (import.meta.env.VITE_LOG_LEVEL === 'debug') {
        logger.debug('FeedbackModal feedbacks carregados do banco', `${feedbackData?.length || 0} items`);
      }
      
      if (feedbackData && feedbackData.length > 0) {
        // Tentar buscar informações dos usuários (opcional)
        const userIds = [...new Set(feedbackData.map(f => f.user_id))];
        
        let profilesData: any[] | null = null;
        try {
          // Só tentar buscar profiles se realmente necessário
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, avatar_url')
            .in('id', userIds);
            
          if (!profilesError && profiles) {
            profilesData = profiles;
            if (import.meta.env.VITE_LOG_LEVEL === 'debug') {
              logger.debug('FeedbackModal Dados dos usuários carregados de profiles');
            }
          }
          // Não logar erro se profiles não existir - é opcional
        } catch (error) {
          // Silenciar erro de profiles - não é crítico
        }

        const formattedFeedbacks = feedbackData.map(item => {
          const profile = profilesData?.find((p: any) => p.id === item.user_id);
          return {
            id: item.id,
            lead_id: item.lead_id,
            user_id: item.user_id,
            feedback_type: item.feedback_type,
            comment: item.comment,
            created_at: item.created_at,
            user_name: profile?.full_name || profile?.email || user?.email || 'Usuário',
            user_role: profile?.role || user?.role || 'member',
            user_avatar: profile?.avatar_url
          };
        });

        setFeedbacks(formattedFeedbacks);
      } else {
        setFeedbacks([]);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar feedbacks:', error);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!newFeedback.trim() || !user) return;

    setSubmitting(true);
    try {
      console.log('📤 Enviando feedback para o banco...');
      
      // Tentar inserir no banco primeiro
      const feedbackData: any = {
        lead_id: leadId,
        user_id: user.id,
        feedback_type: feedbackType,
        comment: newFeedback.trim()
      };

      // Incluir pipeline_id se disponível
      if (pipelineId) {
        feedbackData.pipeline_id = pipelineId;
      }

      const { data, error } = await supabase
        .from('lead_feedback')
        .insert(feedbackData)
        .select()
        .single();

      if (error) {
        console.log('⚠️ Erro ao inserir no banco:', error.message);
        console.log('📋 Adicionando localmente como fallback');
        
        // Fallback: adicionar localmente se o banco falhar
        const newFeedbackItem = {
          id: Date.now().toString(),
          lead_id: leadId,
          user_id: user.id,
          feedback_type: feedbackType,
          comment: newFeedback.trim(),
          created_at: new Date().toISOString(),
          user_name: (user as any)?.full_name || user?.email || 'Usuário',
          user_role: user.role || 'member',
          user_avatar: (user as any)?.avatar_url
        };

        setFeedbacks(prev => [newFeedbackItem, ...prev]);
        setNewFeedback('');
        console.log('✅ Feedback adicionado localmente');
        return;
      }

      console.log('✅ Feedback salvo no banco com sucesso:', data);
      setNewFeedback('');
      
      // Recarregar feedbacks do banco
      await loadFeedbacks();
      
    } catch (error) {
      console.error('❌ Erro ao enviar feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Feedback do Lead</DialogTitle>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">{leadName}</p>
              <p className="text-xs text-gray-500">Lead ID: {leadId}</p>
            </div>
          </DialogHeader>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Formulário de novo feedback */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Deixar Feedback</h3>
            
            {/* Tipo de feedback */}
            <div className="flex space-x-4 mb-4">
              <Button
                type="button"
                variant={feedbackType === 'positive' ? 'default' : 'outline'}
                onClick={() => setFeedbackType('positive')}
                className={`flex items-center space-x-2 ${
                  feedbackType === 'positive'
                    ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Positivo</span>
              </Button>
              <Button
                type="button"
                variant={feedbackType === 'negative' ? 'default' : 'outline'}
                onClick={() => setFeedbackType('negative')}
                className={`flex items-center space-x-2 ${
                  feedbackType === 'negative'
                    ? 'border-red-500 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-red-300'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>Negativo</span>
              </Button>
            </div>

            {/* Campo de comentário */}
            <div className="mb-4">
              <textarea
                value={newFeedback}
                onChange={(e) => setNewFeedback(e.target.value)}
                placeholder="Descreva seu feedback sobre este lead..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Botão enviar */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitFeedback}
                disabled={!newFeedback.trim() || submitting}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Enviando...' : 'Enviar Feedback'}</span>
              </Button>
            </div>
          </div>

          {/* Lista de feedbacks */}
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Histórico de Feedbacks ({feedbacks.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum feedback ainda</p>
                <p className="text-sm">Seja o primeiro a deixar um feedback!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div key={feedback.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {feedback.user_avatar ? (
                          <img
                            src={feedback.user_avatar}
                            alt={feedback.user_name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {getUserInitials(feedback.user_name)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">{feedback.user_name}</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {feedback.user_role === 'super_admin' ? 'Super Admin' : 
                             feedback.user_role === 'admin' ? 'Admin' : 'Vendedor'}
                          </span>
                          <div className="flex items-center space-x-1">
                            {feedback.feedback_type === 'positive' ? (
                              <ThumbsUp className="w-4 h-4 text-green-500" />
                            ) : (
                              <ThumbsDown className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-2">{feedback.comment}</p>
                        
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(feedback.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal; 