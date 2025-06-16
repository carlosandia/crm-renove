import React, { useState, useEffect } from 'react';
import { useMCP } from '../hooks/useMCP';

interface MCPDashboardProps {
  tenantId: string;
}

const MCPDashboard: React.FC<MCPDashboardProps> = ({ tenantId }) => {
  const {
    loading,
    error,
    getUsers,
    getCompanies,
    getLeads,
    getDashboardStats,
    getMCPStatus
  } = useMCP();

  const [stats, setStats] = useState({
    users: 0,
    companies: 0,
    leads: 0
  });

  const [mcpStatus, setMcpStatus] = useState<{
    message: string;
    timestamp: string;
    version: string;
  } | null>(null);

  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentCompanies, setRecentCompanies] = useState<any[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    loadMCPStatus();
  }, [tenantId]);

  const loadDashboardData = async () => {
    try {
      // Carregar estatísticas
      const dashboardStats = await getDashboardStats(tenantId);
      setStats(dashboardStats);

      // Carregar dados recentes
      const [users, companies, leads] = await Promise.all([
        getUsers({ tenant_id: tenantId, limit: 5 }),
        getCompanies({ tenant_id: tenantId, limit: 5 }),
        getLeads({ tenant_id: tenantId, limit: 5 })
      ]);

      setRecentUsers(users);
      setRecentCompanies(companies);
      setRecentLeads(leads);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    }
  };

  const loadMCPStatus = async () => {
    try {
      const status = await getMCPStatus();
      setMcpStatus(status);
    } catch (err) {
      console.error('Erro ao carregar status do MCP:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Carregando dashboard MCP...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Erro:</strong> {error}
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">MCP Dashboard</h1>
          <p className="text-gray-600">
            Sistema de Gerenciamento CRM com integração MCP
          </p>
        </div>

        {/* Status do MCP */}
        {mcpStatus && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <div className="flex items-center justify-between">
              <div>
                <strong>Status MCP:</strong> {mcpStatus.message}
              </div>
              <div className="text-sm">
                Versão: {mcpStatus.version} | Atualizado: {new Date(mcpStatus.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">👤</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Usuários</p>
                <p className="text-2xl font-bold text-gray-900">{stats.users}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">🏢</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Empresas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.companies}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">🎯</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Leads</p>
                <p className="text-2xl font-bold text-gray-900">{stats.leads}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dados Recentes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Usuários Recentes */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Usuários Recentes</h3>
            </div>
            <div className="p-6">
              {recentUsers.length > 0 ? (
                <div className="space-y-3">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {user.email} • {user.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum usuário encontrado</p>
              )}
            </div>
          </div>

          {/* Empresas Recentes */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Empresas Recentes</h3>
            </div>
            <div className="p-6">
              {recentCompanies.length > 0 ? (
                <div className="space-y-3">
                  {recentCompanies.map((company) => (
                    <div key={company.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-green-700">🏢</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {company.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {company.segment || 'Sem segmento'} • {company.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nenhuma empresa encontrada</p>
              )}
            </div>
          </div>

          {/* Leads Recentes */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Leads Recentes</h3>
            </div>
            <div className="p-6">
              {recentLeads.length > 0 ? (
                <div className="space-y-3">
                  {recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-purple-700">🎯</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {lead.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {lead.email || 'Sem email'} • {lead.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum lead encontrado</p>
              )}
            </div>
          </div>
        </div>

        {/* Botão de Recarregar */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Carregando...' : 'Recarregar Dados'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MCPDashboard; 