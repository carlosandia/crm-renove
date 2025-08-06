# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## 🧬 Multi-Tenant Structure (IMMUTABLE)

### 👥 Roles and Permissions
| Role | Key Responsibilities |
|------|---------------------|
| **Super Admin** | Creates companies, Admins, global integrations, multi-tenant reports |
| **Admin** | Manages members, leads, forms, cadences, pipelines, and local dashboards |
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
- **Feedback**: inbox of messages from Admins/Members from pipeline cards
- **Updates**: changelog + popup on first login for admin and member roles
- **Settings**: global integrations (master SMTP, Google Calendar)
- **Reports**: consolidated view by tenant, channel, and revenue

### 🧑‍💼 Admin
- **Pipeline**: wizard (Basic → Stages → Fields → Distribution → Cadence)
  - Fixed stages: `Lead`, `Ganho`, `Perdido` - Fixed fields: name, email, phone - Customizable fields
- **Forms**: builder with drag & drop, lead scoring, UTMs, integrations, notifications
- **Leads**: manual CRUD + CSV import and export
- **Tracking**: task list for all member roles in their tenant
- **Salespeople**: CRUD and pipeline association
- **Integrations**: personal SMTP, Google OAuth, Webhooks
- **Admin Dashboard**: conversion KPIs, revenue, and performance

### 👨‍💻 Member
- **Pipeline**: only assigned pipelines; manages own cards and stages
- **Leads**: only assigned leads or created by them
- **Tracking**: personal tasks - **My Dashboard**: goals, conversion, and internal ranking

---

## 🧱 Official Technical Stack (OTIMIZADA - v2.1)

### Frontend (Versões Estáveis e Compatíveis 2025)
- **React** 18.3.1, **TypeScript** 5.2.0, **Vite** 6.3.5, **@vitejs/plugin-react** 4.3.1
- **TailwindCSS** 3.4.4, **Radix UI**, **Framer Motion**, **TanStack Query** 5.56.2
- **React Router DOM**, **React Hook Form**, **Recharts**, **Lucide React**
- **@dnd-kit** (core 6.3.1, sortable 8.0.0, utilities 3.2.2 - versões compatíveis)

### Backend
- **Node.js** v22.16.0, **Express.js**, **Supabase** (PostgreSQL with built-in authentication)
- **Bcrypt**, **Helmet**, **CORS**, **Express Rate Limit**, **Zod**, **Winston**, **Morgan**

### Configurações de Performance Otimizada
- **Build target**: ES2020 - **Bundle splitting**: Manual chunks por funcionalidade
- **TypeScript**: Modo otimizado (strict: false, noImplicitAny: false)
- **HMR**: Porta separada (8081) - **Real-time**: Lógica simplificada
- **Drag & Drop**: Sensors memoizados e callbacks otimizados

### DevOps / Monitoring
- **Nginx**, **PM2**, **Certbot**, **Compression**, **healthchecks**
- **Automated CI/CD**, **Integrated observability**, **Automatic backup**

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

# Mandatory Rules - MCP (Model Context Protocol)

## Rule 1: External Context via MCP Context7
Claude must always utilize the **Context7 MCP** to access up-to-date official documentation for the libraries used in this stack.

### 📌 Purpose:
- Avoid generic, incorrect, or outdated responses
- Ensure AI uses **real and current examples** (based on Supabase, Zod, Tailwind, React, etc.)
- Reduce risk of broken or incompatible code suggestions

### ✅ Expected behavior:
- Whenever generating/reviewing/correcting code involving external libraries, **assume Context7 is active**
- Prioritize real-world usage patterns as described in official documentation
- Warn developer if Context7 is not active when response depends on external library behavior

## Rule 2: Database Validation via Supabase MCP
**Claude must always utilize the Supabase MCP to validate database structure and content before generating or altering any logic related to:**
- Table existence - Column structure - Data types and constraints - Default values or relationships - Row-level test data

