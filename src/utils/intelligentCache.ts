/**
 * INTELLIGENT CACHE MANAGER - WINSTON-OPTIMIZED
 * Sistema de cache otimizado com logging consolidado
 * Implementa Winston best practices para reduzir spam de logs
 */

import { QueryClient } from '@tanstack/react-query';
import { withSilentRetry } from './supabaseRetry';
import { loggers } from './logger';

// ================================================================================
// TIPOS E CONFIGURAÇÕES
// ================================================================================

interface CacheOperation {
  type: 'invalidate' | 'refetch' | 'setData';
  queryKey: string[];
  data?: any;
  exact?: boolean;
  silent?: boolean;
}

interface CacheStrategy {
  immediate: CacheOperation[];
  background: CacheOperation[];
  skipOn?: string[]; // Condições para pular cache
}

// ================================================================================
// ESTRATÉGIAS DE CACHE POR CONTEXTO
// ================================================================================

const CACHE_STRATEGIES = {
  // Salvamento de pipeline - invalidação mínima e inteligente
  pipelineSave: (tenantId: string, pipelineId: string): CacheStrategy => ({
    immediate: [
      // Apenas invalidar listas gerais (não dados específicos)
      {
        type: 'invalidate',
        queryKey: ['pipelines'],
        exact: false,
        silent: true
      }
    ],
    background: [
      // Refetch silencioso apenas da lista do tenant
      {
        type: 'refetch',
        queryKey: ['pipelines', tenantId],
        silent: true
      }
    ],
    skipOn: ['ERR_CONNECTION_CLOSED', 'ERR_NETWORK']
  }),

  // Salvamento de regras de qualificação - cache específico
  qualificationSave: (tenantId: string, pipelineId: string): CacheStrategy => ({
    immediate: [
      // Invalidar apenas cache específico de qualificação
      {
        type: 'invalidate',
        queryKey: ['qualification-rules', pipelineId],
        exact: true,
        silent: true
      }
    ],
    background: [
      // Background refetch silencioso
      {
        type: 'refetch', 
        queryKey: ['qualification-rules', pipelineId],
        silent: true
      }
    ],
    skipOn: ['ERR_CONNECTION_CLOSED', 'ERR_NETWORK', 'ETIMEDOUT']
  }),

  // Salvamento de motivos de ganho/perda - cache específico
  motivesSave: (tenantId: string, pipelineId: string): CacheStrategy => ({
    immediate: [
      // Invalidar apenas cache específico de motivos
      {
        type: 'invalidate',
        queryKey: ['outcome-reasons', pipelineId],
        exact: true,
        silent: true
      }
    ],
    background: [
      // Background refetch silencioso
      {
        type: 'refetch', 
        queryKey: ['outcome-reasons', pipelineId],
        silent: true
      }
    ],
    skipOn: ['ERR_CONNECTION_CLOSED', 'ERR_NETWORK', 'ETIMEDOUT']
  }),

  // Cache sync geral - operação completamente silenciosa
  backgroundSync: (tenantId: string): CacheStrategy => ({
    immediate: [],
    background: [
      {
        type: 'invalidate',
        queryKey: ['pipelines', tenantId],
        exact: false,
        silent: true
      }
    ],
    skipOn: ['ERR_CONNECTION_CLOSED', 'ERR_NETWORK', 'ETIMEDOUT', 'fetch failed']
  })
};

// ================================================================================
// EXECUTOR DE CACHE INTELIGENTE
// ================================================================================

export class IntelligentCacheManager {
  private queryClient: QueryClient;
  private debugMode: boolean;

  constructor(queryClient: QueryClient, debugMode = false) {
    this.queryClient = queryClient;
    this.debugMode = debugMode;
  }

