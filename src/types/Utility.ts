/**
 * ============================================
 * 🔧 CATEGORIA 6.1: TIPOS UTILITY
 * ============================================
 * 
 * Tipos genéricos e utilities para melhorar o desenvolvimento
 * e a experiência do IntelliSense no projeto CRM.
 * 
 * Padrões baseados em:
 * - Total TypeScript
 * - TypeScript Handbook
 * - React TypeScript Cheatsheet
 */

// ============================================
// BEAUTIFICATION & INTELLISENSE
// ============================================

/**
 * ✅ PRETTIFY<T> - Melhora a visualização de tipos no IntelliSense
 * 
 * Transforma intersections complexas em types simples e legíveis.
 * 
 * @example
 * // Antes: { name: string } & { age: number } & { email: string }
 * // Depois: { name: string; age: number; email: string }
 * 
 * type User = Prettify<UserBase & UserProfile & UserContact>;
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * ✅ SIMPLIFY<T> - Alternativa ao Prettify para casos específicos
 * 
 * Remove propriedades never e simplifica tipos condicionais.
 */
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] };

// ============================================
// PARTIAL & OPTIONAL UTILITIES
// ============================================

/**
 * ✅ DEEPPARTIAL<T> - Partial recursivo para formulários e APIs
 * 
 * Torna todas as propriedades (incluindo nested) opcionais.
 * Essencial para formulários com validação progressiva.
 * 
 * @example
 * interface FormData {
 *   user: { name: string; email: string };
 *   settings: { theme: string; notifications: boolean };
 * }
 * 
 * type PartialForm = DeepPartial<FormData>;
 * // Resultado: todas as props opcionais, inclusive user.name, user.email, etc.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object 
    ? T[P] extends (infer U)[]
      ? DeepPartial<U>[]
      : T[P] extends readonly (infer U)[]
      ? readonly DeepPartial<U>[]
      : DeepPartial<T[P]>
    : T[P];
};

/**
 * ✅ OPTIONAL<T, K> - Torna chaves específicas opcionais
 * 
 * Útil para APIs onde alguns campos são opcionais na criação
 * mas obrigatórios na resposta.
 * 
 * @example
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   created_at: string;
 * }
 * 
 * type CreateUser = Optional<User, 'id' | 'created_at'>;
 * // Resultado: { id?: string; name: string; email: string; created_at?: string }
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * ✅ REQUIREDKEYS<T, K> - Torna chaves específicas obrigatórias
 * 
 * Oposto do Optional. Útil para validações e transformações.
 * 
 * @example
 * interface PartialUser {
 *   id?: string;
 *   name?: string;
 *   email?: string;
 * }
 * 
 * type ValidatedUser = RequiredKeys<PartialUser, 'name' | 'email'>;
 * // Resultado: { id?: string; name: string; email: string }
 */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============================================
// OBJECT MANIPULATION
// ============================================

/**
 * ✅ PICK_BY_TYPE<T, U> - Seleciona propriedades por tipo
 * 
 * Útil para extrair apenas strings, números, etc. de uma interface.
 * 
 * @example
 * interface User {
 *   id: string;
 *   name: string;
 *   age: number;
 *   isActive: boolean;
 * }
 * 
 * type UserStrings = PickByType<User, string>;
 * // Resultado: { id: string; name: string }
 */
export type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};

/**
 * ✅ OMIT_BY_TYPE<T, U> - Remove propriedades por tipo
 * 
 * Oposto do PickByType.
 */
export type OmitByType<T, U> = {
  [P in keyof T as T[P] extends U ? never : P]: T[P];
};

/**
 * ✅ NULLABLE<T> - Adiciona null às propriedades
 * 
 * Útil para dados vindos de APIs que podem retornar null.
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * ✅ NON_NULLABLE<T> - Remove null e undefined
 * 
 * Útil para garantir que dados foram validados.
 */
export type NonNullable<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

// ============================================
// ARRAY & FUNCTION UTILITIES
// ============================================

/**
 * ✅ ARRAY_ELEMENT<T> - Extrai tipo de elemento do array
 * 
 * @example
 * type User = ArrayElement<User[]>; // User
 * type Status = ArrayElement<('active' | 'inactive')[]>; // 'active' | 'inactive'
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * ✅ FUNCTION_ARGS<T> - Extrai argumentos de função
 * 
 * @example
 * type Args = FunctionArgs<(a: string, b: number) => void>; // [string, number]
 */
export type FunctionArgs<T> = T extends (...args: infer P) => any ? P : never;

/**
 * ✅ FUNCTION_RETURN<T> - Extrai tipo de retorno
 * 
 * @example
 * type Return = FunctionReturn<() => Promise<User>>; // Promise<User>
 */
export type FunctionReturn<T> = T extends (...args: any[]) => infer R ? R : never;

// ============================================
// CONDITIONAL & UNION UTILITIES
// ============================================

