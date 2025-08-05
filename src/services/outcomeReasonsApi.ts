import { api } from '../lib/api';
import { withApiRetry, withCriticalRetry } from '../utils/supabaseRetry';
import { loggers } from '../utils/logger';

// ================================================================================
// TIPOS E INTERFACES
// ================================================================================
export interface OutcomeReason {
  id: string;
  reason_type: 'won' | 'lost';
  reason_text: string;
  description: string;
  is_default?: boolean;
}

export interface OutcomeReasons {
  won: OutcomeReason[];
  lost: OutcomeReason[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

interface SaveOutcomeReasonsResponse {
  pipeline_id: string;
  outcome_reasons: OutcomeReasons;
  saved_count: number;
}

interface LoadOutcomeReasonsResponse {
  pipeline_id: string;
  outcome_reasons: OutcomeReasons;
}

// ================================================================================
// QUERY KEYS PARA REACT QUERY
// ================================================================================
export const outcomeReasonsQueryKeys = {
  reasons: (pipelineId: string) => ['outcome-reasons', pipelineId],
} as const;

// ================================================================================
// SERVIÇO DE API PARA MOTIVOS DE GANHO/PERDA
// ================================================================================
export class OutcomeReasonsApiService {
  /**
   * ✅ WINSTON-OPTIMIZED: Carregar motivos de ganho/perda de uma pipeline
   */
  static async loadOutcomeReasons(pipelineId: string): Promise<OutcomeReasons> {
    const startTime = Date.now();

    try {
      // ✅ WINSTON-STYLE: Usar retry básico para operações de leitura
      return await withApiRetry(async () => {
        const response = await api.get<OutcomeReason[]>(
          `/outcome-reasons?pipeline_id=${pipelineId}&reason_type=all&active_only=true`
        );
        
        // ✅ Transformar array em estrutura organizada
        const reasons = response.data;
        const won = reasons.filter(r => r.reason_type === 'won');
        const lost = reasons.filter(r => r.reason_type === 'lost');
        
        const outcomeReasons: OutcomeReasons = { won, lost };
        
        // ✅ WINSTON-STYLE: Log consolidado apenas se há dados ou demora
        const duration = Date.now() - startTime;
        loggers.outcomeReasons.loadOperation(pipelineId, won.length, lost.length, duration);
        
        return outcomeReasons;
      }, `Carregar Motivos [${pipelineId}]`);
      
    } catch (error: any) {
      // ✅ WINSTON-STYLE: Log de erro estruturado
      loggers.outcomeReasons.error('loadOutcomeReasons', pipelineId, error);
      
      // Em caso de erro após retry, retornar estrutura vazia
      return { won: [], lost: [] };
    }
  }

  /**
   * ✅ WINSTON-OPTIMIZED: Salvar motivos de ganho/perda via backend API usando CRUD individual
   */
  static async saveOutcomeReasons(
    pipelineId: string, 
    outcomeReasons: OutcomeReasons
  ): Promise<SaveOutcomeReasonsResponse> {
    const startTime = Date.now();
    let retryCount = 0;

    // ✅ WINSTON-STYLE: Usar retry crítico para operações de salvamento individuais
    return await withCriticalRetry(async () => {
      retryCount++;
      
      // ✅ ETAPA 1: Carregar motivos existentes para comparação
      const existingReasons = await this.loadOutcomeReasons(pipelineId);
      
      // ✅ ETAPA 2: Identificar motivos para remover (existem mas não estão na nova lista)
      const allCurrentReasons = [...outcomeReasons.won, ...outcomeReasons.lost];
      const existingWonToRemove = existingReasons.won.filter(existing => 
        !allCurrentReasons.some(current => 
          current.id === existing.id || 
          (current.reason_text.trim() === existing.reason_text.trim() && current.reason_type === existing.reason_type)
        )
      );
      const existingLostToRemove = existingReasons.lost.filter(existing => 
        !allCurrentReasons.some(current => 
          current.id === existing.id || 
          (current.reason_text.trim() === existing.reason_text.trim() && current.reason_type === existing.reason_type)
        )
      );
      
      // ✅ ETAPA 3: Remover motivos que não estão mais na lista
      const reasonsToRemove = [...existingWonToRemove, ...existingLostToRemove];
      if (reasonsToRemove.length > 0) {
        const removePromises = reasonsToRemove.map(reason => 
          api.delete(`/outcome-reasons/${reason.id}`)
        );
        await Promise.all(removePromises);
      }
      
      // ✅ ETAPA 4: Identificar motivos novos para criar (não possuem ID ou não existem)
      const allExistingReasons = [...existingReasons.won, ...existingReasons.lost];
      const reasonsToCreate = allCurrentReasons.filter(current => 
        !current.id || !allExistingReasons.some(existing => existing.id === current.id)
      );
      
      // ✅ ETAPA 5: Criar novos motivos
      if (reasonsToCreate.length > 0) {
        const createPromises = reasonsToCreate.map((reason, index) => 
          api.post<OutcomeReason>('/outcome-reasons', {
            pipeline_id: pipelineId,
            reason_type: reason.reason_type,
            reason_text: reason.reason_text.trim(),
            display_order: index
          })
        );
        
        await Promise.all(createPromises);
      }
      
      // ✅ ETAPA 6: Atualizar motivos existentes se necessário
      const reasonsToUpdate = allCurrentReasons.filter(current => 
        current.id && allExistingReasons.some(existing => 
          existing.id === current.id && existing.reason_text.trim() !== current.reason_text.trim()
        )
      );
      
      if (reasonsToUpdate.length > 0) {
        const updatePromises = reasonsToUpdate.map(reason => 
          api.put(`/outcome-reasons/${reason.id}`, {
            reason_text: reason.reason_text.trim()
          })
        );
        await Promise.all(updatePromises);
      }
      
      const totalOperations = reasonsToRemove.length + reasonsToCreate.length + reasonsToUpdate.length;
      const duration = Date.now() - startTime;
      
      // ✅ WINSTON-STYLE: Log consolidado único com todas as informações
      const changes = {
        created: reasonsToCreate.length,
        updated: reasonsToUpdate.length,
        removed: reasonsToRemove.length
      };
      
      loggers.outcomeReasons.saveOperation(pipelineId, changes, duration, retryCount - 1);
      
      const savedRules: SaveOutcomeReasonsResponse = {
        pipeline_id: pipelineId,
        outcome_reasons: outcomeReasons,
        saved_count: totalOperations
      };
      
      return savedRules;
    }, `Salvar Motivos [${pipelineId}]`);
  }

  /**
   * ✅ WINSTON-OPTIMIZED: Criar motivos padrão para uma pipeline
   */
  static async createDefaultReasons(pipelineId: string): Promise<OutcomeReasons> {
    try {
      const response = await api.post<OutcomeReason[]>('/outcome-reasons/defaults', {
        pipeline_id: pipelineId
      });
      
      const reasons = response.data;
      const won = reasons.filter(r => r.reason_type === 'won');
      const lost = reasons.filter(r => r.reason_type === 'lost');
      
      const outcomeReasons: OutcomeReasons = { won, lost };
      
      // ✅ WINSTON-STYLE: Log consolidado apenas com informações essenciais
      loggers.api.request('POST', '/outcome-reasons/defaults', 201, 0);
      
      return outcomeReasons;
    } catch (error: any) {
      // ✅ WINSTON-STYLE: Log de erro estruturado
      loggers.outcomeReasons.error('createDefaultReasons', pipelineId, error);
      
      throw new Error('Erro ao criar motivos padrão');
    }
  }

  /**
   * ✅ WINSTON-OPTIMIZED: Remover motivo específico
   */
  static async removeReason(reasonId: string): Promise<void> {
    try {
      await api.delete(`/outcome-reasons/${reasonId}`);
      
      // ✅ WINSTON-STYLE: Log silencioso - apenas em debug mode
      loggers.api.request('DELETE', `/outcome-reasons/${reasonId}`, 200, 0);
      
    } catch (error: any) {
      // ✅ WINSTON-STYLE: Log de erro estruturado
      loggers.api.error(`/outcome-reasons/${reasonId}`, error);
      
      throw new Error('Erro ao remover motivo');
    }
  }

  /**
   * ✅ WINSTON-OPTIMIZED: Resetar motivos (remover todos)
   */
  static async resetReasons(pipelineId: string): Promise<void> {
    try {
      // Salvar motivos vazios para resetar
      await this.saveOutcomeReasons(pipelineId, { won: [], lost: [] });
      
      // ✅ WINSTON-STYLE: Log consolidado será feito pelo saveOutcomeReasons
      
    } catch (error: any) {
      // ✅ WINSTON-STYLE: Log de erro estruturado
      loggers.outcomeReasons.error('resetReasons', pipelineId, error);
      
      throw new Error('Erro ao resetar motivos');
    }
  }
}