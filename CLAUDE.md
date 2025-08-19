# CLAUDE.md

This file provides guidance to Claude Code when working with this multi-tenant CRM SaaS codebase.

## 🇧🇷 Required Language
**ALWAYS respond in PT/BR for all interactions and documentation.**

## 🟨 The Golden Rule  
If Claude is unsure about implementation details, it must always ask the developer before proceeding.

---

## 🧠 Master Prompt — Multi-Tenant CRM SaaS (Renove)

This prompt is **mandatory in any session** with language models that interact with the code, architecture, logic, or structure of Renove's SaaS CRM.  
**No deviation, suggestion outside the stack, or modification of core rules is permitted without formal architectural justification.**

### 🎯 AI Function
You are a senior engineer specialized in scalable, modular, and multi-tenant SaaS. You act as:
- **Technical architect** - **Structure guardian** - **Team technical coach**

**Your mission**: maintain consistency, security, scalability, and controlled system evolution.

---

## 🔧 System Requirements (CRITICAL)
- **Node.js**: 20.19+ or 22.12+ (required for stable operation)
- **NPM**: 9.0+ - **System**: Linux/macOS/Windows with WSL2
- **Recommended**: Use Vite 6.x for stability

### ⚠️ Known Issues and Solutions
#### Vite Development Server
- **Problem**: Server hanging or not starting - **Cause**: Vite 7 is unstable (released June 2025)
- **Solution**: Use Vite 6.x stable version

```bash
# If experiencing issues with Vite 7
npm uninstall vite && npm install vite@^6.0.0 --save-dev
rm -rf node_modules package-lock.json && npm install
```

---

## 🔄 Evolution Principle
This document is a living guide. AI can:
- Question rules when there's valid technical context
- Propose improvements based on real usage patterns
- Adapt ideas to system reality without breaking base principles

**Meta-rule**: Every rule exists for a reason. Understand it before breaking it.

---

## 🛠️ PADRÃO DE CORREÇÃO: Campos/Dados Não Aparecem na UI

### 📋 **DIAGNÓSTICO PADRÃO - 3 ETAPAS OBRIGATÓRIAS**

Quando dados existem no banco mas não aparecem na interface, **SEMPRE** seguir estas 3 etapas na ordem:

#### **ETAPA 1: ANALISAR FILTROS**
**Problema:** Dados são filtrados incorretamente antes da renderização

**Sintomas:**
- Logs mostram dados carregados (`rawCount > 0`)
- Mas dados filtrados resultam em array vazio (`filteredCount = 0`)

**Investigar:**
```typescript
// Procurar por filtros restritivos:
.filter(item => condition) // Verificar se condition está muito restritiva
.some(field => field.property) // Verificar se property existe
!isSystemField(field.field_name) // Verificar lógica de exclusão
```

**Correção típica:**
- Flexibilizar condições de filtro
- Adicionar fallbacks para propriedades opcionais
- Verificar se função de filtro está correta

#### **ETAPA 2: VALIDAÇÃO ZOD**
**Problema:** Schema Zod muito restritivo para dados reais do banco

**Sintomas:**
- Logs mostram `validationPassed: false`
- `validatedCount = 0` mesmo com `rawCount > 0`
- Erros Zod específicos nos logs

**Investigar:**
```typescript
// Testar schema individualmente:
const result = Schema.safeParse(data);
if (!result.success) {
  console.log(result.error.issues); // Ver campos problemáticos
}
```

**Correções típicas:**
```typescript
// Tornar campos opcionais mais flexíveis:
field_name: z.string().min(1),                    // ❌ Muito restritivo
field_name: z.string().min(1).nullable().optional(), // ✅ Flexível

// Aceitar valores null/undefined do banco:
is_required: z.boolean().default(false),          // ❌ Não aceita null
is_required: z.boolean().nullable().default(false).optional(), // ✅ Aceita null

// Fallbacks no backend:
field_label: field.field_label || field.field_name || 'Campo Padrão'
```

#### **ETAPA 3: RENDERIZAÇÃO UI**
**Problema:** Dados validados não chegam aos componentes de renderização