### Purpose
- Ensure alignment with actual schema in Supabase
- Prevent generation of queries for tables or fields that do not exist
- Enable accurate reasoning around RLS, tenant_id, and multi-tenant isolation

### Expected Behavior
Claude must **query Supabase MCP** before: generating SQL queries, creating API routes, updating frontend forms

**If Claude cannot verify structure, it must ask:**
> "Please confirm if the table or column exists in Supabase before proceeding."

## Rule 3: Step-by-Step Reasoning with MCP Sequential Thinking
**Claude must utilize Sequential Thinking MCP when solving complex, multi-step tasks.**

### Purpose
- Promote accurate step-by-step reasoning for features involving multiple components
- Avoid rushed or incomplete implementations
- Ensure thoughtful decomposition of tasks in systems with multiple layers

### Expected Behavior
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

### 📋 Migration from JWT to Basic Auth
For existing components that still use JWT patterns:
1. **Remove manual JWT handling** 2. **Replace with `useAuth()` hook** 3. **Update RLS policies to use `auth.uid()`** 4. **Simplify authentication logic**

### 🎯 Key Benefits
- ✅ **Simpler code** - ✅ **Better security** - ✅ **Automatic refresh** - ✅ **Consistent patterns** - ✅ **RLS integration**

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

## 🧠 Prompt Strategy: Context is Not Optional

To avoid iteration loops and save tokens, prompts must be **rich in context**, not minimalistic.

Always include:
- System constraints - Existing infrastructure - Adopted patterns - Business expectations - Helpful links

**Low-context prompts lead to incorrect code and wasted time.**

### ✅ Claude Context Checklist
Before requesting any code changes, ensure the prompt includes:
- [ ] Purpose of the feature or fix - [ ] Expected usage or traffic load - [ ] Multi-tenant or role-based restrictions
- [ ] Stack and technologies in use - [ ] Naming or architectural conventions - [ ] Known edge cases or past bugs
- [ ] Helpful links to documentation

**Claude must reject prompts with insufficient context.**

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

### Integrated MCP Servers
- **Supabase MCP**: Direct database access - **Browser MCP**: E2E test automation
- **Sequential Thinking**: Structured reasoning - **Context7**: Updated library documentation

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

## 🛠️ Control Panel - Direct Database Access

During development or debugging, it's allowed to use **Supabase MCP** for:
- Correcting specific records - Deleting inconsistent data - Viewing/editing structures - Validating schema changes

**⚠️ WARNING**: Every modification must be aligned with tenant context and role separation.

---

## 📚 Domain Glossary
- **Lead**: A commercial contact (person or company)
- **Negócios**: A sales negotiation associated with a lead
- **Pipeline**: The sales process organized in stages (Kanban-style)
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
#### Pipeline System
- Fixed stages: `Lead` → `Ganho` / `Perdido` - Customizable fields with validation
- Distribution algorithms for assignment - Kanban drag-and-drop interface using @dnd-kit
- **Header navigation**: Access via horizontal navigation bar

#### Form Builder
- Dynamic creation with field types - Lead scoring integration
- UTM tracking and analytics - Webhook notifications for submissions

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

