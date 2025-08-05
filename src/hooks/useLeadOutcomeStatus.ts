/**
 * ============================================
 * 🪝 HOOK: USE LEAD OUTCOME STATUS
 * ============================================
 * 
 * Hook para verificar se um lead tem motivos de ganho/perda aplicados
 * AIDEV-NOTE: Usado para mostrar indicadores visuais nos cards
 */

import { useQuery } from '@tanstack/react-query';
import { outcomeReasonsApi } from '../modules/outcome-reasons/services/outcomeReasonsApi';

// ============================================
// INTERFACE
// ============================================

interface LeadOutcomeStatus {
  hasOutcome: boolean;
  lastOutcome?: {
    outcome_type: 'ganho' | 'perdido' | 'won' | 'lost';
    reason_text: string;
    applied_at: string;
  };
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export const useLeadOutcomeStatus = (leadId: string, enabled = true) => {
  return useQuery({
    queryKey: ['lead-outcome-status', leadId],
    queryFn: async (): Promise<LeadOutcomeStatus> => {
      try {
        const history = await outcomeReasonsApi.getLeadHistory(leadId);
        
        if (!history || history.length === 0) {
          return { hasOutcome: false };
        }

        // Pegar o último motivo aplicado
        const lastOutcome = history[history.length - 1];
        
        return {
          hasOutcome: true,
          lastOutcome: {
            outcome_type: lastOutcome.outcome_type,
            reason_text: lastOutcome.reason_text,
            applied_at: lastOutcome.applied_at
          }
        };
      } catch (error) {
        // Se der erro (ex: lead não tem motivos), retornar sem outcome
        return { hasOutcome: false };
      }
    },
    enabled: Boolean(enabled && !!leadId),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false, // Não retry em caso de erro - é normal não ter motivos
  });
};

export default useLeadOutcomeStatus;