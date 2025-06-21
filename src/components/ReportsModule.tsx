
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  Filter,
  Search,
  Eye,
  Clock,
  AlertTriangle,
  BarChart3
} from 'lucide-react';

interface ConsolidatedMetrics {
  total_companies: number;
  total_leads: number;
  total_mqls: number;
  total_sales: number;
  avg_conversion_rate: number;
  global_avg_ticket: number;
  total_revenue: number;
}

interface CompanyPerformance {
  company_id: string;
  company_name: string;
  city: string;
  state: string;
  industry: string;
  expected_leads_monthly: number;
  leads_received: number;
  expected_sales_monthly: number;
  sales_closed: number;
  expected_followers_monthly: number;
  conversion_rate: number;
  avg_ticket: number;
  origem_breakdown: Record<string, number>;
  time_to_mql_days: number;
  time_to_close_days: number;
  stalled_leads: number;
}

interface CompanyDetailModal {
  isOpen: boolean;
  company: CompanyPerformance | null;
}

const ReportsModule: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ConsolidatedMetrics | null>(null);
  const [companies, setCompanies] = useState<CompanyPerformance[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyPerformance[]>([]);
  
  // Filtros
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    companySearch: '',
    origem: '',
    status: ''
  });

  // Modal de detalhes
  const [detailModal, setDetailModal] = useState<CompanyDetailModal>({
    isOpen: false,
    company: null
  });

  // Verificar se é super_admin
  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Acesso Negado</h3>
          <p className="text-gray-600">Apenas Super Admins podem acessar os relatórios.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, [filters.startDate, filters.endDate, filters.origem]);

  useEffect(() => {
    applyFilters();
  }, [companies, filters.companySearch, filters.status]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados básicos das empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (companiesError) {
        console.error('Erro ao carregar empresas:', companiesError);
        setCompanies([]);
        setMetrics({
          total_companies: 0,
          total_leads: 0,
          total_mqls: 0,
          total_sales: 0,
          avg_conversion_rate: 0,
          global_avg_ticket: 0,
          total_revenue: 0
        });
        return;
      }

      // Simular dados de performance para demonstração
      const companiesPerformance: CompanyPerformance[] = (companiesData || []).map(company => ({
        company_id: company.id,
        company_name: company.name,
        city: company.city || 'Não informado',
        state: company.state || 'SP',
        industry: company.industry || 'Não informado',
        expected_leads_monthly: company.expected_leads_monthly || 0,
        leads_received: Math.floor((company.expected_leads_monthly || 0) * (0.7 + Math.random() * 0.6)),
        expected_sales_monthly: company.expected_sales_monthly || 0,
        sales_closed: Math.floor((company.expected_sales_monthly || 0) * (0.6 + Math.random() * 0.4)),
        expected_followers_monthly: company.expected_followers_monthly || 0,
        conversion_rate: Math.round((5 + Math.random() * 25) * 10) / 10,
        avg_ticket: Math.round((500 + Math.random() * 4500) * 100) / 100,
        origem_breakdown: {
          'Meta': Math.floor(Math.random() * 50),
          'Google': Math.floor(Math.random() * 30),
          'Manual': Math.floor(Math.random() * 20)
        },
        time_to_mql_days: Math.floor(1 + Math.random() * 14),
        time_to_close_days: Math.floor(7 + Math.random() * 45),
        stalled_leads: Math.floor(Math.random() * 10)
      }));

      setCompanies(companiesPerformance);

      // Calcular métricas consolidadas
      const totalCompanies = companiesPerformance.length;
      const totalLeads = companiesPerformance.reduce((sum, c) => sum + c.leads_received, 0);
      const totalSales = companiesPerformance.reduce((sum, c) => sum + c.sales_closed, 0);
      const avgConversionRate = totalCompanies > 0 
        ? companiesPerformance.reduce((sum, c) => sum + c.conversion_rate, 0) / totalCompanies 
        : 0;
      const globalAvgTicket = totalCompanies > 0
        ? companiesPerformance.reduce((sum, c) => sum + c.avg_ticket, 0) / totalCompanies
        : 0;

      setMetrics({
        total_companies: totalCompanies,
        total_leads: totalLeads,
        total_mqls: Math.floor(totalLeads * 0.6),
        total_sales: totalSales,
        avg_conversion_rate: Math.round(avgConversionRate * 10) / 10,
        global_avg_ticket: Math.round(globalAvgTicket * 100) / 100,
        total_revenue: Math.round(totalSales * globalAvgTicket * 100) / 100
      });

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setCompanies([]);
      setMetrics({
        total_companies: 0,
        total_leads: 0,
        total_mqls: 0,
        total_sales: 0,
        avg_conversion_rate: 0,
        global_avg_ticket: 0,
        total_revenue: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = companies;

    // Filtro por nome da empresa
    if (filters.companySearch) {
      filtered = filtered.filter(company =>
        company.company_name.toLowerCase().includes(filters.companySearch.toLowerCase())
      );
    }

    // Filtro por status (baseado na taxa de conversão)
    if (filters.status) {
      filtered = filtered.filter(company => {
        switch (filters.status) {
          case 'high_performance':
            return company.conversion_rate >= 20;
          case 'medium_performance':
            return company.conversion_rate >= 10 && company.conversion_rate < 20;
          case 'low_performance':
            return company.conversion_rate < 10;
          case 'stalled':
            return company.stalled_leads > 0;
          default:
            return true;
        }
      });
    }

    setFilteredCompanies(filtered);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getOrigemLabel = (origem: string) => {
    const labels: Record<string, string> = {
      'Meta': 'Meta Ads',
      'Google': 'Google Ads',
      'Manual': 'Manual',
      'Webhook': 'Webhook',
      'Não informado': 'Não informado'
    };
    return labels[origem] || origem;
  };

  const openCompanyDetail = (company: CompanyPerformance) => {
    setDetailModal({
      isOpen: true,
      company
    });
  };

  const closeCompanyDetail = () => {
    setDetailModal({
      isOpen: false,
      company: null
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios Estratégicos</h1>
          <p className="text-gray-600">Visão consolidada de performance de todas as empresas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar empresa..."
                value={filters.companySearch}
                onChange={(e) => setFilters(prev => ({ ...prev, companySearch: e.target.value }))}
                className="w-full pl-9 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Canal
            </label>
            <select
              value={filters.origem}
              onChange={(e) => setFilters(prev => ({ ...prev, origem: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os canais</option>
              <option value="Meta">Meta Ads</option>
              <option value="Google">Google Ads</option>
              <option value="Manual">Manual</option>
              <option value="Webhook">Webhook</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Performance
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              <option value="high_performance">Alta (≥20%)</option>
              <option value="medium_performance">Média (10-20%)</option>
              <option value="low_performance">Baixa (&lt;10%)</option>
              <option value="stalled">Com Leads Parados</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPIs Consolidados */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Empresas</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.total_companies}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversão Média Global</p>
                <p className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.avg_conversion_rate)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ticket Médio Global</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.global_avg_ticket)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.total_sales}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Performance por Empresa */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance por Empresa</h3>
          <p className="text-sm text-gray-600">
            Mostrando {filteredCompanies.length} de {companies.length} empresas
          </p>
        </div>

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
                  Leads (Exp/Real)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendas (Exp/Real)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversão
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Médio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Principais Canais
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCompanies.map((company) => (
                <tr key={company.company_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {company.company_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {company.industry}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {company.city}/{company.state}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {company.expected_leads_monthly} / {company.leads_received}
                    </div>
                    <div className={`text-xs ${
                      company.leads_received >= company.expected_leads_monthly 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {company.leads_received >= company.expected_leads_monthly ? '✓ Meta atingida' : '⚠ Abaixo da meta'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {company.expected_sales_monthly} / {company.sales_closed}
                    </div>
                    <div className={`text-xs ${
                      company.sales_closed >= company.expected_sales_monthly 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {company.sales_closed >= company.expected_sales_monthly ? '✓ Meta atingida' : '⚠ Abaixo da meta'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      company.conversion_rate >= 20 
                        ? 'bg-green-100 text-green-800'
                        : company.conversion_rate >= 10
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {formatPercentage(company.conversion_rate)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(company.avg_ticket)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(company.origem_breakdown || {})
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 2)
                        .map(([origem, count]) => (
                          <span 
                            key={origem}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800"
                          >
                            {getOrigemLabel(origem)}: {count}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openCompanyDetail(company)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Detalhes</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes da Empresa */}
      {detailModal.isOpen && detailModal.company && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {detailModal.company.company_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {detailModal.company.industry} • {detailModal.company.city}/{detailModal.company.state}
                </p>
              </div>
              <button
                onClick={closeCompanyDetail}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Métricas Avançadas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Tempo para MQL</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-2">
                    {detailModal.company.time_to_mql_days} dias
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Tempo para Fechamento</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-2">
                    {detailModal.company.time_to_close_days} dias
                  </p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-900">Leads Parados</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900 mt-2">
                    {detailModal.company.stalled_leads}
                  </p>
                </div>
              </div>

              {/* Detalhamento por Canal */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Origem das Vendas</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(detailModal.company.origem_breakdown || {}).map(([origem, count]) => (
                    <div key={origem} className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-sm font-medium text-gray-700">{getOrigemLabel(origem)}</p>
                      <p className="text-xl font-bold text-gray-900">{count}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expectativas vs Realidade */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Expectativas vs Realidade</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium">Leads Mensais</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Esperado: {detailModal.company.expected_leads_monthly}
                      </p>
                      <p className="text-sm font-medium">
                        Atual: {detailModal.company.leads_received}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium">Vendas Mensais</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Esperado: {detailModal.company.expected_sales_monthly}
                      </p>
                      <p className="text-sm font-medium">
                        Atual: {detailModal.company.sales_closed}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium">Seguidores Mensais</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Esperado: {detailModal.company.expected_followers_monthly}
                      </p>
                      <p className="text-sm font-medium text-gray-500">
                        Dados não disponíveis
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsModule;
