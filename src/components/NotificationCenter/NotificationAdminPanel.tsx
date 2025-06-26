import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Users, 
  Calendar, 
  BarChart3, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Image,
  Link,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

// Sistema de logs condicionais
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'warn';
const isDebugMode = LOG_LEVEL === 'debug';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'admin' | 'member';
}

interface NotificationTemplate {
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'novidades' | 'atualizacoes' | 'comunicados';
  priority: 'low' | 'medium' | 'high';
  targetRole?: 'super_admin' | 'admin' | 'member';
  targetUsers: string[];
  richContent: {
    image_url?: string;
    action_button?: string;
    action_url?: string;
  };
  scheduledFor?: string;
  expiresAt?: string;
}

interface NotificationAdminPanelProps {
  className?: string;
}

export const NotificationAdminPanel: React.FC<NotificationAdminPanelProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'analytics'>('create');
  
  // Estados para criação
  const [notification, setNotification] = useState<NotificationTemplate>({
    title: '',
    message: '',
    type: 'info',
    category: 'comunicados',
    priority: 'medium',
    targetUsers: [],
    richContent: {}
  });
  
  // Estados para gestão
  const [users, setUsers] = useState<User[]>([]);
  const [existingNotifications, setExistingNotifications] = useState([]);
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Verificar se é super admin
  const isSuperAdmin = user?.role === 'super_admin';

  // Health check da API usando sistema universal
  const checkApiHealth = async (): Promise<boolean> => {
    try {
      const { networkHealth } = await import('../../utils/networkHealthCheck');
      const result = await networkHealth.checkBackendHealth();
      return result.isHealthy;
    } catch {
      return false;
    }
  };

  // Carregar usuários com fallback graceful
  const loadUsers = async () => {
    try {
      const apiHealthy = await checkApiHealth();
      if (!apiHealthy) {
        if (isDebugMode) {
          console.log('📋 NotificationAdmin: API indisponível (modo demo)');
        }
        setUsers([]);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        
        if (isDebugMode) {
          console.log(`📋 NotificationAdmin: ${data.users?.length || 0} usuários carregados`);
        }
      } else if (isDebugMode) {
        console.log('📋 NotificationAdmin: Erro ao carregar usuários (API indisponível)');
      }
    } catch (error: any) {
      if (isDebugMode) {
        console.log('📋 NotificationAdmin: Erro de conexão ao carregar usuários:', error.message);
      }
      setUsers([]);
    }
  };

  // Carregar notificações com fallback graceful
  const loadNotifications = async () => {
    try {
      const apiHealthy = await checkApiHealth();
      if (!apiHealthy) {
        if (isDebugMode) {
          console.log('📋 NotificationAdmin: API indisponível para notificações');
        }
        setExistingNotifications([]);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/notifications/admin`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        setExistingNotifications(data.data?.notifications || []);
        
        if (isDebugMode) {
          console.log(`📋 NotificationAdmin: ${data.data?.notifications?.length || 0} notificações carregadas`);
        }
      } else if (isDebugMode) {
        console.log('📋 NotificationAdmin: Erro ao carregar notificações existentes');
      }
    } catch (error: any) {
      if (isDebugMode) {
        console.log('📋 NotificationAdmin: Erro de conexão ao carregar notificações:', error.message);
      }
      setExistingNotifications([]);
    }
  };

  // Carregar analytics com fallback graceful
  const loadAnalytics = async () => {
    try {
      const apiHealthy = await checkApiHealth();
      if (!apiHealthy) {
        if (isDebugMode) {
          console.log('📋 NotificationAdmin: API indisponível para analytics');
        }
        setAnalytics(null);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/notifications/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
        
        if (isDebugMode) {
          console.log('📋 NotificationAdmin: Analytics carregados');
        }
      } else if (isDebugMode) {
        console.log('📋 NotificationAdmin: Erro ao carregar analytics');
      }
    } catch (error: any) {
      if (isDebugMode) {
        console.log('📋 NotificationAdmin: Erro de conexão ao carregar analytics:', error.message);
      }
      setAnalytics(null);
    }
  };

  // Criar notificação com fallback graceful
  const createNotification = async () => {
    if (!notification.title || !notification.message) {
      setError('Título e mensagem são obrigatórios');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const apiHealthy = await checkApiHealth();
      if (!apiHealthy) {
        setError('Sistema de notificações temporariamente indisponível');
        setIsLoading(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/notifications/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(notification),
        signal: AbortSignal.timeout(10000)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Notificação criada com sucesso!');
        // Limpar formulário
        setNotification({
          title: '',
          message: '',
          type: 'info',
          category: 'comunicados',
          priority: 'medium',
          targetUsers: [],
          richContent: {}
        });
        // Recarregar notificações
        loadNotifications();
        
        if (isDebugMode) {
          console.log('📋 NotificationAdmin: Notificação criada com sucesso');
        }
      } else {
        setError(data.error || 'Erro ao criar notificação');
        if (isDebugMode) {
          console.log('📋 NotificationAdmin: Erro ao criar notificação:', data.error);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Timeout - Sistema temporariamente indisponível');
      } else {
        setError('Erro de conexão - Tente novamente');
      }
      
      if (isDebugMode) {
        console.log('📋 NotificationAdmin: Erro de conexão ao criar notificação:', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar usuários
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Carregar dados iniciais
  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
      loadNotifications();
      loadAnalytics();
    }
  }, [isSuperAdmin]);

  // Limpar mensagens após 5 segundos
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (!isSuperAdmin) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Acesso Restrito</h3>
        <p className="text-gray-600">Apenas Super Admins podem acessar o painel de notificações.</p>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Centro de Notificações Enterprise
        </h1>
        <p className="text-gray-600">
          Crie, gerencie e analise notificações para sua equipe
        </p>
      </div>

      {/* Mensagens de feedback */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} className="text-red-500" />
          <span className="text-red-700">{error}</span>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
        >
          <CheckCircle size={20} className="text-green-500" />
          <span className="text-green-700">{success}</span>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'create', label: 'Criar Notificação', icon: Plus },
            { id: 'manage', label: 'Gerenciar', icon: Edit },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo das tabs */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário de criação */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Send size={20} />
                Nova Notificação
              </h3>

              {/* Título */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={notification.title}
                  onChange={(e) => setNotification(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o título da notificação"
                />
              </div>

              {/* Mensagem */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem *
                </label>
                <textarea
                  value={notification.message}
                  onChange={(e) => setNotification(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite a mensagem da notificação"
                />
              </div>

              {/* Configurações básicas */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={notification.type}
                    onChange={(e) => setNotification(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">Informação</option>
                    <option value="success">Sucesso</option>
                    <option value="warning">Aviso</option>
                    <option value="error">Erro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={notification.category}
                    onChange={(e) => setNotification(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="novidades">Novidades</option>
                    <option value="atualizacoes">Atualizações</option>
                    <option value="comunicados">Comunicados</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridade
                  </label>
                  <select
                    value={notification.priority}
                    onChange={(e) => setNotification(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              {/* Rich Content */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Image size={16} />
                  Conteúdo Rico (Opcional)
                </h4>
                
                <div className="space-y-3">
                  <input
                    type="url"
                    value={notification.richContent.image_url || ''}
                    onChange={(e) => setNotification(prev => ({
                      ...prev,
                      richContent: { ...prev.richContent, image_url: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="URL da imagem"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={notification.richContent.action_button || ''}
                      onChange={(e) => setNotification(prev => ({
                        ...prev,
                        richContent: { ...prev.richContent, action_button: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Texto do botão"
                    />
                    
                    <input
                      type="url"
                      value={notification.richContent.action_url || ''}
                      onChange={(e) => setNotification(prev => ({
                        ...prev,
                        richContent: { ...prev.richContent, action_url: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="URL do botão"
                    />
                  </div>
                </div>
              </div>

              {/* Agendamento */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Clock size={16} />
                    Agendar Para
                  </label>
                  <input
                    type="datetime-local"
                    value={notification.scheduledFor || ''}
                    onChange={(e) => setNotification(prev => ({ ...prev, scheduledFor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expira Em
                  </label>
                  <input
                    type="datetime-local"
                    value={notification.expiresAt || ''}
                    onChange={(e) => setNotification(prev => ({ ...prev, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Botão de envio */}
              <button
                onClick={createNotification}
                disabled={isLoading || !notification.title || !notification.message}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send size={16} />
                )}
                {isLoading ? 'Enviando...' : 'Enviar Notificação'}
              </button>
            </div>
          </div>

          {/* Targeting de usuários */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target size={20} />
                Destinatários
              </h3>

              {/* Targeting por role */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enviar para Role
                </label>
                <select
                  value={notification.targetRole || ''}
                  onChange={(e) => setNotification(prev => ({ 
                    ...prev, 
                    targetRole: e.target.value as any,
                    targetUsers: [] // Limpar usuários específicos
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar usuários específicos</option>
                  <option value="admin">Todos os Admins</option>
                  <option value="member">Todos os Membros</option>
                  <option value="super_admin">Todos os Super Admins</option>
                </select>
              </div>

              {/* Targeting específico */}
              {!notification.targetRole && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuários Específicos
                  </label>
                  
                  {/* Busca */}
                  <div className="relative mb-3">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Buscar usuários..."
                    />
                  </div>

                  {/* Lista de usuários */}
                  <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                    {filteredUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={notification.targetUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNotification(prev => ({
                                ...prev,
                                targetUsers: [...prev.targetUsers, user.id]
                              }));
                            } else {
                              setNotification(prev => ({
                                ...prev,
                                targetUsers: prev.targetUsers.filter(id => id !== user.id)
                              }));
                            }
                          }}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.email} • {user.role}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {notification.targetUsers.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600">
                      {notification.targetUsers.length} usuário(s) selecionado(s)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Notificações Enviadas</h3>
          
          {existingNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Send size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Nenhuma notificação enviada ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {existingNotifications.map((notif: any) => (
                <div key={notif.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{notif.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Categoria: {notif.notification_category}</span>
                        <span>Prioridade: {notif.priority}</span>
                        <span>Status: {notif.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-blue-500">
                        <Eye size={16} />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Cards de métricas */}
          {analytics?.aggregatedMetrics && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Total Enviadas</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.aggregatedMetrics.totalSent}</p>
                  </div>
                  <Send className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Taxa de Leitura</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.aggregatedMetrics.overallReadRate}%</p>
                  </div>
                  <Eye className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Taxa de Clique</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.aggregatedMetrics.overallClickRate}%</p>
                  </div>
                  <Link className="h-8 w-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Total Lidas</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.aggregatedMetrics.totalRead}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}; 