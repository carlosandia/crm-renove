import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useAsyncState } from './useAsyncState';
import { parseSafe, validateArray, formatValidationError } from '../shared/utils/validation';
import type { SafeParseResult } from '../shared/types/Api';

// ============================================
// TIPOS E INTERFACES BASE
// ============================================

export interface CrudConfig<T extends z.ZodTypeAny> {
  tableName: string;
  selectFields?: string;
  defaultOrderBy?: { column: string; ascending: boolean };
  enableCache?: boolean;
  cacheKeyPrefix?: string;
  cacheDuration?: number; // em ms
  // AIDEV-NOTE: Schema Zod para validação runtime
  schema: T;
  createSchema?: z.ZodTypeAny;
  updateSchema?: z.ZodTypeAny;
}

export interface FilterOptions {
  [key: string]: unknown;
}

export interface QueryOptions {
  filters?: FilterOptions;
  search?: { field: string; value: string };
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  offset?: number;
}

export interface CrudPermissions {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  requireOwnership?: boolean; // Para verificar se user é dono do registro
}

// ============================================
// HOOK BASE PARA OPERAÇÕES CRUD
// ============================================

export function useSupabaseCrud<TSchema extends z.ZodTypeAny>(
  config: CrudConfig<TSchema>
) {
  // AIDEV-NOTE: Inferir tipo do schema Zod
  type T = z.infer<TSchema>;
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  // Estados usando o hook já criado useAsyncState
  const fetchState = useAsyncState<T[]>();
  const createState = useAsyncState<T>();
  const updateState = useAsyncState<T>();
  const deleteState = useAsyncState<void>();

  // ============================================
  // UTILITÁRIOS PARA CACHE
  // ============================================

  const getCacheKey = useCallback((suffix = '') => {
    const prefix = config.cacheKeyPrefix || config.tableName;
    return suffix ? `${prefix}_${suffix}` : prefix;
  }, [config.tableName, config.cacheKeyPrefix]);

  const setCache = useCallback((key: string, data: unknown, duration = config.cacheDuration || 300000) => {
    if (!config.enableCache) return;
    
    const cacheData = {
      data,
      timestamp: Date.now(),
      duration
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  }, [config.enableCache, config.cacheDuration]);

  const getCache = useCallback((key: string) => {
    if (!config.enableCache) return null;
    
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      const isExpired = Date.now() - cacheData.timestamp > cacheData.duration;
      
      if (isExpired) {
        localStorage.removeItem(key);
        return null;
      }
      
      return cacheData.data;
    } catch {
      return null;
    }
  }, [config.enableCache]);

  // ============================================
  // CONSTRUÇÃO DE QUERY SUPABASE
  // ============================================

  const buildQuery = useCallback((options: QueryOptions = {}) => {
    let query = supabase
      .from(config.tableName)
      .select(config.selectFields || '*', { count: 'exact' });

    // Aplicar filtros
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });
    }

    // Aplicar busca textual
    if (options.search?.field && options.search?.value) {
      query = query.ilike(options.search.field, `%${options.search.value}%`);
    }

    // Aplicar ordenação
    const orderBy = options.orderBy || config.defaultOrderBy;
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
    }

    // Aplicar paginação
    if (options.limit) {
      query = query.limit(options.limit);
      if (options.offset) {
        query = query.range(options.offset, options.offset + options.limit - 1);
      }
    }

    return query;
  }, [config.tableName, config.selectFields, config.defaultOrderBy]);

  // ============================================
  // OPERAÇÕES CRUD
  // ============================================

  const fetchAll = useCallback(async (options: QueryOptions = {}) => {
    if (!user) throw new Error('Usuário não autenticado');

    const cacheKey = getCacheKey(`fetchAll_${JSON.stringify(options)}`);
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      setData(cachedData.items);
      setTotalCount(cachedData.count);
      return cachedData;
    }

    return fetchState.execute(async () => {
      console.log(`🔍 [useSupabaseCrud] Buscando dados de ${config.tableName}...`);
      
      const query = buildQuery(options);
      const { data: queryData, error, count } = await query;

      if (error) {
        console.error(`❌ [useSupabaseCrud] Erro ao buscar ${config.tableName}:`, error);
        throw error;
      }

      // AIDEV-NOTE: Validação Zod dos dados retornados
      const validationResult = validateArray(config.schema, queryData || []);
      
      if (!validationResult.success) {
        const errorMessage = formatValidationError(validationResult);
        console.error(`❌ [useSupabaseCrud] Erro de validação ${config.tableName}:`, errorMessage);
        throw new Error(`Validation error: ${errorMessage}`);
      }

      console.log(`✅ [useSupabaseCrud] ${config.tableName}: ${validationResult.data.length} registros encontrados e validados`);
      
      const result = {
        items: validationResult.data,
        count: count || 0
      };

      setData(result.items);
      setTotalCount(result.count);
      setCache(cacheKey, result);
      
      return result.items;
    });
  }, [user, fetchState.execute, buildQuery, getCacheKey, getCache, setCache, config.tableName, config.schema]);

  const fetchById = useCallback(async (id: string) => {
    if (!user) throw new Error('Usuário não autenticado');
    if (!id) throw new Error('ID é obrigatório');

    const cacheKey = getCacheKey(`item_${id}`);
    const cachedData = getCache(cacheKey);
    
    if (cachedData) {
      return cachedData as T;
    }

    const { data: queryData, error } = await supabase
      .from(config.tableName)
      .select(config.selectFields || '*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`❌ [useSupabaseCrud] Erro ao buscar ${config.tableName} por ID:`, error);
      throw error;
    }

    // AIDEV-NOTE: Validação Zod do item retornado
    const validationResult = parseSafe(config.schema, queryData);
    
    if (!validationResult.success) {
      const errorMessage = formatValidationError(validationResult);
      console.error(`❌ [useSupabaseCrud] Erro de validação ${config.tableName} por ID:`, errorMessage);
      throw new Error(`Validation error: ${errorMessage}`);
    }

    console.log(`✅ [useSupabaseCrud] ${config.tableName} encontrado e validado:`, validationResult.data.id);
    
    setCache(cacheKey, validationResult.data);
    return validationResult.data;
  }, [user, getCacheKey, getCache, setCache, config.tableName, config.selectFields, config.schema]);

  const create = useCallback(async (item: Omit<T, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Usuário não autenticado');

    return createState.execute(async () => {
      console.log(`🆕 [useSupabaseCrud] Criando novo ${config.tableName}...`);
      
      // AIDEV-NOTE: Validação Zod dos dados de entrada se createSchema disponível
      if (config.createSchema) {
        const inputValidation = parseSafe(config.createSchema, item);
        if (!inputValidation.success) {
          const errorMessage = formatValidationError(inputValidation);
          console.error(`❌ [useSupabaseCrud] Erro de validação entrada ${config.tableName}:`, errorMessage);
          throw new Error(`Input validation error: ${errorMessage}`);
        }
      }
      
      // 🔧 CORREÇÃO RLS: Gerar UUID manualmente para contornar problema de SELECT após INSERT
      const itemId = crypto.randomUUID();
      
      const itemData = {
        id: itemId,
        ...item,
        ...(user.tenant_id && { tenant_id: user.tenant_id }),
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from(config.tableName)
        .insert(itemData);

      if (error) {
        console.error(`❌ [useSupabaseCrud] Erro ao criar ${config.tableName}:`, error);
        throw error;
      }

      // AIDEV-NOTE: Validação Zod do item criado
      const validationResult = parseSafe(config.schema, itemData);
      
      if (!validationResult.success) {
        const errorMessage = formatValidationError(validationResult);
        console.error(`❌ [useSupabaseCrud] Erro de validação item criado ${config.tableName}:`, errorMessage);
        throw new Error(`Created item validation error: ${errorMessage}`);
      }

      console.log(`✅ [useSupabaseCrud] ${config.tableName} criado e validado:`, itemId);
      
      // Atualizar lista local
      setData(prev => [validationResult.data, ...prev]);
      setTotalCount(prev => prev + 1);
      
      // Invalidar cache
      const baseKey = getCacheKey();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(baseKey)) {
          localStorage.removeItem(key);
        }
      });
      
      return validationResult.data;
    });
  }, [user, createState.execute, getCacheKey, config.tableName, config.schema, config.createSchema]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    if (!user) throw new Error('Usuário não autenticado');
    if (!id) throw new Error('ID é obrigatório');

    return updateState.execute(async () => {
      console.log(`📝 [useSupabaseCrud] Atualizando ${config.tableName}:`, id);
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data: queryData, error } = await supabase
        .from(config.tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`❌ [useSupabaseCrud] Erro ao atualizar ${config.tableName}:`, error);
        throw error;
      }

      console.log(`✅ [useSupabaseCrud] ${config.tableName} atualizado:`, queryData.id);
      
      // Atualizar lista local
      setData(prev => prev.map(item => 
        item.id === id ? queryData : item
      ));
      
      // Invalidar cache do item específico
      const itemCacheKey = getCacheKey(`item_${id}`);
      localStorage.removeItem(itemCacheKey);
      
      return queryData;
    });
  }, [user, updateState.execute, getCacheKey, config.tableName]);

  const remove = useCallback(async (id: string) => {
    if (!user) throw new Error('Usuário não autenticado');
    if (!id) throw new Error('ID é obrigatório');

    return deleteState.execute(async () => {
      console.log(`🗑️ [useSupabaseCrud] Removendo ${config.tableName}:`, id);
      
      const { error } = await supabase
        .from(config.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`❌ [useSupabaseCrud] Erro ao remover ${config.tableName}:`, error);
        throw error;
      }

      console.log(`✅ [useSupabaseCrud] ${config.tableName} removido:`, id);
      
      // Atualizar lista local
      setData(prev => prev.filter(item => item.id !== id));
      setTotalCount(prev => prev - 1);
      
      // Invalidar cache
      const itemCacheKey = getCacheKey(`item_${id}`);
      localStorage.removeItem(itemCacheKey);
      
      return;
    });
  }, [user, deleteState.execute, getCacheKey, config.tableName]);

  // ============================================
  // FUNÇÕES DE CONVENIÊNCIA
  // ============================================

  const refresh = useCallback(() => {
    // Limpar cache e recarregar dados
    const baseKey = getCacheKey();
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(baseKey)) {
        localStorage.removeItem(key);
      }
    });
    
    return fetchAll();
  }, [fetchAll, getCacheKey]);

  const findOne = useCallback((predicate: (item: T) => boolean) => {
    return data.find(predicate) || null;
  }, [data]);

  const findMany = useCallback((predicate: (item: T) => boolean) => {
    return data.filter(predicate);
  }, [data]);

  // ============================================
  // ESTADOS COMPUTADOS
  // ============================================

  const isLoading = useMemo(() => 
    fetchState.loading || createState.loading || updateState.loading || deleteState.loading,
    [fetchState.loading, createState.loading, updateState.loading, deleteState.loading]
  );

  const error = useMemo(() => 
    fetchState.error || createState.error || updateState.error || deleteState.error,
    [fetchState.error, createState.error, updateState.error, deleteState.error]
  );

  const isEmpty = useMemo(() => data.length === 0, [data.length]);

  const hasData = useMemo(() => data.length > 0, [data.length]);

  // ============================================
  // RETURN INTERFACE
  // ============================================

  return {
    // Data
    data,
    totalCount,
    
    // States
    isLoading,
    error,
    isEmpty,
    hasData,
    
    // Individual operation states
    fetchState: {
      loading: fetchState.loading,
      error: fetchState.error,
      isSuccess: fetchState.isSuccess
    },
    createState: {
      loading: createState.loading,
      error: createState.error,
      isSuccess: createState.isSuccess
    },
    updateState: {
      loading: updateState.loading,
      error: updateState.error,
      isSuccess: updateState.isSuccess
    },
    deleteState: {
      loading: deleteState.loading,
      error: deleteState.error,
      isSuccess: deleteState.isSuccess
    },
    
    // Operations
    fetchAll,
    fetchById,
    create,
    update,
    remove,
    refresh,
    
    // Utilities
    findOne,
    findMany,
    
    // Cache controls
    clearCache: () => {
      const baseKey = getCacheKey();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(baseKey)) {
          localStorage.removeItem(key);
        }
      });
    }
  };
}

