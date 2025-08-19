/**
 * ============================================
 * 🔧 SIMPLE OUTCOME REASONS TYPES
 * ============================================
 * 
 * Types derivados dos schemas Zod simplificados para motivos
 * AIDEV-NOTE: Source of truth é o schema Zod - nunca editar types manualmente
 */

import { z } from 'zod';
import { 
  SimpleOutcomeReasonSchema, 
  OutcomeReasonsCollectionSchema 
} from '../schemas/DomainSchemas';

// ============================================
// TYPES DERIVADOS DO ZOD - NUNCA EDITAR MANUALMENTE
// ============================================

/**
 * 🔧 Simple Outcome Reason - Motivo simples sem IDs nem timestamps
 */
export type SimpleOutcomeReason = z.infer<typeof SimpleOutcomeReasonSchema>;

/**
 * 🔧 Outcome Reasons Collection - Coleção de motivos para pipeline
 */
export type OutcomeReasonsCollection = z.infer<typeof OutcomeReasonsCollectionSchema>;

// ============================================
// TYPES PARA FORMULÁRIOS E COMPONENTES
// ============================================

/**
 * 🔧 Form Outcome Reason - Para uso em formulários (campos podem ser undefined)
 */
export interface FormOutcomeReason {
  id?: string; // ✅ CORREÇÃO: Adicionar id opcional para compatibilidade
  reason_text: string;
  reason_type: 'ganho' | 'perdido';
  display_order: number;
  is_active: boolean;
}

/**
 * 🔧 Form Outcome Reasons Data - Para componentes de formulário
 */
export interface FormOutcomeReasonsData {
  ganho_reasons: FormOutcomeReason[];
  perdido_reasons: FormOutcomeReason[];
}

// ============================================
// TYPES PARA BACKWARD COMPATIBILITY
// ============================================

/**
 * 🔧 Legacy Form Data - Para compatibilidade durante transição
 * @deprecated Usar FormOutcomeReasonsData em vez disso
 */
export interface LegacyFormOutcomeReasonsData extends FormOutcomeReasonsData {
  // Campos antigos para compatibilidade
  won_reasons?: FormOutcomeReason[];
  lost_reasons?: FormOutcomeReason[];
  perda_reasons?: FormOutcomeReason[];
}

// ============================================
// DEFAULTS E CONSTANTES
// ============================================

/**
 * 🔧 Default Outcome Reasons - Motivos padrão do sistema
 */
export const DEFAULT_OUTCOME_REASONS: OutcomeReasonsCollection = {
  ganho_reasons: [
    { reason_text: 'Preço competitivo', reason_type: 'ganho', display_order: 0, is_active: true },
    { reason_text: 'Melhor proposta técnica', reason_type: 'ganho', display_order: 1, is_active: true },
    { reason_text: 'Relacionamento/confiança', reason_type: 'ganho', display_order: 2, is_active: true },
    { reason_text: 'Urgência do cliente', reason_type: 'ganho', display_order: 3, is_active: true },
    { reason_text: 'Recomendação/indicação', reason_type: 'ganho', display_order: 4, is_active: true }
  ],
  perdido_reasons: [
    { reason_text: 'Preço muito alto', reason_type: 'perdido', display_order: 0, is_active: true },
    { reason_text: 'Concorrente escolhido', reason_type: 'perdido', display_order: 1, is_active: true },
    { reason_text: 'Não era o momento', reason_type: 'perdido', display_order: 2, is_active: true },
    { reason_text: 'Não há orçamento', reason_type: 'perdido', display_order: 3, is_active: true },
    { reason_text: 'Não era fit para o produto', reason_type: 'perdido', display_order: 4, is_active: true }
  ]
};

/**
 * 🔧 Empty Outcome Reasons - Motivos vazios para inicialização
 */
export const EMPTY_OUTCOME_REASONS: OutcomeReasonsCollection = {
  ganho_reasons: [],
  perdido_reasons: []
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * 🔧 Criar motivo simples
 */
export const createSimpleOutcomeReason = (
  text: string, 
  type: 'ganho' | 'perdido', 
  order: number = 0
): SimpleOutcomeReason => ({
  reason_text: text.trim(),
  reason_type: type,
  display_order: order,
  is_active: true
});

/**
 * 🔧 Validar coleção de motivos
 */
export const validateOutcomeReasonsCollection = (data: unknown): OutcomeReasonsCollection => {
  return OutcomeReasonsCollectionSchema.parse(data);
};

/**
 * 🔧 Converter legacy data para formato novo
 */
export const convertLegacyToSimple = (legacyData: LegacyFormOutcomeReasonsData): OutcomeReasonsCollection => {
  const result: OutcomeReasonsCollection = {
    ganho_reasons: [],
    perdido_reasons: []
  };

  // Usar novos campos se existirem
  if (legacyData.ganho_reasons?.length) {
    result.ganho_reasons = legacyData.ganho_reasons.map((reason, index) => ({
      reason_text: reason.reason_text,
      reason_type: 'ganho' as const,
      display_order: reason.display_order ?? index,
      is_active: reason.is_active ?? true
    }));
  }

  if (legacyData.perdido_reasons?.length) {
    result.perdido_reasons = legacyData.perdido_reasons.map((reason, index) => ({
      reason_text: reason.reason_text,
      reason_type: 'perdido' as const,
      display_order: reason.display_order ?? index,
      is_active: reason.is_active ?? true
    }));
  }

  // Fallback para campos antigos se novos estão vazios
  if (result.ganho_reasons.length === 0 && legacyData.won_reasons?.length) {
    result.ganho_reasons = legacyData.won_reasons.map((reason, index) => ({
      reason_text: reason.reason_text,
      reason_type: 'ganho' as const,
      display_order: reason.display_order ?? index,
      is_active: reason.is_active ?? true
    }));
  }

  if (result.perdido_reasons.length === 0) {
    // Tentar lost_reasons primeiro, depois perda_reasons
    const lostReasons = legacyData.lost_reasons?.length ? legacyData.lost_reasons : legacyData.perda_reasons;
    if (lostReasons?.length) {
      result.perdido_reasons = lostReasons.map((reason, index) => ({
        reason_text: reason.reason_text,
        reason_type: 'perdido' as const,
        display_order: reason.display_order ?? index,
        is_active: reason.is_active ?? true
      }));
    }
  }

  return result;
};