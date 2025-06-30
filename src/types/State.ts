/**
 * ============================================
 * 🔧 CATEGORIA 6.2: TIPOS DE ESTADO GLOBAL
 * ============================================
 * 
 * Tipos para gerenciamento de estado global, actions, reducers
 * e estados padronizados de loading/error.
 * 
 * Compatível com:
 * - Redux Toolkit
 * - Zustand
 * - React Context
 * - TanStack Query
 */

import type { User } from './User';
import type { Company } from './Company';
import type { Pipeline, Lead, PipelineStage } from './Pipeline';
import type { Deal } from './deals';
import type { AsyncState, PaginatedResponse } from './Utility';

// ============================================
// CORE STATE INTERFACES
// ============================================

/**
 * ✅ BASE_STATE - Estado base para todos os slices
 * 
 * Padroniza loading, error e timestamps em todos os estados.
 */
export interface BaseState {
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  initialized: boolean;
}

/**
 * ✅ ENTITY_STATE<T> - Estado para entidades CRUD
 * 
 * Padrão para gerenciar listas de entidades com operações CRUD.
 */
export interface EntityState<T extends { id: string }> extends BaseState {
  entities: Record<string, T>;
  ids: string[];
  selectedId: string | null;
  
  // Pagination
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  
  // Filters & Search
  filters: Record<string, any>;
  searchTerm: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

// ============================================
// AUTH STATE
// ============================================

/**
 * ✅ AUTH_STATE - Estado de autenticação
 * 
 * Gerencia login, logout, refresh de token e permissões.
 */
export interface AuthState extends BaseState {
  // User data
  user: User | null;
  company: Company | null;
  
  // Tokens
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
  
  // Status
  isAuthenticated: boolean;
  isRefreshing: boolean;
  loginAttempts: number;
  lastLoginAttempt: string | null;
  
  // Permissions
  permissions: string[];
  role: 'super_admin' | 'admin' | 'manager' | 'sales_rep' | null;
}

// ============================================
// PIPELINE STATE
// ============================================

/**
 * ✅ PIPELINE_STATE - Estado do módulo Pipeline
 * 
 * Gerencia pipelines, stages, leads e operações drag-and-drop.
 */
export interface PipelineState extends BaseState {
  // Pipelines
  pipelines: EntityState<Pipeline>;
  activePipelineId: string | null;
  
  // Stages
  stages: Record<string, PipelineStage[]>;
  
  // Leads
  leads: EntityState<Lead>;
  leadsByStage: Record<string, string[]>;
  
  // Drag & Drop
  dragState: {
    isDragging: boolean;
    draggedLeadId: string | null;
    sourceStageId: string | null;
    targetStageId: string | null;
  };
  
  // Kanban View
  kanbanSettings: {
    viewMode: 'board' | 'list' | 'table';
    groupBy: 'stage' | 'assigned_to' | 'priority';
    showClosedDeals: boolean;
    cardFields: string[];
  };
}

// ============================================
// FORMS STATE
// ============================================

/**
 * ✅ FORM_BUILDER_STATE - Estado do Form Builder
 * 
 * Gerencia criação, edição e publicação de formulários.
 */
export interface FormBuilderState extends BaseState {
  // Current form being edited
  activeForm: {
    id: string | null;
    title: string;
    description: string;
    fields: any[]; // FormField[] from Forms.ts
    settings: any; // FormSettings from Forms.ts
    isDirty: boolean;
  };
  
  // Preview state
  previewMode: 'desktop' | 'tablet' | 'mobile';
  isPreviewMode: boolean;
  
  // Form list
  forms: EntityState<any>; // Form interface from Forms.ts
  
  // Publishing
  publishState: {
    isPublishing: boolean;
    publishError: string | null;
    lastPublished: string | null;
  };
}

// ============================================
// DEALS STATE
// ============================================

/**
 * ✅ DEALS_STATE - Estado do módulo Deals
 * 
 * Gerencia negócios fechados, receita e analytics.
 */
export interface DealsState extends BaseState {
  deals: EntityState<Deal>;
  
  // Revenue tracking
  revenue: {
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
    target: number;
    growth: number;
  };
  