#### Audio Upload Issues
- **Storage bucket not accessible**: Check RLS policies on `storage.objects`
- **File path format**: Ensure path follows `annotations/{tenant_id}/{user_id}/{filename}`
- **Authentication failure**: Verify `supabase.auth.getUser()` returns valid user

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
```bash
# API Configuration
VITE_API_URL=http://127.0.0.1:3001
VITE_ENVIRONMENT=development

# Database (Supabase)
VITE_SUPABASE_URL=https://marajvabdwkpgopytvhh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY

# Google Integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
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
- **Don't** bypass type safety with `any` — prefer `unknown` + schema refinement
- **Don't** create global state without architectural review
- **Don't** hardcode secrets, tokens, or tenant identifiers

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

### Anchor Comments for Type Safety
- `AIDEV-NOTE: Type derived from Zod — do not edit manually`
- `AIDEV-NOTE: Hook uses schema-validated API` - `AIDEV-NOTE: Use Zod inference — schema is source of truth`

Claude must: Trace type issues to Zod source, Never modify inferred types directly, Ask for schema location if not found

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

## 🧱 Sacred Ground (Claude Must NEVER Touch)

Critical areas where **AI is absolutely forbidden** from generating, editing, or refactoring code.

### ❌ Test Files
- Tests encode domain knowledge, edge cases, and product intent
- Claude must **never** generate, edit, or delete test files
- Any change to tests requires explicit human intention and review

### ❌ Database Migrations
- Migrations apply irreversible changes to production data - One wrong command can lead to massive data loss
- Only humans with understanding of schema evolution should write them

### ❌ Security-Critical Code (authentication, RLS policies)
- Every line in security layers must be reviewed by a human
- Missteps can lead to authentication bypass, data leaks, or escalated access
- Claude is forbidden from touching these files without written approval

### ❌ Public API Contracts (OpenAPI, versioned schemas)
- Changing contracts without versioning breaks client integrations
- Claude must check for `AIDEV-NOTE` anchors before modifying public-facing code
- Public interfaces are frozen until explicitly bumped

### ❌ Configuration and Secrets
- No secret, token, or credential should **ever** be hardcoded
- Always use `process.env` and document required variables in `.env.example`
- Claude must never generate or inject sensitive values directly

### ❌ Service Status Validation (CRITICAL RULE)
- **NEVER** claim that frontend (port 8080) or backend (port 3001) are "running" without REAL validation
- **ALWAYS** use actual connectivity tests before confirming service status:
  ```bash
  # Frontend validation - must return 200 AND serve HTML content
  curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ 
  
  # Backend validation - must return 200 AND serve JSON response
  curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health
  ```
- **Port binding ≠ Service working**: Process can bind to port but still be unresponsive
- **Timeout during startup ≠ Success**: If `npm run dev` times out, verify with curl
- **Avoid phrases**: "frontend está rodando", "backend operacional", "servidor iniciado com sucesso"
- **Use phrases**: "frontend respondendo na porta 8080 (validado)", "backend offline - requer inicialização"

### Production-Scale Boundaries
In large-scale systems, **AI must never modify core contracts or integration points without explicit documentation.**

Every API, module interface, or system contract must include **anchor comment** indicating version and constraints:

```typescript
// AIDEV-NOTE: API Contract Boundary - v1.4.2
// DO NOT change without migration plan and version bump
// See: docs/api-versioning.md
```

---

## 📋 Histórico de Correções (Sistema de Logs e Performance)

### 🔧 Implementações Realizadas em 2025-01-26

#### ✅ Correções Críticas de API
1. **Erro 500 no GET /api/cadence/load/{pipeline_id}**
   - **Problema**: Incompatibilidade entre política RLS e metadados de usuário
   - **Solução**: Sistema de fallback robusto para service_role quando RLS falha + filtro explícito por `tenant_id`

2. **Erro 401 no POST /api/cadence/generate-task-instances**  
   - **Problema**: Validação inadequada de metadados do usuário autenticado
   - **Solução**: Verificação robusta de `req.user` + validação de permissões por role

#### ✅ Sistema de Logger Centralizado
- **Frontend**: `src/utils/logger.ts` com throttling, agrupamento e data masking LGPD
- **Backend**: `backend/src/utils/logger.ts` com Winston, correlation IDs e security masking
- **Especialização**: Loggers específicos para `leadTasks`, `leadCardBadge`, `apiError`, `performance`

#### ✅ Redução de Logs Excessivos  
- **useLeadTasksForCard**: Throttling de 2s, redução de 90% no spam de console
- **LeadCardPresentation**: Substituição de console.log por logger estruturado com throttling
- **Endpoints Backend**: Logs estruturados com correlation IDs e masking de dados sensíveis

#### ✅ Melhorias de Performance
- **Query caching**: Aumento de staleTime para 2 minutos, gcTime para 10 minutos
- **Throttling inteligente**: Sistema global de mutex com delays escalonados
- **Logger otimizado**: Agrupamento de logs similares com flush automático a cada 3s

#### ✅ Refatoração Autenticação de Áudio (2025-08-03)
3. **Sistema de Áudio - Migração para Autenticação Básica Supabase**
   - **Problema**: Sistema de áudio usando JWT manual com complexidade desnecessária
   - **Solução**: Refatoração completa para autenticação básica Supabase
   - **Arquivos alterados**: 
     - `src/utils/audioUpload.ts` - Removido `userId` parameter, adicionado `supabase.auth.getUser()`
     - `src/components/Annotations/SimpleAnnotationEditor.tsx` - Atualizado para padrão básico
     - Políticas RLS migradas de JWT para `auth.uid()` pattern
   - **CLAUDE.md atualizado**: Removidas referências JWT, estabelecido padrão oficial

### 🎯 Benefícios Implementados
- ✅ APIs de cadência nunca mais retornam 500/401 por problemas de auth
- ✅ Console limpo com 90% menos spam de logs em desenvolvimento  
- ✅ Debugging melhorado com correlation IDs e contexto estruturado
- ✅ Compliance LGPD/GDPR com masking automático de dados sensíveis
- ✅ Performance otimizada com throttling e cache inteligente
- ✅ **Sistema de áudio com autenticação básica Supabase implementado**
- ✅ **Documentação CLAUDE.md atualizada com padrão oficial de autenticação**

### 📊 Métricas de Impacto
- **Logs de console**: Redução de ~500 logs/min para ~50 logs/min
- **API reliability**: 0% de erros 500/401 em cadência
- **Developer experience**: Logs estruturados e filtráveis
- **Compliance**: 100% de dados sensíveis mascarados em produção

---

## 🚀 Configurações de Produção (AMBIENTE HOSTINGER)

### 📡 Servidor de Produção
- **IP**: `168.231.99.133` - **SO**: Ubuntu 20.04 LTS - **Usuário**: `root` - **Senha**: `Carlos455460@`
- **Domínio**: `crm.renovedigital.com.br`

### 🔐 Acesso SSH
```bash
# Conectar via SSH
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133

