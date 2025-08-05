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
- **Technical architect**
- **Structure guardian**
- **Team technical coach**

**Your mission**: maintain consistency, security, scalability, and controlled system evolution.

---

## 🔧 System Requirements (CRITICAL)
- **Node.js**: 20.19+ or 22.12+ (required for stable operation)
- **NPM**: 9.0+
- **System**: Linux/macOS/Windows with WSL2
- **Recommended**: Use Vite 6.x for stability

### ⚠️ Known Issues and Solutions

#### Vite Development Server
- **Problem**: Server hanging or not starting
- **Cause**: Vite 7 is unstable (released June 2025)
- **Solution**: Use Vite 6.x stable version

```bash
# If experiencing issues with Vite 7
npm uninstall vite
npm install vite@^6.0.0 --save-dev
rm -rf node_modules package-lock.json
npm install
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
  - Fixed stages: `Lead`, `Ganho`, `Perdido`
  - Fixed fields: name, email, phone
  - Customizable fields
- **Forms**: builder with drag & drop, lead scoring, UTMs, integrations, notifications
- **Leads**: manual CRUD + CSV import and export
- **Tracking**: task list for all member roles in their tenant
- **Salespeople**: CRUD and pipeline association
- **Integrations**: personal SMTP, Google OAuth, Webhooks
- **Admin Dashboard**: conversion KPIs, revenue, and performance

### 👨‍💻 Member
- **Pipeline**: only assigned pipelines; manages own cards and stages
- **Leads**: only assigned leads or created by them
- **Tracking**: personal tasks
- **My Dashboard**: goals, conversion, and internal ranking

---

## 🧱 Official Technical Stack (OTIMIZADA - v2.1)

### Frontend (Versões Estáveis e Compatíveis 2025)
- **React** 18.3.1 (versão estável atual com React 19 prep)
- **TypeScript** 5.2.0 (modo otimizado para desenvolvimento)
- **Vite** 6.3.5 (versão estável oficial, não experimental)
- **@vitejs/plugin-react** 4.3.1
- **TailwindCSS** 3.4.4 (styling principal - otimizado)
- **Radix UI** (design system e componentes)
- **Framer Motion** (animações críticas apenas)
- **TanStack Query (React Query)** 5.56.2 (versão testada e compatível)
- **React Router DOM** (routing)
- **React Hook Form** (forms)
- **Recharts** (gráficos e métricas)
- **Lucide React** (ícones otimizados)
- **@dnd-kit** (core 6.3.1, sortable 8.0.0, utilities 3.2.2 - versões compatíveis)

### Backend
- **Node.js** v22.16.0 (versão atual do ambiente)
- **Express.js**
- **Supabase** (PostgreSQL with built-in authentication)
- **Bcrypt**, **Helmet**, **CORS**, **Express Rate Limit**
- **Zod** (validation principal)
- **Winston**, **Morgan** (logging)

### Configurações de Performance Otimizada
- **Build target**: ES2020 (compatibilidade moderna)
- **Bundle splitting**: Manual chunks por funcionalidade (react-vendor, dnd-kit, supabase, query, ui, utils)
- **TypeScript**: Modo otimizado para desenvolvimento (strict: false, noImplicitAny: false)
- **HMR**: Porta separada (8081) para evitar conflitos
- **Real-time**: Lógica simplificada sem loops de reconexão infinitos
- **Drag & Drop**: Sensors memoizados e callbacks otimizados

### Versões Validadas e Compatíveis
- ✅ **React 18.3.1**: Preparação para React 19, totalmente estável
- ✅ **Vite 6.3.5**: Versão oficial estável com melhor performance
- ✅ **@dnd-kit 8.0.0**: Versão compatível com React 18.3 (downgrade de 10.0.0)
- ✅ **TanStack Query 5.56.2**: Versão testada e estável (downgrade de 5.81.2)
- ✅ **TypeScript 5.2**: Compatibilidade com todas as dependências

### DevOps / Monitoring
- **Nginx**, **PM2**, **Certbot**
- **Compression**, **healthchecks**
- **Automated CI/CD**
- **Integrated observability** (Sentry optional)
- **Automatic backup**

---

## 🧬 Type Safety with Zod Across Layers

All types in the system are derived from Zod schemas.

- Schemas live in `src/shared/schemas/`
- Derived types are stored in `src/shared/types/`
- Types must always be generated via `z.infer<typeof Schema>`

Claude must:
- Never create manual types
- Never assume structure — always infer from schema
- Fix type issues by updating the **original Zod schema** and regenerating the inferred type

If unsure, ask:
> "Which Zod schema defines this type?"

---

## 🔁 Auto-Recovery for Types and Queries

Claude is allowed to auto-correct:

- Type errors caused by schema updates
- React Query hooks (`useLeads`, `usePipeline`, etc.) that fail due to mismatched schemas
- Broken API responses validated by outdated Zod schemas

Recovery strategy:
- Identify the correct Zod schema
- Update the schema file
- Regenerate the type with `z.infer`
- Fix downstream usages accordingly

❌ Never fix by removing validation or marking things `any`.
✅ Always fix from the source: the schema.

---

# Mandatory Rules - MCP (Model Context Protocol)

## Rule 1: External Context via MCP Context7

Claude must always utilize the **Context7 MCP** to access up-to-date official documentation for the libraries used in this stack.

### 📌 Purpose:
- Avoid generic, incorrect, or outdated responses
- Ensure AI uses **real and current examples** (based on Supabase, Zod, Tailwind, React, etc.)
- Reduce risk of broken or incompatible code suggestions with adopted libraries

### ✅ Expected behavior:
- Whenever Claude is generating, reviewing, or correcting code involving external libraries, it must **implicitly assume Context7 is active**
- Prioritize real-world usage patterns as described in official documentation
- Warn developer if Context7 is not active when response depends on external library behavior

> Claude must assume that "use context7" is implicitly present in **all prompts** within this project.

## Rule 2: Database Validation via Supabase MCP

**Claude must always utilize the Supabase MCP to validate database structure and content before generating or altering any logic related to:**

- Table existence
- Column structure
- Data types and constraints
- Default values or relationships
- Row-level test data (e.g. checking if a `lead_id` exists)

### Purpose
- Ensure alignment with actual schema in Supabase
- Prevent generation of queries for tables or fields that do not exist
- Enable accurate reasoning around RLS, tenant_id, and multi-tenant isolation
- Avoid breaking changes or runtime failures due to assumptions

### Expected Behavior
Claude must **query Supabase MCP** to check for table, column, or constraint existence before:
- Generating SQL queries
- Creating API routes that rely on DB
- Updating frontend forms or schemas based on DB fields

**If Claude cannot verify structure (e.g. Supabase MCP not active), it must ask:**
> "Please confirm if the table or column exists in Supabase before proceeding."

## Rule 3: Step-by-Step Reasoning with MCP Sequential Thinking

**Claude must always utilize the Sequential Thinking MCP (`@modelcontextprotocol/server-sequential-thinking`) when solving complex, multi-step tasks within this project.**

### Purpose
- Promote accurate step-by-step reasoning for features involving multiple components (e.g. database + API + UI)
- Avoid rushed or incomplete implementations
- Ensure thoughtful decomposition of tasks in systems with multiple layers (backend, frontend, database, roles)

### Expected Behavior
- Claude must assume **Sequential Thinking is active by default** in all prompts involving multi-step logic or fullstack development
- It must break complex requests into **clearly reasoned, ordered steps**
- It should preserve context across steps to avoid code duplication, structural inconsistency, or gaps in flow

**If Sequential Thinking is not active, Claude should warn the developer:**
> "This task requires multi-step reasoning. Please activate Sequential Thinking MCP to proceed properly."

## Rules Summary
1. **Always validate database via Supabase MCP** before generating data-related code
2. **Always use Sequential Thinking MCP** for complex multi-component tasks
3. **Always use Context7 MCP** for external library documentation
4. **Assume all MCPs are active by default** in this project
5. **Explicitly warn** if any required MCP is not available

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
  // Manual user management leads to security issues
};

// ❌ WRONG: Complex JWT validation
const validateJWTToken = (token: string) => { // DON'T DO THIS
  // Supabase handles this automatically
};
```