  /**
   * ✅ WINSTON-OPTIMIZED: Executa estratégia de cache com log consolidado único
   */
  async executeStrategy(
    strategyName: string,
    strategy: CacheStrategy,
    context: Record<string, any> = {}
  ): Promise<void> {
    const startTime = Date.now();

    // Fase 1: Operações imediatas (críticas)
    if (strategy.immediate.length > 0) {
      await this.executeOperations(strategy.immediate, 'immediate', strategy.skipOn);
    }

    // Fase 2: Operações background (não-críticas)
    if (strategy.background.length > 0) {
      // Executar em background sem bloquear
      setTimeout(() => {
        this.executeOperations(strategy.background, 'background', strategy.skipOn);
      }, 100);
    }

    const totalTime = Date.now() - startTime;
    
    // ✅ LOG CONSOLIDADO ÚNICO - só se for lento ou em debug mode
    if (totalTime > 50 || this.debugMode) {
      loggers.cache.strategyCompleted(
        strategyName, 
        strategy.immediate.length, 
        strategy.background.length, 
        totalTime
      );
    }
  }

  /**
   * ✅ WINSTON-OPTIMIZED: Executa operações de cache sem spam de logs
   */
  private async executeOperations(
    operations: CacheOperation[],
    phase: 'immediate' | 'background',
    skipConditions: string[] = []
  ): Promise<void> {
    // ✅ NÃO LOGAR CADA OPERAÇÃO - apenas executar

    const promises = operations.map(async (operation, index) => {
      try {
        if (operation.silent) {
          // Operação silenciosa com fallback
          await withSilentRetry(
            () => this.executeSingleOperation(operation),
            undefined,
            `Cache ${operation.type} [${phase}]`
          );
        } else {
          // Operação normal com retry
          await this.executeSingleOperation(operation);
        }

      } catch (error: any) {
        // Verificar se devemos pular baseado nas condições
        const shouldSkip = skipConditions.some(condition => 
          error.code?.includes(condition) || 
          error.message?.includes(condition)
        );

        if (shouldSkip) {
          // ✅ NÃO LOGAR SKIP - é comportamento esperado
          return;
        }

        // ✅ LOGAR APENAS ERROS CRÍTICOS E INESPERADOS
        if (phase === 'immediate') {
          loggers.cache.error(`Critical cache operation failed [${phase}]`, error);
          throw error;
        } else {
          // Background errors são menos críticos - só warn se for inesperado
          if (!error.message?.includes('Connection') && !error.message?.includes('Network')) {
            loggers.cache.error(`Unexpected background cache error`, error);
          }
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Executa uma única operação de cache
   */
  private async executeSingleOperation(operation: CacheOperation): Promise<void> {
    switch (operation.type) {
      case 'invalidate':
        await this.queryClient.invalidateQueries({
          queryKey: operation.queryKey,
          exact: operation.exact
        });
        break;

      case 'refetch':
        await this.queryClient.refetchQueries({
          queryKey: operation.queryKey,
          exact: operation.exact
        });
        break;

      case 'setData':
        this.queryClient.setQueryData(operation.queryKey, operation.data);
        break;

      default:
        throw new Error(`Tipo de operação desconhecido: ${operation.type}`);
    }
  }

  // ================================================================================
  // MÉTODOS DE CONVENIÊNCIA PARA ESTRATÉGIAS PRÉ-DEFINIDAS
  // ================================================================================

  /**
   * Cache strategy para salvamento de pipeline
   */
  async handlePipelineSave(tenantId: string, pipelineId: string): Promise<void> {
    // ✅ VALIDAÇÕES DE SEGURANÇA
    if (!tenantId || !pipelineId) {
      console.warn('⚠️ [IntelligentCache] Pulando pipelineSave - parâmetros inválidos:', {
        tenantId: tenantId || '(vazio)',
        pipelineId: pipelineId || '(vazio)'
      });
      return;
    }

    if (tenantId.length < 5 || pipelineId.length < 5) {
      console.warn('⚠️ [IntelligentCache] Pulando pipelineSave - IDs muito curtos:', {
        tenantIdLength: tenantId.length,
        pipelineIdLength: pipelineId.length
      });
      return;
    }

    const strategy = CACHE_STRATEGIES.pipelineSave(tenantId, pipelineId);
    await this.executeStrategy('pipelineSave', strategy, { tenantId, pipelineId });
  }

  /**
   * Cache strategy para salvamento de regras de qualificação
   */
  async handleQualificationSave(tenantId: string, pipelineId: string): Promise<void> {
    // ✅ VALIDAÇÕES DE SEGURANÇA
    if (!tenantId || !pipelineId) {
      console.warn('⚠️ [IntelligentCache] Pulando qualificationSave - parâmetros inválidos:', {
        tenantId: tenantId || '(vazio)',
        pipelineId: pipelineId || '(vazio)'
      });
      return;
    }

    if (tenantId.length < 5 || pipelineId.length < 5) {
      console.warn('⚠️ [IntelligentCache] Pulando qualificationSave - IDs muito curtos:', {
        tenantIdLength: tenantId.length,
        pipelineIdLength: pipelineId.length
      });
      return;
    }

    const strategy = CACHE_STRATEGIES.qualificationSave(tenantId, pipelineId);
    await this.executeStrategy('qualificationSave', strategy, { tenantId, pipelineId });
  }

  /**
   * Cache strategy para salvamento de motivos de ganho/perda
   */
  async handleMotivesSave(tenantId: string, pipelineId: string): Promise<void> {
    // ✅ VALIDAÇÕES DE SEGURANÇA
    if (!tenantId || !pipelineId) {
      console.warn('⚠️ [IntelligentCache] Pulando motivesSave - parâmetros inválidos:', {
        tenantId: tenantId || '(vazio)',
        pipelineId: pipelineId || '(vazio)'
      });
      return;
    }

    if (tenantId.length < 5 || pipelineId.length < 5) {
      console.warn('⚠️ [IntelligentCache] Pulando motivesSave - IDs muito curtos:', {
        tenantIdLength: tenantId.length,
        pipelineIdLength: pipelineId.length
      });
      return;
    }

    const strategy = CACHE_STRATEGIES.motivesSave(tenantId, pipelineId);
    await this.executeStrategy('motivesSave', strategy, { tenantId, pipelineId });
  }

  /**
   * Cache strategy para sincronização background
   */
  async handleBackgroundSync(tenantId: string): Promise<void> {
    const strategy = CACHE_STRATEGIES.backgroundSync(tenantId);
    await this.executeStrategy('backgroundSync', strategy, { tenantId });
  }

  /**
   * Método genérico para operações silenciosas
   */
  async silentInvalidate(queryKey: string[], exact = false): Promise<void> {
    await withSilentRetry(async () => {
      await this.queryClient.invalidateQueries({ queryKey, exact });
    }, undefined, `Silent Invalidate [${queryKey.join('/')}]`);
  }

  /**
   * Método genérico para refetch silencioso
   */
  async silentRefetch(queryKey: string[], exact = false): Promise<void> {
    await withSilentRetry(async () => {
      await this.queryClient.refetchQueries({ queryKey, exact });
    }, undefined, `Silent Refetch [${queryKey.join('/')}]`);
  }
}

// ================================================================================
// HOOK PARA USO EM COMPONENTES
// ================================================================================

import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

export function useIntelligentCache(debugMode = false) {
  const queryClient = useQueryClient();
  
  const cacheManager = useMemo(() => {
    return new IntelligentCacheManager(queryClient, debugMode);
  }, [queryClient, debugMode]);
  
  return cacheManager;
}

// ================================================================================
// CONFIGURAÇÕES GLOBAIS
// ================================================================================

export const CACHE_CONFIG = {
  // Timeouts otimizados para operações
  staleTime: {
    lists: 2 * 60 * 1000,      // 2 minutos para listas
    details: 5 * 60 * 1000,    // 5 minutos para detalhes
    static: 15 * 60 * 1000     // 15 minutos para dados estáticos
  },
  
  // Garbage collection otimizado
  gcTime: {
    default: 10 * 60 * 1000,   // 10 minutos
    important: 30 * 60 * 1000  // 30 minutos para dados importantes
  },
  
  // Retry configuration
  retry: {
    networkErrors: 2,
    otherErrors: 0
  }
};