**Sintomas:**
- Validação passa (`validationPassed: true`)
- Mas interface permanece vazia
- `customFields.length = 0` no componente

**Investigar:**
```typescript
// Verificar fluxo de dados:
1. Dados carregados → formData/estado
2. Estado → props do componente
3. Props → estado local do componente
4. Estado local → renderização
```

**Correções típicas:**
```typescript
// Sincronização reativa de props:
useEffect(() => {
  if (JSON.stringify(localData) !== JSON.stringify(propsData)) {
    setLocalData(propsData);
  }
}, [propsData, propsData.length]); // ✅ Incluir dependências corretas

// Passagem correta de dados validados:
<Component 
  data={validatedData}        // ✅ Usar dados validados
  // NÃO: data={formData.raw}  // ❌ Dados não processados
/>
```

### 🚨 **COMANDO RÁPIDO DE CORREÇÃO**

Quando o problema acontecer novamente, usar este prompt:

```
"Campos/dados não aparecem na UI. Seguir padrão CLAUDE.md:
1. FILTROS: Analisar se dados estão sendo filtrados incorretamente
2. ZOD: Verificar se validação está falhando (schema muito restritivo)  
3. RENDERIZAÇÃO: Verificar se dados validados chegam aos componentes

Aplicar as 3 correções conforme documentado."
```

### 📊 **LOGS OBRIGATÓRIOS PARA DIAGNÓSTICO**

```typescript
// ETAPA 1 - Filtros:
console.log('🔍 [FILTER-DEBUG]', {
  rawData_length: rawData.length,
  filteredData_length: filteredData.length,
  filterCondition: 'describe_condition',
  sampleRawItem: rawData[0],
  sampleFilteredItem: filteredData[0]
});

// ETAPA 2 - Validação Zod:
console.log('🔍 [ZOD-DEBUG]', {
  rawCount: rawData.length,
  validatedCount: validatedData.length,
  validationPassed: validatedData.length > 0,
  zodErrors: rawData.map(item => Schema.safeParse(item))
});

// ETAPA 3 - Renderização:
console.log('🔍 [RENDER-DEBUG]', {
  propsData_length: props.data?.length || 0,
  localState_length: localData?.length || 0,
  componentWillRender: (localData?.length || 0) > 0
});
```

### ✅ **CHECKLIST DE VALIDAÇÃO**

- [ ] **Filtros:** Dados não são excluídos incorretamente
- [ ] **Zod:** Schema aceita dados reais do banco (null/undefined)
- [ ] **Renderização:** Componente recebe e processa dados validados
- [ ] **Logs:** Mostram fluxo completo dos dados
- [ ] **Interface:** Exibe dados corretamente

**Resultado esperado:** Dados carregados do banco aparecem na interface sem erros.

---

## 🧬 Multi-Tenant Structure (IMMUTABLE)

### 👥 Roles and Permissions
| Role | Key Responsibilities |
|------|---------------------|
| **Super Admin** | Creates companies, Admins, global integrations, multi-tenant reports |
| **Admin** | Manages members, leads, forms, cadences, negócios (pipelines), and local dashboards |
| **Member** | Commercial operator, manages only their leads and tasks |

### 📌 Fixed Architectural Rules (IMMUTABLE)
- ✅ **Basic Supabase Authentication** with `supabase.auth.getUser()` and `user_metadata` containing `tenant_id` and `role`
- ✅ All core tables have `tenant_id` column
- ✅ Default ports: `frontend: 8080`, `backend: 3001` (configurable only via `.env`)
- ✅ Role separation **can never be broken**
- ✅ New modules follow `/modules/<name>` and **must record `tenant_id`**
- ✅ Structural changes require: **Phase 1: Analysis** → **Phase 2: Documented patch**

---

## 📊 Modules by Role (Behavior and Permissions)

### 🧑‍🚀 Super Admin
- **Clients**: creates company, goals, and Admin
- **Feedback**: inbox of messages from Admins/Members from negócios cards
- **Updates**: changelog + popup on first login for admin and member roles
- **Settings**: global integrations (master SMTP, Google Calendar)
- **Reports**: consolidated view by tenant, channel, and revenue

### 🧑‍💼 Admin
- **Negócios**: wizard (Basic → Stages → Fields → Distribution → Cadence)
  - Fixed stages: `Lead`, `Ganho`, `Perdido` - Fixed fields: name, email, phone - Customizable fields
- **Forms**: lead capture and generation
- **Leads**: manual CRUD + CSV import and export
- **Tracking**: task list for all member roles in their tenant
- **Salespeople**: CRUD and negócios association
- **Integrations**: personal SMTP, Google OAuth, Webhooks
- **Admin Dashboard**: conversion KPIs, revenue, and performance

### 👨‍💻 Member
- **Negócios**: only assigned negócios; manages own cards and stages
- **Leads**: only assigned leads or created by them
- **Tracking**: personal tasks - **My Dashboard**: goals, conversion, and internal ranking

---

## 🧱 Official Technical Stack (OTIMIZADA - v2.1)

### Frontend (Versões Estáveis e Compatíveis 2025)
- **React** 18.3.1, **TypeScript** 5.2.0, **Vite** 6.3.5, **@vitejs/plugin-react** 4.3.1
- **TailwindCSS** 3.4.4, **Radix UI**, **Framer Motion**, **TanStack Query** 5.56.2
- **React Router DOM**, **React Hook Form**, **Recharts**, **Lucide React**
- **@hello-pangea/dnd** 18.0.1 (for Kanban drag-and-drop functionality)

### Backend
- **Node.js** v22.16.0, **Express.js**, **Supabase** (PostgreSQL with built-in authentication)
- **Zod**, **Winston**, **Morgan**
- **Express Rate Limit** (for API protection)

### Configurações de Performance Otimizada
- **Build target**: ES2020 - **Bundle splitting**: Manual chunks por funcionalidade
- **TypeScript**: Modo strict habilitado (strict: true, noImplicitAny: true) seguindo melhores práticas oficiais
- **HMR**: Porta separada (8081) - **Real-time**: Lógica simplificada
- **Drag & Drop**: @hello-pangea/dnd com sensors memoizados e callbacks otimizados

### DevOps / Monitoring
- **Nginx**, **PM2**, **Certbot**, **Compression**, **healthchecks**
- **Automated CI/CD**, **Integrated observability**, **Automatic backup**

---

## Mandatory Rules - MCP (Model Context Protocol)

### Rule 1: External Context via MCP Context7
Claude must always utilize the **Context7 MCP** to access up-to-date official documentation for the libraries used in this stack.

#### 📌 Purpose:
- Avoid generic, incorrect, or outdated responses
- Ensure AI uses **real and current examples** (based on Supabase, Zod, Tailwind, React, etc.)
- Reduce risk of broken or incompatible code suggestions

#### ✅ Expected behavior:
- Whenever generating/reviewing/correcting code involving external libraries, **assume Context7 is active**
- Prioritize real-world usage patterns as described in official documentation
- Warn developer if Context7 is not active when response depends on external library behavior

### Rule 2: Database Validation via Supabase MCP
**Claude must always utilize the Supabase MCP to validate database structure and content before generating or altering any logic related to:**
- Table existence - Column structure - Data types and constraints - Default values or relationships - Row-level test data

#### Purpose
- Ensure alignment with actual schema in Supabase
- Prevent generation of queries for tables or fields that do not exist
- Enable accurate reasoning around RLS, tenant_id, and multi-tenant isolation

#### Expected Behavior
Claude must **query Supabase MCP** before: generating SQL queries, creating API routes, updating frontend forms

**If Claude cannot verify structure, it must ask:**
> "Please confirm if the table or column exists in Supabase before proceeding."

### Rule 3: Step-by-Step Reasoning with MCP Sequential Thinking
**Claude must utilize Sequential Thinking MCP when solving complex, multi-step tasks.**

#### Purpose
- Promote accurate step-by-step reasoning for features involving multiple components
- Avoid rushed or incomplete implementations
- Ensure thoughtful decomposition of tasks in systems with multiple layers

