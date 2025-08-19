import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building, Plus, Filter, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface FilterState {
  searchTerm: string;
  status: string;
  industry: string;
  adminStatus: string;
}

export interface EmpresasSubHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onCreateCompany: () => void;
  onRefresh: () => void;
  loading?: boolean;
  className?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const EmpresasSubHeader: React.FC<EmpresasSubHeaderProps> = ({
  searchValue,
  onSearchChange,
  filters,
  onFiltersChange,
  onCreateCompany,
  onRefresh,
  loading = false,
  className = ""
}) => {
  // Estado para busca expansível (seguindo padrão dos outros SubHeaders)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // Estado para dropdown mobile de filtros
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Ref para o dropdown mobile
  const mobileFiltersRef = useRef<HTMLDivElement>(null);

  // ============================================
  // EFEITOS
  // ============================================

  // Fechar dropdown mobile ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileFiltersRef.current && !mobileFiltersRef.current.contains(event.target as Node)) {
        setShowMobileFilters(false);
      }
    };

    if (showMobileFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileFilters]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSearchToggle = () => {
    if (isSearchExpanded && searchValue) {
      // Se está expandido e tem texto, limpa primeiro
      onSearchChange("");
    } else if (isSearchExpanded) {
      // Se está expandido sem texto, contrai
      setIsSearchExpanded(false);
    } else {
      // Se não está expandido, expande
      setIsSearchExpanded(true);
    }
  };

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
  };

  const handleFilterChange = (filterKey: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [filterKey]: value };
    onFiltersChange(newFilters);
  };

  // ============================================
  // CONFIGURAÇÃO DOS FILTROS
  // ============================================

  const statusOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'active', label: 'Ativas' },
    { value: 'inactive', label: 'Inativas' }
  ];

  const industryOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'E-commerce', label: 'E-commerce' },
    { value: 'SaaS', label: 'SaaS' },
    { value: 'Consultoria', label: 'Consultoria' },
    { value: 'Educação', label: 'Educação' },
    { value: 'Saúde', label: 'Saúde' },
    { value: 'Imobiliário', label: 'Imobiliário' },
    { value: 'Tecnologia', label: 'Tecnologia' },
    { value: 'Outros', label: 'Outros' }
  ];


  // ============================================
  // CONTADORES DE FILTROS ATIVOS
  // ============================================

  const activeFilterCount = [
    filters.status && filters.status !== 'all',
    filters.industry && filters.industry !== 'all'
  ].filter(Boolean).length;

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className={`
      h-[50px] bg-gray-50/80 border-t border-gray-100 border-b border-gray-200 shadow-sm sticky top-[60px] z-40
      ${className}
    `}>
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        
        {/* LADO ESQUERDO: Título */}
        <div className="flex items-center space-x-4 flex-shrink-0">
          <h1 className="text-sm font-medium text-gray-700 truncate flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" />
            Gestão de Clientes
          </h1>
          
          {/* Badge de filtros ativos */}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo{activeFilterCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* LADO DIREITO: Busca, Filtros e Ações */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          
          {/* Sistema de Busca Expansível */}
          <div className={`
            relative transition-all duration-300 ease-in-out
            ${isSearchExpanded ? 'w-80' : 'w-auto'}
          `}>
            {isSearchExpanded ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome da empresa ou email do admin..."
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10 h-9"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSearchToggle}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 border-0 bg-transparent hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearchToggle}
                className="h-8 px-2.5 gap-2 border-0 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 text-sm"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Buscar</span>
              </Button>
            )}
          </div>

          {/* Filtros como Selects - Desktop */}
          <div className="hidden lg:flex items-center space-x-2">
            {/* Filtro Status - Dropdown */}
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="h-8 px-2.5 pr-8 text-sm border-0 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-md appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Filtro Nicho - Dropdown */}
            <div className="relative">
              <select
                value={filters.industry}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
                className="h-8 px-2.5 pr-8 text-sm border-0 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-md appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {industryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Filtros Responsivos para Tablet/Mobile */}
          <div className="lg:hidden relative" ref={mobileFiltersRef}>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="h-8 px-2.5 gap-2 border-0 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 text-sm"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Filtros</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
              </Button>
              
              {/* Dropdown Mobile */}
              {showMobileFilters && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">Filtros</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMobileFilters(false)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Status */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded bg-white"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Nicho */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nicho</label>
                      <select
                        value={filters.industry}
                        onChange={(e) => handleFilterChange('industry', e.target.value)}
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded bg-white"
                      >
                        {industryOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Botão Limpar Filtros */}
                    {activeFilterCount > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onFiltersChange({
                              searchTerm: filters.searchTerm,
                              status: 'all',
                              industry: 'all',
                              adminStatus: 'all'
                            });
                            setShowMobileFilters(false);
                          }}
                          className="w-full h-8 text-xs text-gray-600 hover:text-gray-900"
                        >
                          Limpar Filtros
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ação Principal */}
          <div className="flex items-center">
            <Button
              onClick={onCreateCompany}
              size="sm"
              className="h-8 px-3 gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Nova Empresa</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmpresasSubHeader;