import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';

interface PendingTasksCache {
  [leadId: string]: {
    count: number;
    lastChecked: number;
  };
}

export const usePendingTasks = () => {
  const { user } = useAuth();
  const [cache, setCache] = useState<PendingTasksCache>({});
  const CACHE_DURATION = 60000; // 1 minuto em ms

  // Verificar tarefas pendentes para um lead específico
  const checkPendingTasksForLead = useCallback(async (leadId: string): Promise<number> => {
    if (!user?.id || !leadId) return 0;

    // Verificar cache primeiro
    const cached = cache[leadId];
    const now = Date.now();
    
    if (cached && (now - cached.lastChecked) < CACHE_DURATION) {
      return cached.count;
    }

    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Final do dia atual
      
      const { data: tasks, error } = await supabase
        .from('lead_tasks')
        .select('id')
        .eq('lead_id', leadId)
        .eq('assigned_to', user.id)
        .eq('status', 'pendente')
        .lte('data_programada', today.toISOString());

      if (error) {
        console.error('Erro ao verificar tarefas pendentes:', error);
        return 0;
      }

      const count = tasks?.length || 0;
      
      // Atualizar cache
      setCache(prev => ({
        ...prev,
        [leadId]: {
          count,
          lastChecked: now
        }
      }));

      return count;
      
    } catch (error) {
      console.error('Erro ao verificar tarefas pendentes:', error);
      return 0;
    }
  }, [user?.id, cache]);

  // Verificar tarefas pendentes para múltiplos leads (otimizado)
  const checkPendingTasksForLeads = useCallback(async (leadIds: string[]): Promise<PendingTasksCache> => {
    if (!user?.id || leadIds.length === 0) return {};

    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      const { data: tasks, error } = await supabase
        .from('lead_tasks')
        .select('lead_id')
        .in('lead_id', leadIds)
        .eq('assigned_to', user.id)
        .eq('status', 'pendente')
        .lte('data_programada', today.toISOString());

      if (error) {
        console.error('Erro ao verificar tarefas pendentes:', error);
        return {};
      }

      // Contar tarefas por lead
      const taskCounts: { [leadId: string]: number } = {};
      tasks?.forEach(task => {
        taskCounts[task.lead_id] = (taskCounts[task.lead_id] || 0) + 1;
      });

      // Criar cache atualizado
      const now = Date.now();
      const newCache: PendingTasksCache = {};
      
      leadIds.forEach(leadId => {
        newCache[leadId] = {
          count: taskCounts[leadId] || 0,
          lastChecked: now
        };
      });

      setCache(prev => ({ ...prev, ...newCache }));
      return newCache;
      
    } catch (error) {
      console.error('Erro ao verificar tarefas pendentes:', error);
      return {};
    }
  }, [user?.id]);

  // Limpar cache
  const clearCache = useCallback(() => {
    setCache({});
  }, []);

  // Obter contagem do cache
  const getPendingTasksCount = useCallback((leadId: string): number => {
    const cached = cache[leadId];
    if (!cached) return 0;
    
    const now = Date.now();
    if ((now - cached.lastChecked) > CACHE_DURATION) {
      return 0; // Cache expirado
    }
    
    return cached.count;
  }, [cache]);

  return {
    checkPendingTasksForLead,
    checkPendingTasksForLeads,
    getPendingTasksCount,
    clearCache,
    cache
  };
}; 