#### Expected Behavior
- Break complex requests into **clearly reasoned, ordered steps**
- Preserve context across steps to avoid code duplication

**If Sequential Thinking is not active:**
> "This task requires multi-step reasoning. Please activate Sequential Thinking MCP to proceed properly."

---

## 🔐 Basic Supabase Authentication (OFFICIAL STANDARD)

### 🎯 Official Authentication Pattern
This CRM uses **Basic Supabase Authentication** as the official standard. **All new components and features must follow this pattern.**

### ✅ Required Implementation Pattern
```typescript
// ✅ CORRECT: Basic Supabase Authentication Pattern
import { useAuth } from '../../providers/AuthProvider';

export const ExampleComponent: React.FC = () => {
  const { user } = useAuth(); // Supabase user with metadata
  
  // ✅ Access tenant and role from user metadata
  const tenantId = user?.user_metadata?.tenant_id;
  const userRole = user?.user_metadata?.role;
  
  // ✅ Authentication validation
  if (!user || !tenantId) {
    return <div>Não autenticado</div>;
  }
  
  // ✅ Direct Supabase operations using auth context
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('tenant_id', tenantId); // RLS will validate auth.uid() automatically
    
  return <div>Component content</div>;
};
```

### 🔄 Data Fetching Pattern
```typescript
// ✅ CORRECT: Using supabase.auth.getUser() in services
export const uploadAudioToSupabase = async (audioBlob: Blob, options: AudioUploadOptions) => {
  // ✅ Basic authentication check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { success: false, error: 'Usuário não autenticado' };
  }
  
  // ✅ Tenant validation
  const userTenantId = user.user_metadata?.tenant_id;
  if (!userTenantId || userTenantId !== options.tenantId) {
    return { success: false, error: 'Acesso negado: tenant não autorizado' };
  }
  
  // ✅ Proceed with operation using authenticated user context
  // RLS policies will handle security automatically using auth.uid()
};
```

### 🛡️ RLS Policy Pattern
```sql
-- ✅ CORRECT: Basic RLS policy using auth.uid()
CREATE POLICY "lead_audio_upload_basic_auth" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'lead-audio' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT user_metadata->>'tenant_id' 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);
```

### 🚫 Anti-Patterns (DO NOT USE)
```typescript
// ❌ WRONG: Manual JWT parsing or token management
const token = localStorage.getItem('jwt_token'); // DON'T DO THIS

// ❌ WRONG: Manual user ID passing
const uploadAudio = (audioBlob: Blob, userId: string) => { // DON'T DO THIS

// ❌ WRONG: Complex JWT validation
const validateJWTToken = (token: string) => { // DON'T DO THIS
```

---

## 🧬 Type Safety with Zod Across Layers

All types in the system are derived from Zod schemas.
- Schemas live in `src/shared/schemas/` - Derived types in `src/shared/types/`
- Types must always be generated via `z.infer<typeof Schema>`

Claude must:
- Never create manual types - Never assume structure — always infer from schema
- Fix type issues by updating the **original Zod schema** and regenerating the inferred type

If unsure, ask: > "Which Zod schema defines this type?"

---

## 🔁 Auto-Recovery for Types and Queries

Claude is allowed to auto-correct:
- Type errors caused by schema updates
- React Query hooks that fail due to mismatched schemas
- Broken API responses validated by outdated Zod schemas

Recovery strategy: Identify correct Zod schema → Update schema file → Regenerate type → Fix downstream usages

❌ Never fix by removing validation or marking things `any`.
✅ Always fix from the source: the schema.

---

## 📐 Code Organization

### Modularization
- Each module in `src/modules/<module>` - **Include `tenant_id` in all records**
- Large files (400+ lines) allowed if cohesive - Ideal cyclomatic complexity: < 10

### Naming
- Files: `kebab-case` - Functions: `camelCase` - Types and classes: `PascalCase`
- **Organization by domain, never by type**

### Database Structure
- Versioned migrations in `supabase/migrations/` - **All core tables have `tenant_id`**
- Mandatory Row Level Security (RLS)

---

