import { useState, useCallback, useEffect } from 'react';
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
   * Effect para carregar pipeline inicial quando pipelines mudarem
   */
  useEffect(() => {
    if (!pipelines || pipelines.length === 0) {
      setIsLoading(false);
      return;
    }

    const bestPipeline = findBestPipeline();
    
    if (bestPipeline) {
      setLastViewedPipelineState(bestPipeline);
      // Atualizar cache apenas se não for do cache
      const cached = getCachedPipeline();
      if (!cached || cached.id !== bestPipeline.id) {
        console.log(`🔄 [usePipelineCache] Atualizando cache inicial: ${bestPipeline.name} (${bestPipeline.id})`);
        setPipelineCache(bestPipeline);
      } else {
        console.log(`📖 [usePipelineCache] Pipeline do cache mantida: ${bestPipeline.name} (${bestPipeline.id})`);
      }
    }
    
    setIsLoading(false);
  }, [pipelines, findBestPipeline, getCachedPipeline, setPipelineCache]);

  return {
    lastViewedPipeline,
    setLastViewedPipeline,
    clearCache,
    isLoading
  };
};