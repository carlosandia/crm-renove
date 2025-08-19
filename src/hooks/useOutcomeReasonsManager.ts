/**
 * ============================================
 * 🪝 HOOK: OUTCOME REASONS MANAGER
 * ============================================
 * 
 * Hook para gerenciar motivos durante criação/edição de pipeline
 * AIDEV-NOTE: Integrado ao wizard de pipeline
 */

import { useState, useCallback, useEffect } from 'react';
import { useDefaultReasons } from '../modules/outcome-reasons';

// ============================================
// TYPES E INTERFACES
// ============================================

interface OutcomeReason {
  id?: string;
  reason_text: string;
  display_order: number;
  is_active: boolean;
}

interface OutcomeReasonsData {
  ganho_reasons: OutcomeReason[];
  perdido_reasons: OutcomeReason[];
  // ✅ COMPATIBILIDADE: Manter campos antigos durante transição
  won_reasons: OutcomeReason[];
  lost_reasons: OutcomeReason[];
}

interface UseOutcomeReasonsManagerParams {
  initialData?: OutcomeReasonsData;
  pipelineId?: string;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export const useOutcomeReasonsManager = (params: UseOutcomeReasonsManagerParams = {}) => {
  // ============================================
  // ESTADO
  // ============================================
  
  const [outcomeReasonsData, setOutcomeReasonsData] = useState<OutcomeReasonsData>({
    ganho_reasons: [],
    perdido_reasons: [],
    won_reasons: [],
    lost_reasons: [],
    ...params.initialData
  });

  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  // ============================================
  // HOOKS EXTERNOS
  // ============================================

  const { data: defaultReasons } = useDefaultReasons();

  // ============================================
  // VALIDATION
  // ============================================

  const validateReasons = useCallback((data: OutcomeReasonsData): boolean => {
    const newErrors: string[] = [];

    // Validar motivos de ganho
    data.won_reasons.forEach((reason, index) => {
      if (!reason.reason_text.trim()) {
        newErrors.push(`Motivo de ganho ${index + 1} não pode estar vazio`);
      }
      if (reason.reason_text.length > 200) {
        newErrors.push(`Motivo de ganho ${index + 1} deve ter no máximo 200 caracteres`);
      }
    });

    // Validar motivos de perdido
    data.lost_reasons.forEach((reason, index) => {
      if (!reason.reason_text.trim()) {
        newErrors.push(`Motivo de perdido ${index + 1} não pode estar vazio`);
      }
      if (reason.reason_text.length > 200) {
        newErrors.push(`Motivo de perdido ${index + 1} deve ter no máximo 200 caracteres`);
      }
    });

    // Verificar duplicatas em motivos de ganho
    const wonTexts = data.won_reasons.map(r => r.reason_text.trim().toLowerCase());
    const wonDuplicates = wonTexts.filter((text, index) => wonTexts.indexOf(text) !== index);
    if (wonDuplicates.length > 0) {
      newErrors.push('Existem motivos de ganho duplicados');
    }

    // Verificar duplicatas em motivos de perdido
    const lostTexts = data.lost_reasons.map(r => r.reason_text.trim().toLowerCase());
    const lostDuplicates = lostTexts.filter((text, index) => lostTexts.indexOf(text) !== index);
    if (lostDuplicates.length > 0) {
      newErrors.push('Existem motivos de perdido duplicados');
    }

    setErrors(newErrors);
    const valid = newErrors.length === 0;
    setIsValid(valid);
    return valid;
  }, []);

  // ============================================
  // HANDLERS
  // ============================================

  const updateOutcomeReasons = useCallback((data: OutcomeReasonsData) => {
    setOutcomeReasonsData(data);
    validateReasons(data);
  }, [validateReasons]);

  const resetToDefaults = useCallback(() => {
    if (!defaultReasons) return;

    const defaultData: OutcomeReasonsData = {
      ganho_reasons: (defaultReasons.ganho || defaultReasons.won || []).map((text, index) => ({
        reason_text: text,
        display_order: index,
        is_active: true
      })),
      perdido_reasons: (defaultReasons.perdido || defaultReasons.lost || []).map((text, index) => ({
        reason_text: text,
        display_order: index,
        is_active: true
      })),
      won_reasons: (defaultReasons.won || defaultReasons.ganho || []).map((text, index) => ({
        reason_text: text,
        display_order: index,
        is_active: true
      })),
      lost_reasons: (defaultReasons.lost || defaultReasons.perdido || []).map((text, index) => ({
        reason_text: text,
        display_order: index,
        is_active: true
      }))
    };

    setOutcomeReasonsData(defaultData);
    validateReasons(defaultData);
  }, [defaultReasons, validateReasons]);

  const clearReasons = useCallback(() => {
    const emptyData: OutcomeReasonsData = {
      won_reasons: [],
      lost_reasons: [],
      ganho_reasons: [],
      perdido_reasons: []
    };
    setOutcomeReasonsData(emptyData);
    setIsValid(true);
    setErrors([]);
  }, []);

  const getFormattedDataForAPI = useCallback((): {
    won_reasons: Array<{ reason_text: string; display_order: number }>;
    lost_reasons: Array<{ reason_text: string; display_order: number }>;
  } => {
    return {
      won_reasons: outcomeReasonsData.won_reasons
        .filter(reason => reason.reason_text.trim())
        .map(reason => ({
          reason_text: reason.reason_text.trim(),
          display_order: reason.display_order
        })),
      lost_reasons: outcomeReasonsData.lost_reasons
        .filter(reason => reason.reason_text.trim())
        .map(reason => ({
          reason_text: reason.reason_text.trim(),
          display_order: reason.display_order
        }))
    };
  }, [outcomeReasonsData]);

  // ============================================
  // EFFECTS
  // ============================================

  // Validar automaticamente quando dados mudam
  useEffect(() => {
    validateReasons(outcomeReasonsData);
  }, [outcomeReasonsData]); // AIDEV-NOTE: Remover validateReasons das dependências para evitar loop

  // ============================================
  // COMPUTED PROPERTIES
  // ============================================

  const hasReasons = outcomeReasonsData.won_reasons.length > 0 || outcomeReasonsData.lost_reasons.length > 0;
  const totalReasons = outcomeReasonsData.won_reasons.length + outcomeReasonsData.lost_reasons.length;

  // ============================================
  // RETURN
  // ============================================

  return {
    // Data
    outcomeReasonsData,
    hasReasons,
    totalReasons,
    
    // Validation
    isValid,
    errors,
    
    // Actions
    updateOutcomeReasons,
    resetToDefaults,
    clearReasons,
    getFormattedDataForAPI,
    
    // Utilities
    canUseDefaults: !!defaultReasons && !hasReasons
  };
};

export default useOutcomeReasonsManager;