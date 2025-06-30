/**
 * 🔧 Utilitários de Array - Elimina duplicação em 30+ componentes
 * Operações comuns para arrays com padrões reutilizáveis
 */

// ============================================
// TIPOS BASE
// ============================================

export interface GroupedData<T> {
  [key: string]: T[];
}

export interface AggregatedData {
  [key: string]: number;
}

export interface SortOptions {
  field: string;
  direction?: 'asc' | 'desc';
}

// ============================================
// FILTROS COMUNS
// ============================================

/**
 * Filtra itens ativos (is_active === true)
 */
export const filterActive = <T extends { is_active?: boolean }>(items: T[]): T[] => {
  return items.filter(item => item.is_active === true);
};

/**
 * Filtra itens inativos (is_active === false)
 */
export const filterInactive = <T extends { is_active?: boolean }>(items: T[]): T[] => {
  return items.filter(item => item.is_active === false);
};

/**
 * Filtra por status específico
 */
export const filterByStatus = <T extends { status?: string }>(
  items: T[], 
  status: string
): T[] => {
  return items.filter(item => item.status === status);
};

/**
 * Filtra múltiplos status
 */
export const filterByStatuses = <T extends { status?: string }>(
  items: T[], 
  statuses: string[]
): T[] => {
  return items.filter(item => item.status && statuses.includes(item.status));
};

/**
 * Filtro de busca textual em múltiplos campos
 */
export const filterBySearch = <T>(
  items: T[], 
  searchTerm: string, 
  fields: (keyof T)[]
): T[] => {
  if (!searchTerm.trim()) return items;
  
  const term = searchTerm.toLowerCase();
  return items.filter(item =>
    fields.some(field => {
      const value = item[field];
      return value && String(value).toLowerCase().includes(term);
    })
  );
};

// ============================================
// ORDENAÇÃO COMUM
// ============================================

/**
 * Ordena por order_index (padrão em pipelines/stages)
 */
export const sortByOrderIndex = <T extends { order_index?: number }>(items: T[]): T[] => {
  return [...items].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
};

/**
 * Ordena por field_order (padrão em custom_fields)
 */
export const sortByFieldOrder = <T extends { field_order?: number }>(items: T[]): T[] => {
  return [...items].sort((a, b) => (a.field_order || 0) - (b.field_order || 0));
};

/**
 * Ordena por nome/title alfabeticamente
 */
export const sortByName = <T extends { name?: string; title?: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const aName = a.name || a.title || '';
    const bName = b.name || b.title || '';
    return aName.localeCompare(bName, 'pt-BR');
  });
};

/**
 * Ordena por data de criação (mais recente primeiro)
 */
export const sortByCreatedAt = <T extends { created_at?: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate; // Descending (mais recente primeiro)
  });
};

/**
 * Ordenação genérica por campo
 */
export const sortByField = <T>(
  items: T[], 
  field: keyof T, 
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...items].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];
    
    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue, 'pt-BR');
    } else {
      comparison = aValue < bValue ? -1 : 1;
    }
    
    return direction === 'desc' ? -comparison : comparison;
  });
};

// ============================================
// AGREGAÇÕES E CÁLCULOS
// ============================================

/**
 * Soma valores numéricos por campo
 */
export const sumByField = <T>(items: T[], field: keyof T): number => {
  return items.reduce((sum, item) => {
    const value = Number(item[field]) || 0;
    return sum + value;
  }, 0);
};

/**
 * Conta itens por status
 */
