import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, Clock, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { silentFetch, executeWithFallback } from '../../utils/silentFallback';

// Sistema de logs condicionais
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'warn';
const isDebugMode = LOG_LEVEL === 'debug';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: any;
  // Enterprise features
  notification_category?: 'novidades' | 'atualizacoes' | 'comunicados';
  priority?: 'low' | 'medium' | 'high';
  rich_content?: {
    image_url?: string;
    action_button?: string;
    action_url?: string;
  };
  expires_at?: string;
  click_tracking?: {
    clicks: number;
    last_clicked?: string;
  };
}

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 CARREGAMENTO DE NOTIFICAÇÕES COM FALLBACK SILENCIOSO
  const loadNotifications = useCallback(async () => {
    const result = await executeWithFallback(
      async () => {
        const response = await silentFetch('http://localhost:3001/api/notifications');
        if (!response) return [];
        
        const data = await response.json();
        return data.notifications || [];
      },
      [], // fallback: array vazio
      'Notificações indisponíveis'
    );
    
    setNotifications(result);
  }, []);

  // Marcar como lida com fallback graceful
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) {
        if (isDebugMode) {
          console.log('📋 NotificationCenter: Erro ao marcar como lida:', error.message);
        }
        return;
      }

      // Atualizar estado local
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true }
            : n
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));

      if (isDebugMode) {
        console.log('📋 NotificationCenter: Notificação marcada como lida');
      }

    } catch (error: any) {
      if (isDebugMode) {
        console.log('📋 NotificationCenter: Erro de conexão ao marcar como lida:', error.message);
      }
    }
  };

  // Rastrear clique com fallback graceful
  const trackClick = async (notification: Notification, actionType: string = 'click') => {
    try {
      // Verificar se API está disponível
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/notifications/track-click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          notificationId: notification.id,
          actionType
        }),
        signal: AbortSignal.timeout(3000) // Timeout de 3s
      });

      if (!response.ok && isDebugMode) {
        console.log('📋 NotificationCenter: API de tracking indisponível');
      }

    } catch (error: any) {
      if (isDebugMode) {
        console.log('📋 NotificationCenter: Tracking offline (modo graceful)');
      }
      // Não mostrar erro para o usuário - tracking é opcional
    }
  };

  // Lidar com ação da notificação
  const handleNotificationAction = async (notification: Notification) => {
    // Marcar como lida
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Rastrear clique (opcional)
    await trackClick(notification, 'action_click');

    // Navegar para URL se existir
    const actionUrl = notification.rich_content?.action_url || notification.action_url;
    if (actionUrl) {
      if (actionUrl.startsWith('http')) {
        window.open(actionUrl, '_blank');
      } else {
        window.location.href = actionUrl;
      }
    }
  };

  // Subscription para notificações em tempo real com fallback
  useEffect(() => {
    if (!user?.id) return;

    // Carregar notificações iniciais
    loadNotifications();

    // Configurar subscription apenas se Supabase estiver disponível
    let subscription: any;
    
    try {
      subscription = supabase
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
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            if (isDebugMode) {
              console.log('📋 NotificationCenter: Nova notificação recebida');
            }
            
            // Mostrar notificação toast se necessário
            if (newNotification.priority === 'high') {
              // Implementar toast notification aqui
            }
          }
        )
        .subscribe();
    } catch (error) {
      if (isDebugMode) {
        console.log('📋 NotificationCenter: Subscription indisponível (modo offline)');
      }
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user?.id]);

  // Ícone baseado no tipo
  const getNotificationIcon = (type: string, priority?: string) => {
    const iconProps = { 
      size: 20, 
      className: `${priority === 'high' ? 'text-red-500' : ''} ${priority === 'medium' ? 'text-yellow-500' : ''} ${priority === 'low' ? 'text-blue-500' : ''}` 
    };

    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} className="text-green-500" />;
      case 'warning':
        return <AlertTriangle {...iconProps} className="text-yellow-500" />;
      case 'error':
        return <AlertCircle {...iconProps} className="text-red-500" />;
      default:
        return <Info {...iconProps} className="text-blue-500" />;
    }
  };

  // Cor da categoria
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'novidades':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'atualizacoes':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'comunicados':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Botão de notificações */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Painel de notificações */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 z-40 bg-black bg-opacity-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Painel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-12 z-50 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notificações</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="text-sm text-gray-500">
                      {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Lista de notificações */}
              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2">Carregando...</p>
                  </div>
                ) : error ? (
                  <div className="p-4 text-center text-red-500">
                    <AlertCircle size={24} className="mx-auto mb-2" />
                    <p>{error}</p>
                    <button 
                      onClick={loadNotifications}
                      className="mt-2 text-sm text-blue-500 hover:underline"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma notificação</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleNotificationAction(notification)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Ícone */}
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type, notification.priority)}
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            {/* Categoria e prioridade */}
                            <div className="flex items-center gap-2 mb-1">
                              {notification.notification_category && (
                                <span className={`px-2 py-1 text-xs rounded-full border ${getCategoryColor(notification.notification_category)}`}>
                                  {notification.notification_category}
                                </span>
                              )}
                              {notification.priority === 'high' && (
                                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 border border-red-200">
                                  Urgente
                                </span>
                              )}
                            </div>

                            {/* Título */}
                            <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </h4>

                            {/* Mensagem */}
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>

                            {/* Rich content */}
                            {notification.rich_content?.image_url && (
                              <img 
                                src={notification.rich_content.image_url}
                                alt=""
                                className="mt-2 w-full h-24 object-cover rounded"
                              />
                            )}

                            {/* Botão de ação */}
                            {notification.rich_content?.action_button && (
                              <button className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors">
                                {notification.rich_content.action_button}
                              </button>
                            )}

                            {/* Timestamp */}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                {new Date(notification.created_at).toLocaleString('pt-BR')}
                              </span>
                              
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="text-xs text-blue-500 hover:underline"
                                >
                                  Marcar como lida
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <button 
                    onClick={() => {
                      // Implementar visualização de todas as notificações
                      setIsOpen(false);
                    }}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Ver todas as notificações
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}; 