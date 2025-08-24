/**
 * ============================================
 * 🌐 OUTCOME REASONS API SERVICE
 * ============================================
 * 
 * Serviço dedicado para operações de motivos de ganho/perdido
 * AIDEV-NOTE: Isolado em módulo próprio seguindo arquitetura domain-driven
 */

import { api } from '../../../lib/api';
import { 
  OutcomeReason,
  LeadOutcomeHistory,
  CreateOutcomeReasonRequest,
  UpdateOutcomeReasonRequest,
  ApplyOutcomeRequest,
  GetOutcomeReasonsQuery
} from '../types';

// ============================================
// CONFIGURAÇÃO DE MOTIVOS
// ============================================

export const outcomeReasonsApi = {
  // ✅ Buscar motivos de um pipeline
  getReasons: async (params: GetOutcomeReasonsQuery): Promise<OutcomeReason[]> => {
    try {
      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - REQUEST API
      console.log('🔍 [API-DEBUG] outcomeReasonsApi.getReasons - Enviando request:', {
        endpoint: '/outcome-reasons',
        method: 'GET',
        params: {
          pipeline_id: params.pipeline_id?.substring(0, 8) + '...' || 'undefined',
          reason_type: params.reason_type || 'all',
          active_only: params.active_only ?? 'true'
        },
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substr(2, 9)
      });
      
      const response = await api.get('/outcome-reasons', { params });
      
      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - RESPONSE API
      console.log('🔍 [API-DEBUG] outcomeReasonsApi.getReasons - Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        dataType: typeof response.data,
        hasData: !!response.data?.data,
        rawDataLength: response.data?.data?.length || 0,
        responseStructure: Object.keys(response.data || {}),
        contentType: response.headers?.['content-type'],
        hasErrors: !!response.data?.error,
        errorMessage: response.data?.error || null,
        timestamp: new Date().toISOString()
      });
      
      // ✅ CORREÇÃO: Backend retorna {success: true, data: array}, extrair apenas data
      const reasons = response.data?.data || response.data;
      
      // ✅ CORREÇÃO CRÍTICA: Se a tabela estiver vazia, buscar no JSON da pipeline
      if (!reasons || reasons.length === 0) {
        // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - FALLBACK TRIGGER
        console.log('🔄 [FALLBACK-DEBUG] outcomeReasonsApi - Tabela vazia, iniciando fallback JSON:', {
          responseData: response.data,
          extractedReasons: reasons,
          reasonsLength: reasons?.length || 0,
          fallbackReason: 'empty_database_table',
          pipelineId: params.pipeline_id?.substring(0, 8) || 'undefined',
          requestedType: params.reason_type || 'all'
        });
        return await outcomeReasonsApi.getReasonsFallback(params);
      }
      
      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - DADOS ENCONTRADOS NA TABELA
      console.log('✅ [API-SUCCESS] outcomeReasonsApi - Motivos encontrados na tabela:', {
        totalCount: reasons.length,
        reasonsByType: {
          ganho: reasons.filter(r => r.reason_type === 'ganho').length,
          perdido: reasons.filter(r => r.reason_type === 'perdido').length,
          won: reasons.filter(r => r.reason_type === 'won').length,
          lost: reasons.filter(r => r.reason_type === 'lost').length
        },
        hasNullFields: reasons.some(r => 
          r.tenant_id === null || 
          r.is_active === null || 
          r.display_order === null
        ),
        firstReason: reasons[0] ? {
          id: reasons[0].id?.substring(0, 8) || 'undefined',
          pipeline_id: reasons[0].pipeline_id?.substring(0, 8) || 'undefined',
          tenant_id: reasons[0].tenant_id?.substring(0, 8) || 'null/undefined',
          reason_type: reasons[0].reason_type || 'undefined',
          reason_text: reasons[0].reason_text?.substring(0, 30) || 'undefined',
          is_active: reasons[0].is_active ?? 'null',
          display_order: reasons[0].display_order ?? 'null'
        } : null
      });
      
      return reasons;
    } catch (error) {
      console.error('❌ [outcomeReasonsApi] Erro na busca principal, tentando fallback:', error);
      return await outcomeReasonsApi.getReasonsFallback(params);
    }
  },

  // ✅ FALLBACK: Buscar motivos do JSON da pipeline
  getReasonsFallback: async (params: GetOutcomeReasonsQuery): Promise<OutcomeReason[]> => {
    try {
      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - FALLBACK INICIADO
      console.log('🔍 [FALLBACK-DEBUG] outcomeReasonsApi - Iniciando fallback JSON da pipeline:', {
        method: 'getReasonsFallback',
        pipelineId: params.pipeline_id?.substring(0, 8) || 'undefined',
        requestedType: params.reason_type || 'all',
        activeOnly: params.active_only ?? 'true',
        fallbackReason: 'primary_api_failed_or_empty',
        endpoint: `/pipelines/${params.pipeline_id}`,
        timestamp: new Date().toISOString()
      });
      
      // Buscar pipeline com campo outcome_reasons
      const response = await api.get(`/pipelines/${params.pipeline_id}`);
      const pipeline = response.data;
      
      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - PIPELINE RESPONSE
      console.log('🔍 [FALLBACK-DEBUG] outcomeReasonsApi - Pipeline response recebida:', {
        status: response.status,
        hasPipeline: !!pipeline,
        hasOutcomeReasons: !!pipeline?.outcome_reasons,
        pipelineFields: pipeline ? Object.keys(pipeline) : [],
        outcomeReasonsStructure: pipeline?.outcome_reasons ? Object.keys(pipeline.outcome_reasons) : null
      });
      
      if (!pipeline?.outcome_reasons) {
        console.log('⚠️ [outcomeReasonsApi] Pipeline sem outcome_reasons configurados');
        return [];
      }
      
      const outcomeReasons = pipeline.outcome_reasons;
      const convertedReasons: OutcomeReason[] = [];
      
      // Converter motivos de ganho
      if (outcomeReasons.ganho_reasons && Array.isArray(outcomeReasons.ganho_reasons)) {
        outcomeReasons.ganho_reasons.forEach((reason: any, index: number) => {
          if (reason.is_active !== false) { // Incluir se is_active for true ou undefined
            convertedReasons.push({
              id: `json-ganho-${index}`, // ID temporário para compatibilidade
              pipeline_id: params.pipeline_id,
              tenant_id: pipeline.tenant_id || '',
              reason_type: 'ganho' as const,
              reason_text: reason.reason_text || reason.text || '',
              is_active: true,
              display_order: reason.display_order || index,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_from_json: true // Marcador para identificar origem
            });
          }
        });
      }
      
      // Converter motivos de perdido
      if (outcomeReasons.perdido_reasons && Array.isArray(outcomeReasons.perdido_reasons)) {
        outcomeReasons.perdido_reasons.forEach((reason: any, index: number) => {
          if (reason.is_active !== false) { // Incluir se is_active for true ou undefined
            convertedReasons.push({
              id: `json-perdido-${index}`, // ID temporário para compatibilidade
              pipeline_id: params.pipeline_id,
              tenant_id: pipeline.tenant_id || '',
              reason_type: 'perdido' as const,
              reason_text: reason.reason_text || reason.text || '',
              is_active: true,
              display_order: reason.display_order || index,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_from_json: true // Marcador para identificar origem
            });
          }
        });
      }
      
      // Filtrar por tipo se especificado
      let filteredReasons = convertedReasons;
      if (params.reason_type && params.reason_type !== 'all') {
        let targetType = params.reason_type;
        // Mapear valores antigos para novos
        if (params.reason_type === 'won') targetType = 'ganho';
        if (params.reason_type === 'lost') targetType = 'perdido';
        
        filteredReasons = convertedReasons.filter(reason => reason.reason_type === targetType);
      }
      
      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - FALLBACK CONCLUÍDO
      console.log(`✅ [FALLBACK-SUCCESS] outcomeReasonsApi - Fallback JSON concluído:`, {
        totalConverted: convertedReasons.length,
        filteredByType: filteredReasons.length,
        requestedType: params.reason_type || 'all',
        activeOnly: params.active_only ?? true,
        reasonsByType: {
          ganho: convertedReasons.filter(r => r.reason_type === 'ganho').length,
          perdido: convertedReasons.filter(r => r.reason_type === 'perdido').length
        },
        dataOrigin: 'json_fallback',
        allMarkedAsFromJson: filteredReasons.every(r => r.is_from_json === true),
        sampleConvertedReason: filteredReasons[0] ? {
          id: filteredReasons[0].id?.substring(0, 15) || 'undefined',
          pipeline_id: filteredReasons[0].pipeline_id?.substring(0, 8) || 'undefined',
          tenant_id: filteredReasons[0].tenant_id?.substring(0, 8) || 'null/undefined',
          reason_type: filteredReasons[0].reason_type || 'undefined',
          reason_text: filteredReasons[0].reason_text?.substring(0, 30) || 'undefined',
          is_from_json: filteredReasons[0].is_from_json
        } : null,
        timestamp: new Date().toISOString()
      });
      
      return filteredReasons;
      
    } catch (fallbackError) {
      console.error('❌ [outcomeReasonsApi] Erro no fallback JSON:', fallbackError);
      return [];
    }
  },

  // ✅ Criar novo motivo
  createReason: async (data: CreateOutcomeReasonRequest): Promise<OutcomeReason> => {
    const response = await api.post('/outcome-reasons', data);
    return response.data;
  },

  // ✅ Atualizar motivo existente
  updateReason: async (data: UpdateOutcomeReasonRequest & { id: string }): Promise<OutcomeReason> => {
    const { id, ...updateData } = data;
    const response = await api.put(`/outcome-reasons/${id}`, updateData);
    return response.data;
  },

  // ✅ Deletar motivo
  deleteReason: async (reasonId: string): Promise<void> => {
    await api.delete(`/outcome-reasons/${reasonId}`);
  },

  // ✅ Reordenar motivos
  reorderReasons: async (pipelineId: string, reasonIds: string[]): Promise<void> => {
    await api.post(`/outcome-reasons/reorder`, {
      pipeline_id: pipelineId,
      reason_ids: reasonIds
    });
  },

  // ============================================
  // APLICAÇÃO DE MOTIVOS
  // ============================================

  // ✅ Aplicar motivo a um lead
  applyOutcome: async (data: ApplyOutcomeRequest): Promise<LeadOutcomeHistory> => {
    // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - APPLY OUTCOME REQUEST
    console.log('🔍 [APPLY-DEBUG] outcomeReasonsApi.applyOutcome - Enviando aplicação de motivo:', {
      endpoint: '/outcome-reasons/apply',
      method: 'POST',
      requestData: {
        lead_id: data.lead_id?.substring(0, 8) || 'undefined',
        outcome_type: data.outcome_type || 'undefined',
        reason_id: data.reason_id?.substring(0, 8) || 'null/undefined',
        reason_text: data.reason_text?.substring(0, 50) || 'undefined',
        notes: data.notes?.substring(0, 100) || 'null/undefined',
        hasReasonId: !!data.reason_id,
        reasonIdType: data.reason_id ? (data.reason_id.startsWith('json-') ? 'JSON_MOTIVO' : 'BANCO_UUID') : 'PERSONALIZADO'
      },
      validation: {
        leadId_isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.lead_id || ''),
        outcomeType_valid: ['ganho', 'perdido', 'won', 'lost'].includes(data.outcome_type || ''),
        reasonText_notEmpty: (data.reason_text || '').trim().length > 0,
        reasonId_isUUID: data.reason_id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.reason_id) : 'not_provided'
      },
      timestamp: new Date().toISOString()
    });

    const response = await api.post('/outcome-reasons/apply', data);
    
    // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - APPLY OUTCOME RESPONSE
    console.log('✅ [APPLY-SUCCESS] outcomeReasonsApi.applyOutcome - Motivo aplicado com sucesso:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      responseStructure: response.data ? Object.keys(response.data) : [],
      outcomeHistory: response.data ? {
        id: response.data.id?.substring(0, 8) || 'undefined',
        lead_id: response.data.lead_id?.substring(0, 8) || 'undefined',
        outcome_type: response.data.outcome_type || 'undefined',
        reason_text: response.data.reason_text?.substring(0, 30) || 'undefined',
        applied_by: response.data.applied_by?.substring(0, 8) || 'undefined',
        applied_at: response.data.applied_at || 'undefined'
      } : null,
      timestamp: new Date().toISOString()
    });
    
    return response.data;
  },

  // ✅ Buscar histórico de um lead
  getLeadHistory: async (leadId: string): Promise<LeadOutcomeHistory[]> => {
    // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - HISTORY REQUEST VALIDATION
    console.log('🔍 [HISTORY-DEBUG] outcomeReasonsApi.getLeadHistory - Iniciando busca de histórico:', {
      leadId: leadId?.substring(0, 8) || 'undefined',
      leadIdLength: leadId?.length || 0,
      leadIdValid: !!(leadId && leadId.trim().length > 0 && leadId !== 'undefined' && leadId !== 'null'),
      isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId || ''),
      endpoint: `/outcome-reasons/history/${leadId}`,
      timestamp: new Date().toISOString()
    });

    // ✅ CORREÇÃO CRÍTICA: Validar leadId antes de fazer chamada
    if (!leadId || leadId.trim().length === 0 || leadId === 'undefined' || leadId === 'null') {
      console.warn('⚠️ [HISTORY-ERROR] outcomeReasonsApi - leadId inválido, retornando array vazio:', {
        leadId: leadId,
        leadIdType: typeof leadId,
        leadIdLength: leadId?.length || 0,
        returnEmptyArray: true
      });
      return [];
    }

    try {
      const response = await api.get(`/outcome-reasons/history/${leadId}`);
      
      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - HISTORY RESPONSE
      console.log('🔍 [HISTORY-DEBUG] outcomeReasonsApi.getLeadHistory - Response recebida:', {
        status: response.status,
        statusText: response.statusText,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        hasNestedData: response.data && typeof response.data === 'object' && Array.isArray(response.data.data),
        responseStructure: response.data ? Object.keys(response.data) : [],
        dataLength: Array.isArray(response.data) ? response.data.length : (response.data?.data?.length || 0)
      });
      
      // ✅ CORREÇÃO CRÍTICA: Garantir que response.data é sempre um array
      const data = response.data;
      let historyArray: LeadOutcomeHistory[] = [];
      
      if (Array.isArray(data)) {
        historyArray = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        // Caso a API retorne formato {data: array}
        historyArray = data.data;
      } else {
        console.warn('⚠️ [HISTORY-ERROR] outcomeReasonsApi - Resposta não é array, retornando vazio:', {
          dataType: typeof data,
          dataValue: data,
          isObject: typeof data === 'object',
          hasDataProperty: data && typeof data === 'object' && 'data' in data,
          dataPropertyType: data && typeof data === 'object' && data.data ? typeof data.data : 'undefined'
        });
        return [];
      }

      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - HISTORY SUCCESS
      console.log('✅ [HISTORY-SUCCESS] outcomeReasonsApi.getLeadHistory - Histórico processado:', {
        totalHistoryItems: historyArray.length,
        leadId: leadId.substring(0, 8),
        historyByType: {
          ganho: historyArray.filter(h => h.outcome_type === 'ganho').length,
          perdido: historyArray.filter(h => h.outcome_type === 'perdido').length,
          won: historyArray.filter(h => h.outcome_type === 'won').length,
          lost: historyArray.filter(h => h.outcome_type === 'lost').length
        },
        sampleHistoryItem: historyArray[0] ? {
          id: historyArray[0].id?.substring(0, 8) || 'undefined',
          outcome_type: historyArray[0].outcome_type || 'undefined',
          reason_text: historyArray[0].reason_text?.substring(0, 30) || 'undefined',
          applied_at: historyArray[0].applied_at || 'undefined'
        } : null,
        timestamp: new Date().toISOString()
      });

      return historyArray;
    } catch (error) {
      // ✅ LOGS OBRIGATÓRIOS PADRÃO CLAUDE.MD - HISTORY ERROR
      console.error('❌ [HISTORY-ERROR] outcomeReasonsApi.getLeadHistory - Erro ao buscar histórico:', {
        leadId: leadId?.substring(0, 8) || 'undefined',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        returnEmptyArray: true,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  },

  // ============================================
  // CONFIGURAÇÕES PADRÃO
  // ============================================

  // ✅ Criar motivos padrão para novo pipeline
  createDefaultReasons: async (pipelineId: string): Promise<OutcomeReason[]> => {
    const response = await api.post(`/outcome-reasons/defaults`, {
      pipeline_id: pipelineId
    });
    return response.data;
  },

  // ✅ Buscar motivos padrão do sistema
  getDefaultReasons: async (): Promise<{ ganho: string[]; perdido: string[]; won?: string[]; lost?: string[] }> => {
    const response = await api.get('/outcome-reasons/system-defaults');
    return response.data;
  },

  // ✅ Migrar motivos do JSON para tabela normalizada
  migrateFromJson: async (pipelineId: string): Promise<{ success: boolean; migrated: number; details: any }> => {
    const response = await api.post('/outcome-reasons/migrate-from-json', {
      pipeline_id: pipelineId
    });
    return response.data;
  }
};

export default outcomeReasonsApi;