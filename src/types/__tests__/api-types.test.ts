/**
 * ============================================
 * 🔧 CATEGORIA 7.2: TYPE TESTING - API TYPES
 * ============================================
 * 
 * Testes de tipo para validar os tipos de API criados
 */

import type {
  ApiResponse,
  ApiError,
  ListRequest,
  ListResponse,
  CreateRequest,
  CreateResponse,
  UpdateRequest,
  UpdateResponse,
  DeleteRequest,
  DeleteResponse,
  LoginRequest,
  LoginResponse,
  BaseQueryParams,
  FilterParams,
  EntityQueryParams,
  BatchRequest,
  BatchResponse
} from '../api';

// Interface de teste
interface TestEntity {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

// ✅ TESTES APIRESPONSE<T>
type UserResponse = ApiResponse<TestEntity>;

const successResponse: UserResponse = {
  success: true,
  data: {
    id: '1',
    name: 'Test User',
    email: 'test@test.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  timestamp: '2024-01-01T00:00:00Z',
  requestId: 'req-123'
};

const errorResponse: UserResponse = {
  success: false,
  error: {
    code: 'USER_NOT_FOUND',
    message: 'User not found',
    category: 'business',
    severity: 'medium'
  },
  timestamp: '2024-01-01T00:00:00Z',
  requestId: 'req-124'
};

// ✅ TESTES APIERROR
const apiError: ApiError = {
  code: 'VALIDATION_ERROR',
  message: 'Invalid email format',
  category: 'validation',
  severity: 'medium',
  field: 'email',
  userMessage: 'Por favor, insira um email válido'
};

// ✅ TESTES QUERY PARAMS
const baseParams: BaseQueryParams = {
  page: 1,
  per_page: 20,
  sort_by: 'created_at',
  sort_direction: 'desc',
  search: 'test'
};

const filterParams: FilterParams = {
  created_after: '2024-01-01',
  status: ['active', 'pending'],
  is_active: true,
  tenant_id: 'tenant-123'
};

const entityParams: EntityQueryParams<TestEntity> = {
  ...baseParams,
  ...filterParams,
  name: 'Test User',
  email: 'test@test.com'
};

// ✅ TESTES CRUD OPERATIONS
// List Request/Response
type UserListRequest = ListRequest<TestEntity>;
type UserListResponse = ListResponse<TestEntity>;

const listRequest: UserListRequest = {
  params: entityParams,
  headers: {
    'Authorization': 'Bearer token-123'
  }
};

// Create Request/Response
type UserCreateRequest = CreateRequest<Omit<TestEntity, 'id' | 'created_at' | 'updated_at'>>;
type UserCreateResponse = CreateResponse<TestEntity>;

const createRequest: UserCreateRequest = {
  data: {
    name: 'New User',
    email: 'new@test.com'
  },
  validate: true,
  return_entity: true
};

// Update Request/Response
type UserUpdateRequest = UpdateRequest<TestEntity>;
type UserUpdateResponse = UpdateResponse<TestEntity>;

const updateRequest: UserUpdateRequest = {
  id: 'user-123',
  data: {
    name: 'Updated User'
    // Outros campos são opcionais
  },
  validate: true
};

// Delete Request/Response
const deleteRequest: DeleteRequest = {
  id: 'user-123',
  soft_delete: true,
  cascade: false
};

type UserDeleteResponse = DeleteResponse;

const deleteResponse: UserDeleteResponse = {
  success: true,
  data: {
    deleted: true,
    id: 'user-123'
  },
  timestamp: '2024-01-01T00:00:00Z',
  requestId: 'req-125'
};

// ✅ TESTES BATCH OPERATIONS
type UserBatchRequest = BatchRequest<TestEntity>;
type UserBatchResponse = BatchResponse<TestEntity>;

const batchRequest: UserBatchRequest = {
  operation: 'create',
  items: [
    {
      id: '1',
      name: 'User 1',
      email: 'user1@test.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'User 2',
      email: 'user2@test.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  validate: true,
  continue_on_error: false
};

// ✅ TESTES LOGIN
const loginRequest: LoginRequest = {
  email: 'admin@test.com',
  password: 'secret123',
  remember_me: true,
  device_info: {
    user_agent: 'Mozilla/5.0...',
    device_type: 'desktop'
  }
};

const loginResponse: LoginResponse = {
  user: {
    id: 'user-123',
    email: 'admin@test.com',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin',
    tenant_id: 'tenant-123',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    permissions: ['read', 'write', 'admin'],
    avatar_url: 'https://example.com/avatar.jpg'
  },
  tokens: {
    accessToken: 'jwt-access-token',
    refreshToken: 'jwt-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
    issuedAt: '2024-01-01T00:00:00Z'
  },
  session: {
    id: 'session-123',
    expires_at: '2024-01-01T01:00:00Z',
    device_info: {
      user_agent: 'Mozilla/5.0...',
      device_type: 'desktop'
    }
  }
};

// ✅ TESTES DE COMPATIBILIDADE
// Verificar se todos os tipos estão disponíveis
type _ApiExportsTest = {
  response: ApiResponse<TestEntity>;
  error: ApiError;
  listReq: ListRequest<TestEntity>;
  listRes: ListResponse<TestEntity>;
  createReq: CreateRequest<TestEntity>;
  createRes: CreateResponse<TestEntity>;
  updateReq: UpdateRequest<TestEntity>;
  updateRes: UpdateResponse<TestEntity>;
  deleteReq: DeleteRequest;
  deleteRes: DeleteResponse;
  batchReq: BatchRequest<TestEntity>;
  batchRes: BatchResponse<TestEntity>;
  loginReq: LoginRequest;
  loginRes: LoginResponse;
  baseParams: BaseQueryParams;
  filterParams: FilterParams;
  entityParams: EntityQueryParams<TestEntity>;
};

console.log('✅ Todos os testes de tipos API passaram!');

export {};
