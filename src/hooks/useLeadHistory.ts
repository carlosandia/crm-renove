import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface HistoryEntry {
  id: string;
  lead_id: string;
  action: string;
  description: string;
  user_name: string;
  user_role?: string;
  user_email?: string;
  created_at: string;
  old_values?: any;
  new_values?: any;
}

export interface UseLeadHistoryReturn {
  history: HistoryEntry[];
  historyLoading: boolean;
  loadHistory: () => Promise<void>;
}

export const useLeadHistory = (leadId: string): UseLeadHistoryReturn => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Carregar histórico
  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      
      // ✅ CORREÇÃO: Query simples sem JOIN problemático
      const { data: historyData, error } = await supabase
        .from('lead_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        setHistory([]);
        return;
      }

      // ✅ CORREÇÃO: Buscar dados dos usuários separadamente para evitar erro de foreign key
      const userIds = [...new Set((historyData || [])
        .map(entry => entry.user_id)
        .filter(Boolean)
      )];

      let usersMap = new Map();
      
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, role')
          .in('id', userIds);

        if (!usersError && usersData) {
          usersData.forEach(user => {
            usersMap.set(user.id, user);
          });
        }
      }

      // ✅ CORREÇÃO: Processar dados com fallback robusto
      const processedHistory = (historyData || []).map(entry => {
        const userData = usersMap.get(entry.user_id);
        const userName = userData 
          ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || 'Usuário'
          : entry.user_id ? 'Usuário' : 'Sistema';

        return {
          ...entry,
          user_name: userName,
          user_role: userData?.role,
          user_email: userData?.email
        };
      });

      setHistory(processedHistory);
    } catch (error) {
      console.error('❌ Erro geral ao carregar histórico:', error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [leadId]);

  return {
    history,
    historyLoading,
    loadHistory
  };
}; 