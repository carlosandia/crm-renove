import { useState, useCallback, useEffect } from 'react';
import { CompanyFilters } from '../types/Company';

interface CompaniesState {
  showCreateForm: boolean;
  filters: CompanyFilters;
  selectedCompanyId: string | null;
  lastRefreshTime: Date | null;
}

const STORAGE_KEY = 'crm_empresas_state';

const defaultState: CompaniesState = {
  showCreateForm: false,
  filters: {
    searchTerm: '',
    status: '',
    industry: '',
    adminStatus: ''
  },
  selectedCompanyId: null,
  lastRefreshTime: null
};

export const useCompaniesState = () => {
  const [state, setState] = useState<CompaniesState>(() => {
    // Recuperar estado do localStorage
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        return {
          ...defaultState,
          ...parsed,
          showCreateForm: false, // Sempre resetar formulário ao carregar
          selectedCompanyId: null, // Sempre resetar seleção ao carregar
          lastRefreshTime: parsed.lastRefreshTime ? new Date(parsed.lastRefreshTime) : null
        };
      }
    } catch (error) {
      console.warn('Erro ao recuperar estado das empresas:', error);
    }
    return defaultState;
  });

  // Salvar estado no localStorage sempre que mudar
  useEffect(() => {
    try {
      const stateToSave = {
        ...state,
        showCreateForm: false, // Não salvar estado do formulário
        selectedCompanyId: null // Não salvar seleção
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Erro ao salvar estado das empresas:', error);
    }
  }, [state]);

  const setShowCreateForm = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showCreateForm: show }));
  }, []);

  const setFilters = useCallback((filters: CompanyFilters) => {
    setState(prev => ({ ...prev, filters }));
  }, []);

  const setSelectedCompanyId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedCompanyId: id }));
  }, []);

  const markRefresh = useCallback(() => {
    setState(prev => ({ ...prev, lastRefreshTime: new Date() }));
  }, []);

  const resetState = useCallback(() => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toggleCreateForm = useCallback(() => {
    setState(prev => ({ ...prev, showCreateForm: !prev.showCreateForm }));
  }, []);

  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, searchTerm: '' }
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: { searchTerm: '', status: '', industry: '', adminStatus: '' }
    }));
  }, []);

  return {
    // Estado atual
    showCreateForm: state.showCreateForm,
    filters: state.filters,
    selectedCompanyId: state.selectedCompanyId,
    lastRefreshTime: state.lastRefreshTime,

    // Setters
    setShowCreateForm,
    setFilters,
    setSelectedCompanyId,
    markRefresh,

    // Ações utilitárias
    resetState,
    toggleCreateForm,
    clearSearch,
    resetFilters,

    // Helpers
    hasActiveFilters: state.filters.searchTerm || state.filters.status || state.filters.industry || state.filters.adminStatus,
    isRecentlyRefreshed: (
      state.lastRefreshTime && 
      (Date.now() - state.lastRefreshTime.getTime()) < 30000 // 30 segundos
    )
  };
}; 