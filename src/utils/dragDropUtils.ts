/**
 * Utilitários para sistema de Drag & Drop simplificado
 * Centraliza conversões e validações comuns
 */

/**
 * Converte índice 0-based (Hello Pangea DnD) para position 1-based (Backend)
 */
export const indexToPosition = (index: number): number => {
  return Math.max(1, index + 1);
};

/**
 * Converte position 1-based (Backend) para índice 0-based (Hello Pangea DnD)
 */
export const positionToIndex = (position: number): number => {
  return Math.max(0, position - 1);
};

/**
 * Valida se um índice é válido para drag & drop
 */
export const isValidIndex = (index: number): boolean => {
  return Number.isInteger(index) && index >= 0;
};

/**
 * Valida se uma posição é válida para o backend
 */
export const isValidPosition = (position: number): boolean => {
  return Number.isInteger(position) && position >= 1;
};

/**
 * Reordena um array movendo um item de uma posição para outra
 */
export const reorderArray = <T>(array: T[], startIndex: number, endIndex: number): T[] => {
  const result = Array.from(array);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

/**
 * Move um item entre arrays diferentes
 */
export const moveItemBetweenArrays = <T>(
  sourceArray: T[],
  destArray: T[],
  sourceIndex: number,
  destIndex: number
): { newSourceArray: T[]; newDestArray: T[] } => {
  const newSourceArray = Array.from(sourceArray);
  const newDestArray = Array.from(destArray);
  
  const [movedItem] = newSourceArray.splice(sourceIndex, 1);
  newDestArray.splice(destIndex, 0, movedItem);
  
  return {
    newSourceArray,
    newDestArray
  };
};

/**
 * Cria um log estruturado simples para drag & drop
 */
export const logDragOperation = (operation: 'start' | 'success' | 'error', data: {
  leadId?: string;
  from?: { stageId: string; index: number };
  to?: { stageId: string; index: number };
  error?: string;
}) => {
  if (!import.meta.env.DEV) return;
  
  const emoji = operation === 'start' ? '🎯' : operation === 'success' ? '✅' : '❌';
  const truncated = {
    ...data,
    leadId: data.leadId?.substring(0, 8),
    from: data.from ? {
      stageId: data.from.stageId.substring(0, 8),
      index: data.from.index
    } : undefined,
    to: data.to ? {
      stageId: data.to.stageId.substring(0, 8),
      index: data.to.index
    } : undefined
  };
  
  console.log(`${emoji} [DragDrop] ${operation.toUpperCase()}:`, truncated);
};