  // Analytics
  analytics: {
    conversionRate: number;
    avgDealSize: number;
    salesCycle: number;
    topPerformers: Array<{
      userId: string;
      userName: string;
      dealsCount: number;
      revenue: number;
    }>;
  };
}

// ============================================
// NOTIFICATIONS STATE
// ============================================

/**
 * ✅ NOTIFICATION_STATE - Estado de notificações
 * 
 * Gerencia toasts, alertas e notificações em tempo real.
 */
export interface NotificationState {
  // Toast notifications
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration: number;
    isVisible: boolean;
    createdAt: string;
  }>;
  
  // System alerts
  alerts: Array<{
    id: string;
    level: 'high' | 'medium' | 'low';
    category: 'system' | 'security' | 'business';
    title: string;
    description: string;
    isRead: boolean;
    createdAt: string;
    expiresAt: string | null;
  }>;
  
  // Real-time notifications
  realTime: {
    isConnected: boolean;
    lastPing: string | null;
    connectionCount: number;
  };
}

// ============================================
// UI STATE
// ============================================

/**
 * ✅ UI_STATE - Estado da interface do usuário
 * 
 * Gerencia sidebars, modals, themes e preferências de UI.
 */
export interface UIState {
  // Layout
  layout: {
    sidebarCollapsed: boolean;
    sidebarWidth: number;
    headerHeight: number;
    footerHeight: number;
  };
  
  // Theme
  theme: {
    mode: 'light' | 'dark' | 'system';
    primaryColor: string;
    fontSize: 'small' | 'medium' | 'large';
    density: 'compact' | 'standard' | 'comfortable';
  };
  
  // Modals
  modals: {
    activeModal: string | null;
    modalData: Record<string, any>;
    modalStack: string[];
  };
  
  // Preferences
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    numberFormat: string;
    defaultPageSize: number;
  };
  
  // Loading states
  loadingStates: Record<string, boolean>;
}

// ============================================
// ROOT STATE
// ============================================

/**
 * ✅ ROOT_STATE - Estado raiz da aplicação
 * 
 * Combina todos os slices em um estado global tipado.
 */
export interface RootState {
  auth: AuthState;
  pipeline: PipelineState;
  formBuilder: FormBuilderState;
  deals: DealsState;
  notifications: NotificationState;
  ui: UIState;
}

// ============================================
// ACTION TYPES
// ============================================

/**
 * ✅ BASE_ACTION - Ação base para Redux/Zustand
 * 
 * Estrutura padrão para todas as actions.
 */
export interface BaseAction<T = any> {
  type: string;
  payload?: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    optimistic?: boolean;
  };
  error?: boolean;
}

/**
 * ✅ ASYNC_ACTION_TYPES - Tipos para actions assíncronas
 * 
 * Padrão REQUEST/SUCCESS/FAILURE para operações async.
 */
export type AsyncActionTypes<T extends string> = {
  REQUEST: `${T}_REQUEST`;
  SUCCESS: `${T}_SUCCESS`;
  FAILURE: `${T}_FAILURE`;
};

/**
 * ✅ ASYNC_ACTION<T> - Action assíncrona tipada
 * 
 * Template para actions que fazem chamadas API.
 */
export type AsyncAction<T extends string, P = any> = 
  | { type: `${T}_REQUEST`; payload?: P }
  | { type: `${T}_SUCCESS`; payload: P }
  | { type: `${T}_FAILURE`; payload: { error: string } };

// ============================================
// SPECIFIC ACTIONS
// ============================================

/**
 * ✅ AUTH_ACTIONS - Actions específicas de autenticação
 */
export type AuthActions =
  | AsyncAction<'LOGIN', { email: string; password: string }>
  | AsyncAction<'LOGOUT'>
  | AsyncAction<'REFRESH_TOKEN'>
  | AsyncAction<'LOAD_USER'>
  | { type: 'SET_USER'; payload: User }
  | { type: 'CLEAR_AUTH' }
  | { type: 'INCREMENT_LOGIN_ATTEMPTS' }
  | { type: 'RESET_LOGIN_ATTEMPTS' };

/**
 * ✅ PIPELINE_ACTIONS - Actions do módulo Pipeline
 */