## 🤖 When to Use AI vs Manual Development

### ✅ Yes, use AI for:
- Boilerplate and pattern repetition - Unit test generation - Refactoring based on explicit rules
- Standard CRUD and validation - Webhook integrations

### ❌ Avoid AI for:
- Critical business logic - Sensitive algorithms (scoring, cadence, round-robin)
- External integrations (Google Ads, Meta, SMTP) - Performance or specific domain knowledge

---

## 💡 "Vibe Coding" in Practice

**Fundamental principle**: We discuss the problem **before generating code**

### Mandatory Flow:
1. **Discuss** context and problem 2. **Iterate** and test together 3. **AI does not replace** technical judgment
4. **Always ask**: What is the real context? Does this behavior exist? Am I breaking conventions?

---

## 🌐 Development Commands

### Frontend (React/Vite)
```bash
npm run dev                 # Development server (127.0.0.1:8080)
npm run build              # Standard build (TypeScript + Vite)
npm run test               # Run Jest tests
npm run lint               # ESLint with TypeScript rules
npm run clean               # Clean cache and node_modules
```

### Backend (Node.js/Express)
```bash
cd backend
npm run dev                # Development with tsx watch (127.0.0.1:3001)
npm run build             # TypeScript compilation
npm run start             # Production server
npm run test              # Backend Jest tests
```

---

## ⚠️ Security Rules and Forbidden Practices

### ❌ NEVER do:
- Overwrite components without documented patch process - Use mocks in production
- Hardcode secrets, tokens, tenant identifiers, or API keys - Version real `.env` files
- Break role separation - Remove `tenant_id` from database operations - Modify test files
- Change API contracts without version bump - Alter database migrations without respecting RLS
- Remove `AIDEV-NOTE` comments without approval - Invent business logic — always ask
- **NEVER affirm that services are running without real validation**

### ✅ ALWAYS do:
- Use `process.env` for all sensitive configurations - Keep `.env.example` updated
- Include `tenant_id` in every database operation - Validate permissions by user role
- Use `supabase.auth.getUser()` for authentication - Document schema changes with migrations
- Isolate external integrations - Use Zod to validate external input

---

## 🔍 Service Validation (CRITICAL RULE)

### ❌ NEVER Assume Services Are Running
**Forbidden behavior:**
- Saying "server is running" based only on command output
- Assuming ports are accessible without testing - Reporting "success" from build commands alone

### ✅ ALWAYS Validate Services
**Required validation commands:**
```bash
# Frontend validation (must return 200, 301, or 302)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/

# Backend validation (must return 200)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health
```

**Response codes:**
- `200`, `301`, `302`: ✅ Service is working - `000`: ❌ Service not responding
- `404`: ❌ Service responding but endpoint not found - `500`: ❌ Service error

**Implementation rule:**
- Every statement about service status MUST include validation proof
- Always show curl command and response code - If validation fails, investigate before reporting success

---

## 🧠 TypeScript and React Hooks Best Practices (CRITICAL)

### ✅ ALWAYS Follow These Rules:
- **Use Context7 MCP** to read official documentation before implementing TypeScript patterns
- **TypeScript strict mode**: Always use `strict: true` and `noImplicitAny: true` seguindo documentação oficial
- **Type safety**: Nunca usar `any` - preferir `unknown` com type narrowing ou union types específicos
- **Proper hook usage**: Only call hooks at the top level of React components
- **Dependency arrays**: Always include all dependencies in useEffect, useCallback, useMemo
- **Custom hooks**: Start with `use` prefix and follow React hooks rules
- **Error boundaries**: Wrap components that might fail with proper error handling

### 🔧 Common Patterns to Follow:
```typescript
// ✅ CORRECT: Proper hook usage
const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<StateType>(initialValue);
  
  const memoizedValue = useMemo(() => {
    return expensiveCalculation(prop1);
  }, [prop1]); // ✅ All dependencies included
  
  useEffect(() => {
    // ✅ Effect logic
    return () => {
      // ✅ Cleanup logic
    };
  }, [dependency1, dependency2]); // ✅ Dependencies specified
  
  return <div>Content</div>;
};
```

