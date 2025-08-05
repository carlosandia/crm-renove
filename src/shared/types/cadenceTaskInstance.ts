// =====================================================================================
// TYPES: Cadence Task Instance (Nova Arquitetura)
// Autor: Claude (Arquiteto Sênior)
// Data: 2025-01-24
// Descrição: Tipos TypeScript derivados dos schemas Zod
// AIDEV-NOTE: Todos os tipos são inferidos do schema - não editar manualmente
// =====================================================================================

// AIDEV-NOTE: Importar tipos do schema - fonte única da verdade
export type {
  CadenceTaskInstance,
  CombinedActivityView,
  CreateManualActivity,
  CompleteTask,
  RescheduleTask,
  SkipTask,
  GetActivitiesQuery,
  ActivityStats,
  ActivityType,
  Channel,
  TaskStatus,
  Outcome,
  UrgencyLevel,
  SourceType
} from '../schemas/cadenceTaskInstance';

// ===================================
// TIPOS ESPECÍFICOS PARA COMPONENTES
// ===================================

import type { 
  CombinedActivityView,
  ActivityStats,
  TaskStatus,
  UrgencyLevel,
  CreateManualActivity
} from '../schemas/cadenceTaskInstance';

// Tipo para props de componentes de atividade
export interface ActivityCardProps {
  activity: CombinedActivityView;
  onComplete?: (taskId: string, notes?: string) => void;
  onSkip?: (taskId: string, reason: string) => void;
  onReschedule?: (taskId: string, newDate: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

// Tipo para props de lista de atividades
export interface ActivityListProps {
  leadId: string;
  activities: CombinedActivityView[];
  loading?: boolean;
  stats?: ActivityStats;
  onActivityAction?: (action: string, taskId: string, data?: any) => void;
  filterStatus?: TaskStatus;
  maxItems?: number;
}

// Tipo para props do timeline de atividades
export interface ActivityTimelineProps {
  leadId: string;
  leadName?: string;
  isOpen: boolean;
  onClose: () => void;
  showFilters?: boolean;
  allowActions?: boolean;
}

// Tipo para props do dropdown de tarefas nos cards
export interface TasksDropdownProps {
  leadId: string;
  onTaskCompleted?: () => void;
  maxDisplayItems?: number;
  showBadge?: boolean;
}

// ===================================
// TIPOS PARA HOOKS
// ===================================

// Hook de atividades combinadas
export interface UseCombinedActivitiesResult {
  activities: CombinedActivityView[];
  stats: ActivityStats | null;
  loading: boolean;
  error: string | null;
  pendingCount: number;
  overdueCount: number;
  completedCount: number;
  // Ações
  completeTask: (taskId: string, notes?: string, outcome?: string) => Promise<boolean>;
  skipTask: (taskId: string, reason: string) => Promise<boolean>;
  rescheduleTask: (taskId: string, newDate: string, reason?: string) => Promise<boolean>;
  createManualActivity: (data: CreateManualActivity) => Promise<boolean>;
  refreshActivities: () => void;
}

// Hook específico para tarefas de um card
export interface UseLeadTasksForCardResult {
  tasks: CombinedActivityView[];
  loading: boolean;
  error: string | null;
  pendingCount: number;
  overdueCount: number;
  completedCount: number;
  // Ações simplificadas para card
  completeTask: (taskId: string, notes?: string) => Promise<boolean>;
  refreshTasks: () => void;
}

// ===================================
// TIPOS PARA BADGES E INDICADORES
// ===================================

// Badge de progresso para cards
export interface TaskProgressBadge {
  completed: number;
  total: number;
  overdue: number;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
  label: string; // "2/5 ✓", "3 vencidas", etc.
}

// Indicador de urgência
export interface UrgencyIndicator {
  level: UrgencyLevel;
  color: string;
  icon: string;
  label: string;
  priority: number; // Para ordenação
}

// ===================================
// TIPOS PARA FILTROS E ORDENAÇÃO
// ===================================

export interface ActivityFilters {
  status?: TaskStatus[];
  urgencyLevel?: UrgencyLevel[];
  activityType?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  sourceType?: 'manual' | 'cadence' | 'all';
  search?: string;
}

export interface ActivitySortOptions {
  field: 'scheduled_at' | 'created_at' | 'title' | 'urgency_level';
  direction: 'asc' | 'desc';
}

// ===================================
// TIPOS PARA API/BACKEND
// ===================================

// Response padrão da API
export interface ActivityApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Request para buscar atividades
export interface GetActivitiesRequest {
  leadId: string;
  filters?: ActivityFilters;
  sort?: ActivitySortOptions;
  pagination?: {
    page: number;
    limit: number;
  };
}

// Response paginada
export interface PaginatedActivitiesResponse {
  activities: CombinedActivityView[];
  stats: ActivityStats;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ===================================
// TIPOS PARA EVENTOS E CALLBACKS
// ===================================

export type ActivityActionType = 
  | 'complete'
  | 'skip' 
  | 'reschedule'
  | 'edit'
  | 'delete'
  | 'view_details';

export interface ActivityActionEvent {
  action: ActivityActionType;
  taskId: string;
  activity: CombinedActivityView;
  data?: any;
  timestamp: string;
}

export type ActivityActionCallback = (event: ActivityActionEvent) => void | Promise<void>;

// ===================================
// TIPOS LEGACY (COMPATIBILIDADE)
// ===================================

// AIDEV-NOTE: Manter compatibilidade temporária com sistema antigo
export interface LegacyLeadTask {
  id: string;
  lead_id: string;
  pipeline_id: string;
  etapa_id: string;
  descricao: string;
  canal: string;
  tipo: string;
  status: 'pendente' | 'concluida' | 'cancelada';
  data_programada: string;
  executed_at?: string;
  execution_notes?: string;
  template_content?: string;
  day_offset?: number;
  stage_name?: string;
  created_at: string;
  updated_at: string;
  // Dados enriquecidos legacy
  lead_name?: string;
  lead_data?: any;
  pipeline_name?: string;
}

// Função para converter tipos legacy
export interface LegacyTaskConverter {
  toCombinedActivity: (legacyTask: LegacyLeadTask) => CombinedActivityView;
  fromCombinedActivity: (activity: CombinedActivityView) => LegacyLeadTask;
}