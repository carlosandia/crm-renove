/**
 * ============================================
 * 🎯 OUTCOME REASONS MODULE - TYPE EXPORTS
 * ============================================
 * 
 * Re-exportação dos tipos Zod para o módulo outcome-reasons
 * AIDEV-NOTE: Centraliza imports e mantém organização por domínio
 */

// ✅ AIDEV-NOTE: Re-export dos schemas e types do shared
export * from '../../../shared/schemas/outcome-reasons';

// ✅ AIDEV-NOTE: Types específicos do módulo
export interface OutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  outcomeType: 'ganho' | 'perdido' | 'won' | 'lost'; // ✅ REFATORAÇÃO: ganho/perdido preferidos, won/lost para compatibilidade
  pipelineId: string;
  onSuccess: () => void;
}

export interface OutcomeConfigurationProps {
  pipelineId: string;
  onConfigUpdate: () => void;
  isEditing?: boolean;
}

export interface OutcomeHistoryProps {
  leadId: string;
  showTitle?: boolean;
  maxItems?: number;
}

// ✅ AIDEV-NOTE: Types para hooks customizados
export interface UseOutcomeReasonsParams {
  pipelineId: string;
  reasonType?: 'ganho' | 'perdido' | 'won' | 'lost' | 'all'; // ✅ REFATORAÇÃO: ganho/perdido preferidos, won/lost para compatibilidade
  activeOnly?: boolean;
}

export interface UseOutcomeHistoryParams {
  leadId: string;
  enabled?: boolean;
}

export interface UseApplyOutcomeParams {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}