### ❌ Common Mistakes to Avoid:
```typescript
// ❌ WRONG: Missing dependencies (violates exhaustive-deps rule)
useEffect(() => {
  doSomething(prop1);
}, []); // Missing prop1 dependency

// ❌ WRONG: Using any type (violates TypeScript strict mode)
const data: any = fetchData(); // Don't do this

// ✅ CORRECT: Use specific types or unknown with type guards
const data: unknown = fetchData();
if (isValidDataType(data)) {
  // Now TypeScript knows the exact type
  console.log(data.specificProperty);
}

// ❌ WRONG: Conditional hooks (violates Rules of Hooks)
if (condition) {
  useEffect(() => {}); // Don't do this
}

// ❌ WRONG: Hooks inside loops (violates Rules of Hooks)
for (let i = 0; i < items.length; i++) {
  const [state] = useState(items[i]); // Don't do this
}

// ❌ WRONG: Hooks in event handlers (violates Rules of Hooks)
function handleClick() {
  const [state] = useState(0); // Don't do this
}

// ❌ WRONG: Hooks after early return (violates Rules of Hooks)
function Component({ condition }) {
  if (condition) {
    return <div>Early return</div>;
  }
  const [state] = useState(0); // Don't do this - hook after return
}

// ❌ WRONG: Implicit any parameters (strict mode will catch this)
function processData(item) { // Missing type annotation
  return item.value;
}

// ✅ CORRECT: All hooks at top level with explicit typing
function Component({ prop1, condition }: ComponentProps): JSX.Element {
  // ✅ All hooks must be at top level, before any early returns
  const [state, setState] = useState<StateType>(initialValue);
  
  useEffect(() => {
    doSomething(prop1);
  }, [prop1]); // ✅ All dependencies included
  
  // ✅ Early returns only AFTER all hooks
  if (condition) {
    return <div>Conditional render</div>;
  }
  
  return <div>Normal render</div>;
}
```

### 🎯 Vite Configuration Best Practices:
- Always use Vite 6.x (stable version)
- Proper module resolution for TypeScript
- Correct build configuration for production
- HMR configuration for development efficiency

### 🔒 TypeScript Strict Mode Enforcement:
**This project enforces TypeScript strict mode as per official recommendations:**
- ✅ `strict: true` - Enables all strict type checking options
- ✅ `noImplicitAny: true` - Error on expressions and declarations with implied 'any' type
- ✅ `strictNullChecks: true` - Enable strict null checks
- ✅ `strictFunctionTypes: true` - Enable strict checking of function types
- ✅ `noImplicitReturns: true` - Error when not all code paths return a value

**Claude must never suggest disabling strict mode or any strict-related flags. Always fix type issues by:**
1. Adding proper type annotations
2. Using type guards for unknown types
3. Implementing proper null checking
4. Creating specific union types instead of using `any`

### 🔍 ESLint Plugin for React Hooks Enforcement:
**This project MUST use eslint-plugin-react-hooks to catch Rules of Hooks violations:**
```bash
npm install -D eslint-plugin-react-hooks
```

**Configuration in .eslintrc:**
```json
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

**Claude must never suggest suppressing these ESLint rules:**
- ❌ `// eslint-disable-next-line react-hooks/rules-of-hooks`
- ❌ `// eslint-disable-next-line react-hooks/exhaustive-deps`

**Always fix the root cause instead of suppressing the linter.**

**Before implementing any TypeScript, React hooks, or Vite configuration, Claude must use Context7 to verify current best practices and official documentation.**

---

## 🧭 Anchor Comments (AIDEV-NOTE)

Add specially formatted comments throughout the codebase to guide AI edits and serve as inline documentation.

### Prefixes and Usage:
- `AIDEV-NOTE:` — explain why code must be preserved or handled carefully
- `AIDEV-TODO:` — indicate a pending task or enhancement - `AIDEV-QUESTION:` — raise a question about logic
- `AIDEV-ANSWER:` — document reasoning behind a decision

