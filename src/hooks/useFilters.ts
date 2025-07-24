import { useState, useCallback, useMemo } from 'react';

// ============================================
// TIPOS E INTERFACES BASE
// ============================================

export interface BaseFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FilterConfig<T = any> {
  initialFilters?: Partial<T>;
  enablePagination?: boolean;
  defaultLimit?: number;
  enableDebounce?: boolean;
  debounceMs?: number;
  enableLocalStorage?: boolean;
  storageKey?: string;
}

export interface UseFiltersReturn<T> {
  // Filtros atuais
  filters: T;
  
  // Funções de atualização
  setFilter: (key: keyof T, value: any) => void;
  setFilters: (filters: Partial<T>) => void;
  updateFilters: (updater: (prev: T) => T) => void;
  
  // Funções de controle
  clearFilters: () => void;
  resetFilters: () => void;
  
  // Estados computados
  hasActiveFilters: boolean;
  activeFilterCount: number;
  isFiltered: boolean;
  
  // Query string utilities
  toQueryString: () => string;
  fromQueryString: (queryString: string) => void;
  
  // Paginação (se habilitada)
  pagination: {
    page: number;
    limit: number;
    setPage: (page: number) => void;
    setLimit: (limit: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    resetPagination: () => void;
  };
  
  // Local storage (se habilitado)
  saveToStorage: () => void;
  loadFromStorage: () => void;
  clearStorage: () => void;
}

// ============================================
// HOOK PRINCIPAL PARA FILTROS
// ============================================

export function useFilters<T extends BaseFilters>(
  config: FilterConfig<T> = {}
): UseFiltersReturn<T> {
  const {
    initialFilters = {} as T,
    enablePagination = true,
    defaultLimit = 20,
    enableLocalStorage = false,
    storageKey = 'filters'
  } = config;

  // Estado principal dos filtros
  const [filters, setInternalFilters] = useState<T>(() => {
    const defaultFilters = {
      ...initialFilters,
      ...(enablePagination && {
        page: 1,
        limit: defaultLimit
      })
    } as T;

    // Carregar do localStorage se habilitado
    if (enableLocalStorage) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsedFilters = JSON.parse(stored);
          return { ...defaultFilters, ...parsedFilters };
        }
      } catch (error) {
        console.warn('⚠️ [useFilters] Erro ao carregar filtros do localStorage:', error);
      }
    }