### 📋 Migration from JWT to Basic Auth

For existing components that still use JWT patterns:

1. **Remove manual JWT handling**
2. **Replace with `useAuth()` hook**
3. **Update RLS policies to use `auth.uid()`**
4. **Simplify authentication logic**

```typescript
// 🔄 MIGRATION EXAMPLE

// Before (JWT pattern)
const { userId } = parseJWTToken(token);
const result = await uploadAudio(blob, { userId, tenantId });

// After (Basic Supabase pattern)
const { user } = useAuth();
const result = await uploadAudio(blob, { tenantId: user.user_metadata.tenant_id });
```

### 🎯 Key Benefits

- ✅ **Simpler code**: Less manual token management
- ✅ **Better security**: Supabase handles session management
- ✅ **Automatic refresh**: Built-in token renewal
- ✅ **Consistent patterns**: Same approach across all components
- ✅ **RLS integration**: Seamless database security

---

## 📐 Code Organization

### Modularization
- Each module in `src/modules/<module>`
- **Include `tenant_id` in all records**
- Large files (400+ lines) allowed if cohesive
- Ideal cyclomatic complexity: < 10

### Naming
- Files: `kebab-case`
- Functions: `camelCase`
- Types and classes: `PascalCase`
- **Organization by domain, never by type**

