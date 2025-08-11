import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface FilterOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface SubHeaderProps {
  title: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  actions?: React.ReactNode;
  showSearch?: boolean;
  showFilterBadge?: boolean;
  className?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const SubHeader: React.FC<SubHeaderProps> = ({
  title,
  searchPlaceholder = "Buscar...",
  searchValue = "",
  onSearchChange,
  filters = [],
  activeFilter,
  onFilterChange,
  actions,
  showSearch = true,
  showFilterBadge = true,
  className = ""
}) => {
  // Estado para busca expansível (similar ao módulo Leads)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSearchToggle = () => {
    if (isSearchExpanded && searchValue) {
      // Se está expandido e tem texto, limpa primeiro
      onSearchChange?.("");
    } else if (isSearchExpanded) {
      // Se está expandido sem texto, contrai
      setIsSearchExpanded(false);
    } else {
      // Se não está expandido, expande
      setIsSearchExpanded(true);
    }
  };

  const handleSearchChange = (value: string) => {
    onSearchChange?.(value);
  };

  const handleFilterClick = (filterId: string) => {
    onFilterChange?.(filterId);
  };

  // ============================================
  // CONTADORES DE FILTROS
  // ============================================

  const activeFilterCount = filters.filter(filter => 
    activeFilter === filter.id && filter.id !== 'all'
  ).length;

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
          <h1 className="text-base font-medium text-gray-700 truncate">
            {title}
          </h1>
          
          {/* Badge de filtros ativos */}
          {showFilterBadge && activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo{activeFilterCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* LADO DIREITO: Busca, Filtros e Ações */}
        <div className="flex items-center space-x-4 flex-shrink-0">
          
          {/* Sistema de Busca Expansível */}
          {showSearch && (
            <div className="flex items-center space-x-2">
              {/* Busca Expansível */}
              <div className={`
                relative transition-all duration-300 ease-in-out
                ${isSearchExpanded ? 'w-80' : 'w-auto'}
              `}>
                {isSearchExpanded ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={searchPlaceholder}
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
                    className="h-8 px-2.5 gap-2 border-0 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                  >
                    <Search className="w-4 h-4" />
                    <span className="hidden sm:inline">Buscar</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Filtros */}
          {filters.length > 0 && (
            <div className="flex items-center space-x-2">
              {filters.map((filter) => (
                <Button
                  key={filter.id}
                  variant={activeFilter === filter.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleFilterClick(filter.id)}
                  className={`h-8 px-2.5 gap-2 whitespace-nowrap ${
                    activeFilter === filter.id ? '' : 'border-0 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {filter.icon}
                  <span>{filter.label}</span>
                  {filter.count !== undefined && (
                    <Badge 
                      variant="secondary" 
                      className="ml-1 text-xs bg-white text-gray-600 border-gray-300"
                    >
                      {filter.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}

          {/* Ações */}
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubHeader;