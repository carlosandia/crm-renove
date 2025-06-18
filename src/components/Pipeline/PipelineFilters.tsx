import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, Tag, SortAsc, ChevronDown, X, Settings, Layers } from 'lucide-react';

interface Pipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  pipeline_members?: any[];
}

interface Vendor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
}

interface PipelineFiltersProps {
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  onPipelineChange: (pipeline: Pipeline | null) => void;
  onSearchChange: (search: string) => void;
  onStatusFilter: (status: string) => void;
  onDateFilter: (dateRange: { start: string; end: string }) => void;
  onAssigneeFilter: (assigneeId: string) => void;
  onSortChange: (sortBy: string, direction: 'asc' | 'desc') => void;
  availableVendors?: Vendor[];
  selectedVendorFilter?: string;
  searchFilter?: string;
  statusFilter?: string;
  showOnlyMyPipelines?: boolean;
  onToggleMyPipelines?: () => void;
  onClearFilters?: () => void;
  onVendorFilter?: (vendorId: string) => void;
  userRole?: string;
  userId?: string;
}

const PipelineFilters: React.FC<PipelineFiltersProps> = ({
  pipelines,
  selectedPipeline,
  onPipelineChange,
  onSearchChange,
  onStatusFilter,
  onDateFilter,
  onAssigneeFilter,
  onSortChange,
  availableVendors = [],
  selectedVendorFilter = '',
  searchFilter = '',
  statusFilter = '',
  showOnlyMyPipelines = false,
  onToggleMyPipelines,
  onClearFilters,
  onVendorFilter,
  userRole,
  userId
}) => {
  const [searchTerm, setSearchTerm] = useState(searchFilter);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(selectedVendorFilter);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Atualizar contador de filtros ativos
  useEffect(() => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter) count++;
    if (selectedVendor) count++;
    if (showOnlyMyPipelines) count++;
    setActiveFiltersCount(count);
  }, [searchTerm, statusFilter, selectedVendor, showOnlyMyPipelines]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearchChange(value);
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendor(vendorId);
    if (onVendorFilter) {
      onVendorFilter(vendorId);
    }
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedVendor('');
    onSearchChange('');
    onStatusFilter('');
    if (onVendorFilter) onVendorFilter('');
    if (onClearFilters) onClearFilters();
  };

  // Obter vendedores da pipeline selecionada (para admin)
  const getVendorsFromSelectedPipeline = () => {
    if (!selectedPipeline?.pipeline_members) return [];
    
    return selectedPipeline.pipeline_members
      .map(pm => pm.users || pm.member)
      .filter(Boolean)
      .filter(vendor => vendor.is_active !== false);
  };

  const vendorsToShow = userRole === 'admin' && selectedPipeline 
    ? getVendorsFromSelectedPipeline() 
    : availableVendors;

  return (
    <div className="px-4 pb-2">
      {/* Container principal com design moderno */}
      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
        
        {/* Seção de controle para Admin */}
        {userRole === 'admin' && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-900">Controles de Admin</span>
              </div>
              
              {activeFiltersCount > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={handleClearAllFilters}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Limpar Tudo</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toggle: Minhas vs Todas as Pipelines */}
              {onToggleMyPipelines && (
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={showOnlyMyPipelines}
                      onChange={onToggleMyPipelines}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Mostrar apenas minhas pipelines
                      </span>
                      <p className="text-xs text-gray-500">
                        {showOnlyMyPipelines 
                          ? 'Exibindo apenas pipelines criadas por você' 
                          : 'Exibindo todas as pipelines do tenant'
                        }
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Seletor de Pipeline Aprimorado */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Pipeline Ativa
                </label>
                <div className="relative">
                  <select 
                    value={selectedPipeline?.id || ''} 
                    onChange={(e) => {
                      const pipeline = pipelines.find(p => p.id === e.target.value);
                      onPipelineChange(pipeline || null);
                    }}
                    className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full transition-colors"
                  >
                    {pipelines.map(pipeline => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between gap-4">
          {/* Barra de busca aprimorada */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar leads por nome, email, telefone..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filtros rápidos */}
          <div className="flex items-center space-x-3">
            {/* Filtro por Vendedor (para admin) */}
            {userRole === 'admin' && vendorsToShow.length > 0 && (
              <div className="relative">
                <select 
                  value={selectedVendor}
                  onChange={(e) => handleVendorChange(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px] transition-colors"
                >
                  <option value="">Todos os Vendedores</option>
                  {vendorsToShow.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.first_name} {vendor.last_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Seletor de Pipeline (para member - compacto) */}
            {userRole === 'member' && pipelines.length > 1 && (
              <div className="relative">
                <select 
                  value={selectedPipeline?.id || ''} 
                  onChange={(e) => {
                    const pipeline = pipelines.find(p => p.id === e.target.value);
                    onPipelineChange(pipeline || null);
                  }}
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px] transition-colors"
                >
                  {pipelines.map(pipeline => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            <select 
              value={statusFilter}
              onChange={(e) => onStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors"
            >
              <option value="">Todos os Status</option>
              <option value="active">Ativos (Novo → Negociação)</option>
              <option value="won">Ganhos</option>
              <option value="lost">Perdidos</option>
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center space-x-2 px-3 py-2.5 border rounded-lg text-sm transition-all duration-200 ${
                showAdvancedFilters 
                  ? 'border-blue-300 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <select 
              onChange={(e) => {
                const [sortBy, direction] = e.target.value.split(':');
                onSortChange(sortBy, direction as 'asc' | 'desc');
              }}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors"
            >
              <option value="created_at:desc">Mais Recentes</option>
              <option value="created_at:asc">Mais Antigos</option>
              <option value="value:desc">Maior Valor</option>
              <option value="value:asc">Menor Valor</option>
              <option value="name:asc">Nome A-Z</option>
              <option value="name:desc">Nome Z-A</option>
            </select>
          </div>
        </div>

        {/* Filtros avançados (expandidos) */}
        {showAdvancedFilters && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por data */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Período de Criação
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors"
                    onChange={(e) => {
                      // Implementar lógica de filtro por data
                    }}
                  />
                  <input
                    type="date"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors"
                    onChange={(e) => {
                      // Implementar lógica de filtro por data
                    }}
                  />
                </div>
              </div>

              {/* Filtro por responsável (alternativo) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Responsável
                </label>
                <select 
                  onChange={(e) => onAssigneeFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors"
                >
                  <option value="">Todos os Responsáveis</option>
                  {availableVendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.first_name} {vendor.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors">
                  <option value="">Todas as Tags</option>
                  <option value="hot">Lead Quente</option>
                  <option value="cold">Lead Frio</option>
                  <option value="vip">Cliente VIP</option>
                </select>
              </div>
            </div>

            {/* Ações dos filtros avançados */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <button 
                onClick={handleClearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Limpar Todos os Filtros
              </button>
              <div className="flex gap-2">
                <button className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 bg-white transition-colors">
                  Salvar Filtro
                </button>
                <button 
                  onClick={() => setShowAdvancedFilters(false)}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Indicadores de filtros ativos */}
        {activeFiltersCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <span>Filtros ativos:</span>
              {searchTerm && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                  Busca: "{searchTerm}"
                </span>
              )}
              {statusFilter && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md">
                  Status: {statusFilter}
                </span>
              )}
              {selectedVendor && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md">
                  Vendedor: {vendorsToShow.find(v => v.id === selectedVendor)?.first_name}
                </span>
              )}
              {showOnlyMyPipelines && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-md">
                  Minhas Pipelines
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineFilters;
