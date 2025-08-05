/**
 * Utilitários para debug sistemático do sistema Drag & Drop
 * Permite ativar/desativar logs específicos para investigação de posicionamento
 */

export interface DragDropDebugConfig {
  enabled: boolean;
  logMovements: boolean;
  logPositions: boolean;
  logAPI: boolean;
  logOptimistic: boolean;
}

// Configuração padrão de debug
const defaultConfig: DragDropDebugConfig = {
  enabled: false,
  logMovements: true,
  logPositions: true,
  logAPI: true,
  logOptimistic: true
};

// ✅ CONTROLE GLOBAL: Configuração de debug acessível via window
declare global {
  interface Window {
    debugDragDrop?: boolean;
    dragDropDebugConfig?: DragDropDebugConfig;
    enableDragDropDebug: () => void;
    disableDragDropDebug: () => void;
    showDragDropConfig: () => void;
  }
}

// Inicializar configuração global
if (typeof window !== 'undefined') {
  window.dragDropDebugConfig = window.dragDropDebugConfig || { ...defaultConfig };
  
  // ✅ HELPERS GLOBAIS: Funções para controlar debug via console
  window.enableDragDropDebug = () => {
    window.debugDragDrop = true;
    window.dragDropDebugConfig!.enabled = true;
    console.log('🐛 [DEBUG] Drag & Drop debug ATIVADO');
    console.log('📋 [DEBUG] Use window.showDragDropConfig() para ver opções');
  };
  
  window.disableDragDropDebug = () => {
    window.debugDragDrop = false;
    window.dragDropDebugConfig!.enabled = false;
    console.log('✅ [DEBUG] Drag & Drop debug DESATIVADO');
  };
  
  window.showDragDropConfig = () => {
    console.table(window.dragDropDebugConfig);
    console.log('🔧 [DEBUG] Para ativar: window.enableDragDropDebug()');
    console.log('🔧 [DEBUG] Para desativar: window.disableDragDropDebug()');
  };
}

// ✅ HELPER: Verificar se debug está ativado
export const isDebugEnabled = (): boolean => {
  return import.meta.env.DEV && !!(window?.debugDragDrop || window?.dragDropDebugConfig?.enabled);
};

// ✅ HELPER: Verificar categoria específica de debug
export const isDebugCategoryEnabled = (category: keyof Omit<DragDropDebugConfig, 'enabled'>): boolean => {
  if (!isDebugEnabled()) return false;
  return window?.dragDropDebugConfig?.[category] ?? true;
};

// ✅ LOGGER ESTRUTURADO: Para movimentos de drag & drop
export const logDragMovement = (data: {
  type: 'horizontal' | 'vertical' | 'cancelled';
  draggableId: string;
  source: { droppableId: string; index: number };
  destination?: { droppableId: string; index: number };
  reason?: string;
}) => {
  if (!isDebugCategoryEnabled('logMovements')) return;
  
  const emoji = data.type === 'horizontal' ? '↔️' : data.type === 'vertical' ? '↕️' : '❌';
  console.log(`${emoji} [DRAG MOVEMENT] ${data.type.toUpperCase()}:`, {
    leadId: data.draggableId.substring(0, 8),
    from: {
      stage: data.source.droppableId.substring(0, 8),
      index: data.source.index
    },
    to: data.destination ? {
      stage: data.destination.droppableId.substring(0, 8),
      index: data.destination.index
    } : null,
    reason: data.reason || 'N/A'
  });
};

// ✅ LOGGER ESTRUTURADO: Para updates de posição
export const logPositionUpdates = (data: {
  operation: 'batch' | 'single' | 'optimistic';
  updates: Array<{ leadId: string; position: number }>;
  stageId?: string;
  context?: string;
}) => {
  if (!isDebugCategoryEnabled('logPositions')) return;
  
  const emoji = data.operation === 'batch' ? '📦' : data.operation === 'single' ? '🎯' : '⚡';
  console.log(`${emoji} [POSITION UPDATE] ${data.operation.toUpperCase()}:`, {
    count: data.updates.length,
    stage: data.stageId?.substring(0, 8) || 'N/A',
    context: data.context || 'N/A',
    sample: data.updates.slice(0, 3).map(u => ({
      leadId: u.leadId.substring(0, 8),
      position: u.position
    }))
  });
};

// ✅ LOGGER ESTRUTURADO: Para chamadas de API
export const logAPICall = (data: {
  endpoint: string;
  method: string;
  payload?: any;
  status?: number;
  duration?: number;
  error?: string;
}) => {
  if (!isDebugCategoryEnabled('logAPI')) return;
  
  const emoji = data.error ? '❌' : data.status && data.status >= 200 && data.status < 300 ? '✅' : '⚠️';
  console.log(`${emoji} [API CALL] ${data.method} ${data.endpoint}:`, {
    status: data.status || 'pending',
    duration: data.duration ? `${data.duration}ms` : 'N/A',
    payloadSize: data.payload ? JSON.stringify(data.payload).length : 0,
    error: data.error || null
  });
};

// ✅ LOGGER ESTRUTURADO: Para updates otimistas
export const logOptimisticUpdate = (data: {
  operation: 'apply' | 'revert';
  leadId: string;
  changes: any;
  reason?: string;
}) => {
  if (!isDebugCategoryEnabled('logOptimistic')) return;
  
  const emoji = data.operation === 'apply' ? '⚡' : '↩️';
  console.log(`${emoji} [OPTIMISTIC] ${data.operation.toUpperCase()}:`, {
    leadId: data.leadId.substring(0, 8),
    changes: data.changes,
    reason: data.reason || 'N/A'
  });
};

// ✅ PERFORMANCE TRACKER: Para medir tempo de operações
export class PerformanceTracker {
  private startTime: number;
  private operation: string;
  
  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
    
    if (isDebugEnabled()) {
      console.time(`⏱️ [PERFORMANCE] ${operation}`);
    }
  }
  
  end(details?: any) {
    const duration = performance.now() - this.startTime;
    
    if (isDebugEnabled()) {
      console.timeEnd(`⏱️ [PERFORMANCE] ${this.operation}`);
      
      if (details) {
        console.log(`📊 [PERFORMANCE] ${this.operation} details:`, {
          duration: `${duration.toFixed(2)}ms`,
          ...details
        });
      }
    }
    
    return duration;
  }
}

// ✅ EXPORTAR CONFIGURAÇÃO: Para uso em componentes
export { defaultConfig };