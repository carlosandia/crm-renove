import { useState, useCallback, useMemo } from 'react';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface VendedoresSubHeaderState {
  searchValue: string;
  showOnlyActive: boolean | undefined;
}

export interface VendedoresSubHeaderActions {
  handleSearchChange: (value: string) => void;
  handleActiveFilterChange: (showActive: boolean | undefined) => void;
  resetFilters: () => void;
}

export interface UseVendedoresSubHeaderResult {
  state: VendedoresSubHeaderState;
  actions: VendedoresSubHeaderActions;
  // Propriedades computadas
  hasActiveFilters: boolean;
  filterSummary: string;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export const useVendedoresSubHeader = (): UseVendedoresSubHeaderResult => {
  // ============================================
  // ESTADO
  // ============================================
  
  const [searchValue, setSearchValue] = useState<string>('');
  const [showOnlyActive, setShowOnlyActive] = useState<boolean | undefined>(undefined);

  // ============================================
  // ACTIONS
  // ============================================

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleActiveFilterChange = useCallback((showActive: boolean | undefined) => {
    setShowOnlyActive(showActive);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchValue('');
    setShowOnlyActive(undefined);
  }, []);

  // ============================================
  // PROPRIEDADES COMPUTADAS
  // ============================================

  const hasActiveFilters = useMemo(() => {
    return searchValue.trim() !== '' || showOnlyActive !== undefined;
  }, [searchValue, showOnlyActive]);

  const filterSummary = useMemo(() => {
    const filters: string[] = [];
    
    if (searchValue.trim() !== '') {
      filters.push(`busca: "${searchValue}"`);
    }
    
    if (showOnlyActive === true) {
      filters.push('apenas ativos');
    } else if (showOnlyActive === false) {
      filters.push('apenas inativos');
    } else {
      filters.push('todos');
    }
    
    return filters.length > 0 ? filters.join(', ') : 'sem filtros';
  }, [searchValue, showOnlyActive]);

  // ============================================
  // RETORNO COM OBJETOS ESTABILIZADOS
  // ============================================

  // ✅ OTIMIZAÇÃO CRÍTICA: Usar useMemo para estabilizar objetos e evitar re-renders desnecessários
  // PROBLEMA ORIGINAL: Objetos state e actions eram recriados a cada render,
  // causando re-renders excessivos no useUpdateEffect do VendedoresModule
  // SOLUÇÃO: Estabilizar objetos com useMemo baseado apenas nas dependências essenciais
  const state = useMemo(() => ({
    searchValue,
    showOnlyActive
  }), [searchValue, showOnlyActive]);

  const actions = useMemo(() => ({
    handleSearchChange,
    handleActiveFilterChange,
    resetFilters
  }), [handleSearchChange, handleActiveFilterChange, resetFilters]);

  return {
    state,
    actions,
    hasActiveFilters,
    filterSummary
  };
};