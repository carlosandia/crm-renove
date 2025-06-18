
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, TrendingUp, Users, Target, Calendar, Filter, ChevronDown, ChevronRight, Eye } from 'lucide-react';

interface CompanyMetrics {
  id: string;
  name: string;
  city: string;
  state: string;
  industry: string;
  expected_leads_monthly: number;
  expected_sales_monthly: number;
  expected_followers_monthly: number;
  total_leads: number;
  mql_leads: number;
  closed_leads: number;
  avg_ticket: number;
  conversion_rate: number;
  origem_distribution: Record<string, number>;
}

interface Filters {
  period: string;
  startDate: string;
  endDate: string;
  channel: string;
  company: string;
  status: string;
}

const ReportsModule: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyMetrics[]>([]);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<{ show: boolean; company: CompanyMetrics | null }>({
    show: false,
    company: null
  });
  
  const [filters, setFilters] = useState<Filters>({
    period: '30days',
    startDate: '',
    endDate: '',
    channel: 'all',
    company: '',
    status: 'all'
  });

  // Verificar se é super_admin
  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">🚫</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Acesso Restrito</h3>
          <p className="text-gray-600">Apenas super administradores podem acessar os relatórios.</p>
        </div>
      </div>
    );
  }

  const fetchCompaniesData = async () => {
    setLoading(true);
    try {
      let startDate = '';
      let endDate = '';

      // Calcular período baseado no filtro
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      switch (filters.period) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          endDate = today;
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          endDate = today;
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          endDate = today;
          break;
        case 'custom':
          startDate = filters.startDate;
          endDate = filters.endDate;
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          endDate = today;
      }

      // Buscar empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (companiesError) throw companiesError;

      // Buscar métricas para cada empresa
      const companiesWithMetrics = await Promise.all(
        companiesData.map(async (company) => {
          // Buscar leads da empresa
          let leadsQuery = supabase
            .from('leads_master')
            .select('*')
            .eq('company_id', company.id)
            .gte('created_at', startDate)
            .lte('created_at', endDate + 'T23:59:59');

          if (filters.channel !== 'all') {
            leadsQuery = leadsQuery.eq('origem', filters.channel);
          }

          if (filters.status !== 'all') {
            leadsQuery = leadsQuery.eq('status', filters.status);
          }

          const { data: leadsData } = await leadsQuery;
          const leads = leadsData || [];

          // Calcular métricas
          const totalLeads = leads.length;
          const mqls = leads.filter(lead => lead.is_mql).length;
          const closedLeads = leads.filter(lead => lead.status === 'converted').length;
          const avgTicket = leads
            .filter(lead => lead.status === 'converted' && lead.valor > 0)
            .reduce((sum, lead, _, arr) => sum + (lead.valor / arr.length), 0) || 0;
          
          const conversionRate = mqls > 0 ? Math.round((closedLeads / mqls) * 100 * 100) / 100 : 0;

          // Distribuição por origem
          const origemDistribution = leads.reduce((acc, lead) => {
            const origem = lead.origem || 'Manual';
            acc[origem] = (acc[origem] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return {
            ...company,
            total_leads: totalLeads,
            mql_leads: mqls,
            closed_leads: closedLeads,
            avg_ticket: avgTicket,
            conversion_rate: conversionRate,
            origem_distribution: origemDistribution
          };
        })
      );

      setCompanies(companiesWithMetrics);
    } catch (error) {
      console.error('Erro ao buscar dados das empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompaniesData();
  }, [filters]);

  // Métricas agregadas
  const aggregatedMetrics = {
    totalCompanies: companies.length,
    avgConversion: companies.length > 0 
      ? Math.round((companies.reduce((sum, c) => sum + c.conversion_rate, 0) / companies.length) * 100) / 100 
      : 0,
    avgTicket: companies.length > 0 
      ? Math.round((companies.reduce((sum, c) => sum + c.avg_ticket, 0) / companies.length) * 100) / 100 
      : 0,
    totalSales: companies.reduce((sum, c) => sum + c.closed_leads, 0)
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios Estratégicos</h1>
          <p className="text-gray-600 mt-1">Visão geral de performance de todas as empresas</p>
        </div>
      </div>

      {/* Dashboard Superior */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Empresas</p>
              <p className="text-2xl font-bold text-gray-900">{aggregatedMetrics.totalCompanies}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversão Média</p>
              <p className="text-2xl font-bold text-gray-900">{aggregatedMetrics.avgConversion}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(aggregatedMetrics.avgTicket)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
              <p className="text-2xl font-bold text-gray-900">{aggregatedMetrics.totalSales}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          
          <select
            value={filters.period}
            onChange={(e) => setFilters({ ...filters, period: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7days">Últimos 7 dias</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="month">Mês atual</option>
            <option value="custom">Período customizado</option>
          </select>

          {filters.period === 'custom' && (
            <>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </>
          )}

          <select
            value={filters.channel}
            onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Todos os canais</option>
            <option value="Meta">Meta</option>
            <option value="Google">Google</option>
            <option value="Manual">Manual</option>
            <option value="Webhook">Webhook</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="active">Em andamento</option>
            <option value="converted">Ganho</option>
            <option value="lost">Perdido</option>
          </select>
        </div>
      </div>

      {/* Tabela de Empresas */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Localização
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nicho
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leads (Meta/Real)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendas (Meta/Real)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxa Conv.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Médio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Carregando dados...</span>
                    </div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Nenhuma empresa encontrada
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{company.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.city}/{company.state}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.industry}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {company.expected_leads_monthly}/{company.total_leads}
                      </div>
                      <div className="text-xs text-gray-500">
                        {company.expected_leads_monthly > 0 
                          ? Math.round((company.total_leads / company.expected_leads_monthly) * 100) 
                          : 0}% da meta
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {company.expected_sales_monthly}/{company.closed_leads}
                      </div>
                      <div className="text-xs text-gray-500">
                        {company.expected_sales_monthly > 0 
                          ? Math.round((company.closed_leads / company.expected_sales_monthly) * 100) 
                          : 0}% da meta
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        company.conversion_rate >= 10 
                          ? 'bg-green-100 text-green-800'
                          : company.conversion_rate >= 5
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.conversion_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(company.avg_ticket)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setDetailModal({ show: true, company })}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {detailModal.show && detailModal.company && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalhes - {detailModal.company.name}
              </h3>
              <button
                onClick={() => setDetailModal({ show: false, company: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informações da Empresa</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Localização:</span> {detailModal.company.city}/{detailModal.company.state}</div>
                  <div><span className="font-medium">Nicho:</span> {detailModal.company.industry}</div>
                  <div><span className="font-medium">Meta Leads:</span> {detailModal.company.expected_leads_monthly}/mês</div>
                  <div><span className="font-medium">Meta Vendas:</span> {detailModal.company.expected_sales_monthly}/mês</div>
                  <div><span className="font-medium">Meta Seguidores:</span> {detailModal.company.expected_followers_monthly}/mês</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Performance Atual</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Total de Leads:</span> {detailModal.company.total_leads}</div>
                  <div><span className="font-medium">MQLs:</span> {detailModal.company.mql_leads}</div>
                  <div><span className="font-medium">Vendas Fechadas:</span> {detailModal.company.closed_leads}</div>
                  <div><span className="font-medium">Taxa de Conversão:</span> {detailModal.company.conversion_rate}%</div>
                  <div><span className="font-medium">Ticket Médio:</span> {formatCurrency(detailModal.company.avg_ticket)}</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Origem das Vendas</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(detailModal.company.origem_distribution).map(([origem, count]) => (
                  <div key={origem} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-600">{origem}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsModule;