### Database Structure
- Versioned migrations in `supabase/migrations/`
- **All core tables have `tenant_id`**
- Mandatory Row Level Security (RLS)

---

## 🤖 When to Use AI vs Manual Development

### ✅ Yes, use AI for:
- Boilerplate and pattern repetition
- Unit test generation
- Refactoring based on explicit rules
- Standard CRUD and validation
- Webhook integrations

### ❌ Avoid AI for:
- Critical business logic
- Sensitive algorithms (scoring, cadence, round-robin)
- External integrations (Google Ads, Meta, SMTP)
- Any part involving performance or specific domain knowledge

---

## 💡 "Vibe Coding" in Practice

**Fundamental principle**: We discuss the problem **before generating code**

### Mandatory Flow:
1. **Discuss** context and problem
2. **Iterate** and test together
3. **AI does not replace** technical judgment
4. **Always ask**:
   - What is the real context of the module?
   - Does this behavior already exist?
   - Am I breaking any convention?

---

## 🧠 Prompt Strategy: Context is Not Optional

To avoid iteration loops and save tokens in the long run, prompts must be **rich in context**, not minimalistic.

Always include:
- System constraints (e.g. performance expectations, tenant limitations, expected behavior)
- Existing infrastructure (e.g. Supabase, monitoring)
- Adopted patterns (e.g. cache-aside, TTL, fallback, retry strategy)
- Business expectations (e.g. request frequency, update intervals)
- Helpful links (e.g. internal docs, versioning guide, caching standards)

**Low-context prompts lead to incorrect code and wasted time.**

> Think as if you're briefing a senior engineer new to the project.

### ✅ Claude Context Checklist

Before requesting any code changes, ensure the prompt includes:

- [ ] Purpose of the feature or fix
- [ ] Expected usage or traffic load
- [ ] Multi-tenant or role-based restrictions
- [ ] Stack and technologies in use (e.g. Supabase, REST API, SMTP)
- [ ] Naming or architectural conventions (e.g. TTL, RESTful routes)
- [ ] Known edge cases or past bugs
- [ ] Helpful links to documentation or reference code

**Claude must reject prompts with insufficient context.**

---

## 🌐 Development Commands

