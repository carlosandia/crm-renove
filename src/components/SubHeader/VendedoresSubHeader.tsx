import React, { useState, useCallback } from 'react';
import { Search, X, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface VendedoresSubHeaderProps {
  onSearchChange?: (value: string) => void;
  onActiveFilterChange?: (showActive: boolean | undefined) => void;
  onCreateVendedor?: () => void;
  searchValue?: string;
  searchPlaceholder?: string;
  showOnlyActive?: boolean | undefined;
  className?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const VendedoresSubHeader: React.FC<VendedoresSubHeaderProps> = ({
  onSearchChange,
  onActiveFilterChange,
  onCreateVendedor,
  searchValue = "",
  searchPlaceholder = "Buscar vendedores...",
  showOnlyActive = undefined,
  className = ""
}) => {
  // Estados para busca expansível (similar aos outros SubHeaders)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSearchToggle = useCallback(() => {
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
  }, [isSearchExpanded, searchValue, onSearchChange]);

  const handleSearchChange = useCallback((value: string) => {
    onSearchChange?.(value);
  }, [onSearchChange]);

  const handleActiveFilterToggle = useCallback((filterValue: boolean | undefined) => {
    onActiveFilterChange?.(filterValue);
  }, [onActiveFilterChange]);

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
          <h1 className="text-sm font-semibold text-gray-700 truncate">
            Equipe de vendas
          </h1>
        </div>

        {/* LADO DIREITO: Busca, Filtros e Ações */}
        <div className="flex items-center space-x-4 flex-shrink-0">
          
          {/* Sistema de Busca Expansível */}
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

          {/* Filtros Ativos/Inativos/Todos */}
          <div className="flex items-center space-x-1 p-1 bg-gray-50 rounded-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleActiveFilterToggle(true)}
              className={`h-6 px-2 text-xs font-medium ${
                showOnlyActive === true
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ativos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleActiveFilterToggle(false)}
              className={`h-6 px-2 text-xs font-medium ${
                showOnlyActive === false
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Inativos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleActiveFilterToggle(undefined)}
              className={`h-6 px-2 text-xs font-medium ${
                showOnlyActive === undefined
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos
            </Button>
          </div>

          {/* Botão Novo Vendedor */}
          {onCreateVendedor && (
            <Button
              onClick={onCreateVendedor}
              size="sm"
              className="h-8 px-3 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Vendedor</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendedoresSubHeader;