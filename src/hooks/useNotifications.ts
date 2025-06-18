import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  user_id: string;
  action_url?: string;
  metadata?: Record<string, any>;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'user_id'>) => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar notificações do usuário
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      setNotifications(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao buscar notificações:', err);
      setError(err.message || 'Erro ao carregar notificações');
      // Fallback para notificações mock em caso de erro
      setNotifications(getMockNotifications());
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Subscrever para notificações real-time
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Nova notificação recebida:', payload.new);
          setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 49)]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notificação atualizada:', payload.new);
          setNotifications(prev => 
            prev.map(notification => 
              notification.id === payload.new.id 
                ? { ...notification, ...payload.new }
                : notification
            )
          );
        }
      )
      .subscribe();

    // Buscar notificações iniciais
    fetchNotifications();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  // Marcar notificação como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (updateError) {
        throw updateError;
      }

      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (err: any) {
      console.error('Erro ao marcar notificação como lida:', err);
      // Atualizar estado local mesmo em caso de erro de rede
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    }
  }, [user?.id]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (updateError) {
        throw updateError;
      }

      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (err: any) {
      console.error('Erro ao marcar todas como lidas:', err);
      // Atualizar estado local mesmo em caso de erro
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    }
  }, [user?.id]);

  // Adicionar notificação local (para feedback imediato)
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'created_at' | 'user_id'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      user_id: user?.id || 'unknown',
      read: false
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);

    // Auto-remover notificações temporárias após 5 segundos
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  }, [user?.id]);

  // Remover notificação local
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Limpar todas as notificações
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Calcular contagem de não lidas
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAllNotifications
  };
};

// Notificações mock para fallback
const getMockNotifications = (): Notification[] => [
  {
    id: 'mock-1',
    title: 'Novo Lead Adicionado',
    message: 'Um novo lead foi adicionado à pipeline "Vendas B2B"',
    type: 'info',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min atrás
    user_id: 'mock-user',
    action_url: '/pipeline',
    metadata: {
      pipeline_id: 'pipeline-1',
      lead_id: 'lead-1'
    }
  },
  {
    id: 'mock-2',
    title: 'Lead Movido para "Proposta"',
    message: 'O lead "João Silva" foi movido para a etapa "Proposta"',
    type: 'success',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h atrás
    user_id: 'mock-user',
    action_url: '/pipeline',
    metadata: {
      pipeline_id: 'pipeline-1',
      lead_id: 'lead-2',
      stage_id: 'stage-proposta'
    }
  },
  {
    id: 'mock-3',
    title: 'Meta Atingida',
    message: 'Parabéns! Você atingiu 90% da sua meta mensal',
    type: 'success',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
    user_id: 'mock-user',
    action_url: '/meta',
    metadata: {
      percentage: 90,
      month: new Date().getMonth() + 1
    }
  }
];

// Hook para notificações toast (temporárias)
interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface UseToastReturn {
  toasts: ToastNotification[];
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = toast.duration || 5000;

    const newToast: ToastNotification = {
      ...toast,
      id
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remover após duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    clearToasts
  };
}; 