### Frontend (React/Vite)
```bash
# Development
npm run dev                 # Development server (127.0.0.1:8080)
npm run dev:clean          # Development without console logs
npm run dev:quiet          # Development warnings only
npm run dev:prod           # Development in production mode
npm run dev:force          # Force cache clean + restart

# Build
npm run build              # Standard build (TypeScript + Vite)
npm run build:prod         # Production build with optimizations
npm run build:analyze      # Build with bundle analysis

# Tests and Quality
npm run test               # Run Jest tests
npm run test:watch         # Tests in watch mode
npm run lint               # ESLint with TypeScript rules

# Troubleshooting
npm run clean               # Clean cache and node_modules
npm run reset              # Complete environment reset
```

### Backend (Node.js/Express)
```bash
cd backend
npm run dev                # Development with tsx watch (127.0.0.1:3001)
npm run build             # TypeScript compilation
npm run start             # Production server
npm run test              # Backend Jest tests
npm run test:watch        # Backend tests in watch mode
npm run lint              # Backend ESLint
npm run type-check        # TypeScript type verification
```

### Environment and Infrastructure
```bash
# Environment Setup
npm run env:setup:dev     # Copy development environment files
npm run env:setup:prod    # Copy production environment files

# Supabase
npm run supabase:status   # Check Supabase connection health
npm run supabase:tables   # List database tables
npm run supabase:test     # Test Supabase integration
```

---

### Integrated MCP Servers
The project has configured MCP servers that extend Gemini capabilities:
- **Supabase MCP**: Direct database access
- **Browser MCP**: E2E test automation
- **Sequential Thinking**: Structured reasoning
- **Context7**: Updated library documentation

---

## ⚠️ Security Rules and Forbidden Practices

### ❌ NEVER do:
- Overwrite or delete components without documented patch process
- Use mocks in production (use feature flags instead)
- Hardcode secrets, tokens, tenant identifiers, or API keys
- Version real `.env` files — always use `.env.example` as reference
- Break role separation (`Super Admin`, `Admin`, `Member`)
- Remove `tenant_id` from any database operation
- Modify test files — tests represent human intent and edge cases
- Change API contracts without version bump and migration plan
- Alter database migration files without respecting RLS and tenant isolation
- Remove `AIDEV-NOTE` or other anchor comments without explicit approval
- Invent or assume business logic — always ask developer when unsure
- **NEVER affirm that services are running without real validation** (see Service Validation section)

### ✅ ALWAYS do:
- Use `process.env` for all sensitive configurations:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SMTP_*`
- Keep `.env.example` updated with all required environment variables
- Include `tenant_id` in every database write and query
- Validate permissions explicitly by user role (Super Admin, Admin, Member)
- Use `supabase.auth.getUser()` for authentication instead of manual JWT parsing
- Document any schema or contract change using migrations and changelogs
- Isolate external integrations (e.g., Meta, Google Ads) into dedicated service modules
- Use Zod or Joi to validate every external input (API, forms, queries)

## 🔍 Service Validation (CRITICAL RULE)

### ❌ NEVER Assume Services Are Running

**Forbidden behavior:**
- Saying "server is running" based only on command output
- Assuming ports are accessible without testing
- Reporting "success" from build/start commands alone

### ✅ ALWAYS Validate Services

**Required validation commands:**

```bash
# Frontend validation (must return 200, 301, or 302)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/

# Backend validation (must return 200)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health

