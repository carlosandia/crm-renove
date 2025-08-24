// ✅ PRIORIDADE 2: Utilitários para padronização de IDs nos logs
// Garante formato consistente: "abcd1234" (8 chars) vs UUID completo quando necessário

interface LogIdOptions {
  format?: 'truncated' | 'full' | 'masked';
  includeEllipsis?: boolean;
}

/**
 * ✅ PADRÃO OFICIAL: Formatação consistente de IDs nos logs
 * 
 * @param id - O UUID completo
 * @param options - Opções de formatação
 * @returns ID formatado consistentemente
 */
export function formatLeadIdForLog(id: string | undefined | null, options: LogIdOptions = {}): string {
  const { format = 'truncated', includeEllipsis = false } = options;
  
  // ✅ SEGURANÇA: Tratar valores nulos/undefined
  if (!id || typeof id !== 'string') {
    return 'UNDEFINED_ID';
  }

  // ✅ VALIDAÇÃO: Verificar se é UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return `INVALID_UUID(${id.substring(0, 8)})`;
  }

  switch (format) {
    case 'full':
      return id;
    
    case 'masked':
      // Mostra início e fim: "abcd1234-****-****-****-123456789012"
      return `${id.substring(0, 8)}-****-****-****-${id.substring(32)}`;
    
    case 'truncated':
    default:
      // ✅ PADRÃO OFICIAL: Primeiros 8 caracteres consistentes
      const truncated = id.substring(0, 8);
      return includeEllipsis ? `${truncated}...` : truncated;
  }
}

/**
 * ✅ CONVENIÊNCIA: Formatação para múltiplos IDs
 */
export function formatMultipleIds(ids: (string | undefined)[], options?: LogIdOptions): string {
  const formatted = ids
    .map(id => formatLeadIdForLog(id, options))
    .join(', ');
  
  return `[${formatted}]`;
}

/**
 * ✅ CONTEXTO COMPLETO: Para logs críticos que precisam de contexto completo
 */
export function formatLeadLogContext(lead: { id?: string; name?: string; email?: string }, options: LogIdOptions = {}) {
  return {
    leadId: formatLeadIdForLog(lead.id, options),
    leadName: lead.name || 'NO_NAME',
    leadEmail: lead.email || 'NO_EMAIL'
  };
}

/**
 * ✅ PERFORMANCE: Para validação rápida se é UUID válido
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}