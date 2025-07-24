import { useState, useCallback, useMemo, useEffect, useDebugValue } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Lead, Pipeline, PipelineStage } from '../types/Pipeline';
import { useEnterpriseMetrics } from './useEnterpriseMetrics';
import { logger, LogContext, useLoggerDebug, startTimer, endTimer, clearTimer, hasTimer, group, groupEnd } from '../utils/loggerOptimized';
import { LOGGING, isDevelopment } from '../utils/constants';
import { 
  logOnlyInDevelopment,
  logPerformanceIfSlow
} from './useOptimizedLogging';

// ============================================
// TYPE GUARDS (TYPESCRIPT BEST PRACTICES)
// ============================================

// Type guard para verificar se um objeto é uma Pipeline válida
function isPipelineValid(data: unknown): data is Pipeline {
  return (
    data !== null &&
    data !== undefined &&
    typeof data === 'object' &&
    'id' in data &&
    'name' in data &&
    typeof (data as any).id === 'string' &&
    typeof (data as any).name === 'string'
  );
}

// Type guard para verificar se um objeto é um Lead válido (versão mais tolerante)
function isLeadValid(data: unknown): data is Lead {
  if (data === null || data === undefined || typeof data !== 'object') {
    return false;
  }
  
  const lead = data as any;
  
  // Validação mais tolerante: verificar se os campos essenciais existem
  const hasId = 'id' in lead && lead.id && (typeof lead.id === 'string' || typeof lead.id === 'number');
  const hasStageId = 'stage_id' in lead && lead.stage_id && (typeof lead.stage_id === 'string' || typeof lead.stage_id === 'number');
  
  if (!hasId || !hasStageId) {
    // Log detalhado para debug em desenvolvimento
    if (import.meta.env.DEV) {
      console.debug('🔍 [isLeadValid] Lead inválido:', {
        hasId,
        hasStageId,
        leadData: {
          id: lead.id,
          stage_id: lead.stage_id,
          keys: Object.keys(lead)
        }
      });
    }
    return false;
  }
  
  // Converter para string se necessário
  if (typeof lead.id !== 'string') {
    lead.id = String(lead.id);
  }
  if (typeof lead.stage_id !== 'string') {
    lead.stage_id = String(lead.stage_id);
  }
  
  return true;
}

// Type guard para verificar se um objeto é um PipelineStage válido
function isPipelineStageValid(data: unknown): data is PipelineStage {
  return (
    data !== null &&
    data !== undefined &&
    typeof data === 'object' &&
    'id' in data &&
    'name' in data &&
    typeof (data as any).id === 'string' &&
    typeof (data as any).name === 'string'
  );
}

// Type guard para verificar se dados são um array de leads (versão mais tolerante com debug)
function isLeadsArrayValid(data: unknown): data is Lead[] {
  if (!Array.isArray(data)) {
    if (import.meta.env.DEV) {
      console.debug('🔍 [isLeadsArrayValid] Dados não são um array:', {
        type: typeof data,
        isNull: data === null,
        isUndefined: data === undefined,
        value: data
      });
    }
    return false;
  }
  
  if (data.length === 0) {
    return true; // Array vazio é válido
  }
  
  // Contar leads válidos vs inválidos
  let validCount = 0;
  let invalidCount = 0;
  
  const results = data.map((item, index) => {
    const isValid = isLeadValid(item);
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
      if (import.meta.env.DEV) {
        console.debug(`🔍 [isLeadsArrayValid] Lead ${index} inválido:`, item);
      }
    }
    return isValid;
  });
  
  // Se mais de 90% dos leads são válidos, considerar o array válido
  const validPercentage = validCount / data.length;
  const isArrayValid = validPercentage >= 0.9;
  
  if (import.meta.env.DEV && invalidCount > 0) {
    console.debug('🔍 [isLeadsArrayValid] Estatísticas de validação:', {
      total: data.length,
      valid: validCount,
      invalid: invalidCount,
      validPercentage: Math.round(validPercentage * 100) + '%',
      arrayValid: isArrayValid
    });
  }
  
  return isArrayValid;
}

// Type guard para verificar se dados são um array de stages
function isPipelineStagesArrayValid(data: unknown): data is PipelineStage[] {
  return Array.isArray(data) && data.every(isPipelineStageValid);
}

// Função para extrair dados seguros da resposta da API (versão mais robusta)
function extractSafeApiData<T>(response: any, validator: (data: unknown) => data is T, fallback: T): T {
  if (!response) {
    if (import.meta.env.DEV) {
      console.debug('🔍 [extractSafeApiData] Resposta da API é null/undefined');
    }
    logger.warn('Resposta da API é null/undefined', LogContext.PIPELINE);
    return fallback;
  }
  
  // Tentar extrair dados de diferentes formatos de resposta
  const possibleData = [
    response,
    response.data,
    response.data?.data,
    response.result,
    response.payload,
    response.items, // Algumas APIs usam 'items'
    response.records // Outras usam 'records'
  ];
  
  for (let i = 0; i < possibleData.length; i++) {
    const data = possibleData[i];
    if (validator(data)) {
      if (import.meta.env.DEV && i > 0) {
        console.debug(`🔍 [extractSafeApiData] Dados encontrados no caminho ${i}:`, {
          path: ['response', 'response.data', 'response.data.data', 'response.result', 'response.payload', 'response.items', 'response.records'][i],
          dataType: typeof data,
          isArray: Array.isArray(data),
          length: Array.isArray(data) ? data.length : 'N/A'
        });
      }
      return data;
    }
  }
  
  // Tentar recuperação de dados parciais se for um array
  if (Array.isArray(response) && validator === isLeadsArrayValid) {
    const partialLeads = response.filter(isLeadValid);
    if (partialLeads.length > 0 && validator(partialLeads)) {
      logger.info('Dados parciais recuperados da resposta da API', LogContext.VALIDATION, {
        originalLength: response.length,
        recoveredLength: partialLeads.length,
        recoveryRate: Math.round((partialLeads.length / response.length) * 100) + '%'
      });
      return partialLeads;
    }
  }
  
  logger.warn('Dados da API não passaram na validação', LogContext.VALIDATION, {
    validatorName: validator.name,
    responseType: typeof response,
    isArray: Array.isArray(response),
    responseLength: Array.isArray(response) ? response.length : 'N/A',
    hasFallback: !!fallback,
    testedPaths: possibleData.map((_, i) => ['response', 'response.data', 'response.data.data', 'response.result', 'response.payload', 'response.items', 'response.records'][i])
  });
  
  return fallback;
}

// ============================================
// CONSTANTES
// ============================================

// ✅ CORREÇÃO CRÍTICA: Definir DEFAULT_DATE_RANGE para evitar ReferenceError
const DEFAULT_DATE_RANGE: { start: string; end: string } | undefined = undefined;

