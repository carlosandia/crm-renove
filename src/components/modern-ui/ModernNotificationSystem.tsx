// =====================================================================================
// COMPONENT: Modern Notification System
// Autor: Claude (Arquiteto Sênior)
// Descrição: Sistema moderno de notificações usando Magic UI + logger integrado
// =====================================================================================

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { AnimatedList } from '../magicui/animated-list';
import { BorderBeam } from '../magicui/border-beam';
import { ConfettiButton } from '../magicui/confetti';
import { logger } from '../../utils/logger';
import { registerModernNotify } from '../../utils/loggerNotificationIntegration';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ModernNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
  correlationId?: string;
}

interface ModernNotificationSystemProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  maxNotifications?: number;
}

// Store global para notificações
class NotificationStore {
  private notifications: ModernNotification[] = [];
  private listeners: ((notifications: ModernNotification[]) => void)[] = [];

  subscribe(listener: (notifications: ModernNotification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  add(notification: Omit<ModernNotification, 'id'>) {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: ModernNotification = {
      id,
      duration: 5000, // 5 segundos padrão
      ...notification,
    };

    this.notifications.push(newNotification);
    this.notify();

    // Log estruturado da notificação
    logger.info('ModernNotification criada', {
      notificationId: id,
      type: newNotification.type,
      title: newNotification.title,
      persistent: newNotification.persistent,
      correlationId: newNotification.correlationId
    });

    // Auto-remove após duration (se não for persistente)
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        this.remove(id);
      }, newNotification.duration);
    }

    return id;
  }

  remove(id: string) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index > -1) {
      const removed = this.notifications.splice(index, 1)[0];
      this.notify();
      
      logger.info('ModernNotification removida', {
        notificationId: id,
        type: removed.type,
        title: removed.title
      });
    }
  }

  clear() {
    const count = this.notifications.length;
    this.notifications = [];
    this.notify();
    
    logger.info('Todas notificações limpas', { count });
  }

  getNotifications() {
    return [...this.notifications];
  }
}

// Instância global
const notificationStore = new NotificationStore();

// Hooks para uso em componentes
export const useModernNotifications = () => {
  const [notifications, setNotifications] = useState<ModernNotification[]>([]);

  useEffect(() => {
    return notificationStore.subscribe(setNotifications);
  }, []);

  const addNotification = useCallback((notification: Omit<ModernNotification, 'id'>) => {
    return notificationStore.add(notification);
  }, []);

  const removeNotification = useCallback((id: string) => {
    notificationStore.remove(id);
  }, []);

  const clearNotifications = useCallback(() => {
    notificationStore.clear();
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
};

// API para uso direto (sem hooks)
export const modernNotify = {
  success: (title: string, message?: string, options?: Partial<ModernNotification>) =>
    notificationStore.add({ type: 'success', title, message, ...options }),
  
  error: (title: string, message?: string, options?: Partial<ModernNotification>) =>
    notificationStore.add({ type: 'error', title, message, ...options }),
  
  warning: (title: string, message?: string, options?: Partial<ModernNotification>) =>
    notificationStore.add({ type: 'warning', title, message, ...options }),
  
  info: (title: string, message?: string, options?: Partial<ModernNotification>) =>
    notificationStore.add({ type: 'info', title, message, ...options }),

  // Integração com logger - automáticamente cria notificações para erros
  fromError: (error: any, title: string = 'Erro', correlationId?: string) => {
    logger.error(title, {
      error: error.message || error,
      correlationId
    });
    
    return notificationStore.add({
      type: 'error',
      title,
      message: typeof error === 'string' ? error : error.message || 'Erro inesperado',
      correlationId,
      persistent: true // Erros são persistentes por padrão
    });
  },

  // Celebração de sucesso com confetti
  celebrate: (title: string, message?: string, options?: Partial<ModernNotification>) => {
    const id = notificationStore.add({ 
      type: 'success', 
      title, 
      message, 
      duration: 8000, // Mais tempo para celebração
      ...options 
    });
    
    // Trigger confetti após um delay para sincronizar com animação
    setTimeout(() => {
      const event = new CustomEvent('triggerConfetti');
      window.dispatchEvent(event);
    }, 300);
    
    return id;
  }
};

// Registrar globalmente para integração com logger
if (typeof window !== 'undefined') {
  (window as any).modernNotify = modernNotify;
  registerModernNotify(modernNotify);
}

// Componente de notificação individual
const NotificationItem: React.FC<{
  notification: ModernNotification;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'border-green-200 bg-green-50 text-green-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  const Icon = icons[notification.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      className={`relative overflow-hidden rounded-lg border p-4 shadow-lg backdrop-blur-sm ${colors[notification.type]}`}
    >
      {notification.type === 'error' && <BorderBeam className="rounded-lg" />}
      
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{notification.title}</h4>
          {notification.message && (
            <p className="mt-1 text-sm opacity-90">{notification.message}</p>
          )}
          
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-2 text-sm font-medium underline hover:no-underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={() => onRemove(notification.id)}
          className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};

// Componente principal do sistema
export const ModernNotificationSystem: React.FC<ModernNotificationSystemProps> = ({
  className,
  position = 'top-right',
  maxNotifications = 5,
}) => {
  const { notifications, removeNotification } = useModernNotifications();

  // Limitar número de notificações
  const visibleNotifications = notifications.slice(-maxNotifications);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
  };

  // Listener para confetti
  useEffect(() => {
    const handleConfetti = () => {
      // Trigger confetti - será capturado pelo ConfettiButton global
    };

    window.addEventListener('triggerConfetti', handleConfetti);
    return () => window.removeEventListener('triggerConfetti', handleConfetti);
  }, []);

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Container de notificações */}
      <div
        className={`fixed z-50 w-full max-w-sm space-y-2 ${positionClasses[position]} ${className}`}
      >
        <AnimatePresence mode="popLayout">
          {visibleNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRemove={removeNotification}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Confetti global invisível */}
      <ConfettiButton
        className="hidden"
        options={{
          particleCount: 100,
          spread: 70,
          origin: { x: 0.5, y: 0.6 }
        }}
      >
        <span />
      </ConfettiButton>
    </>
  );
};