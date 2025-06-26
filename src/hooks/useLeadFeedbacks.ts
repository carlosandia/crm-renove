import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { registerFeedback } from '../utils/historyUtils';

export interface Feedback {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  message: string;
  comment?: string; // ✅ ETAPA 1: Campo adicional para compatibilidade com banco
  created_at: string;
  feedback_type?: 'positive' | 'negative';
}

export interface UseLeadFeedbacksReturn {
  feedbacks: Feedback[];
  loading: boolean;
  newFeedback: string;
  setNewFeedback: (feedback: string) => void;
  feedbackType: 'positive' | 'negative';
  setFeedbackType: (type: 'positive' | 'negative') => void;
  loadFeedbacks: () => Promise<void>;
  handleAddFeedback: (userId: string, onHistoryReload?: () => void) => Promise<void>;
}

export const useLeadFeedbacks = (leadId: string): UseLeadFeedbacksReturn => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFeedback, setNewFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative'>('positive');

  // Carregar feedbacks
  const loadFeedbacks = useCallback(async () => {
    try {
      const { data: feedbacksData, error } = await supabase
        .from('lead_feedback')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar feedbacks:', error);
        setFeedbacks([]);
        return;
      }

      // Buscar dados do usuário separadamente para cada feedback
      const feedbacksWithUsers = await Promise.all(
        (feedbacksData || []).map(async (feedback) => {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('first_name, last_name, email')
              .eq('id', feedback.user_id)
              .single();

            const userName = userData 
              ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email
              : 'Usuário Desconhecido';

            return {
              ...feedback,
              user_name: userName,
              message: feedback.comment || feedback.message || '' // ✅ ETAPA 1: Compatibilidade com ambos os campos
            };
          } catch (userError) {
            console.warn('Erro ao buscar dados do usuário para feedback:', userError);
            return {
              ...feedback,
              user_name: 'Usuário Desconhecido'
            };
          }
        })
      );

      setFeedbacks(feedbacksWithUsers);
    } catch (error) {
      console.error('❌ Erro geral ao carregar feedbacks:', error);
      setFeedbacks([]);
    }
  }, [leadId]);

  // Adicionar feedback
  const handleAddFeedback = useCallback(async (userId: string, onHistoryReload?: () => void) => {
    if (!newFeedback.trim() || loading || !userId) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('lead_feedback')
        .insert({
          lead_id: leadId,
          user_id: userId,
          comment: newFeedback.trim(), // ✅ ETAPA 1: Usar campo correto do banco
          feedback_type: feedbackType,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      // Registrar no histórico
      await registerFeedback(leadId, newFeedback.trim(), userId);

      // Recarregar feedbacks
      await loadFeedbacks();
      
      // Recarregar histórico se callback fornecido
      if (onHistoryReload) {
        await onHistoryReload();
      }

      // Limpar campo
      setNewFeedback('');
      
    } catch (error) {
      console.error('❌ Erro ao adicionar feedback:', error);
    } finally {
      setLoading(false);
    }
  }, [newFeedback, loading, leadId, feedbackType, loadFeedbacks]);

  return {
    feedbacks,
    loading,
    newFeedback,
    setNewFeedback,
    feedbackType,
    setFeedbackType,
    loadFeedbacks,
    handleAddFeedback
  };
}; 