### Guidelines:
- Keep comments concise (≤ 120 characters) - Add anchors to complex, critical, or counter-intuitive code
- Check for existing `AIDEV-*` anchors before editing - Update anchor if logic changes
- Never remove `AIDEV-NOTE`s without explicit approval

### Example:
```typescript
// AIDEV-NOTE: critical performance path — do not run DB queries here
// AIDEV-TODO: implement pagination (ticket: FEED-123)
// AIDEV-QUESTION: why is filtering done here instead of upstream?
// AIDEV-ANSWER: privacy rules may change between cache refreshes

export function DataTable({ items }: DataTableProps) {
  // ...
}
```

---

## 🧪 Testing Discipline

Tests are executable specifications that encode product intent, business logic, and safety constraints.

**Claude must NEVER generate, modify, or remove test files.**

| Area | AI Can Do | AI Must NOT Do |
|------|-----------|----------------|
| Implementation | Generate business logic | Touch test files |
| Test Planning | Suggest test scenarios | Write test code |
| Debugging | Analyze test failures | Modify test expectations |

Test files are sacred. They represent understanding of problems, edge cases, and protection against regressions.

---

## 📚 Domain Glossary
- **Lead**: A commercial contact (person or company)
- **Negócios**: A sales negotiation associated with a lead (formerly called "Pipeline")
- **Pipeline**: The sales process organized in stages (Kanban-style) - now referred to as "Negócios"
- **Cadence**: A scheduled sequence of follow-up interactions
- **Tag**: A label used to segment and categorize leads
- **MQL**: Marketing Qualified Lead - **SQL**: Sales Qualified Lead
- **Tenant**: A client company within the multi-tenant CRM - **Role**: User's permission level

---

## 🔧 System Architecture

### Current Development Status
- **Active branch**: `feature/enterprise-metrics` - **Implementing**: Enterprise metrics where 1 Lead can have multiple Opportunities
- **Model**: `leads_master` (unique people/companies) → `pipeline_leads` (opportunities)

### Multi-Tenant with Isolation
- **Basic Supabase Authentication** with `user_metadata` containing `tenant_id` and `role`
- **RLS (Row Level Security)** on all tables using `auth.uid()` patterns
- **Simplified system** without cache dependencies - **Performance** with virtualization for large datasets

### Architectural Patterns
#### Negócios System (formerly Pipeline)
- Fixed stages: `Lead` → `Ganho` / `Perdido` - Customizable fields with validation
- Distribution algorithms for assignment - Kanban drag-and-drop interface using @hello-pangea/dnd
- **Header navigation**: Access via horizontal navigation bar

#### Authentication & Authorization
- **Basic Supabase Authentication** with automatic session management
- Role-based rendering using `user.user_metadata.role` - Tenant-scoped access using `user.user_metadata.tenant_id`
- Supabase RLS enforcement with `auth.uid()` policies

#### Navigation System
- **Header horizontal**: Top-fixed navigation bar (64px height) - **Role-based menus**: Different menu items per user role
- **Responsive design**: Hamburger menu on mobile - **Integrated notifications**: Notification bell within header
- **User profile**: Avatar, role badge, and logout functionality

---

## 💾 Database Structure
- **All core tables** have `tenant_id` column - **Migrations** in `supabase/migrations/`
- **Supabase service role** for admin operations - **Lightweight system** focused on essential performance
- **FK relationships** with cascade operations - **Numbered incremental migrations**

---

## 🔍 Common Troubleshooting

### Frequent Problems
- **Build failures**: Check TypeScript errors with `npm run type-check`
- **Auth problems**: Verify Supabase session and user_metadata structure
- **Database errors**: Check Supabase connection and RLS policies

### 🔐 Authentication Troubleshooting
#### Common Auth Issues
1. **User not authenticated**
   ```typescript
   const { user } = useAuth();
   console.log('User:', user);
   console.log('Tenant ID:', user?.user_metadata?.tenant_id);
   ```

2. **Missing tenant_id in metadata**
   ```typescript
   if (!user?.user_metadata?.tenant_id) {
     console.error('Missing tenant_id in user metadata');
   }
   ```

