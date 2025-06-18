import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, X, Check, CheckCheck, Clock } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

interface CRMHeaderProps {
  user: any;
  onLogout?: () => void;
  activeModule?: string;
  onNavigate?: (module: string) => void;
  showSearch?: boolean;
}

const CRMHeader: React.FC<CRMHeaderProps> = ({ 
  user, 
  onLogout,
  activeModule = 'Relatório',
  onNavigate,
  showSearch = true 
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const notificationRef = useRef<HTMLDivElement>(null);
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    addNotification 
  } = useNotifications();

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Função para obter título do módulo
  const getModuleTitle = () => {
    switch (activeModule) {
      case 'Pipeline': return 'Pipeline de Vendas';
      case 'Criador de pipeline': return 'Criador de Pipeline';
      case 'Vendedores': return 'Gerenciar Vendedores';
      case 'Meta': return 'Metas e Objetivos';
      case 'Leads': return 'Gerenciar Leads';
      case 'Relatório': return 'Relatórios e Analytics';
      case 'Acompanhamento': return 'Acompanhamento';
      case 'Clientes': return 'Gerenciar Clientes';
      case 'Feedback': return 'Feedback do Sistema';
      case 'Integrações': return 'Integrações';
      case 'Cadências': return 'Cadências de Follow-up';
      case 'Criador de formulários': return 'Criador de Formulários';
      case 'Calendário Público': return 'Calendário Público';
      case 'Encurtador de URL': return 'Encurtador de URL';
      default: return activeModule;
    }
  };

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
    
    setShowNotifications(false);
  };

  // Converter URL para nome do módulo
  const getModuleFromUrl = (url: string): string | null => {
    if (url.includes('pipeline')) return 'Pipeline';
    if (url.includes('leads')) return 'Leads';
    if (url.includes('meta')) return 'Meta';
    if (url.includes('vendedores')) return 'Vendedores';
    return null;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left section - Module title */}
        <div className="flex items-center space-x-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{getModuleTitle()}</h1>
          </div>
        </div>

        {/* Center section - Search */}
        {showSearch && (
          <div className="flex-1 max-w-md mx-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  try {
                    setSearchTerm(e.target.value);
                  } catch (error) {
                    console.info('Erro na busca:', error);
                  }
                }}
                placeholder={`Buscar em ${activeModule?.toLowerCase() || 'módulo'}...`}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    try {
                      setSearchTerm('');
                    } catch (error) {
                      console.info('Erro ao limpar busca:', error);
                    }
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown de Notificações */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 max-h-96 overflow-hidden z-50">
                {/* Header do dropdown */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Notificações
                      {unreadCount > 0 && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({unreadCount} não lida{unreadCount > 1 ? 's' : ''})
                        </span>
                      )}
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <CheckCheck className="w-4 h-4" />
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de notificações */}
                <div className="max-h-80 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">Carregando notificações...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Nenhuma notificação</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Você está em dia com tudo!
                      </p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-lg mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h4 className={`text-sm font-medium text-gray-900 ${
                                !notification.read ? 'font-semibold' : ''
                              }`}>
                                {notification.title}
                              </h4>
                              <div className="flex items-center space-x-2 ml-2">
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {formatNotificationTime(notification.created_at)}
                                </span>
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Marcar como lida"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer do dropdown */}
                {notifications.length > 0 && (
                  <div className="p-3 border-t border-gray-100 bg-gray-50">
                    <button 
                      onClick={() => {
                        setShowNotifications(false);
                        // Navegar para página de notificações se existir
                        if (onNavigate) {
                          // onNavigate('Notificações');
                        }
                      }}
                      className="w-full text-sm text-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Ver todas as notificações
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User avatar */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Vendedor'}
              </div>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
              {user?.first_name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CRMHeader;