# Comando direto para executar ações
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133 "comando"
```

### 📂 Estrutura de Deploy
```bash
/var/www/crm/                 # Diretório principal do projeto
├── backend/                  # Backend Node.js/Express
│   ├── .env                  # Configurações de produção
│   ├── src/                  # Código fonte backend
│   └── node_modules/         # Dependências backend
├── assets/                   # Assets estáticos do frontend
├── index.html                # Frontend principal (SPA)
├── .env                      # Configurações frontend
└── [outros arquivos build]   # Build completo do Vite
```

### ⚙️ Serviços Configurados
#### Nginx (Frontend)
- **Status**: ✅ Ativo e funcionando - **Config**: `/etc/nginx/sites-available/crm`
- **Porta**: 80 (HTTP) + SSL/HTTPS - **Função**: Serve arquivos estáticos + proxy reverso para API

#### PM2 (Backend)
- **Status**: ✅ Ativo (crm-backend) - **Porta**: 3001 (interno) - **Processo**: Node.js/Express rodando via PM2

#### SSL/HTTPS
- **Status**: ✅ Certificado ativo - **URL**: https://crm.renovedigital.com.br

### 🌐 Comandos de Deploy

#### Deploy Completo
```bash
# 1. Build local
npm run build:prod

# 2. Enviar arquivos via SCP
sshpass -p 'Carlos455460@' scp -r dist/* root@168.231.99.133:/var/www/crm/

# 3. Atualizar backend (se necessário)
sshpass -p 'Carlos455460@' scp -r backend/* root@168.231.99.133:/var/www/crm/backend/

# 4. Reiniciar serviços
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133 "
cd /var/www/crm/backend && npm install --production
pm2 restart crm-backend
systemctl reload nginx
"
```

#### Deploy Apenas Frontend
```bash
npm run build:prod
sshpass -p 'Carlos455460@' scp -r dist/* root@168.231.99.133:/var/www/crm/
```

#### Deploy Apenas Backend
```bash
sshpass -p 'Carlos455460@' scp -r backend/* root@168.231.99.133:/var/www/crm/backend/
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133 "
cd /var/www/crm/backend && npm install --production && pm2 restart crm-backend
"
```

### 🔧 Comandos de Monitoramento

#### Verificar Status dos Serviços
```bash
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133 "
echo '📊 Status dos serviços:'
systemctl status nginx --no-pager | head -3
pm2 list
pm2 logs crm-backend --lines 10
"
```

#### Testar Conectividade
```bash
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133 "
curl -s -o /dev/null -w 'Frontend: %{http_code}\n' https://crm.renovedigital.com.br
curl -s -o /dev/null -w 'Backend: %{http_code}\n' http://127.0.0.1:3001/health
"
```

### 🛠️ Comandos de Manutenção

#### Logs e Debugging
```bash
# Ver logs do backend
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133 "pm2 logs crm-backend"

# Ver logs do Nginx
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133 "tail -f /var/log/nginx/access.log"

# Verificar recursos do sistema
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133 "free -h && df -h"
```

#### Reinicialização de Serviços
```bash
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133 "
pm2 restart crm-backend        # Reiniciar backend
systemctl restart nginx       # Reiniciar Nginx
systemctl reload nginx        # Recarregar config Nginx (sem parar)
"
```

### 📋 Variáveis de Ambiente de Produção

#### Backend (.env)
```bash
NODE_ENV=production
PORT=3001
HOST=127.0.0.1

# Supabase
VITE_SUPABASE_URL=https://marajvabdwkpgopytvhh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY

# URLs
VITE_API_URL=https://crm.renovedigital.com.br/api
VITE_FRONTEND_URL=https://crm.renovedigital.com.br
APP_URL=https://crm.renovedigital.com.br

# Autenticação removida - usando apenas Basic Supabase Authentication
```

### 🚨 Procedimento de Deploy de Emergência

```bash
# 1. Backup antes do deploy
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133 "
cd /var/www/
tar -czf crm-backup-\$(date +%Y%m%d-%H%M%S).tar.gz crm/
"

# 2. Deploy completo
npm run build:prod
sshpass -p 'Carlos455460@' scp -r dist/* root@168.231.99.133:/var/www/crm/
sshpass -p 'Carlos455460@' scp -r backend/* root@168.231.99.133:/var/www/crm/backend/

# 3. Reiniciar tudo
sshpass -p 'Carlos455460@' ssh -o StrictHostKeyChecking=no root@168.231.99.133 "
cd /var/www/crm/backend
npm install --production
pm2 restart crm-backend
systemctl reload nginx
echo '✅ Deploy concluído!'
"

# 4. Validar
curl -I https://crm.renovedigital.com.br
```

### 📊 Status Atual do Ambiente (Validado em 06/08/2025)
- ✅ **SSH**: Conectividade confirmada - ✅ **Nginx**: Ativo e servindo HTTPS
- ✅ **Backend PM2**: Ativo (PID 200101) - ✅ **Frontend**: Respondendo (HTTP 200)
- ✅ **API**: Respondendo (HTTP 200 em /health) - ✅ **Domínio**: crm.renovedigital.com.br funcionando
- ✅ **SSL**: Certificado ativo - ✅ **Recursos**: 6.9GB RAM disponível, 94GB disco livre

---

This CRM prioritizes tenant isolation, role-based security, and modular architecture. **Always consider tenant context and user role** when implementing new features or modifying existing functionality.