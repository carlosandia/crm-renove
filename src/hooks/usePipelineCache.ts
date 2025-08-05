import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pipeline } from '../types/Pipeline';

export interface PipelineCacheOptions {
  tenantId: string;
  pipelines: Pipeline[];
  fallbackToPipelineId?: string;
}

export interface PipelineCacheReturn {
  lastViewedPipeline: Pipeline | null;
  setLastViewedPipeline: (pipeline: Pipeline) => void;
  clearCache: () => void;
  isLoading: boolean;
}

/**
 * Hook para gerenciar cache inteligente da última pipeline visualizada
 * Utiliza localStorage para persistência entre sessões
 * 
 * @param options - Configurações do cache
 * @returns Interface para gerenciar pipeline cacheada
 */
export const usePipelineCache = ({
  tenantId,
  pipelines,
  fallbackToPipelineId
}: PipelineCacheOptions): PipelineCacheReturn => {
  const [lastViewedPipeline, setLastViewedPipelineState] = useState<Pipeline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  
  // AIDEV-NOTE: Throttling para evitar spam de logs do React Query
  const logThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const syncThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // AIDEV-NOTE: Cache key específico por tenant para isolamento multi-tenant
  const CACHE_KEY = `crm_last_pipeline_${tenantId}`;

  /**
   * Recupera pipeline do cache localStorage
   */
  const getCachedPipeline = useCallback((): Pipeline | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { pipelineId, cachedAt } = JSON.parse(cached);
      
      // Cache válido por 24 horas
      const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h em ms
      const isExpired = Date.now() - cachedAt > CACHE_DURATION;
      
      if (isExpired) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      // Buscar pipeline no array atual
      const foundPipeline = pipelines.find(p => p.id === pipelineId);
      
      // Verificar se pipeline ainda existe e está ativa
      if (foundPipeline && foundPipeline.is_active) {
        return foundPipeline;
      }
      
      // Cache inválido - pipeline não existe mais ou está inativa
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.warn('Erro ao recuperar pipeline do cache:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, [CACHE_KEY, pipelines]);

  /**
   * Salva pipeline no cache localStorage
   */
  const setPipelineCache = useCallback((pipeline: Pipeline) => {
    try {
      const cacheData = {
        pipelineId: pipeline.id,
        cachedAt: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Erro ao salvar pipeline no cache:', error);
    }
  }, [CACHE_KEY]);

  /**
   * Busca pipeline inteligente com fallbacks
   */
  const findBestPipeline = useCallback((): Pipeline | null => {
    if (!pipelines || pipelines.length === 0) return null;

    // 1. Tentar pipeline do cache
    const cached = getCachedPipeline();
    if (cached) return cached;

    // 2. Tentar pipeline específica (fallback)
    if (fallbackToPipelineId) {
      const fallback = pipelines.find(p => p.id === fallbackToPipelineId && p.is_active);
      if (fallback) return fallback;
    }

    // 3. Primeira pipeline ativa disponível
    const firstActive = pipelines.find(p => p.is_active);
    if (firstActive) return firstActive;

    // 4. Se não há pipelines ativas, retornar a primeira disponível
    return pipelines[0] || null;
  }, [pipelines, getCachedPipeline, fallbackToPipelineId]);

  /**
   * Atualiza pipeline selecionada e salva no cache
   */
  const setLastViewedPipeline = useCallback((pipeline: Pipeline) => {
    setLastViewedPipelineState(pipeline);
    setPipelineCache(pipeline);
    
    console.log(`📌 Pipeline '${pipeline.name}' (${pipeline.id}) salva no cache para tenant ${tenantId}`);
  }, [setPipelineCache, tenantId]);

  /**
   * Limpa cache localStorage
   */
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setLastViewedPipelineState(null);
    console.log(`🧹 Cache de pipeline limpo para tenant ${tenantId}`);
  }, [CACHE_KEY, tenantId]);

  /**
   * ✅ CORREÇÃO: Effect otimizado para carregar pipeline inicial - dependências mínimas
   */
  useEffect(() => {
    if (!pipelines || pipelines.length === 0) {
      setIsLoading(false);
      return;
    }

    // ✅ OTIMIZAÇÃO: Executar lógica diretamente no effect para evitar dependências extras
    let bestPipeline: Pipeline | null = null;

    // 1. Tentar pipeline do cache
    const cached = getCachedPipeline();
    if (cached && pipelines.find(p => p.id === cached.id)) {
      bestPipeline = cached;
    }
    // 2. Tentar pipeline específica (fallback)
    else if (fallbackToPipelineId) {
      const fallback = pipelines.find(p => p.id === fallbackToPipelineId && p.is_active);
      if (fallback) bestPipeline = fallback;
    }
    // 3. Primeira pipeline ativa disponível
    else {
      const firstActive = pipelines.find(p => p.is_active);
      bestPipeline = firstActive || pipelines[0] || null;
    }
    
    if (bestPipeline) {
      setLastViewedPipelineState(bestPipeline);
      // Atualizar cache apenas se não for do cache
      if (!cached || cached.id !== bestPipeline.id) {
        console.log(`🔄 [usePipelineCache] Atualizando cache inicial: ${bestPipeline.name} (${bestPipeline.id})`);
        setPipelineCache(bestPipeline);
      } else {
        // AIDEV-NOTE: Log reduzido para evitar spam - apenas quando necessário
        if (import.meta.env.DEV && import.meta.env.VITE_VERBOSE_LOGS === 'true') {
          console.log(`📖 [usePipelineCache] Pipeline do cache mantida: ${bestPipeline.name} (${bestPipeline.id})`);
        }
      }
    }
    
    setIsLoading(false);
  }, [pipelines, fallbackToPipelineId]); // ✅ OTIMIZAÇÃO: Dependências mínimas

  /**
   * ✅ NOVA: Sincronizar mudanças na pipeline atual quando ela é atualizada
   */
  useEffect(() => {
    if (!lastViewedPipeline || !pipelines.length) return;
    
    // Procurar versão atualizada da pipeline atual
    const updatedPipeline = pipelines.find(p => p.id === lastViewedPipeline.id);
    
    if (updatedPipeline && (
      updatedPipeline.name !== lastViewedPipeline.name ||
      updatedPipeline.description !== lastViewedPipeline.description ||
      updatedPipeline.updated_at !== lastViewedPipeline.updated_at
    )) {
      // AIDEV-NOTE: Throttling para logs de sincronização - evitar spam
      if (syncThrottleRef.current) {
        clearTimeout(syncThrottleRef.current);
      }
      
      syncThrottleRef.current = setTimeout(() => {
        console.log('🔄 [usePipelineCache] Sincronizando mudanças da pipeline:', {
          from: { name: lastViewedPipeline.name, updated: lastViewedPipeline.updated_at },
          to: { name: updatedPipeline.name, updated: updatedPipeline.updated_at }
        });
      }, 1500);
      
      setLastViewedPipelineState(updatedPipeline);
      setPipelineCache(updatedPipeline);
    }
  }, [pipelines, lastViewedPipeline, setPipelineCache]);

  /**
   * ✅ CRÍTICO: Listener para mudanças no React Query cache
   */
  useEffect(() => {
    if (!lastViewedPipeline || !tenantId) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Escutar apenas eventos de pipelines updates
      if (
        event?.query?.queryKey &&
        (event.query.queryKey.includes('pipelines') || 
         event.query.queryKey.includes(lastViewedPipeline.id)) &&
        event.type === 'updated'
      ) {
        // ✅ OTIMIZADO: Throttling agressivo para evitar spam de logs
        if (logThrottleRef.current) {
          clearTimeout(logThrottleRef.current);
        }
        
        logThrottleRef.current = setTimeout(() => {
          // ✅ CORREÇÃO: Log apenas quando há mudanças reais de dados
          const freshPipelines = queryClient.getQueryData(['pipelines', tenantId]) as Pipeline[] | undefined;
          if (freshPipelines && freshPipelines.length !== pipelines.length) {
            console.log('🔄 [usePipelineCache] Cache atualizado:', {
              pipelinesCount: freshPipelines.length,
              change: freshPipelines.length > pipelines.length ? 'adição' : 'remoção'
            });
          }
        }, 5000); // Aumentado de 2s para 5s
        
        // Buscar dados atualizados do cache
        const freshPipelines = queryClient.getQueryData(['pipelines', tenantId]) as Pipeline[] | undefined;
        
        if (freshPipelines) {
          const freshPipeline = freshPipelines.find(p => p.id === lastViewedPipeline.id);
          
          if (freshPipeline && (
            freshPipeline.name !== lastViewedPipeline.name ||
            freshPipeline.description !== lastViewedPipeline.description ||
            freshPipeline.updated_at !== lastViewedPipeline.updated_at
          )) {
            // AIDEV-NOTE: Log de sync instantâneo apenas quando verbose habilitado
            if (import.meta.env.DEV && import.meta.env.VITE_VERBOSE_LOGS === 'true') {
              console.log('⚡ [usePipelineCache] Cache sync instantâneo:', {
                from: { name: lastViewedPipeline.name },
                to: { name: freshPipeline.name }
              });
            }
            
            setLastViewedPipelineState(freshPipeline);
            setPipelineCache(freshPipeline);
          }
        }
      }
    });

    return unsubscribe;
  }, [lastViewedPipeline, tenantId, queryClient, setPipelineCache]);

  return {
    lastViewedPipeline,
    setLastViewedPipeline,
    clearCache,
    isLoading
  };
};