/**
 * ============================================
 * 🔧 CATEGORIA 7.2: TYPE TESTING - UTILITY TYPES
 * ============================================
 * 
 * Testes de tipo para validar os tipos utility criados
 */

import type {
  Prettify,
  DeepPartial,
  Optional,
  RequiredKeys,
  EntityWithTimestamps,
  CreatePayload,
  FormField,
  AsyncState
} from '../Utility';

// Interface de teste
interface TestUser {
  id: string;
  name: string;
  email: string;
  age: number;
  isActive: boolean;
}

// ✅ TESTES PRETTIFY<T>
type BaseUser = { id: string; name: string };
type UserProfile = { email: string; phone: string };
type PrettifiedUser = Prettify<BaseUser & UserProfile>;

const prettifiedUser: PrettifiedUser = {
  id: '1',
  name: 'Test',
  email: 'test@test.com',
  phone: '123'
};

// ✅ TESTES DEEPPARTIAL<T>
type PartialTestUser = DeepPartial<TestUser>;

const partialUser: PartialTestUser = {
  name: 'Test'
  // Outras propriedades são opcionais
};

// ✅ TESTES OPTIONAL<T, K>
type UserWithOptionalId = Optional<TestUser, 'id'>;

const userWithoutId: UserWithOptionalId = {
  name: 'Test',
  email: 'test@test.com',
  age: 25,
  isActive: true
  // id é opcional
};

// ✅ TESTES REQUIREDKEYS<T, K>
interface PartialUser {
  id?: string;
  name?: string;
  email?: string;
}

type UserWithRequiredEmail = RequiredKeys<PartialUser, 'name' | 'email'>;

const validUser: UserWithRequiredEmail = {
  name: 'Test',
  email: 'test@test.com'
  // id é opcional
};

// ✅ TESTES ENTITYWITHTIMESTAMPS<T>
interface SimpleEntity {
  id: string;
  title: string;
}

type EntityWithTime = EntityWithTimestamps<SimpleEntity>;

const entityWithTime: EntityWithTime = {
  id: '1',
  title: 'Test',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

// ✅ TESTES CREATEPAYLOAD<T>
interface FullEntity {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

type CreateEntityPayload = CreatePayload<FullEntity>;

const createPayload: CreateEntityPayload = {
  title: 'Test'
  // id, timestamps removidos
};

// ✅ TESTES FORMFIELD<T>
type NameField = FormField<string>;

const nameField: NameField = {
  value: 'Test Name',
  error: 'Nome muito curto',
  touched: true,
  isValid: false
};

// ✅ TESTES ASYNCSTATE<T>
type UserAsyncState = AsyncState<TestUser>;

const userState: UserAsyncState = {
  data: {
    id: '1',
    name: 'Test',
    email: 'test@test.com',
    age: 25,
    isActive: true
  },
  loading: false,
  error: null
};

console.log('✅ Todos os testes de tipos Utility passaram!');

export {};