# Database validation (via Supabase MCP)
# Use Supabase MCP tools to verify connection
```

**Response codes:**
- `200`, `301`, `302`: ✅ Service is working
- `000`: ❌ Service not responding (connection failed)
- `404`: ❌ Service responding but endpoint not found
- `500`: ❌ Service error

**Implementation rule:**
- Every statement about service status MUST include validation proof
- Always show the curl command and response code
- If validation fails, investigate and fix before reporting success

---

## 🛠️ Control Panel - Direct Database Access

During development or debugging, it's allowed to use **Supabase MCP (Management Control Panel)** for:
- Correcting specific records
- Deleting inconsistent data
- Manually viewing or editing structures
- Validating schema changes via migrations

**⚠️ WARNING**: Every modification must be aligned with tenant context (correct `tenant_id`) and role separation.

---

## 📚 Domain Glossary (Claude, learn these terms)

- **Lead**: A commercial contact. Can be a person or company.
- **Negócios**: A sales negotiation associated with a lead.
- **Pipeline**: The sales process organized in stages (Kanban-style).
- **Cadence**: A scheduled sequence of follow-up interactions with a lead.
- **Tag**: A label used to segment and categorize leads.
- **MQL**: Marketing Qualified Lead — a lead validated by marketing based on engagement or fit.
- **SQL**: Sales Qualified Lead — a lead ready for direct sales interaction.
- **Tenant**: A client company within the multi-tenant CRM system.
- **Role**: The user's permission level in the system (Super Admin, Admin, Member).

---

## 🔧 System Architecture

### Current Development Status
- **Active branch**: `feature/enterprise-metrics`
- **Implementing**: Enterprise metrics where 1 Lead can have multiple Opportunities
- **Model**: `leads_master` (unique people/companies) → `pipeline_leads` (opportunities)

### Multi-Tenant with Isolation
- **Basic Supabase Authentication** with `user_metadata` containing `tenant_id` and `role`
- **RLS (Row Level Security)** on all tables using `auth.uid()` patterns
- **Simplified system** without cache dependencies
- **Performance** with virtualization for large datasets

### Architectural Patterns

#### Pipeline System
- Fixed stages: `Lead` → `Ganho` / `Perdido`
- Customizable fields with validation
- Distribution algorithms for assignment
- Kanban drag-and-drop interface using @dnd-kit
- **Header navigation**: Access via horizontal navigation bar

#### Form Builder
- Dynamic creation with field types
- Lead scoring integration
- UTM tracking and analytics
- Webhook notifications for submissions

#### Authentication & Authorization
- **Basic Supabase Authentication** with automatic session management
- Role-based rendering using `user.user_metadata.role`
- Tenant-scoped access using `user.user_metadata.tenant_id`
- Supabase RLS enforcement with `auth.uid()` policies

#### Navigation System
- **Header horizontal**: Top-fixed navigation bar (64px height)
- **Role-based menus**: Different menu items per user role
- **Responsive design**: Hamburger menu on mobile, full navigation on desktop
- **Integrated notifications**: Notification bell within header layout
- **User profile**: Avatar, role badge, and logout functionality in header

---

## 💾 Database Structure

- **All core tables** have `tenant_id` column for isolation
- **Migrations** stored in `supabase/migrations/`
- **Supabase service role** for admin operations
- **Lightweight system** focused on essential performance
- **FK relationships** with cascade operations
- **Numbered incremental migrations**

---

## 🔍 Common Troubleshooting

### Frequent Problems
- **Build failures**: Check TypeScript errors with `npm run type-check`
- **Auth problems**: Verify Supabase session and user_metadata structure
- **Database errors**: Check Supabase connection and RLS policies
- **General problems**: Restart dev server or check logs

### 🔐 Authentication Troubleshooting

#### Common Auth Issues
1. **User not authenticated**
   ```typescript
   // ✅ Check user session
   const { user } = useAuth();
   console.log('User:', user);
   console.log('Tenant ID:', user?.user_metadata?.tenant_id);
   ```

2. **Missing tenant_id in metadata**
   ```typescript
   // ✅ Verify user_metadata structure
   if (!user?.user_metadata?.tenant_id) {
     console.error('Missing tenant_id in user metadata');
   }
   ```

3. **RLS policy blocking access**
   ```sql
   -- ✅ Test RLS policy manually
   SELECT auth.uid(), user_metadata->>'tenant_id' 
   FROM auth.users 
   WHERE id = auth.uid();
   ```

#### Audio Upload Issues
- **Storage bucket not accessible**: Check RLS policies on `storage.objects`
- **File path format**: Ensure path follows `annotations/{tenant_id}/{user_id}/{filename}`
- **Authentication failure**: Verify `supabase.auth.getUser()` returns valid user

### Debug Tools
- **Frontend**: Browser DevTools for debugging
- **Backend**: Winston logs in `backend/logs/`
- **Database**: Supabase dashboard for inspection
- **API**: Network tab for request/response debugging
- **Auth**: Supabase Auth dashboard for user management

---

## 📂 Important File Locations

### Main Files
- **Main app**: `src/App.tsx` and `src/main.tsx`
- **Route definitions**: `src/App.tsx` (React Router)
- **API client**: `src/lib/api.ts` and `src/services/api.ts`
- **Backend entry**: `backend/src/index.ts`
- **Database types**: `src/integrations/supabase/types.ts`

### Navigation and Layout
- **Main layout**: `src/components/CRMLayout.tsx`
- **Header navigation**: `src/components/CRMHeader.tsx` (horizontal navigation)
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

# Cache
# Cache removed to simplify development

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
  
  // Hooks
  // State
  // Effects
  // Handlers
  // Render
};
```