export const countByStatus = <T extends { status?: string }>(items: T[]): AggregatedData => {
  return items.reduce((acc, item) => {
    const status = item.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as AggregatedData);
};

/**
 * Conta itens ativos vs inativos
 */
export const countActiveInactive = <T extends { is_active?: boolean }>(items: T[]) => {
  const active = items.filter(item => item.is_active === true).length;
  const inactive = items.filter(item => item.is_active === false).length;
  const unknown = items.length - active - inactive;
  
  return { active, inactive, unknown, total: items.length };
};

/**
 * Calcula média de um campo numérico
 */
export const averageByField = <T>(items: T[], field: keyof T): number => {
  if (items.length === 0) return 0;
  const sum = sumByField(items, field);
  return sum / items.length;
};

// ============================================
// AGRUPAMENTO
// ============================================

/**
 * Agrupa itens por campo
 */
export const groupByField = <T>(items: T[], field: keyof T): GroupedData<T> => {
  return items.reduce((acc, item) => {
    const key = String(item[field] || 'unknown');
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as GroupedData<T>);
};

/**
 * Agrupa por data (apenas dia - YYYY-MM-DD)
 */
export const groupByDate = <T extends { created_at?: string }>(items: T[]): GroupedData<T> => {
  return items.reduce((acc, item) => {
    const date = item.created_at 
      ? new Date(item.created_at).toISOString().split('T')[0]
      : 'unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as GroupedData<T>);
};

/**
 * Agrupa por mês (YYYY-MM)
 */
export const groupByMonth = <T extends { created_at?: string }>(items: T[]): GroupedData<T> => {
  return items.reduce((acc, item) => {
    const month = item.created_at 
      ? new Date(item.created_at).toISOString().substring(0, 7)
      : 'unknown';
    if (!acc[month]) acc[month] = [];
    acc[month].push(item);
    return acc;
  }, {} as GroupedData<T>);
};

/**
 * Cria mapa de ID para acesso rápido
 */
export const createIdMap = <T extends { id: string | number }>(items: T[]): Map<string | number, T> => {
  return new Map(items.map(item => [item.id, item]));
};

/**
 * Cria mapa por campo customizado
 */
export const createFieldMap = <T>(items: T[], field: keyof T): Map<any, T> => {
  return new Map(items.map(item => [item[field], item]));
};

// ============================================
// TRANSFORMAÇÕES
// ============================================

/**
 * Remove duplicatas por ID
 */
export const uniqueById = <T extends { id: string | number }>(items: T[]): T[] => {
  const seen = new Set<string | number>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

/**
 * Remove duplicatas por campo
 */
export const uniqueByField = <T>(items: T[], field: keyof T): T[] => {
  const seen = new Set<any>();
  return items.filter(item => {
    const value = item[field];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

/**
 * Paginação
 */
export const paginate = <T>(items: T[], page: number = 1, limit: number = 20) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    items: items.slice(startIndex, endIndex),
    total: items.length,
    page,
    limit,
    totalPages: Math.ceil(items.length / limit),
    hasNextPage: endIndex < items.length,
    hasPrevPage: page > 1
  };
};

// ============================================
// UTILITÁRIOS ESPECÍFICOS DO CRM
// ============================================

/**
 * Filtra leads por temperatura
 */
export const filterLeadsByTemperature = <T extends { temperature?: string }>(
  items: T[], 
  temperature: string
): T[] => {
  return items.filter(item => item.temperature === temperature);
};

/**
 * Filtra por assigned_to (vendedor atribuído)
 */
export const filterByAssignedTo = <T extends { assigned_to?: string }>(
  items: T[], 
  assignedTo: string
): T[] => {
  return items.filter(item => item.assigned_to === assignedTo);
};

/**
 * Calcula valor total de leads/deals
 */
export const calculateTotalValue = <T extends { 
  custom_data?: { valor?: string | number; valor_oportunidade?: string | number }; 
  amount?: number; 
  estimated_value?: number 
}>(items: T[]): number => {
  return items.reduce((sum, item) => {
    let value = 0;
    
    // Tenta pegar valor de várias fontes possíveis
    if (item.amount) value = Number(item.amount);
    else if (item.estimated_value) value = Number(item.estimated_value);
    else if (item.custom_data?.valor) value = Number(item.custom_data.valor);
    else if (item.custom_data?.valor_oportunidade) value = Number(item.custom_data.valor_oportunidade);
    
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
};

// ============================================
// EXPORTAÇÕES CONVENIENTES
// ============================================

export const arrayUtils = {
  // Filtros
  filterActive,
  filterInactive,
  filterByStatus,
  filterByStatuses,
  filterBySearch,
  filterLeadsByTemperature,
  filterByAssignedTo,
  
  // Ordenação
  sortByOrderIndex,
  sortByFieldOrder,
  sortByName,
  sortByCreatedAt,
  sortByField,
  
  // Agregações
  sumByField,
  countByStatus,
  countActiveInactive,
  averageByField,
  calculateTotalValue,
  
  // Agrupamento
  groupByField,
  groupByDate,
  groupByMonth,
  createIdMap,
  createFieldMap,
  
  // Transformações
  uniqueById,
  uniqueByField,
  paginate
}; 