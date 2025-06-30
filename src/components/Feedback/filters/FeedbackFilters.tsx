import React, { useState, useCallback, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface FeedbackFilterState {
  searchTerm: string;
  filterType: 'all' | 'positive' | 'negative';
  companyFilter: string;
  vendorFilter: string;
  sourceFilter: string;
}

export interface FeedbackData {
  id: string;
  feedback_type: 'positive' | 'negative';
  comment: string;
  created_at: string;
  lead_id: string;
  vendedor: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  admin_empresa: {
    id: string;
    company_name: string;
    tenant_id: string;
  };
  lead: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    valor?: number;
    source?: 'meta' | 'google' | 'linkedin' | 'webhook' | 'manual' | 'form';
  };
  pipeline: {
    id: string;
    name: string;
  };
  stage: {
    id: string;
    name: string;
    color: string;
  };
}

interface FeedbackFiltersProps {
  feedbacks: FeedbackData[];
  onFiltersChange: (filteredFeedbacks: FeedbackData[]) => void;
}

interface UseFeedbackFiltersReturn {
  filters: FeedbackFilterState;
  filteredFeedbacks: FeedbackData[];
  companies: string[];
  vendors: { id: string; name: string }[];
  updateFilter: (key: keyof FeedbackFilterState, value: string) => void;
  clearFilters: () => void;
  filtersCount: number;
}

// ============================================
// HOOK PERSONALIZADO - useFeedbackFilters
// ============================================

export const useFeedbackFilters = (feedbacks: FeedbackData[]): UseFeedbackFiltersReturn => {
  // Estados dos filtros
  const [filters, setFilters] = useState<FeedbackFilterState>({
    searchTerm: '',
    filterType: 'all',
    companyFilter: '',
    vendorFilter: '',
    sourceFilter: ''
  });

  // Extrair listas únicas para os selects
  const companies = useMemo(() => {
    return [...new Set(feedbacks.map(f => f.admin_empresa.company_name))].sort();
  }, [feedbacks]);

  const vendors = useMemo(() => {
    const uniqueVendors = feedbacks.reduce((acc, feedback) => {
      const vendor = { id: feedback.vendedor.id, name: feedback.vendedor.name };
      if (!acc.find(v => v.id === vendor.id)) {
        acc.push(vendor);
      }
      return acc;
    }, [] as { id: string; name: string }[]);
    return uniqueVendors.sort((a, b) => a.name.localeCompare(b.name));
  }, [feedbacks]);

  // Função auxiliar para obter label do source
  const getSourceLabel = useCallback((source?: string): string => {
    switch (source) {
      case 'meta':
        return 'Meta Ads';
      case 'google':
        return 'Google Ads';
      case 'linkedin':
        return 'LinkedIn Ads';
      case 'webhook':
        return 'Webhook';
      case 'form':
        return 'Formulário';
      case 'manual':
        return 'Manual';
      default:
        return 'Não informado';
    }
  }, []);

  // Aplicar filtros
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(feedback => {
      // Filtro de busca - busca em múltiplos campos
      const matchesSearch = 
        feedback.comment.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        feedback.vendedor.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        feedback.admin_empresa.company_name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        feedback.lead.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        feedback.pipeline.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        feedback.stage.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        getSourceLabel(feedback.lead.source).toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      // Filtro por tipo de feedback
      const matchesType = 
        filters.filterType === 'all' || feedback.feedback_type === filters.filterType;

      // Filtro por empresa
      const matchesCompany = 
        !filters.companyFilter || feedback.admin_empresa.company_name === filters.companyFilter;

      // Filtro por vendedor
      const matchesVendor = 
        !filters.vendorFilter || feedback.vendedor.id === filters.vendorFilter;

      // Filtro por canal/source
      const matchesSource = 
        !filters.sourceFilter || feedback.lead.source === filters.sourceFilter;

      return matchesSearch && matchesType && matchesCompany && matchesVendor && matchesSource;
    });
  }, [feedbacks, filters, getSourceLabel]);

  // Atualizar filtro específico
  const updateFilter = useCallback((key: keyof FeedbackFilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Limpar todos os filtros
  const clearFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      filterType: 'all',
      companyFilter: '',
      vendorFilter: '',
      sourceFilter: ''
    });
  }, []);

  // Contar filtros ativos
  const filtersCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.filterType !== 'all') count++;
    if (filters.companyFilter) count++;
    if (filters.vendorFilter) count++;
    if (filters.sourceFilter) count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredFeedbacks,
    companies,
    vendors,
    updateFilter,
    clearFilters,
    filtersCount
  };
};

// ============================================
// COMPONENTE FEEDBACK FILTERS
// ============================================

export const FeedbackFilters: React.FC<FeedbackFiltersProps> = ({ 
  feedbacks,
  onFiltersChange 
}) => {
  const {
    filters,
    filteredFeedbacks,
    companies,
    vendors,
    updateFilter,
    clearFilters,
    filtersCount
  } = useFeedbackFilters(feedbacks);

  // Notificar mudanças nos filtros
  React.useEffect(() => {
    onFiltersChange(filteredFeedbacks);
  }, [filteredFeedbacks, onFiltersChange]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header dos Filtros */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
          {filtersCount > 0 && (
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
              {filtersCount} ativo{filtersCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {filtersCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Grid de Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Busca Geral */}
        <div className="lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              placeholder="Buscar por vendedor, empresa, lead, pipeline, canal..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filtro por Tipo */}
        <div>
          <select
            value={filters.filterType}
            onChange={(e) => updateFilter('filterType', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">Todos os Feedbacks</option>
            <option value="positive">Apenas Positivos</option>
            <option value="negative">Apenas Negativos</option>
          </select>
        </div>

        {/* Filtro por Empresa */}
        <div>
          <select
            value={filters.companyFilter}
            onChange={(e) => updateFilter('companyFilter', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todas as Empresas</option>
            {companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Vendedor */}
        <div>
          <select
            value={filters.vendorFilter}
            onChange={(e) => updateFilter('vendorFilter', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todos os Vendedores</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Canal */}
        <div>
          <select
            value={filters.sourceFilter}
            onChange={(e) => updateFilter('sourceFilter', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todos os Canais</option>
            <option value="meta">Meta Ads</option>
            <option value="google">Google Ads</option>
            <option value="linkedin">LinkedIn Ads</option>
            <option value="webhook">Webhook</option>
            <option value="form">Formulário</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      {/* Estatísticas dos Filtros */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Mostrando <span className="font-medium text-gray-900">{filteredFeedbacks.length}</span> de{' '}
            <span className="font-medium text-gray-900">{feedbacks.length}</span> feedbacks
          </span>
          {filtersCount > 0 && (
            <span className="text-purple-600">
              {((filteredFeedbacks.length / feedbacks.length) * 100).toFixed(0)}% dos resultados
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackFilters;