export type PipelineActions =
  | AsyncAction<'LOAD_PIPELINES'>
  | AsyncAction<'CREATE_PIPELINE', Pipeline>
  | AsyncAction<'UPDATE_PIPELINE', { id: string; data: Partial<Pipeline> }>
  | AsyncAction<'DELETE_PIPELINE', string>
  | AsyncAction<'LOAD_LEADS', { pipelineId: string }>
  | AsyncAction<'MOVE_LEAD', { leadId: string; targetStageId: string }>
  | { type: 'SET_ACTIVE_PIPELINE'; payload: string }
  | { type: 'START_DRAG'; payload: { leadId: string; sourceStageId: string } }
  | { type: 'END_DRAG' }
  | { type: 'UPDATE_KANBAN_SETTINGS'; payload: Partial<PipelineState['kanbanSettings']> };

/**
 * ✅ NOTIFICATION_ACTIONS - Actions de notificações
 */
export type NotificationActions =
  | { type: 'ADD_TOAST'; payload: Omit<NotificationState['toasts'][0], 'id' | 'createdAt'> }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'ADD_ALERT'; payload: Omit<NotificationState['alerts'][0], 'id' | 'createdAt'> }
  | { type: 'MARK_ALERT_READ'; payload: string }
  | { type: 'CLEAR_ALERTS' }
  | { type: 'SET_REALTIME_STATUS'; payload: boolean };

// ============================================
// REDUCER TYPES
// ============================================

/**
 * ✅ REDUCER<S, A> - Tipo para reducers
 * 
 * Função reducer tipada com state e action.
 */
export type Reducer<S, A extends BaseAction> = (state: S, action: A) => S;

/**
 * ✅ ASYNC_THUNK<T, R> - Tipo para thunks assíncronos
 * 
 * Para Redux Toolkit createAsyncThunk.
 */
export type AsyncThunk<T = void, R = any> = (
  arg: T,
  thunkAPI: {
    getState: () => RootState;
    dispatch: any;
    rejectWithValue: (value: any) => any;
  }
) => Promise<R>;

// ============================================
// SELECTOR TYPES
// ============================================

/**
 * ✅ SELECTOR<T> - Tipo para seletores
 * 
 * Função que seleciona dados do state.
 */
export type Selector<T> = (state: RootState) => T;

/**
 * ✅ PARAMETRIC_SELECTOR<P, T> - Seletor com parâmetros
 * 
 * Seletor que aceita parâmetros além do state.
 */
export type ParametricSelector<P, T> = (state: RootState, params: P) => T;

// ============================================
// STORE CONFIGURATION
// ============================================

/**
 * ✅ STORE_CONFIG - Configuração do store
 * 
 * Tipo para configuração do Redux/Zustand store.
 */
export interface StoreConfig {
  // Redux DevTools
  devTools: boolean;
  
  // Middleware
  middleware: {
    thunk: boolean;
    logger: boolean;
    persist: boolean;
  };
  
  // Persistence
  persist: {
    key: string;
    storage: 'localStorage' | 'sessionStorage';
    whitelist: (keyof RootState)[];
    blacklist: (keyof RootState)[];
  };
  
  // Performance
  immutableCheck: boolean;
  serializableCheck: boolean;
}

// ============================================
// MUTATION TYPES (para React Query/SWR)
// ============================================

/**
 * ✅ MUTATION_CONTEXT<T> - Contexto para mutações
 * 
 * Dados para rollback em caso de erro em mutações otimistas.
 */
export interface MutationContext<T = any> {
  previousData?: T;
  optimisticData?: T;
  entityId?: string;
  operation: 'create' | 'update' | 'delete';
}

/**
 * ✅ MUTATION_OPTIONS<T, E> - Opções para mutações
 * 
 * Configuração para hooks de mutação (useMutation).
 */
export interface MutationOptions<T = any, E = any> {
  onMutate?: (variables: T) => Promise<MutationContext> | MutationContext;
  onSuccess?: (data: any, variables: T, context?: MutationContext) => void;
  onError?: (error: E, variables: T, context?: MutationContext) => void;
  onSettled?: (data: any, error: E | null, variables: T, context?: MutationContext) => void;
}

// ============================================
// EXPORTS ORGANIZADOS