// ============================================
// HOOK ESPECIALIZADO PARA API BACKEND
// ============================================

export interface ApiConfig {
  baseUrl?: string;
  endpoint: string;
  enableCache?: boolean;
  cacheKeyPrefix?: string;
  cacheDuration?: number;
  defaultHeaders?: Record<string, string>;
}

export function useApiCrud<T extends Record<string, unknown>>(config: ApiConfig) {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  const fetchState = useAsyncState<T[]>();
  const createState = useAsyncState<T>();
  const updateState = useAsyncState<T>();
  const deleteState = useAsyncState<void>();

  const baseUrl = config.baseUrl || process.env.REACT_APP_API_URL || 'http://127.0.0.1:3001';

  // Headers padrão com autenticação
  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders
    };

    if (user?.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }

    return headers;
  }, [user?.token, config.defaultHeaders]);

  const buildUrl = useCallback((path = '', params?: Record<string, unknown>) => {
    const url = new URL(`${baseUrl}${config.endpoint}${path}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    
    return url.toString();
  }, [baseUrl, config.endpoint]);

  const fetchAll = useCallback(async (params?: Record<string, unknown>) => {
    if (!user) throw new Error('Usuário não autenticado');

    return fetchState.execute(async () => {
      console.log(`🔍 [useApiCrud] Buscando dados de ${config.endpoint}...`);
      
      const response = await fetch(buildUrl('', params), {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      const items = result.data || result.contacts || result.deals || result;
      const count = result.total_count || result.total || items.length;
      
      setData(items);
      setTotalCount(count);
      
      console.log(`✅ [useApiCrud] ${config.endpoint}: ${items.length} registros encontrados`);
      
      return items;
    });
  }, [user, fetchState.execute, buildUrl, getHeaders, config.endpoint]);

  const create = useCallback(async (item: Omit<T, 'id'>) => {
    if (!user) throw new Error('Usuário não autenticado');

    return createState.execute(async () => {
      console.log(`🆕 [useApiCrud] Criando novo ${config.endpoint}...`);
      
      const response = await fetch(buildUrl(), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newItem = await response.json();
      
      setData(prev => [newItem, ...prev]);
      setTotalCount(prev => prev + 1);
      
      console.log(`✅ [useApiCrud] ${config.endpoint} criado:`, newItem.id);
      
      return newItem;
    });
  }, [user, createState.execute, buildUrl, getHeaders, config.endpoint]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    if (!user) throw new Error('Usuário não autenticado');

    return updateState.execute(async () => {
      console.log(`📝 [useApiCrud] Atualizando ${config.endpoint}:`, id);
      
      const response = await fetch(buildUrl(`/${id}`), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedItem = await response.json();
      
      setData(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ));
      
      console.log(`✅ [useApiCrud] ${config.endpoint} atualizado:`, updatedItem.id);
      
      return updatedItem;
    });
  }, [user, updateState.execute, buildUrl, getHeaders, config.endpoint]);

  const remove = useCallback(async (id: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    return deleteState.execute(async () => {
      console.log(`🗑️ [useApiCrud] Removendo ${config.endpoint}:`, id);
      
      const response = await fetch(buildUrl(`/${id}`), {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setData(prev => prev.filter(item => item.id !== id));
      setTotalCount(prev => prev - 1);
      
      console.log(`✅ [useApiCrud] ${config.endpoint} removido:`, id);
    });
  }, [user, deleteState.execute, buildUrl, getHeaders, config.endpoint]);

  const isLoading = useMemo(() => 
    fetchState.loading || createState.loading || updateState.loading || deleteState.loading,
    [fetchState.loading, createState.loading, updateState.loading, deleteState.loading]
  );

  const error = useMemo(() => 
    fetchState.error || createState.error || updateState.error || deleteState.error,
    [fetchState.error, createState.error, updateState.error, deleteState.error]
  );

  return {
    data,
    totalCount,
    isLoading,
    error,
    isEmpty: data.length === 0,
    hasData: data.length > 0,
    
    fetchAll,
    create,
    update,
    remove,
    refresh: fetchAll,
    
    findOne: (predicate: (item: T) => boolean) => data.find(predicate) || null,
    findMany: (predicate: (item: T) => boolean) => data.filter(predicate),
  };
} 