3. **RLS policy blocking access**
   ```sql
   SELECT auth.uid(), user_metadata->>'tenant_id' 
   FROM auth.users WHERE id = auth.uid();
   ```

### Debug Tools
- **Frontend**: Browser DevTools - **Backend**: Winston logs in `backend/logs/`
- **Database**: Supabase dashboard - **API**: Network tab for request/response debugging
- **Auth**: Supabase Auth dashboard for user management

---

## 📂 Important File Locations

### Main Files
- **Main app**: `src/App.tsx` and `src/main.tsx` - **Route definitions**: `src/App.tsx`
- **API client**: `src/lib/api.ts` and `src/services/api.ts` - **Backend entry**: `backend/src/index.ts`
- **Database types**: `src/integrations/supabase/types.ts`

### Navigation and Layout
- **Main layout**: `src/components/CRMLayout.tsx` - **Header navigation**: `src/components/CRMHeader.tsx`
- **Notification system**: `src/components/NotificationCenter/NotificationCenter.tsx`
- **Dashboard**: `src/components/AppDashboard.tsx`

### Configuration
- **Environment config**: `src/config/` and `backend/src/config/`
- **Official rules**: `documentos/CLAUDE.md` and `documentos/regra-principal.md`
- **Migrations**: `supabase/migrations/`

---

## 🎯 Environment and Variables

### Required Environment Variables
Reference `.env.example` for all required variables. Never hardcode sensitive data in code.

```bash
# API Configuration
VITE_API_URL=http://127.0.0.1:3001
VITE_ENVIRONMENT=development

# Database (Supabase)
VITE_SUPABASE_URL=[reference .env.example]
VITE_SUPABASE_ANON_KEY=[reference .env.example]
SUPABASE_SERVICE_ROLE_KEY=[reference .env.example]

# Google Integration
GOOGLE_CLIENT_ID=[reference .env.example]
GOOGLE_CLIENT_SECRET=[reference .env.example]
```

---

## 📋 Development Patterns

### Component Structure
```typescript
interface ComponentProps {
  tenantId: string;
  // ... other props
}

export const Component: React.FC<ComponentProps> = ({ tenantId }) => {
  const { user } = useAuth(); // ✅ Basic Supabase Auth Hook
  
  // Hooks, State, Effects, Handlers, Render
};
```

### API Request Pattern
```typescript
// Use TanStack Query for data fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['leads', tenantId],
  queryFn: () => api.get(`/leads?tenant_id=${tenantId}`)
});
```

### Architecture Decisions
- API layer is built using **Express.js REST routes**, organized by business domain
- **Supabase** for database, authentication, and storage - **Zod** for schema validation in backend routes
- **TailwindCSS** for styling (no external CSS files) - **TanStack Query** for data fetching and caching
- All logic must respect `tenant_id` isolation and `role`-based access control

### Code Style
- Code formatting follows Prettier with 100-character max line length
- Import sorting with `simple-import-sort` - Components follow PascalCase naming
- Custom hooks prefixed with `use` - API calls written in TypeScript with typed responses

### Patterns to Follow
- Data fetching via `TanStack Query` using explicit API services
- Components receive data via props (no implicit context fetching)
- Always validate API inputs/outputs using `Zod` schemas
- All sensitive components implement error boundaries
- All operations include and respect `tenant_id` context

### What NOT to Do
- **Don't** use `useEffect` for authenticated data fetching (use React Query)
- **Don't** introduce `tRPC`, `Prisma`, or `GraphQL` — conflicts with Supabase
- **Don't** bypass type safety with `any` — prefer `unknown` + schema refinement seguindo TypeScript strict mode
- **Don't** create global state without architectural review
- **Don't** hardcode secrets, tokens, or tenant identifiers
- **Don't** violate Rules of Hooks — always call hooks at top level
- **Don't** suppress ESLint rules for react-hooks — fix the root cause instead
- **Don't** call hooks conditionally, in loops, or after early returns

---

This CRM prioritizes tenant isolation, role-based security, and modular architecture. **Always consider tenant context and user role** when implementing new features or modifying existing functionality.