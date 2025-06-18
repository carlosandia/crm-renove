import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Clock, ChevronDown } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

interface InternalNotificationsProps {
  /** Posição do componente: 'top-right', 'top-left', 'inline' */
  position?: 'top-right' | 'top-left' | 'inline';
  /** Se deve mostrar de forma compacta */
  compact?: boolean;
  /** Se deve mostrar sempre visível (não como dropdown) */
  alwaysVisible?: boolean;
  /** Callback para navegar entre módulos */
  onNavigate?: (module: string) => void;
}

const InternalNotifications: React.FC<InternalNotificationsProps> = ({
  position = 'top-right',
  compact = false,
  alwaysVisible = false,
  onNavigate
}) => {
  const [showNotifications, setShowNotifications] = useState(alwaysVisible);
  const [isMinimized, setIsMinimized] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    addNotification 
  } = useNotifications();

  // Fechar dropdown ao clicar fora (apenas se não for sempre visível)
  useEffect(() => {
    if (alwaysVisible) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [alwaysVisible]);

  // Formatar tempo da notificação
  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  // Obter ícone da notificação baseado no tipo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  // Lidar com clique na notificação
  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url && onNavigate) {
      const moduleName = getModuleFromUrl(notification.action_url);
      if (moduleName) {
        onNavigate(moduleName);
      }
    }
    
    if (!alwaysVisible) {
      setShowNotifications(false);
    }
  };

  // Converter URL para nome do módulo
  const getModuleFromUrl = (url: string): string | null => {
    if (url.includes('pipeline')) return 'Pipeline';
    if (url.includes('leads')) return 'Leads';
    if (url.includes('meta')) return 'Meta';
    if (url.includes('vendedores')) return 'Vendedores';
    if (url.includes('relatorio')) return 'Relatório';
    if (url.includes('clientes')) return 'Clientes';
    return null;
  };

  // Estilos de posicionamento
  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return 'absolute top-4 left-4 z-40';
      case 'top-right':
        return 'absolute top-4 right-4 z-40';
      case 'inline':
        return 'relative w-full';
      default:
        return 'absolute top-4 right-4 z-40';
    }
  };

  // Renderizar botão de toggle (apenas se não for sempre visível)
  const renderToggleButton = () => {
    if (alwaysVisible) return null;

    return (
      <button 
        onClick={() => setShowNotifications(!showNotifications)}
        className={`p-3 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg shadow-md relative ${
          compact ? 'p-2' : ''
        }`}
        title="Notificações"
      >
        <Bell className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  };

  // Renderizar painel de notificações
  const renderNotificationsPanel = () => {
    if (!showNotifications && !alwaysVisible) return null;

    return (
      <div className={`bg-white rounded-lg shadow-xl overflow-hidden ${
        alwaysVisible ? 'w-full' : 'w-96'
      } ${isMinimized ? 'h-12' : 'max-h-96'}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Notificações
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-3 h-3" />
                  {!compact && 'Marcar todas'}
                </button>
              )}
              
              {alwaysVisible && (
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title={isMinimized ? 'Expandir' : 'Minimizar'}
                >
                  <ChevronDown className={`w-4 h-4 ${isMinimized ? 'rotate-180' : ''}`} />
                </button>
              )}
              
              {!alwaysVisible && (
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de notificações */}
        {!isMinimized && (
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">Carregando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhuma notificação</p>
                <p className="text-xs text-gray-400 mt-1">
                  Você está em dia com tudo!
                </p>
              </div>
            ) : (
              notifications.slice(0, compact ? 3 : 10).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  } ${compact ? 'p-2' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`text-sm mt-0.5 ${compact ? 'text-xs' : ''}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-medium text-gray-900 ${
                          !notification.read ? 'font-semibold' : ''
                        } ${compact ? 'text-xs' : ''}`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2 ml-2">
                          <span className={`text-xs text-gray-500 whitespace-nowrap ${
                            compact ? 'text-xs' : ''
                          }`}>
                            {formatNotificationTime(notification.created_at)}
                          </span>
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100"
                              title="Marcar como lida"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm text-gray-600 mt-1 line-clamp-2 ${
                        compact ? 'text-xs line-clamp-1' : ''
                      }`}>
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        {!isMinimized && notifications.length > (compact ? 3 : 10) && (
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-center text-gray-500">
              Mostrando {compact ? 3 : 10} de {notifications.length} notificações
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={getPositionStyles()} ref={notificationRef}>
      {alwaysVisible ? (
        renderNotificationsPanel()
      ) : (
        <div className="relative">
          {renderToggleButton()}
          {renderNotificationsPanel()}
        </div>
      )}
    </div>
  );
};

export default InternalNotifications;