    return defaultFilters;
  });

  // ============================================
  // FUNÇÕES DE ATUALIZAÇÃO
  // ============================================

  const setFilter = useCallback((key: keyof T, value: any) => {
    setInternalFilters(prev => {
      const updated = { ...prev, [key]: value };
      
      // Reset pagination quando filtros mudam (exceto se estiver mudando página)
      if (enablePagination && key !== 'page') {
        updated.page = 1;
      }
      
      return updated;
    });
  }, [enablePagination]);

  const setFilters = useCallback((newFilters: Partial<T>) => {
    setInternalFilters(prev => {
      const updated = { ...prev, ...newFilters };
      
      // Reset pagination quando filtros mudam
      if (enablePagination && !newFilters.hasOwnProperty('page')) {
        updated.page = 1;
      }
      
      return updated;
    });
  }, [enablePagination]);

  const updateFilters = useCallback((updater: (prev: T) => T) => {
    setInternalFilters(prev => {
      const updated = updater(prev);
      
      // Reset pagination se necessário
      if (enablePagination && JSON.stringify(prev) !== JSON.stringify(updated)) {
        updated.page = 1;
      }
      
      return updated;
    });
  }, [enablePagination]);

  const clearFilters = useCallback(() => {
    const clearedFilters = {
      ...initialFilters,
      ...(enablePagination && {
        page: 1,
        limit: filters.limit || defaultLimit
      })
    } as T;
    
    setInternalFilters(clearedFilters);
  }, [initialFilters, enablePagination, defaultLimit, filters.limit]);

  const resetFilters = useCallback(() => {
    setInternalFilters({
      ...initialFilters,
      ...(enablePagination && {
        page: 1,
        limit: defaultLimit
      })
    } as T);
  }, [initialFilters, enablePagination, defaultLimit]);

  // ============================================
  // ESTADOS COMPUTADOS
  // ============================================

  const hasActiveFilters = useMemo(() => {
    const currentFilters = { ...filters };
    
    // Remover propriedades de paginação para verificar filtros ativos
    if (enablePagination) {
      delete currentFilters.page;
      delete currentFilters.limit;
    }
    
    return Object.values(currentFilters).some(value => 
      value !== undefined && 
      value !== null && 
      value !== '' && 
      !(Array.isArray(value) && value.length === 0)
    );
  }, [filters, enablePagination]);

  const activeFilterCount = useMemo(() => {
    const currentFilters = { ...filters };
    
    // Remover propriedades de paginação
    if (enablePagination) {
      delete currentFilters.page;
      delete currentFilters.limit;
    }
    
    return Object.values(currentFilters).filter(value => 
      value !== undefined && 
      value !== null && 
      value !== '' && 
      !(Array.isArray(value) && value.length === 0)
    ).length;
  }, [filters, enablePagination]);

  const isFiltered = useMemo(() => hasActiveFilters, [hasActiveFilters]);

  // ============================================
  // QUERY STRING UTILITIES
  // ============================================

  const toQueryString = useCallback(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v.toString()));
        } else {
          params.append(key, value.toString());
        }
      }
    });
    
    return params.toString();
  }, [filters]);

  const fromQueryString = useCallback((queryString: string) => {
    try {
      const params = new URLSearchParams(queryString);
      const parsedFilters: Partial<T> = {};
      
      params.forEach((value, key) => {
        // Tentar converter números
        if (!isNaN(Number(value))) {
          (parsedFilters as any)[key] = Number(value);
        } else {
          (parsedFilters as any)[key] = value;
        }
      });
      
      setFilters(parsedFilters);
    } catch (error) {
      console.warn('⚠️ [useFilters] Erro ao parsear query string:', error);
    }
  }, [setFilters]);

  // ============================================
  // FUNÇÕES DE PAGINAÇÃO
  // ============================================

  const setPage = useCallback((page: number) => {
    setFilter('page' as keyof T, page);
  }, [setFilter]);

  const setLimit = useCallback((limit: number) => {
    setInternalFilters(prev => ({ ...prev, limit, page: 1 } as T));
  }, []);

  const nextPage = useCallback(() => {
    const currentPage = (filters.page as number) || 1;
    setPage(currentPage + 1);
  }, [filters.page, setPage]);

  const prevPage = useCallback(() => {
    const currentPage = (filters.page as number) || 1;
    if (currentPage > 1) {
      setPage(currentPage - 1);
    }
  }, [filters.page, setPage]);

  const resetPagination = useCallback(() => {
    setInternalFilters(prev => ({ ...prev, page: 1 } as T));
  }, []);

  // ============================================
  // LOCAL STORAGE UTILITIES
  // ============================================

  const saveToStorage = useCallback(() => {
    if (enableLocalStorage) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(filters));
        console.log('💾 [useFilters] Filtros salvos no localStorage');
      } catch (error) {
        console.warn('⚠️ [useFilters] Erro ao salvar filtros no localStorage:', error);
      }
    }
  }, [enableLocalStorage, storageKey, filters]);

  const loadFromStorage = useCallback(() => {
    if (enableLocalStorage) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsedFilters = JSON.parse(stored);
          setInternalFilters(prev => ({ ...prev, ...parsedFilters }));
          console.log('📂 [useFilters] Filtros carregados do localStorage');
        }
      } catch (error) {
        console.warn('⚠️ [useFilters] Erro ao carregar filtros do localStorage:', error);
      }
    }
  }, [enableLocalStorage, storageKey]);

  const clearStorage = useCallback(() => {
    if (enableLocalStorage) {
      localStorage.removeItem(storageKey);
      console.log('🗑️ [useFilters] Filtros removidos do localStorage');
    }
  }, [enableLocalStorage, storageKey]);

  // ============================================
  // AUTO-SAVE TO LOCALSTORAGE
  // ============================================

  // Salvar automaticamente no localStorage quando filtros mudam
  useEffect(() => {
    if (enableLocalStorage) {
      const timeoutId = setTimeout(() => {
        saveToStorage();
      }, 500); // Debounce de 500ms
      
      return () => clearTimeout(timeoutId);
    }
    return undefined; // ✅ CORREÇÃO TS7030: Retorno explícito para todos os caminhos
  }, [filters, enableLocalStorage, saveToStorage]);

  // ============================================
  // RETURN INTERFACE
  // ============================================

  return {
    // Filtros atuais
    filters,
    
    // Funções de atualização
    setFilter,
    setFilters,
    updateFilters,
    
    // Funções de controle
    clearFilters,
    resetFilters,
    
    // Estados computados
    hasActiveFilters,
    activeFilterCount,
    isFiltered,
    
    // Query string utilities
    toQueryString,
    fromQueryString,
    
    // Paginação
    pagination: {
      page: (filters.page as number) || 1,
      limit: (filters.limit as number) || defaultLimit,
      setPage,
      setLimit,
      nextPage,
      prevPage,
      resetPagination,
    },
    
    // Local storage
    saveToStorage,
    loadFromStorage,
    clearStorage,
  };
}

