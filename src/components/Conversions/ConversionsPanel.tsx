import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  RefreshCw,
  Send,
  BarChart3,
  Filter,
  Download,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BlurFade } from '../ui/blur-fade';
import { ShimmerButton } from '../ui/shimmer-button';

interface ConversionLog {
  id: string;
  lead_id: string;
  platform: 'meta' | 'google';
  event_name: string;
  status: 'pending' | 'sent' | 'failed' | 'retry';
  created_at: string;
  sent_at?: string;
  error_message?: string;
  retry_count: number;
  lead_name?: string;
  event_type?: string;
  event_data?: any;
}

interface ConversionStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  by_platform: {
    meta: number;
    google: number;
  };
  success_rate: number;
}

const ConversionsPanel: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ConversionLog[]>([]);
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filters, setFilters] = useState({
    platform: '',
    status: '',
    days: 7
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user, filters]);

  const generateMockData = () => {
    const mockStats: ConversionStats = {
      total: 45,
      sent: 38,
      failed: 5,
      pending: 2,
      by_platform: {
        meta: 28,
        google: 17
      },
      success_rate: 84.4
    };

    const mockLogs: ConversionLog[] = [
      {
        id: '1',
        lead_id: 'lead-001',
        platform: 'meta',
        event_name: 'Purchase',
        status: 'sent',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        sent_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        retry_count: 0,
        lead_name: 'Lead 001',
        event_type: 'Purchase',
        event_data: { amount: 100 }
      },
      {
        id: '2',
        lead_id: 'lead-002',
        platform: 'google',
        event_name: 'Lead',
        status: 'sent',
        created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        sent_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
        retry_count: 0,
        lead_name: 'Lead 002',
        event_type: 'Lead',
        event_data: { source: 'Google Ads' }
      },
      {
        id: '3',
        lead_id: 'lead-003',
        platform: 'meta',
        event_name: 'Lead',
        status: 'pending',
        created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        retry_count: 0,
        lead_name: 'Lead 003',
        event_type: 'Lead',
        event_data: { source: 'Meta Ads' }
      },
      {
        id: '4',
        lead_id: 'lead-004',
        platform: 'google',
        event_name: 'Purchase',
        status: 'failed',
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        error_message: 'Token inválido',
        retry_count: 2,
        lead_name: 'Lead 004',
        event_type: 'Purchase',
        event_data: { error: 'Invalid token' }
      },
      {
        id: '5',
        lead_id: 'lead-005',
        platform: 'meta',
        event_name: 'Lead',
        status: 'retry',
        created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        retry_count: 1,
        lead_name: 'Lead 005',
        event_type: 'Lead',
        event_data: { source: 'Meta Ads' }
      }
    ];

    return { mockStats, mockLogs };
  };

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Verificar se é usuário de demonstração
      const savedUser = localStorage.getItem('crm_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        // Se é usuário demo, usar dados mock
        if (userData.tenant_id === 'demo') {
          // Simular delay de API
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const { mockStats, mockLogs } = generateMockData();
          setStats(mockStats);
          setLogs(mockLogs);
          
          console.log('✅ Dados de conversão demo carregados');
          setLoading(false);
          return;
        }
      }
      
      // Para todos os usuários, usar dados mock por enquanto
      console.log('⚠️ Usando dados mock para demonstração (backend não configurado)');
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Usar dados mock
      const { mockStats, mockLogs } = generateMockData();
      setStats(mockStats);
      setLogs(mockLogs);
      
    } catch (error) {
      console.error('Erro ao carregar dados de conversão:', error);
      
      // Em caso de erro, ainda mostrar dados mock
      const { mockStats, mockLogs } = generateMockData();
      setStats(mockStats);
      setLogs(mockLogs);
    } finally {
      setLoading(false);
    }
  };

  const processQueue = async () => {
    if (!user) return;
    
    try {
      setProcessing(true);
      
      // Verificar se é usuário de demonstração
      const savedUser = localStorage.getItem('crm_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        // Se é usuário demo, simular processamento
        if (userData.tenant_id === 'demo') {
          // Simular delay de processamento
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          alert('Fila de conversões processada com sucesso! (Modo demonstração)');
          await loadData();
          setProcessing(false);
          return;
        }
      }
      
      // Para todos os usuários, simular processamento
      console.log('⚠️ Simulando processamento para demonstração (backend não configurado)');
      
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Fila processada localmente! (Modo demonstração)');
      await loadData();
      
    } catch (error) {
      console.error('Erro ao processar fila:', error);
      alert('Erro ao processar fila de conversões');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'retry': return <RefreshCw className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'retry': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Conversões</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={processQueue}
            disabled={processing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <Send className={`w-4 h-4 ${processing ? 'animate-pulse' : ''}`} />
            <span>{processing ? 'Processando...' : 'Processar Fila'}</span>
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Enviadas</p>
                <p className="text-2xl font-semibold text-green-600">{stats.sent}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Falharam</p>
                <p className="text-2xl font-semibold text-red-600">{stats.failed}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taxa de Sucesso</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.success_rate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filters.platform}
            onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todas as Plataformas</option>
            <option value="meta">Meta Ads</option>
            <option value="google">Google Ads</option>
          </select>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todos os Status</option>
            <option value="sent">Enviadas</option>
            <option value="pending">Pendentes</option>
            <option value="failed">Falharam</option>
            <option value="retry">Retry</option>
          </select>
          
          <select
            value={filters.days}
            onChange={(e) => setFilters(prev => ({ ...prev, days: parseInt(e.target.value) }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value={1}>Último dia</option>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Logs de Conversão</h3>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
              <span className="ml-2 text-gray-500">Carregando...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma conversão encontrada
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plataforma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Evento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enviado em
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <BlurFade key={log.id} delay={index * 0.05}>
                    <tr className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-600">
                              {log.lead_name?.charAt(0) || 'L'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {log.lead_name || 'Lead não identificado'}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {log.lead_id?.substring(0, 8) || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                         log.platform === 'meta' ? 'bg-blue-100 text-blue-800' :
                             log.platform === 'google' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.platform}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{log.event_type}</div>
                        {log.event_data && (
                          <div className="text-xs text-gray-500 mt-1">
                            {JSON.stringify(log.event_data)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          log.status === 'sent' ? 'bg-green-100 text-green-800' :
                          log.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          log.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.status === 'sent' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {log.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {log.status === 'failed' && <X className="w-3 h-3 mr-1" />}
                          {log.status === 'sent' ? 'Enviado' :
                           log.status === 'pending' ? 'Pendente' :
                           log.status === 'failed' ? 'Falhou' : log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString('pt-BR') : '-'}
                      </td>
                    </tr>
                  </BlurFade>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversionsPanel; 