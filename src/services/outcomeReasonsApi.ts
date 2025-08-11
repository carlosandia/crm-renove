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
      console.log('🔍 [OutcomeReasonsApiService] Iniciando carregamento:', {
        pipelineId: pipelineId.substring(0, 8)
      });

      // ✅ WINSTON-STYLE: Usar retry básico para operações de leitura
      return await withApiRetry(async () => {
        const response = await api.get<OutcomeReason[]>(
          `/outcome-reasons?pipeline_id=${pipelineId}&reason_type=all&active_only=true`
        );
        
        // ✅ CORREÇÃO: Type-safe response processing
        const responseData = response.data;
        console.log('📡 [OutcomeReasonsApiService] Resposta recebida:', {
          pipelineId: pipelineId.substring(0, 8),
          responseType: typeof responseData,
          isArray: Array.isArray(responseData)
        });
        
        // ✅ CORREÇÃO: Tratar resposta API padronizada {success, data} vs array direto
        let reasons: OutcomeReason[] = [];
        if (Array.isArray(responseData)) {
          // Resposta é array direto
          reasons = responseData;
          console.log('🔍 [OutcomeReasonsApiService] Formato: array direto');
        } else if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
          // Resposta é objeto, verificar propriedades conhecidas
          const responseObj = responseData as Record<string, any>;
          if (Array.isArray(responseObj.data)) {
            reasons = responseObj.data;
            console.log('🔍 [OutcomeReasonsApiService] Formato: objeto com propriedade data');
          } else if (Array.isArray(responseObj.reasons)) {
            reasons = responseObj.reasons;
            console.log('🔍 [OutcomeReasonsApiService] Formato: objeto com propriedade reasons');
          } else if (Array.isArray(responseObj.items)) {
            reasons = responseObj.items;
            console.log('🔍 [OutcomeReasonsApiService] Formato: objeto com propriedade items');
          }
        }
        
        console.log('🔍 [OutcomeReasonsApiService] Reasons processados:', {
          reasonsType: typeof reasons,
          reasonsIsArray: Array.isArray(reasons),
          reasonsLength: Array.isArray(reasons) ? reasons.length : 0,
          firstReason: Array.isArray(reasons) && reasons.length > 0 ? reasons[0] : null
        });
        
        // ✅ Validar se reasons é array antes de filtrar
        if (!Array.isArray(reasons)) {
          console.error('❌ [OutcomeReasonsApiService] ERRO: reasons não é array:', {
            reasonsType: typeof reasons,
            reasonsValue: reasons
          });
          reasons = [];
        }
        
        const won = reasons.filter(r => r.reason_type === 'won');
        const lost = reasons.filter(r => r.reason_type === 'lost');
        
        const outcomeReasons: OutcomeReasons = { won, lost };
        
        // ✅ WINSTON-STYLE: Log consolidado apenas se há dados ou demora
        const duration = Date.now() - startTime;
        loggers.outcomeReasons.loadOperation(pipelineId, won.length, lost.length, duration);
        
        console.log('✅ [OutcomeReasonsApiService] Carregamento concluído:', {
          pipelineId: pipelineId.substring(0, 8),
          wonCount: won.length,
          lostCount: lost.length,
          duration
        });
        
        return outcomeReasons;
      }, `Carregar Motivos [${pipelineId}]`);
      
    } catch (error: any) {
      // ✅ WINSTON-STYLE: Log de erro estruturado
      console.error('❌ [OutcomeReasonsApiService] Erro detalhado no carregamento:', {
        pipelineId: pipelineId.substring(0, 8),
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
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

    console.log('🚀 [saveOutcomeReasons] INICIANDO SALVAMENTO:', {
      pipelineId: pipelineId.substring(0, 8),
      outcomeReasons: {
        wonCount: outcomeReasons.won.length,
        lostCount: outcomeReasons.lost.length,
        wonReasons: outcomeReasons.won.map(r => ({ id: r.id, text: r.reason_text })),
        lostReasons: outcomeReasons.lost.map(r => ({ id: r.id, text: r.reason_text }))
      }
    });

    // ✅ WINSTON-STYLE: Usar retry crítico para operações de salvamento individuais
    return await withCriticalRetry(async () => {
      retryCount++;
      console.log(`🔄 [saveOutcomeReasons] TENTATIVA ${retryCount} para pipeline ${pipelineId.substring(0, 8)}`);
      
      // ✅ ETAPA 1: Carregar motivos existentes para comparação
      console.log('📋 [saveOutcomeReasons] ETAPA 1: Carregando motivos existentes...');
      const existingReasons = await this.loadOutcomeReasons(pipelineId);
      console.log('📋 [saveOutcomeReasons] Motivos existentes carregados:', {
        wonCount: existingReasons.won.length,
        lostCount: existingReasons.lost.length
      });
      
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
      console.log('📋 [saveOutcomeReasons] ETAPA 3: Removendo motivos não utilizados...');
      console.log('🗑️  Motivos para remover:', reasonsToRemove.length, 'itens');
      
      if (reasonsToRemove.length > 0) {
        const removePromises = reasonsToRemove.map(reason => 
          api.delete(`/outcome-reasons/${reason.id}`)
        );
        await Promise.all(removePromises);
        console.log(`✅ [saveOutcomeReasons] ${reasonsToRemove.length} motivos removidos com sucesso`);
      }
      
      // ✅ ETAPA 4: Identificar motivos novos para criar (não possuem ID ou não existem)
      const allExistingReasons = [...existingReasons.won, ...existingReasons.lost];
      const reasonsToCreate = allCurrentReasons.filter(current => 
        !current.id || !allExistingReasons.some(existing => existing.id === current.id)
      );
      
      // ✅ ETAPA 5: Criar novos motivos
      console.log('📋 [saveOutcomeReasons] ETAPA 5: Criando novos motivos...');
      console.log('➕ Motivos para criar:', reasonsToCreate.length, 'itens');
      
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
        console.log(`✅ [saveOutcomeReasons] ${reasonsToCreate.length} novos motivos criados com sucesso`);
      }
      
      // ✅ ETAPA 6: Atualizar motivos existentes se necessário
      const reasonsToUpdate = allCurrentReasons.filter(current => 
        current.id && allExistingReasons.some(existing => 
          existing.id === current.id && existing.reason_text.trim() !== current.reason_text.trim()
        )
      );
      
      console.log('📋 [saveOutcomeReasons] ETAPA 6: Atualizando motivos existentes...');
      console.log('🔄 Motivos para atualizar:', reasonsToUpdate.length, 'itens');
      
      if (reasonsToUpdate.length > 0) {
        const updatePromises = reasonsToUpdate.map(reason => 
          api.put(`/outcome-reasons/${reason.id}`, {
            reason_text: reason.reason_text.trim()
          })
        );
        await Promise.all(updatePromises);
        console.log(`✅ [saveOutcomeReasons] ${reasonsToUpdate.length} motivos atualizados com sucesso`);
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

      console.log('🎉 [saveOutcomeReasons] SALVAMENTO CONCLUÍDO COM SUCESSO!', {
        pipelineId: pipelineId.substring(0, 8),
        totalOperations,
        changes,
        duration: `${duration}ms`,
        retryCount
      });
      
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