// ============================================
// HOOKS ESPECIALIZADOS PARA MÓDULOS ESPECÍFICOS
// ============================================

// Filtros para Leads
export interface LeadFilters extends BaseFilters {
  status?: 'active' | 'inactive' | 'converted' | 'lost';
  temperature?: 'cold' | 'warm' | 'hot';
  source?: string;
  assigned_to?: string;
  pipeline_id?: string;
  stage_id?: string;
  campaign?: string;
  city?: string;
  estimated_value_min?: number;
  estimated_value_max?: number;
}

export function useLeadFilters(config?: FilterConfig<LeadFilters>) {
  return useFilters<LeadFilters>({
    initialFilters: {
      status: undefined,
      temperature: undefined,
      search: '',
      sortBy: 'created_at',
      sortOrder: 'desc'
    },
    enableLocalStorage: true,
    storageKey: 'lead_filters',
    ...config
  });
}

// Filtros para Contacts
export interface ContactFilters extends BaseFilters {
  company?: string;
  job_title?: string;
  city?: string;
  tags?: string[];
  lead_source?: string;
}

export function useContactFilters(config?: FilterConfig<ContactFilters>) {
  return useFilters<ContactFilters>({
    initialFilters: {
      search: '',
      sortBy: 'first_name',
      sortOrder: 'asc'
    },
    enableLocalStorage: true,
    storageKey: 'contact_filters',
    ...config
  });
}

// Filtros para Reports
export interface ReportFilters extends BaseFilters {
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  team_member?: string;
  pipeline?: string;
  metric?: string;
}

export function useReportFilters(config?: FilterConfig<ReportFilters>) {
  return useFilters<ReportFilters>({
    initialFilters: {
      period: 'month',
      sortBy: 'date',
      sortOrder: 'desc'
    },
    enableLocalStorage: true,
    storageKey: 'report_filters',
    ...config
  });
}

// ============================================
// UTILITÁRIOS PARA FILTROS AVANÇADOS
// ============================================

export const filterUtils = {
  // Aplicar filtros a um array de dados
  applyFilters: <T>(data: T[], filters: any, searchFields: (keyof T)[] = []) => {
    let filtered = [...data];

    // Aplicar busca textual
    if (filters.search && searchFields.length > 0) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(searchTerm);
        })
      );
    }

    // Aplicar filtros específicos
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && key !== 'search') {
        if (Array.isArray(value) && value.length > 0) {
          filtered = filtered.filter(item => value.includes((item as any)[key]));
        } else if (!Array.isArray(value)) {
          filtered = filtered.filter(item => (item as any)[key] === value);
        }
      }
    });

    return filtered;
  },

  // Aplicar ordenação
  applySorting: <T>(data: T[], sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc') => {
    if (!sortBy) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  },

  // Aplicar paginação
  applyPagination: <T>(data: T[], page: number = 1, limit: number = 20) => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      items: data.slice(startIndex, endIndex),
      total: data.length,
      page,
      limit,
      totalPages: Math.ceil(data.length / limit),
      hasNextPage: endIndex < data.length,
      hasPrevPage: page > 1
    };
  }
}; 