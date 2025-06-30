/**
 * ============================================
 * 🔧 CATEGORIA 7.2: TYPE TESTING - STATE TYPES
 * ============================================
 * 
 * Testes de tipo para validar os tipos de estado criados
 */

import type {
  BaseState,
  EntityState,
  AuthState,
  PipelineState,
  UIState,
  RootState,
  BaseAction,
  AsyncAction,
  AuthActions,
  PipelineActions,
  NotificationActions,
  Reducer,
  Selector,
  ParametricSelector
} from '../State';

// Interface de teste
interface TestEntity {
  id: string;
  name: string;
  created_at: string;
}

// ✅ TESTES BASESTATE
const baseState: BaseState = {
  loading: false,
  error: null,
  lastUpdated: '2024-01-01T00:00:00Z',
  initialized: true
};

// ✅ TESTES ENTITYSTATE<T>
type TestEntityState = EntityState<TestEntity>;

const entityState: TestEntityState = {
  // BaseState
  loading: false,
  error: null,
  lastUpdated: '2024-01-01T00:00:00Z',
  initialized: true,
  
  // EntityState específico
  entities: {
    '1': {
      id: '1',
      name: 'Test Entity',
      created_at: '2024-01-01T00:00:00Z'
    }
  },
  ids: ['1'],
  selectedId: '1',
  
  pagination: {
    page: 1,
    per_page: 20,
    total: 100,
    total_pages: 5
  },
  
  filters: {
    status: 'active'
  },
  searchTerm: 'test',
  sortBy: 'created_at',
  sortDirection: 'desc'
};

// ✅ TESTES AUTHSTATE
const authState: AuthState = {
  // BaseState
  loading: false,
  error: null,
  lastUpdated: '2024-01-01T00:00:00Z',
  initialized: true,
  
  // Auth específico
  user: {
    id: 'user-123',
    email: 'test@test.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'admin',
    tenant_id: 'tenant-123',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z'
  },
  company: null,
  
  accessToken: 'jwt-token',
  refreshToken: 'refresh-token',
  tokenExpiry: Date.now() + 3600000,
  
  isAuthenticated: true,
  isRefreshing: false,
  loginAttempts: 0,
  lastLoginAttempt: null,
  
  permissions: ['read', 'write'],
  role: 'admin'
};

// ✅ TESTES PIPELINESTATE
const pipelineState: PipelineState = {
  // BaseState
  loading: false,
  error: null,
  lastUpdated: '2024-01-01T00:00:00Z',
  initialized: true,
  
  // Pipeline específico
  pipelines: {
    // EntityState structure for pipelines
    loading: false,
    error: null,
    lastUpdated: '2024-01-01T00:00:00Z',
    initialized: true,
    entities: {},
    ids: [],
    selectedId: null,
    pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
    filters: {},
    searchTerm: '',
    sortBy: 'created_at',
    sortDirection: 'desc'
  },
  activePipelineId: 'pipeline-123',
  
  stages: {
    'pipeline-123': [
      {
        id: 'stage-1',
        name: 'Lead',
        order_index: 1,
        temperature_score: 20,
        color: '#blue',
        created_at: '2024-01-01T00:00:00Z'
      }
    ]
  },
  
  leads: {
    // EntityState structure for leads
    loading: false,
    error: null,
    lastUpdated: '2024-01-01T00:00:00Z',
    initialized: true,
    entities: {},
    ids: [],
    selectedId: null,
    pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
    filters: {},
    searchTerm: '',
    sortBy: 'created_at',
    sortDirection: 'desc'
  },
  leadsByStage: {
    'stage-1': ['lead-1', 'lead-2']
  },
  
  dragState: {
    isDragging: false,
    draggedLeadId: null,
    sourceStageId: null,
    targetStageId: null
  },
  
  kanbanSettings: {
    viewMode: 'board',
    groupBy: 'stage',
    showClosedDeals: false,
    cardFields: ['name', 'email', 'value']
  }
};

// ✅ TESTES UISTATE
const uiState: UIState = {
  layout: {
    sidebarCollapsed: false,
    sidebarWidth: 280,
    headerHeight: 64,
    footerHeight: 40
  },
  
  theme: {
    mode: 'light',
    primaryColor: '#3b82f6',
    fontSize: 'medium',
    density: 'standard'
  },
  
  modals: {
    activeModal: 'user-profile',
    modalData: {
      userId: 'user-123'
    },
    modalStack: ['user-profile']
  },
  
  preferences: {
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'pt-BR',
    defaultPageSize: 20
  },
  
  loadingStates: {
    'users-loading': true,
    'pipelines-loading': false
  }
};