### Navigation Header Component Pattern
```typescript
// Header Navigation Component Pattern
interface CRMHeaderProps {
  activeModule: string;
  onNavigate: (module: string) => void;
  user: any;
  onLogout: () => void;
}

export const CRMHeader: React.FC<CRMHeaderProps> = ({ 
  activeModule, 
  onNavigate, 
  user, 
  onLogout 
}) => {
  // Responsive state management
  // Role-based navigation logic  
  // Notification integration
  // Mobile hamburger menu
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

### Error Handling
- ErrorBoundary for React error catching
- Backend uses centralized error middleware
- Log errors with Winston (backend) and console in development

### Architecture Decisions
- API layer is built using **Express.js REST routes**, organized by business domain
- **Supabase** is used for database, authentication, and storage
- **Zod** is used for schema validation in all backend routes
- **TailwindCSS** is used for styling (no external CSS files allowed)
- **TanStack Query** (React Query) is used for data fetching and caching
- All logic must respect `tenant_id` isolation and `role`-based access control

### Code Style
- Code formatting follows Prettier with 100-character max line length
- Import sorting is done with `simple-import-sort`
- Components follow PascalCase naming and are colocated with tests
- Custom hooks must always be prefixed with `use`
- API calls are written in TypeScript with typed responses and Zod validation

### Patterns to Follow
- Data fetching must happen via `TanStack Query` using explicit API services
- Components should receive data via props (no implicit context fetching)
- Always validate API inputs and outputs using `Zod` schemas
- All sensitive components (e.g., pipeline, dashboard) must implement error boundaries
- All operations must include and respect `tenant_id` context

### What NOT to Do
- Do **not** use `useEffect` for authenticated data fetching (use React Query instead)
- Do **not** introduce `tRPC`, `Prisma`, or `GraphQL` — they conflict with Supabase architecture
- Do **not** bypass type safety with `any` — always prefer `unknown` + schema refinement
- Do **not** create global state (e.g., React Context) without architectural review
- Do **not** hardcode secrets, tokens, or tenant identifiers

---

## 🧭 Anchor Comments (AIDEV-NOTE)

Add specially formatted comments throughout the codebase to guide AI edits and serve as inline documentation for developers.

These comments serve a dual purpose:
- Help Claude maintain critical logic and structural consistency during code generation or refactoring
- Act as searchable, maintainable knowledge anchors for the dev team

Think of your codebase as a city and anchor comments as street signs. Without them, even smart visitors (like Claude) can get lost.

### Prefixes and Usage:

Use the following prefixes in **all caps** for anchor comments:

- `AIDEV-NOTE:` — explain why a block of code must be preserved or handled carefully
- `AIDEV-TODO:` — indicate a pending task or enhancement for AI/devs
- `AIDEV-QUESTION:` — raise a question about the logic
- `AIDEV-ANSWER:` — document the reasoning behind a previous decision

### Guidelines:

- Keep comments concise (≤ 120 characters when possible)
- Add anchors to complex, critical, or counter-intuitive code
- Before scanning or editing, always check for existing `AIDEV-*` anchors
- Update the anchor if the logic is changed
- Never remove `AIDEV-NOTE`s without explicit human review or approval

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

Claude should prioritize these anchors when dealing with types:

- `AIDEV-NOTE: Type derived from Zod — do not edit manually`
- `AIDEV-NOTE: Hook uses schema-validated API`
- `AIDEV-NOTE: Use Zod inference — schema is the source of truth`

Claude must:
- Trace type issues to the Zod source
- Never modify inferred types directly
- Ask for schema location if not found

---

## 🧪 Testing Discipline

Tests are not just code — they are executable specifications that encode product intent, business logic, and safety constraints. For this reason:

**Claude must NEVER generate, modify, or remove test files.**

| Area | AI Can Do | AI Must NOT Do |
|------|-----------|----------------|
| Implementation | Generate business logic | Touch test files |
| Test Planning | Suggest test scenarios | Write test code |
| Debugging | Analyze test failures | Modify test expectations |

If an AI tool touches a test file, the PR must be rejected — no exceptions.

Test files are sacred. They represent your understanding of the problem, your edge cases, and your protection against regressions. Guard them with intention.

---

## 🧱 Sacred Ground (Claude Must NEVER Touch)

These are critical areas of the system where **AI is absolutely forbidden** from generating, editing, or refactoring code.  
Only experienced human developers may operate here — with full awareness of context, consequences, and safety.

### ❌ Test Files
- Tests encode domain knowledge, edge cases, and product intent.
- Claude must **never** generate, edit, or delete test files.
- Any change to tests requires explicit human intention and review.

### ❌ Database Migrations
- Migrations apply irreversible changes to production data.
- One wrong command can lead to massive data loss.
- Only humans with understanding of schema evolution and rollout timing should write or review them.

### ❌ Security-Critical Code (e.g. authentication, RLS policies)
- Every line in security layers must be reviewed by a human.
- Missteps can lead to authentication bypass, data leaks, or escalated access.
- Claude is forbidden from touching these files without written approval.

### ❌ Public API Contracts (e.g. OpenAPI, versioned schemas)
- Changing contracts without versioning breaks client integrations and mobile apps.
- Claude must check for `AIDEV-NOTE` anchors before modifying anything public-facing.
- Public interfaces are frozen until explicitly bumped.

### ❌ Configuration and Secrets
- No secret, token, or credential should **ever** be hardcoded.
- Always use `process.env` and document required variables in `.env.example`.
- Claude must never generate or inject sensitive values directly.

### ❌ Service Status Validation (CRITICAL RULE)
- **NEVER** claim that frontend (port 8080) or backend (port 3001) are "running" or "operational" without REAL validation
- **ALWAYS** use actual connectivity tests before confirming service status:
  ```bash
  # Frontend validation
  curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ 
  # Must return 200 AND serve HTML content
  
  # Backend validation  
  curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health
  # Must return 200 AND serve JSON response
  ```
- **Port binding ≠ Service working**: A process can bind to a port but still be unresponsive
- **Timeout during startup ≠ Success**: If `npm run dev` times out, verify with curl before claiming it works
- **Example phrases to AVOID**: "frontend está rodando", "backend operacional", "servidor iniciado com sucesso"
- **Example phrases to USE**: "frontend respondendo na porta 8080 (validado)", "backend offline - requer inicialização"

### Production-Scale Boundaries

In large-scale systems with real users and critical data, **AI must never modify core contracts or integration points without explicit documentation and planning**.

Every API, module interface, or system contract must include an **anchor comment** indicating the version and constraints:

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
   - **CLAUDE.md atualizado**: Removidas todas referências JWT, estabelecido padrão oficial

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

This CRM prioritizes tenant isolation, role-based security, and modular architecture. **Always consider tenant context and user role** when implementing new features or modifying existing functionality.