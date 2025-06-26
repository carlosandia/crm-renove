import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { registerComment } from '../utils/historyUtils';

export interface Comment {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
}

export interface UseLeadCommentsReturn {
  comments: Comment[];
  loading: boolean;
  newComment: string;
  setNewComment: (comment: string) => void;
  loadComments: () => Promise<void>;
  handleAddComment: (userId: string, onHistoryReload?: () => void) => Promise<void>;
}

export const useLeadComments = (leadId: string): UseLeadCommentsReturn => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Carregar comentários
  const loadComments = useCallback(async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('lead_comments')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar comentários:', error);
        setComments([]);
        return;
      }

      // Buscar dados do usuário separadamente para cada comentário
      const commentsWithUsers = await Promise.all(
        (commentsData || []).map(async (comment) => {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('name, role')
              .eq('id', comment.user_id)
              .single();

            return {
              ...comment,
              user_name: userData?.name || 'Usuário Desconhecido',
              user_role: userData?.role || 'unknown'
            };
          } catch (userError) {
            console.warn('Erro ao buscar dados do usuário:', userError);
            return {
              ...comment,
              user_name: 'Usuário Desconhecido',
              user_role: 'unknown'
            };
          }
        })
      );

      setComments(commentsWithUsers);
    } catch (error) {
      console.error('❌ Erro geral ao carregar comentários:', error);
      setComments([]);
    }
  }, [leadId]);

  // Adicionar comentário
  const handleAddComment = useCallback(async (userId: string, onHistoryReload?: () => void) => {
    if (!newComment.trim() || loading || !userId) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('lead_comments')
        .insert({
          lead_id: leadId,
          user_id: userId,
          message: newComment.trim(),
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      // Registrar no histórico
      await registerComment(leadId, newComment.trim(), userId);

      // Recarregar comentários
      await loadComments();
      
      // Recarregar histórico se callback fornecido
      if (onHistoryReload) {
        await onHistoryReload();
      }

      // Limpar campo
      setNewComment('');
      
    } catch (error) {
      console.error('❌ Erro ao adicionar comentário:', error);
    } finally {
      setLoading(false);
    }
  }, [newComment, loading, leadId, loadComments]);

  return {
    comments,
    loading,
    newComment,
    setNewComment,
    loadComments,
    handleAddComment
  };
}; 