// ✅ TESTES ROOTSTATE
const rootState: RootState = {
  auth: authState,
  pipeline: pipelineState,
  formBuilder: {
    loading: false,
    error: null,
    lastUpdated: '2024-01-01T00:00:00Z',
    initialized: true,
    activeForm: {
      id: null,
      title: '',
      description: '',
      fields: [],
      settings: {},
      isDirty: false
    },
    previewMode: 'desktop',
    isPreviewMode: false,
    forms: {
      loading: false,
      error: null,
      lastUpdated: '2024-01-01T00:00:00Z',
      initialized: true,
      entities: {},
      ids: [],
      selectedId: null,
      pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
      filters: {},
      searchTerm: '',
      sortBy: 'created_at',
      sortDirection: 'desc'
    },
    publishState: {
      isPublishing: false,
      publishError: null,
      lastPublished: null
    }
  },
  deals: {
    loading: false,
    error: null,
    lastUpdated: '2024-01-01T00:00:00Z',
    initialized: true,
    deals: {
      loading: false,
      error: null,
      lastUpdated: '2024-01-01T00:00:00Z',
      initialized: true,
      entities: {},
      ids: [],
      selectedId: null,
      pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
      filters: {},
      searchTerm: '',
      sortBy: 'created_at',
      sortDirection: 'desc'
    },
    revenue: {
      thisMonth: 50000,
      lastMonth: 45000,
      thisYear: 500000,
      target: 600000,
      growth: 11.1
    },
    analytics: {
      conversionRate: 15.5,
      avgDealSize: 2500,
      salesCycle: 30,
      topPerformers: [
        {
          userId: 'user-1',
          userName: 'João Silva',
          dealsCount: 25,
          revenue: 62500
        }
      ]
    }
  },
  notifications: {
    toasts: [],
    alerts: [],
    realTime: {
      isConnected: true,
      lastPing: '2024-01-01T00:00:00Z',
      connectionCount: 1
    }
  },
  ui: uiState
};

// ✅ TESTES ACTIONS
// BaseAction
const baseAction: BaseAction = {
  type: 'TEST_ACTION',
  payload: { test: true },
  meta: {
    timestamp: '2024-01-01T00:00:00Z',
    requestId: 'req-123'
  }
};

// AsyncAction
type TestAsyncAction = AsyncAction<'LOAD_USERS', TestEntity[]>;

const loadUsersRequest: TestAsyncAction = {
  type: 'LOAD_USERS_REQUEST'
};

const loadUsersSuccess: TestAsyncAction = {
  type: 'LOAD_USERS_SUCCESS',
  payload: [
    {
      id: '1',
      name: 'User 1',
      created_at: '2024-01-01T00:00:00Z'
    }
  ]
};

const loadUsersFailure: TestAsyncAction = {
  type: 'LOAD_USERS_FAILURE',
  payload: {
    error: 'Failed to load users'
  }
};

// AuthActions
const loginAction: AuthActions = {
  type: 'LOGIN_REQUEST',
  payload: {
    email: 'admin@test.com',
    password: 'secret123'
  }
};

const setUserAction: AuthActions = {
  type: 'SET_USER',
  payload: {
    id: 'user-123',
    email: 'admin@test.com',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin',
    tenant_id: 'tenant-123',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z'
  }
};

// PipelineActions
const setActivePipelineAction: PipelineActions = {
  type: 'SET_ACTIVE_PIPELINE',
  payload: 'pipeline-123'
};

const moveLeadAction: PipelineActions = {
  type: 'MOVE_LEAD_REQUEST',
  payload: {
    leadId: 'lead-123',
    targetStageId: 'stage-456'
  }
};

// NotificationActions
const addToastAction: NotificationActions = {
  type: 'ADD_TOAST',
  payload: {
    type: 'success',
    title: 'Sucesso',
    message: 'Operação realizada com sucesso',
    duration: 5000,
    isVisible: true
  }
};

// ✅ TESTES REDUCER
type TestReducer = Reducer<BaseState, BaseAction>;

const testReducer: TestReducer = (state, action) => {
  switch (action.type) {
    case 'TEST_ACTION':
      return {
        ...state,
        loading: false
      };
    default:
      return state;
  }
};

// ✅ TESTES SELECTORS
const getUserSelector: Selector<AuthState['user']> = (state) => state.auth.user;

const getPipelineByIdSelector: ParametricSelector<string, any> = (state, pipelineId) => 
  state.pipeline.pipelines.entities[pipelineId];

// ✅ TESTES DE COMPATIBILIDADE
type _StateExportsTest = {
  baseState: BaseState;
  entityState: EntityState<TestEntity>;
  authState: AuthState;
  pipelineState: PipelineState;
  uiState: UIState;
  rootState: RootState;
  baseAction: BaseAction;
  asyncAction: AsyncAction<'TEST', any>;
  authActions: AuthActions;
  pipelineActions: PipelineActions;
  notificationActions: NotificationActions;
  reducer: Reducer<any, any>;
  selector: Selector<any>;
  parametricSelector: ParametricSelector<any, any>;
};

console.log('✅ Todos os testes de tipos State passaram!');

export {};