/**
 * ✅ IF_EQUALS<T, U, Y, N> - Conditional type helper
 * 
 * Se T é igual a U, retorna Y, senão N.
 * 
 * @example
 * type Test = IfEquals<string, string, 'yes', 'no'>; // 'yes'
 */
export type IfEquals<T, U, Y = unknown, N = never> =
  (<G>() => G extends T ? 1 : 2) extends (<G>() => G extends U ? 1 : 2) ? Y : N;

/**
 * ✅ IS_UNION<T> - Verifica se é union type
 * 
 * @example
 * type Test1 = IsUnion<string | number>; // true
 * type Test2 = IsUnion<string>; // false
 */
export type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;

/**
 * ✅ UNION_TO_INTERSECTION<T> - Converte union em intersection
 * 
 * Utility interna para outros tipos.
 */
export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

// ============================================
// STRING MANIPULATION
// ============================================

/**
 * ✅ CAPITALIZE<T> - Capitaliza primeira letra
 * 
 * @example
 * type Test = Capitalize<'hello world'>; // 'Hello world'
 */
export type Capitalize<S extends string> = S extends `${infer T}${infer U}` 
  ? `${Uppercase<T>}${U}` 
  : S;

/**
 * ✅ KEBAB_TO_CAMEL<T> - Converte kebab-case para camelCase
 * 
 * @example
 * type Test = KebabToCamel<'user-profile-data'>; // 'userProfileData'
 */
export type KebabToCamel<S extends string> = S extends `${infer T}-${infer U}`
  ? `${T}${Capitalize<KebabToCamel<U>>}`
  : S;

/**
 * ✅ SNAKE_TO_CAMEL<T> - Converte snake_case para camelCase
 * 
 * @example
 * type Test = SnakeToCamel<'user_profile_data'>; // 'userProfileData'
 */
export type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamel<U>>}`
  : S;

// ============================================
// CRM-SPECIFIC UTILITIES
// ============================================

/**
 * ✅ ENTITY_WITH_TIMESTAMPS<T> - Adiciona timestamps padrão
 * 
 * Tipo específico para entidades do CRM que sempre têm created_at/updated_at.
 * 
 * @example
 * interface Lead {
 *   id: string;
 *   title: string;
 * }
 * 
 * type LeadEntity = EntityWithTimestamps<Lead>;
 * // Resultado: Lead + { created_at: string; updated_at: string }
 */
export type EntityWithTimestamps<T> = T & {
  created_at: string;
  updated_at: string;
};

/**
 * ✅ API_ENTITY<T> - Entidade completa de API
 * 
 * Combina timestamps com ID obrigatório.
 */
export type ApiEntity<T> = EntityWithTimestamps<T & { id: string }>;

/**
 * ✅ CREATE_PAYLOAD<T> - Payload para criação
 * 
 * Remove campos automáticos (id, timestamps) para payloads de criação.
 */
export type CreatePayload<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * ✅ UPDATE_PAYLOAD<T> - Payload para atualização
 * 
 * Partial sem timestamps (que são atualizados automaticamente).
 */
export type UpdatePayload<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;

// ============================================
// FORM & VALIDATION UTILITIES
// ============================================

/**
 * ✅ FORM_FIELD<T> - Wrapper para campos de formulário
 * 
 * Adiciona estados de validação e erro para campos.
 */
export type FormField<T> = {
  value: T;
  error?: string;
  touched: boolean;
  isValid: boolean;
};

/**
 * ✅ FORM_STATE<T> - Estado completo de formulário
 * 
 * Transforma interface em form state com validação.
 */
export type FormState<T> = {
  [P in keyof T]: FormField<T[P]>;
} & {
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
};

// ============================================
// LOADING & ERROR STATES
// ============================================

/**
 * ✅ ASYNC_STATE<T> - Estado assíncrono padrão
 * 
 * Padrão para hooks e stores que lidam com operações assíncronas.
 */
export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * ✅ PAGINATED_RESPONSE<T> - Resposta paginada
 * 
 * Estrutura padrão para listagens paginadas.
 */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
};

// ============================================
// TYPE GUARDS HELPERS
// ============================================

/**
 * ✅ IS_NOT_NULL<T> - Type guard para não nulos
 */
export const isNotNull = <T>(value: T | null): value is T => value !== null;

/**
 * ✅ IS_NOT_UNDEFINED<T> - Type guard para não undefined
 */
export const isNotUndefined = <T>(value: T | undefined): value is T => value !== undefined;

/**
 * ✅ IS_NOT_NULLISH<T> - Type guard para não null nem undefined
 */
export const isNotNullish = <T>(value: T | null | undefined): value is T => 
  value !== null && value !== undefined;

/**
 * ✅ HAS_PROPERTY<T, K> - Type guard para propriedades
 */
export const hasProperty = <T, K extends string>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> => {
  return typeof obj === 'object' && obj !== null && prop in obj;
};

// ============================================
// EXPORTS ORGANIZADOS
// ============================================