// ============================================
// QUERY KEY HELPERS
// ============================================

/**
 * Função helper para gerar query key consistente para pipeline leads
 * CRÍTICO: Deve ser usada em TODAS as operações de cache (queries, mutations, invalidações)
 */
const getLeadsQueryKey = (pipelineId: string, tenantId: string | undefined, dateRange: { start: string; end: string } | undefined) => {
  return ['pipeline-leads', pipelineId, tenantId, dateRange];
};

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface PipelineKanbanFilters {
  searchTerm: string;
  selectedStageId: string | null;
  selectedUserId: string | null;
  selectedOutcomeType: 'all' | 'ganho' | 'perdido' | 'sem_motivo';
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface PipelineKanbanState {
  isCreatingLead: boolean;
  isUpdatingStage: boolean;
  selectedLead: Lead | null;
  showCreateModal: boolean;
  showDetailsModal: boolean;
  filters: PipelineKanbanFilters;
  sortBy: 'created_at' | 'updated_at' | 'value' | 'name';
  sortOrder: 'asc' | 'desc';
}

export interface UsePipelineKanbanOptions {
  pipelineId: string;
  autoRefresh?: boolean;
  autoRefreshInterval?: number;
  enableMetrics?: boolean;
  enableRealtime?: boolean;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export const usePipelineKanban = ({
  pipelineId,
  autoRefresh = true,
  autoRefreshInterval = 30000, // 30 segundos
  enableMetrics = true,
  enableRealtime = false
}: UsePipelineKanbanOptions) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ============================================
  // ESTADO LOCAL
  // ============================================

  const [state, setState] = useState<PipelineKanbanState>({
    isCreatingLead: false,
    isUpdatingStage: false,
    selectedLead: null,
    showCreateModal: false,
    showDetailsModal: false,
    filters: {
      searchTerm: '',
      selectedStageId: null,
      selectedUserId: null,
      selectedOutcomeType: 'all'
    },
    sortBy: 'updated_at',
    sortOrder: 'desc'
  });

  // ============================================
  // QUERIES TANSTACK
  // ============================================

  // ============================================
  // QUERIES TANSTACK
  // ============================================

  // Query para dados da pipeline com validação robusta
  const pipelineQuery = useQuery({
    queryKey: ['pipeline', pipelineId, user?.tenant_id],
    queryFn: async (): Promise<Pipeline> => {
      startTimer(`fetch-pipeline-${pipelineId}`, LogContext.API);
      
      // ✅ API CALL: Log simplificado
      if (isDevelopment) {
        logger.debouncedLog(
          `pipeline-fetch-${pipelineId}`,
          'debug',
          'Buscando dados da pipeline',
          LogContext.PIPELINE,
          { pipelineId: pipelineId ? pipelineId.substring(0, 8) + '...' : 'unknown' },
          2000
        );
      }
      
      try {
        const response = await api.get(`/pipelines/${pipelineId}?tenant_id=${user?.tenant_id}`);
        
        endTimer(`fetch-pipeline-${pipelineId}`, LogContext.API);
        
        // ✅ API RESPONSE: Log otimizado de resposta
        logOnlyInDevelopment(
          'Resposta da API pipeline recebida',
          LogContext.API,
          {
            status: response.status,
            hasData: !!response.data,
            stagesCount: response.data?.pipeline_stages?.length || 0
          }
        );
        
        // ✅ VALIDAÇÃO: Usar type guard para verificar dados da pipeline
        if (!isPipelineValid(response.data)) {
          logger.error('Pipeline inválida ou dados ausentes', LogContext.VALIDATION, {
            responseType: typeof response.data,
            hasData: !!response.data
          });
          throw new Error('Pipeline não encontrada ou dados inválidos');
        }
        
        // ✅ VALIDAÇÃO: Processar pipeline_stages com type guard
        const pipeline = response.data;
        
        // Verificar se pipeline_stages existe e é válido
        if (!pipeline.pipeline_stages || !Array.isArray(pipeline.pipeline_stages)) {
          logger.warn('Pipeline sem stages, criando array vazio', LogContext.PIPELINE);
          pipeline.pipeline_stages = [];
        } else {
          // Filtrar apenas stages válidos
          const validStages = pipeline.pipeline_stages.filter(isPipelineStageValid);
          if (validStages.length !== pipeline.pipeline_stages.length) {
            logger.warn('Alguns stages foram filtrados por serem inválidos', LogContext.VALIDATION, {
              totalStages: pipeline.pipeline_stages.length,
              validStages: validStages.length
            });
          }
          pipeline.pipeline_stages = validStages;
        }
        
        // ✅ SUCCESS LOG: Log otimizado de sucesso
        logOnlyInDevelopment(
          'Pipeline processada com sucesso',
          LogContext.PIPELINE,
          {
            id: pipeline.id ? pipeline.id.substring(0, 8) + '...' : 'unknown',
            name: pipeline.name,
            stagesCount: pipeline.pipeline_stages.length
          }
        );
        
        return pipeline;
      } catch (error: any) {
        endTimer(`fetch-pipeline-${pipelineId}`, LogContext.API);
        
        // AIDEV-NOTE: Fallback silencioso para erros de conexão - retornar pipeline mock
        if (!error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.code === 'ECONNREFUSED' || error.code === 'ERR_CONNECTION_REFUSED') {
          // Não gerar logs para erros de conexão
          return {
            id: pipelineId,
            name: 'Pipeline (Offline)',
            tenant_id: user?.tenant_id || 'offline',
            pipeline_stages: [
              { id: 'stage-1', name: 'Lead', order_index: 0, color: '#3B82F6', stage_type: 'contato_inicial' },
              { id: 'stage-2', name: 'Ganho', order_index: 1, color: '#10B981', stage_type: 'ganho' },
              { id: 'stage-3', name: 'Perdido', order_index: 2, color: '#EF4444', stage_type: 'perdido' }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        
        logger.error('Erro ao buscar pipeline', LogContext.API, error);
        throw error;
      }
    },
    enabled: !!pipelineId && !!user?.tenant_id,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchInterval: autoRefresh ? autoRefreshInterval : false,
    retry: (failureCount, error: any) => {
      // AIDEV-NOTE: Não retry para ERR_CONNECTION_REFUSED ou Network Error
      if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || error?.code === 'ECONNREFUSED' || error?.code === 'ERR_CONNECTION_REFUSED') {
        return false;
      }
      return failureCount < 2; // Máximo 2 retries para outros erros
    },
    retryDelay: (attemptIndex) => Math.min(1500 * 2 ** attemptIndex, 10000)
  });

  // Query para leads da pipeline com validação robusta
  const leadsQuery = useQuery({
    queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange),
    queryFn: async (): Promise<Lead[]> => {
      startTimer(`fetch-leads-${pipelineId}`, LogContext.API);
      
      // ✅ API CALL: Log simplificado de leads
      if (isDevelopment) {
        logger.debouncedLog(
          `leads-fetch-${pipelineId}`,
          'debug',
          'Buscando leads',
          LogContext.LEADS,
          {
            hasDateFilter: !!state.filters.dateRange,
            dateRange: state.filters.dateRange
          },
          2000
        );
      }
      
      try {
        // ✅ FILTRO POR PERÍODO: Adicionar parâmetros de data na query
        let queryParams = `tenant_id=${user?.tenant_id}`;
        
        if (state.filters.dateRange) {
          queryParams += `&start_date=${state.filters.dateRange.start}`;
          queryParams += `&end_date=${state.filters.dateRange.end}`;
          
          logger.debouncedLog(
            'pipeline-leads-date-filter',
            'debug',
            'Aplicando filtro de período',
            LogContext.FILTERS,
            {
              pipelineId: pipelineId.substring(0, 8),
              dateRange: state.filters.dateRange
            },
            3000
          );
        }
        
        const response = await api.get(`/pipelines/${pipelineId}/leads?${queryParams}`);
        
        endTimer(`fetch-leads-${pipelineId}`, LogContext.API);
        
        // ✅ API RESPONSE: Log otimizado de resposta de leads
        logOnlyInDevelopment(
          'Resposta da API leads recebida',
          LogContext.API,
          {
            status: response.status,
            isArray: Array.isArray(response.data),
            count: response.data?.length || 0
          }
        );
        
        // ✅ VALIDAÇÃO: Usar extractSafeApiData para extrair leads com fallback
        const leads = extractSafeApiData(
          response.data,
          isLeadsArrayValid,
          [] as Lead[]
        );
        
        // ✅ VALIDAÇÃO ADICIONAL: Filtrar leads válidos se o type guard falhou parcialmente
        const validLeads = leads.filter(isLeadValid);
        
        if (validLeads.length !== leads.length) {
          logger.warn('Alguns leads foram filtrados por serem inválidos', LogContext.VALIDATION, {
            total: leads.length,
            valid: validLeads.length,
            filtered: leads.length - validLeads.length
          });
        }
        
        // ✅ SUCCESS LOG: Log otimizado de sucesso de leads
        if (validLeads.length > 0) {
          logOnlyInDevelopment(
            'Leads processados com sucesso',
            LogContext.LEADS,
            { count: validLeads.length }
          );
        }
        
        return validLeads;
      } catch (error: any) {
        endTimer(`fetch-leads-${pipelineId}`, LogContext.API);
        
        // AIDEV-NOTE: Fallback silencioso para erros de conexão - retornar array vazio
        if (!error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.code === 'ECONNREFUSED' || error.code === 'ERR_CONNECTION_REFUSED') {
          // Não gerar logs para erros de conexão
          return [];
        }
        
        // Para outros erros, log em warn em vez de error para reduzir ruído
        logger.warn('Erro ao buscar leads - retornando array vazio', LogContext.API, { 
          error: error.message,
          pipelineId
        });
        return [];
      }
    },
    // 🔧 CORREÇÃO: Aguardar pipeline ser carregada para evitar race condition
    enabled: !!pipelineId && !!user?.tenant_id && !!pipelineQuery.data,
    staleTime: 2 * 60 * 1000, // 2 minutos (aumentado para reduzir refetches)
    gcTime: 10 * 60 * 1000, // 10 minutos (aumentado para melhor cache)
    refetchInterval: autoRefresh ? autoRefreshInterval : false,
    // ✅ NOVA CORREÇÃO: Desabilitar structural sharing para garantir re-renders
    structuralSharing: false,
    // ✅ BACKUP: Forçar re-render em propriedades específicas (baseado na documentação)
    notifyOnChangeProps: ['data', 'dataUpdatedAt', 'error'],
    retry: (failureCount, error: any) => {
      // AIDEV-NOTE: Não retry para ERR_CONNECTION_REFUSED ou Network Error
      if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || error?.code === 'ECONNREFUSED' || error?.code === 'ERR_CONNECTION_REFUSED') {
        return false;
      }
      return failureCount < 2; // Máximo 2 retries para outros erros
    },
    retryDelay: (attemptIndex) => Math.min(1500 * 2 ** attemptIndex, 10000)
  });

  // Query para campos customizados
  const customFieldsQuery = useQuery({
    queryKey: ['pipeline-custom-fields', pipelineId, user?.tenant_id],
    queryFn: async () => {
      startTimer(`fetch-custom-fields-${pipelineId}`, LogContext.API);
      
      if (isDevelopment) {
        logger.debouncedLog(
          `custom-fields-fetch-${pipelineId}`,
          'debug',
          'Buscando campos customizados',
          LogContext.API,
          {},
          3000
        );
      }
      
      try {
        const response = await api.get(`/pipelines/${pipelineId}/custom-fields?tenant_id=${user?.tenant_id}`);
        endTimer(`fetch-custom-fields-${pipelineId}`, LogContext.API);
        
        logOnlyInDevelopment(
          'Campos customizados carregados',
          LogContext.API,
          { count: response.data?.length || 0 }
        );
        
        return response.data || [];
      } catch (error: any) {
        endTimer(`fetch-custom-fields-${pipelineId}`, LogContext.API);
        
        // AIDEV-NOTE: Fallback silencioso para erros de conexão
        if (!error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.code === 'ECONNREFUSED' || error.code === 'ERR_CONNECTION_REFUSED') {
          // Não gerar logs para erros de conexão
          return [];
        }
        
        // Para outros erros, log em warn em vez de error
        logger.warn('Erro ao buscar campos customizados - retornando array vazio', LogContext.API, { 
          error: error.message,
          pipelineId
        });
        return [];
      }
    },
    // 🔧 CORREÇÃO: Aguardar pipeline ser carregada para evitar race condition
    enabled: !!pipelineId && !!user?.tenant_id && !!pipelineQuery.data,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
    retry: (failureCount, error: any) => {
      // AIDEV-NOTE: Não retry para ERR_CONNECTION_REFUSED ou Network Error
      if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || error.code === 'ECONNREFUSED') {
        return false;
      }
      return failureCount < 2; // Máximo 2 retries para outros erros
    },
    retryDelay: (attemptIndex) => Math.min(1500 * 2 ** attemptIndex, 10000)
  });

  // ============================================
  // MÉTRICAS ENTERPRISE (OPCIONAL)
  // ============================================

  const metricsResult = useEnterpriseMetrics({
    initialFilters: enableMetrics ? {
      pipeline_id: pipelineId
    } : undefined,
    initialPeriod: '30days',
    enabled: enableMetrics && !!user?.tenant_id,
    enableAutoRefresh: autoRefresh,
    autoRefreshInterval: autoRefresh ? 5 * 60 * 1000 : undefined, // 5 minutos
    // ✅ OTIMIZAÇÃO: Aumentar staleTime para evitar refetch após drag/drop
    staleTime: 5 * 60 * 1000, // 5 minutos - métricas não precisam ser atualizadas instantaneamente
    cacheTime: 10 * 60 * 1000 // 10 minutos de cache
  });

  // ============================================
  // DADOS PROCESSADOS (COMPUTED VALUES)
  // ============================================

  // Stages ordenados com validação simplificada
  const stages = useMemo(() => {
    const pipelineStages = pipelineQuery.data?.pipeline_stages;
    
    // Validação simples e rápida
    if (!Array.isArray(pipelineStages) || pipelineStages.length === 0) {
      // Stages padrão sem logging durante render
      return [
        { id: 'temp-lead', name: 'Lead', color: '#3B82F6', order_index: 0, stage_type: 'custom' },
        { id: 'temp-won', name: 'Ganho', color: '#10B981', order_index: 1, stage_type: 'won' },
        { id: 'temp-lost', name: 'Perdido', color: '#EF4444', order_index: 2, stage_type: 'lost' }
      ];
    }
    
    // Processamento rápido sem validação complexa
    return pipelineStages
      .filter(stage => stage?.id && stage?.name) // Validação mínima
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(stage => ({
        id: stage.id,
        name: stage.name,
        color: stage.color || '#6B7280',
        order_index: stage.order_index || 0,
        stage_type: stage.stage_type || 'custom'
      }));
  }, [pipelineQuery.data?.pipeline_stages]);

  // ============================================
  // PERFORMANCE TRACKING OTIMIZADO (APENAS QUANDO NECESSÁRIO)
  // ============================================

  // ✅ PERFORMANCE: Tracking simplificado apenas para desenvolvimento
  const performanceMetrics = useMemo(() => {
    if (!isDevelopment) {
      return { renderCount: 0, lastRenderTime: 0, averageRenderTime: 0, slowRenders: 0 };
    }
    
    // Tracking básico apenas
    return {
      renderCount: 1,
      lastRenderTime: 0,
      averageRenderTime: 0,
      slowRenders: 0
    };
  }, []);

  // ✅ INITIALIZATION LOG: Apenas quando necessário
  useEffect(() => {
    if (isDevelopment) {
      logger.debouncedLog(
        `kanban-init-${pipelineId}`,
        'debug',
        'Hook usePipelineKanban iniciado',
        LogContext.HOOKS,
        { userRole: user?.role },
        5000
      );
    }
  }, [pipelineId]);

  // ============================================
  // MUTATIONS
  // ============================================

  // Mutation para mover lead entre stages com OPTIMISTIC UPDATES
  const moveLeadMutation = useMutation({
    mutationFn: async ({ leadId, newStageId, position }: { leadId: string; newStageId: string; position?: number }) => {
      setState(prev => ({ ...prev, isUpdatingStage: true }));
      
      // 🎯 SISTEMA DE POSIÇÕES: Incluir posição na requisição se fornecida
      const requestBody: any = {
        stage_id: newStageId,
        tenant_id: user?.tenant_id
      };
      
      if (position !== undefined) {
        requestBody.position = position;
        console.log('🎯 [FRONTEND] Enviando posição específica:', { leadId: leadId.substring(0, 8), position });
      }
      
      const response = await api.put(`/pipelines/${pipelineId}/leads/${leadId}`, requestBody);
      
      return response.data;
    },
    // ✨ OPTIMISTIC UPDATE: Move card imediatamente na UI
    onMutate: async ({ leadId, newStageId }) => {
      console.log('🚀 [OPTIMISTIC] Iniciando movimentação otimista:', { leadId, newStageId });
      
      // 1. Cancelar queries pendentes para evitar race conditions
      await queryClient.cancelQueries({ queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange) });
      
      // 2. Snapshot dos dados atuais (para rollback)
      const previousLeads = queryClient.getQueryData(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange));
      
      // 3. ✅ CORREÇÃO STRUCTURAL SHARING: Força nova referência em TODOS os objetos
      const globalTimestamp = Date.now();
      const forceRenderKey = Math.random();
      
      queryClient.setQueryData(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange), (old: any) => {
        if (!Array.isArray(old)) return old;
        
        // ✅ QUEBRA STRUCTURAL SHARING: Novo array + todos objetos com nova referência
        const newLeads = [...old].map((lead: any) => {
          if (lead.id === leadId) {
            console.log('✨ [OPTIMISTIC] Lead movido na UI:', { 
              leadId, 
              from: lead.stage_id, 
              to: newStageId 
            });
            // Lead movido: nova referência completa
            return {
              ...lead,
              stage_id: newStageId,
              moved_at: new Date().toISOString(),
              isOptimistic: true,
              __timestamp: globalTimestamp,
              __force_render: forceRenderKey,
              __moved: true // Flag especial para lead movido
            };
          }
          // ✅ CRÍTICO: Força mudança estrutural em TODOS os leads
          return {
            ...lead,
            __timestamp: globalTimestamp,
            __force_render: forceRenderKey
          };
        });
        
        console.log('🎯 [OPTIMISTIC] Cache atualizado com quebra de structural sharing');
        return newLeads;
      });
      
      // 4. ✅ FORÇA RE-RENDER VIA QUERY STATE: Atualiza metadados da query
      const queryCache = queryClient.getQueryCache();
      const query = queryCache.find(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange));
      if (query) {
        query.setState({ 
          ...query.state, 
          dataUpdatedAt: globalTimestamp,
          __forceUpdate: forceRenderKey
        });
        
        // ✅ CORREÇÃO DEFINITIVA: Atualizar cache imediatamente com padrão oficial
        // Baseado na documentação oficial do TanStack Query v5
        try {
          // 1. Cancelar queries pendentes para evitar overwrites
          await queryClient.cancelQueries({ 
            queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange) 
          });
          
          // 2. Atualizar cache IMEDIATAMENTE (força React re-render)
          queryClient.setQueryData(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange), (oldData: any) => {
            if (!oldData) return oldData;
            
            // Encontrar e mover lead para nova stage
            return oldData.map((lead: any) => {
              if (lead.id === leadId) {
                return { ...lead, stage_id: newStageId, updated_at: new Date().toISOString() };
              }
              return lead;
            });
          });
          
          console.log('✅ [OPTIMISTIC] Cache atualizado instantaneamente com setQueryData');
        } catch (error) {
          console.warn('⚠️ [OPTIMISTIC] Erro ao atualizar cache:', error);
        }
        
        console.log('🔄 [OPTIMISTIC] Query state atualizado manualmente');
      }
      
      // 5. FORÇA RE-RENDER MÚLTIPLO: Estratégia combinada
      queryClient.invalidateQueries({ 
        queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange),
        refetchType: 'none'
      });
      
      // 6. FORÇA RE-RENDER ASSÍNCRONO: Garantia adicional
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange),
          refetchType: 'none'
        });
        console.log('🔄 [OPTIMISTIC] Re-render assíncrono executado');
      }, 0);
      
      // 7. FORÇA ATUALIZAÇÃO RELACIONADA: Pipeline queries
      queryClient.invalidateQueries({ 
        queryKey: ['pipeline'],
        refetchType: 'none'
      });
      
      console.log('🔄 [OPTIMISTIC] Structural sharing quebrado + múltiplas invalidações');
      
      // 8. Retornar contexto expandido
      return { 
        previousLeads, 
        leadId, 
        newStageId,
        oldStageId: previousLeads ? (previousLeads as any[]).find((l: any) => l.id === leadId)?.stage_id : null,
        updateTimestamp: globalTimestamp,
        forceRenderKey
      };
    },
    // ✅ SUCCESS: Confirmar movimentação (remover flag otimista)
    onSuccess: (response, { leadId, newStageId }, context) => {
      console.log('✅ [OPTIMISTIC] Movimentação confirmada pelo servidor');
      
      // ✅ CONFIRMAÇÃO COM STRUCTURAL SHARING BREAK
      const confirmTimestamp = Date.now();
      queryClient.setQueryData(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange), (old: any) => {
        if (!Array.isArray(old)) return old;
        
        // ✅ QUEBRA STRUCTURAL SHARING NA CONFIRMAÇÃO: Novo array
        const confirmedLeads = [...old].map((lead: any) => {
          if (lead.id === leadId) {
            // Lead confirmado: remover flags otimistas + nova referência
            return {
              ...lead,
              isOptimistic: false,
              updated_at: new Date().toISOString(),
              __timestamp: confirmTimestamp,
              __confirmed: true,
              // Remover campos temporários
              __force_render: undefined,
              __moved: undefined
            };
          }
          // ✅ FORÇA MUDANÇA EM TODOS: Nova referência para garantir re-render
          return {
            ...lead,
            __timestamp: confirmTimestamp
          };
        });
        
        console.log('🔄 [OPTIMISTIC] Flag otimista removida com structural sharing break');
        return confirmedLeads;
      });
      
      // ✅ FORÇA QUERY STATE UPDATE NA CONFIRMAÇÃO
      const queryCache = queryClient.getQueryCache();
      const query = queryCache.find(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange));
      if (query) {
        query.setState({ 
          ...query.state, 
          dataUpdatedAt: confirmTimestamp,
          __confirmed: true
        });
        
        // ✅ CONFIRMAÇÃO: Cache já foi atualizado no onMutate
        // TanStack Query automaticamente sincroniza com dados do servidor
        console.log('✅ [SUCCESS] Movimentação confirmada pelo servidor - cache já atualizado');
        
        console.log('🔄 [OPTIMISTIC] Query state confirmação atualizado');
      }
      
      // ✅ FORÇA RE-RENDER FINAL: Múltiplas estratégias
      queryClient.invalidateQueries({ 
        queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange),
        refetchType: 'none'
      });
      
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange),
          refetchType: 'none'
        });
        console.log('✅ [OPTIMISTIC] Re-render final assíncrono executado');
      }, 0);
      
      // ✅ OTIMIZAÇÃO: Invalidação inteligente das métricas
      if (enableMetrics) {
        queryClient.invalidateQueries({ 
          queryKey: ['enterprise-metrics'],
          refetchType: 'none'
        });
      }
      
      console.log('✅ [OPTIMISTIC] Movimentação 100% concluída com structural sharing');
    },
    // ❌ ERROR: Rollback automático
    onError: (error, { leadId, newStageId }, context) => {
      console.error('❌ [OPTIMISTIC] Erro na movimentação, fazendo rollback:', error);
      
      if (context?.previousLeads) {
        // ✅ ROLLBACK COM STRUCTURAL SHARING BREAK
        const rollbackTimestamp = Date.now();
        const rollbackKey = Math.random();
        
        // Restaurar dados com nova referência
        queryClient.setQueryData(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange), (old: any) => {
          // ✅ QUEBRA STRUCTURAL SHARING NO ROLLBACK: Força nova referência
          const rolledBackLeads = [...(context.previousLeads as any[])].map((lead: any) => ({
            ...lead,
            __timestamp: rollbackTimestamp,
            __rollback: rollbackKey,
            // Remover flags otimistas se existirem
            isOptimistic: false,
            __force_render: undefined,
            __moved: undefined
          }));
          
          console.log('🔙 [OPTIMISTIC] Rollback com structural sharing break');
          return rolledBackLeads;
        });
        
        // ✅ FORÇA QUERY STATE UPDATE NO ROLLBACK
        const queryCache = queryClient.getQueryCache();
        const query = queryCache.find(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange));
        if (query) {
          query.setState({ 
            ...query.state, 
            dataUpdatedAt: rollbackTimestamp,
            __rollback: rollbackKey
          });
          
          // ✅ ROLLBACK: Usar setQueryData para restaurar estado anterior
          queryClient.setQueryData(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange), context.previousLeads);
          console.log('🔄 [ROLLBACK] Cache restaurado com setQueryData');
          
          console.log('🔄 [OPTIMISTIC] Query state rollback atualizado');
        }
        
        // ✅ FORÇA RE-RENDER APÓS ROLLBACK: Múltiplas estratégias
        queryClient.invalidateQueries({ 
          queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange),
          refetchType: 'none'
        });
        
        setTimeout(() => {
          queryClient.invalidateQueries({ 
            queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange),
            refetchType: 'none'
          });
          console.log('🔙 [OPTIMISTIC] Re-render rollback assíncrono executado');
        }, 0);
        
        console.log('🔙 [OPTIMISTIC] Rollback executado com structural sharing');
      }
      
      logger.error('Erro ao mover lead', LogContext.LEADS, error);
    },
    // 🏁 SETTLED: Limpeza final
    onSettled: () => {
      setState(prev => ({ ...prev, isUpdatingStage: false }));
      console.log('🏁 [OPTIMISTIC] Processo de movimentação finalizado');
      
      // ✅ CORREÇÃO: Agendar limpeza das flags otimistas
      cleanOptimisticFlags();
    }
  });

  // Mutation para criar novo lead com OPTIMISTIC UPDATES
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: any) => {
      setState(prev => ({ ...prev, isCreatingLead: true }));
      
      const response = await api.post('/leads', {
        ...leadData,
        pipeline_id: pipelineId,
        tenant_id: user?.tenant_id
      });
      
      return response.data;
    },
    // ✨ OPTIMISTIC UPDATE: Criar card instantaneamente
    onMutate: async (leadData: any) => {
      console.log('🚀 [OPTIMISTIC] Iniciando criação otimista de lead:', leadData);
      
      // 1. Cancelar queries pendentes para evitar sobrescrita
      await queryClient.cancelQueries({ queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange) });
      
      // 2. Snapshot dos dados atuais (para rollback)
      const previousLeads = queryClient.getQueryData(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange));
      
      // 3. Criar lead otimista que aparece imediatamente
      const optimisticLead = {
        id: `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID único temporário
        pipeline_id: pipelineId,
        stage_id: leadData.stage_id,
        lead_master_id: leadData.existing_lead_id || `temp-master-${Date.now()}`,
        assigned_to: leadData.responsavel || user?.id,
        created_by: user?.id,
        tenant_id: user?.tenant_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        moved_at: new Date().toISOString(),
        lifecycle_stage: 'lead',
        status: 'active',
        // Dados customizados da oportunidade
        custom_data: {
          nome_oportunidade: leadData.nome_oportunidade || 'Nova Oportunidade',
          valor: leadData.valor ? parseFloat(leadData.valor.toString().replace(/[^0-9.,]/g, '').replace(',', '.')) : 0,
          ...leadData
        },
        // Dados do lead master (existente ou novo)
        leads_master: {
          id: leadData.existing_lead_id || `temp-master-${Date.now()}`,
          first_name: leadData.nome || leadData.nome_lead || leadData.nome_contato || 'Novo Lead',
          last_name: leadData.sobrenome || '',
          email: leadData.email || leadData.email_lead || leadData.email_contato || '',
          phone: leadData.telefone || leadData.telefone_contato || '',
          company: leadData.empresa || '',
          estimated_value: leadData.valor ? parseFloat(leadData.valor.toString().replace(/[^0-9.,]/g, '').replace(',', '.')) : 0
        },
        // Flags para identificação
        isOptimistic: true,
        isCreating: true,
        tempId: `optimistic-${Date.now()}`
      };
      
      console.log('✨ [OPTIMISTIC] Lead otimista criado:', optimisticLead);
      
      // 4. Atualizar cache imediatamente - adicionar no início da lista
      queryClient.setQueryData(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange), (old: any) => {
        const existingLeads = Array.isArray(old) ? old : [];
        return [optimisticLead, ...existingLeads];
      });
      
      console.log('🎯 [OPTIMISTIC] Cache atualizado - lead aparece AGORA na interface');
      
      // 5. Retornar contexto para onError e onSuccess
      return { 
        previousLeads, 
        optimisticLead,
        leadData 
      };
    },
    // ✅ SUCCESS: Substituir lead otimista pelo real do servidor
    onSuccess: (response, leadData, context) => {
      console.log('✅ [OPTIMISTIC] Criação bem-sucedida, substituindo por dados reais:', response);
      
      if (context && response?.data?.opportunity) {
        const realLead = response.data.opportunity;
        
        // Substituir o lead otimista pelo real
        queryClient.setQueryData(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange), (old: any) => {
          if (!Array.isArray(old)) return [realLead];
          
          return old.map((lead: any) => 
            lead.tempId === context.optimisticLead.tempId 
              ? { ...realLead, isOptimistic: false, isCreating: false }
              : lead
          );
        });
        
        console.log('🔄 [OPTIMISTIC] Lead otimista substituído pelo real');
      }
      
      // Invalidar para garantir sincronização
      queryClient.invalidateQueries({ queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange) });
      if (enableMetrics) {
        queryClient.invalidateQueries({ queryKey: ['enterprise-metrics'] });
      }
      setState(prev => ({ ...prev, showCreateModal: false }));
    },
    // ❌ ERROR: Rollback automático
    onError: (error, leadData, context) => {
      console.error('❌ [OPTIMISTIC] Erro na criação, fazendo rollback:', error);
      
      if (context?.previousLeads) {
        // Reverter para dados anteriores
        queryClient.setQueryData(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange), context.previousLeads);
        console.log('🔙 [OPTIMISTIC] Rollback executado - lead otimista removido');
      }
      
      logger.error('Erro ao criar lead', LogContext.LEADS, error);
    },
    // 🏁 SETTLED: Limpeza final
    onSettled: () => {
      setState(prev => ({ ...prev, isCreatingLead: false }));
      console.log('🏁 [OPTIMISTIC] Processo de criação finalizado');
      
      // ✅ CORREÇÃO: Agendar limpeza das flags otimistas
      cleanOptimisticFlags();
    }
  });

  // Mutation para atualizar lead
  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, updateData }: { leadId: string; updateData: any }) => {
      const response = await api.put(`/leads/${leadId}`, {
        ...updateData,
        tenant_id: user?.tenant_id
      });
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange) });
    },
    onError: (error) => {
      logger.error('Erro ao atualizar lead', LogContext.LEADS, error);
    }
  });

  // Leads filtrados com validação simplificada
  const filteredLeads = useMemo(() => {
    if (leadsQuery.isPending || !Array.isArray(leadsQuery.data)) {
      return [];
    }
    
    // Validação simples e filtros rápidos
    let results = leadsQuery.data.filter(lead => lead?.id && lead?.stage_id);
    
    // Filtros sem logs durante render
    if (state.filters.searchTerm.trim()) {
      const searchLower = state.filters.searchTerm.toLowerCase();
      results = results.filter(lead => {
        const customData = lead.custom_data || {};
        const searchableFields = [
          customData.nome_oportunidade || '',
          customData.nome_lead || '',
          customData.email || '',
          customData.telefone || '',
          customData.empresa || ''
        ];
        return searchableFields.some(field => 
          field.toString().toLowerCase().includes(searchLower)
        );
      });
    }
    
    if (state.filters.selectedStageId) {
      results = results.filter(lead => lead.stage_id === state.filters.selectedStageId);
    }
    
    if (state.filters.selectedUserId) {
      results = results.filter(lead => lead.assigned_to === state.filters.selectedUserId);
    }
    
    return results;
  }, [leadsQuery.data, leadsQuery.isPending, state.filters]);

  // Leads agrupados por stage com processamento otimizado e cache de ordenação
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    
    // Inicializar grupos para todas as stages
    stages.forEach(stage => {
      if (stage?.id) {
        grouped[stage.id] = [];
      }
    });
    
    // Agrupar leads de forma simples
    filteredLeads.forEach(lead => {
      if (lead?.stage_id && grouped[lead.stage_id]) {
        grouped[lead.stage_id].push(lead);
      } else if (lead?.stage_id && stages[0]?.id) {
        // Fallback simples para o primeiro stage
        grouped[stages[0].id].push(lead);
      }
    });
    
    // ✅ OTIMIZAÇÃO: Ordenar leads em cada stage de forma otimizada
    Object.keys(grouped).forEach(stageId => {
      // Skip ordenação se não há leads nesta stage
      if (grouped[stageId].length <= 1) return;
      
      grouped[stageId].sort((a, b) => {
        // ✅ PERFORMANCE: Cache de valores para evitar recalculação
        let valueA: any, valueB: any;
        
        switch (state.sortBy) {
          case 'created_at':
            valueA = new Date(a.created_at).getTime();
            valueB = new Date(b.created_at).getTime();
            break;
          case 'updated_at':
            valueA = new Date(a.updated_at || a.created_at).getTime();
            valueB = new Date(b.updated_at || b.created_at).getTime();
            break;
          case 'value':
            valueA = Number(a.custom_data?.valor || 0);
            valueB = Number(b.custom_data?.valor || 0);
            break;
          case 'name':
            // ✅ CACHE: Evitar toLowerCase múltiplo
            valueA = (a.custom_data?.nome_oportunidade || '').toLowerCase();
            valueB = (b.custom_data?.nome_oportunidade || '').toLowerCase();
            break;
          default:
            return 0;
        }
        
        return state.sortOrder === 'asc' 
          ? (valueA > valueB ? 1 : valueA < valueB ? -1 : 0)
          : (valueA < valueB ? 1 : valueA > valueB ? -1 : 0);
      });
    });
    
    return grouped;
  }, [stages, filteredLeads, state.sortBy, state.sortOrder]);

  // ============================================
  // HANDLERS E ACTIONS (OTIMIZADOS COM USECALLBACK)
  // ============================================

  const updateFilters = useCallback((newFilters: Partial<PipelineKanbanFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  }, []);

  // ✅ FILTRO POR PERÍODO: Handler específico para filtro de data
  const updateDateRange = useCallback((dateRange: { start: Date | null; end: Date | null } | null) => {
    let formattedDateRange: { start: string; end: string } | undefined;
    
    if (dateRange && dateRange.start && dateRange.end) {
      formattedDateRange = {
        start: dateRange.start.toISOString().split('T')[0], // YYYY-MM-DD
        end: dateRange.end.toISOString().split('T')[0]
      };
      
      logger.debouncedLog(
        'pipeline-kanban-date-filter',
        'debug',
        'Atualizando filtro de período',
        LogContext.FILTERS,
        {
          start: formattedDateRange.start,
          end: formattedDateRange.end
        },
        1000
      );
    } else {
      logger.debouncedLog(
        'pipeline-kanban-date-filter-clear',
        'debug',
        'Removendo filtro de período',
        LogContext.FILTERS,
        {},
        1000
      );
    }
    
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, dateRange: formattedDateRange }
    }));
  }, []);

  const updateSorting = useCallback((sortBy: string, sortOrder: string) => {
    setState(prev => ({
      ...prev,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any
    }));
  }, []);

  const openCreateModal = useCallback(() => {
    setState(prev => ({ ...prev, showCreateModal: true }));
  }, []);

  const closeCreateModal = useCallback(() => {
    setState(prev => ({ ...prev, showCreateModal: false }));
  }, []);

  const openDetailsModal = useCallback((lead: Lead) => {
    setState(prev => ({ 
      ...prev, 
      selectedLead: lead, 
      showDetailsModal: true 
    }));
  }, []);

  const closeDetailsModal = useCallback(() => {
    if (state.isUpdatingStage) {
      // Log apenas em desenvolvimento
      if (isDevelopment) {
        logger.debouncedLog(
          'modal-block',
          'debug',
          'Modal bloqueado durante atualização',
          LogContext.LEADS,
          {},
          2000
        );
      }
      return;
    }
    setState(prev => ({ 
      ...prev, 
      selectedLead: null, 
      showDetailsModal: false 
    }));
  }, [state.isUpdatingStage]);

  const handleLeadMove = useCallback(async (leadId: string, newStageId: string, position?: number) => {
    try {
      await moveLeadMutation.mutateAsync({ leadId, newStageId, position });
    } catch (error) {
      logger.error('Erro ao mover lead', LogContext.LEADS, error);
      throw error;
    }
  }, [moveLeadMutation]);

  const handleCreateLead = useCallback(async (leadData: any) => {
    try {
      await createLeadMutation.mutateAsync(leadData);
    } catch (error) {
      logger.error('Erro ao criar lead', LogContext.LEADS, error);
      throw error;
    }
  }, [createLeadMutation]);

  const handleUpdateLead = useCallback(async (leadId: string, updateData: any) => {
    try {
      await updateLeadMutation.mutateAsync({ leadId, updateData });
    } catch (error) {
      logger.error('Erro ao atualizar lead', LogContext.LEADS, error);
      throw error;
    }
  }, [updateLeadMutation]);

  const refreshData = useCallback(async () => {
    // ✅ CORREÇÃO: Verificar se timer já existe antes de criar um novo
    if (hasTimer('refresh-all-data')) {
      clearTimer('refresh-all-data');
    }
    startTimer('refresh-all-data', LogContext.PERFORMANCE);
    // Log apenas se necessário
    if (isDevelopment) {
      logger.debouncedLog(
        `refresh-data-${pipelineId}`,
        'debug',
        'Atualizando dados',
        LogContext.PIPELINE,
        {},
        3000
      );
    }
    
    try {
      // Primeiro atualizar a pipeline, depois as demais queries
      await pipelineQuery.refetch();
      
      // Aguardar um pouco para garantir que a pipeline foi carregada
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await Promise.all([
        leadsQuery.refetch(),
        customFieldsQuery.refetch()
      ]);
      
      if (enableMetrics) {
        await metricsResult.refetch();
      }
      
      endTimer('refresh-all-data', LogContext.PERFORMANCE);
      // Log de sucesso simplificado
      if (isDevelopment) {
        logger.debouncedLog(
          `refresh-success-${pipelineId}`,
          'debug',
          'Dados atualizados',
          LogContext.PIPELINE,
          {},
          5000
        );
      }
    } catch (error) {
      endTimer('refresh-all-data', LogContext.PERFORMANCE);
      logger.error('Erro ao atualizar dados', LogContext.PIPELINE, error);
      throw error;
    }
  }, [pipelineQuery, leadsQuery, customFieldsQuery, enableMetrics, metricsResult]);

  // ============================================
  // EFEITOS
  // ============================================

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      // ✅ CORREÇÃO: Limpar timers ativos para evitar vazamentos de memória
      if (hasTimer('process-stages')) {
        clearTimer('process-stages');
      }
      if (hasTimer('process-leads')) {
        clearTimer('process-leads');
      }
      if (hasTimer('refresh-all-data')) {
        clearTimer('refresh-all-data');
      }
      if (hasTimer(`fetch-pipeline-${pipelineId}`)) {
        clearTimer(`fetch-pipeline-${pipelineId}`);
      }
      if (hasTimer(`fetch-leads-${pipelineId}`)) {
        clearTimer(`fetch-leads-${pipelineId}`);
      }
      if (hasTimer(`fetch-custom-fields-${pipelineId}`)) {
        clearTimer(`fetch-custom-fields-${pipelineId}`);
      }
      
      setState({
        isCreatingLead: false,
        isUpdatingStage: false,
        selectedLead: null,
        showCreateModal: false,
        showDetailsModal: false,
        filters: {
          searchTerm: '',
          selectedStageId: null,
          selectedUserId: null,
          selectedOutcomeType: 'all'
        },
        sortBy: 'updated_at',
        sortOrder: 'desc'
      });
    };
  }, [pipelineId]);

  // ============================================
  // LIMPEZA AUTOMÁTICA DE FLAGS OTIMISTAS
  // ============================================
  
  // ✅ CORREÇÃO: Função para limpar flags otimistas persistentes
  const cleanOptimisticFlags = useCallback(() => {
    const cleanupTimer = setTimeout(() => {
      queryClient.setQueryData(getLeadsQueryKey(pipelineId, user?.tenant_id, state.filters.dateRange || DEFAULT_DATE_RANGE), (old: any) => {
        if (!Array.isArray(old)) return old;
        
        // Verificar se há leads com flags otimistas antigas
        const hasOptimisticFlags = old.some((lead: any) => lead.isOptimistic);
        if (!hasOptimisticFlags) return old;
        
        console.log('🧹 [CLEANUP] Limpando flags otimistas persistentes');
        
        // Limpar todas as flags otimistas
        return old.map((lead: any) => {
          if (lead.isOptimistic || lead.isCreating || lead.tempId) {
            return {
              ...lead,
              isOptimistic: false,
              isCreating: false,
              tempId: undefined,
              __timestamp: Date.now(),
              __cleaned: true
            };
          }
          return lead;
        });
      });
    }, 2000); // Limpar após 2 segundos para permitir animações
    
    return () => clearTimeout(cleanupTimer);
  }, [pipelineId, user?.tenant_id, state.filters.dateRange, queryClient]);

  // ============================================
  // DEBUG VALUE PARA REACT DEVTOOLS
  // ============================================
  
  // ✅ REACT DEVTOOLS: useDebugValue otimizado com performance metrics
  const debugState = useMemo(() => ({
    pipelineId: pipelineId ? pipelineId.substring(0, 8) + '...' : 'unknown',
    pipelineName: pipelineQuery.data?.name || 'N/A',
    stagesCount: stages.length,
    totalLeads: leadsQuery.data?.length || 0,
    filteredCount: filteredLeads.length,
    isLoading: pipelineQuery.isLoading || leadsQuery.isLoading,
    hasError: !!(pipelineQuery.error || leadsQuery.error),
    renderCount: performanceMetrics.renderCount,
    avgRenderTime: performanceMetrics.averageRenderTime,
    slowRenders: performanceMetrics.slowRenders
  }), [
    pipelineId,
    pipelineQuery.data?.name,
    stages.length,
    leadsQuery.data?.length,
    filteredLeads.length,
    pipelineQuery.isLoading,
    leadsQuery.isLoading,
    pipelineQuery.error,
    leadsQuery.error,
    performanceMetrics.renderCount,
    performanceMetrics.averageRenderTime,
    performanceMetrics.slowRenders
  ]);
  
  // ✅ REACT DOCS: useDebugValue com formatter otimizado
  useDebugValue(debugState, (state) => 
    `${state.pipelineName} | S:${state.stagesCount} L:${state.totalLeads}/${state.filteredCount} | R:${state.renderCount}(${state.avgRenderTime.toFixed(1)}ms) | E:${state.errorCount}`
  );
  
  // ✅ OPTIMIZED DEBUG: Só em desenvolvimento com debouncing
  useLoggerDebug(debugState, 'usePipelineKanban');
  
  // ============================================
  // RETURN DO HOOK
  // ============================================

  // ============================================
  // RETURN OBJECT MEMOIZADO PARA EVITAR RE-RENDERS
  // ============================================
  
  // Return object otimizado com menos dependências
  return useMemo(() => ({
    // Dados essenciais
    pipeline: pipelineQuery.data || null,
    stages,
    leads: leadsQuery.data || [],
    filteredLeads,
    leadsByStage,
    customFields: customFieldsQuery.data || [],
    
    // Estados de carregamento (agrupados)
    isLoading: pipelineQuery.isLoading || leadsQuery.isLoading,
    
    // Estados de operação (do state)
    ...state,
    
    // Ações (já memoizadas)
    updateFilters,
    updateDateRange,
    updateSorting,
    openCreateModal,
    closeCreateModal,
    openDetailsModal,
    closeDetailsModal,
    handleLeadMove,
    handleCreateLead,
    handleUpdateLead,
    refreshData,
    
    // Utilities básicas
    hasData: (leadsQuery.data?.length || 0) > 0,
    isEmpty: filteredLeads.length === 0,
    totalLeads: leadsQuery.data?.length || 0,
    filteredCount: filteredLeads.length,
    
    // Error handling
    error: pipelineQuery.error || leadsQuery.error,
    
    // Métricas (se habilitadas)
    metrics: enableMetrics ? metricsResult.metrics : null,
    refreshMetrics: enableMetrics ? metricsResult.refetch : undefined
  }), [
    // Dependências essenciais (reduzidas)
    pipelineQuery.data,
    pipelineQuery.isLoading,
    pipelineQuery.error,
    stages,
    leadsQuery.data,
    leadsQuery.isLoading,
    leadsQuery.error,
    filteredLeads,
    leadsByStage,
    customFieldsQuery.data,
    state,
    enableMetrics,
    metricsResult.metrics,
    metricsResult.refetch,
    // Ações (já memoizadas)
    updateFilters,
    updateDateRange,
    updateSorting,
    openCreateModal,
    closeCreateModal,
    openDetailsModal,
    closeDetailsModal,
    handleLeadMove,
    handleCreateLead,
    handleUpdateLead,
    refreshData
  ]);
};

export default usePipelineKanban;