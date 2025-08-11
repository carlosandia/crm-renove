/**
 * ============================================
 * 🌐 OUTCOME REASONS API SERVICE
 * ============================================
 * 
 * Serviço dedicado para operações de motivos de ganho/perda
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
    const response = await api.get('/outcome-reasons', { params });
    return response.data;
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
    const response = await api.post('/outcome-reasons/apply', data);
    return response.data;
  },

  // ✅ Buscar histórico de um lead
  getLeadHistory: async (leadId: string): Promise<LeadOutcomeHistory[]> => {
    // ✅ CORREÇÃO CRÍTICA: Validar leadId antes de fazer chamada
    if (!leadId || leadId.trim().length === 0 || leadId === 'undefined' || leadId === 'null') {
      console.warn('⚠️ [outcomeReasonsApi] leadId inválido, retornando array vazio:', leadId);
      return [];
    }

    try {
      const response = await api.get(`/outcome-reasons/history/${leadId}`);
      
      // ✅ CORREÇÃO CRÍTICA: Garantir que response.data é sempre um array
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        // Caso a API retorne formato {data: array}
        return data.data;
      } else {
        console.warn('⚠️ [outcomeReasonsApi] Resposta não é array, retornando vazio:', typeof data);
        return [];
      }
    } catch (error) {
      console.error('❌ [outcomeReasonsApi] Erro ao buscar histórico:', error);
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
  }
};

export default outcomeReasonsApi;