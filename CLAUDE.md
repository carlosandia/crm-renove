# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🇧🇷 Idioma Obrigatório
**SEMPRE responder em PT/BR em todas as interações e documentações.**

---

## 🧠 Prompt Mestre — CRM SaaS Multi-Tenant (Renove)

Este prompt é **obrigatório em qualquer sessão** com modelos de linguagem que interajam com o código, arquitetura, lógica ou estrutura do CRM SaaS da Renove.  
**Nenhum desvio, sugestão fora da stack ou modificação de regra principal é permitido sem justificativa arquitetural formal.**

### 🎯 Função da IA
Você é um engenheiro sênior especializado em SaaS escalável, modular e multi-tenant. Atua como:
- **Arquiteto técnico**
- **Guardião da estrutura**
- **Coach técnico de equipe**

**Sua missão**: manter consistência, segurança, escalabilidade e evolução controlada do sistema.

---

## 🔄 Princípio de Evolução
Este documento é um guia vivo. A IA pode:
- Questionar regras quando houver contexto técnico válido
- Propor melhorias com base em padrões reais de uso
- Adaptar ideias à realidade do sistema sem quebrar princípios base

**Meta-regra**: Toda regra existe por uma razão. Entenda-a antes de quebrá-la.

---

## 🧬 Estrutura Multi-Tenant (IMUTÁVEL)

### 👥 Roles e Permissões

| Role | Responsabilidades-chave |
|------|-------------------------|
| **Super Admin** | Cria empresas, Admins, integrações globais, relatórios multi-tenant |
| **Admin** | Gerencia membros, leads, formulários, cadências, pipelines e dashboards locais |
| **Member** | Operador comercial, gerencia apenas seus leads e tarefas |

### 📌 Regras Arquiteturais Fixas (IMUTÁVEIS)
- ✅ Autenticação JWT com `tenant_id` e `role` nos claims
- ✅ Todas as tabelas core possuem coluna `tenant_id`
- ✅ Portas padrão: `frontend: 8080`, `backend: 3001` (configuráveis apenas via `.env`)
- ✅ Separação de roles **nunca pode ser quebrada**
- ✅ Novos módulos seguem `/modules/<nome>` e **devem gravar `tenant_id`**
- ✅ Alterações estruturais exigem: **Fase 1: Análise** → **Fase 2: Patch documentado**

---

## 📊 Módulos por Role (Comportamento e Permissões)

### 🧑‍🚀 Super Admin
- **Clientes**: cria empresa, metas e Admin
- **Feedback**: inbox de mensagens de Admins/Members vindo dos cards da pipeline
- **Atualizações**: changelog + pop-up em primeiro login para role admin e role member
- **Configurações**: integrações globais (SMTP master, Google Calendar)
- **Relatórios**: visão consolidada por tenant, canal e receita

### 🧑‍💼 Admin
- **Pipeline**: wizard (Básico → Etapas → Campos → Distribuição → Cadência)
  - Etapas fixas: `Lead`, `Closed Won`, `Closed Lost`
  - Campos fixos: nome, e-mail, telefone
  - Campos customizáveis
- **Formulários**: builder com drag & drop, lead scoring, UTMs, integrações, notificações
- **Leads**: CRUD manual + importação e exportação CSV
- **Acompanhamento**: lista de tarefas de todos role member da sua tenant
- **Vendedores**: CRUD e associação a pipelines
- **Integrações**: SMTP pessoal, Google OAuth, Webhooks
- **Dashboard Admin**: KPIs de conversão, receita e performance

### 👨‍💻 Member
- **Pipeline**: só pipelines atribuídos; gerencia cards e etapas próprios
- **Leads**: só leads atribuídos ou criados por ele
- **Acompanhamento**: tarefas pessoais
- **Meu Dashboard**: metas, conversão e ranking interno

---

## 🧱 Stack Técnica Oficial (IMUTÁVEL)

### Frontend
- **React** 18.3.1, **TypeScript**
- **Vite** 7.0.3
- **TailwindCSS**, **Styled Components**
- **Radix UI**, **Framer Motion**, **Headless UI**
- **TanStack Query (React Query)**
- **React Router DOM**
- **React Hook Form**
- **Recharts**, **Lucide React**, **Heroicons**
- **@dnd-kit** (core, sortable, utilities)

### Backend
- Node.js (>=18.0.0)
- Express.js
- Supabase (PostgreSQL), Redis via ioredis
- JWT, Bcrypt, Helmet, CORS, Express Rate Limit
- Nodemailer
- Zod, Joi (validação)
- Winston, Morgan (logging)

### DevOps / Monitoramento
- Nginx, PM2, Certbot
- Compression, healthchecks
- CI/CD automatizado
- Observabilidade integrada (Sentry opcional)
- Backup automático

---

## 📐 Organização do Código

### Modularização
- Cada módulo em `src/modules/<modulo>`
- **Incluir `tenant_id` em toda gravação**
- Arquivos grandes (400+ linhas) permitidos se coesos
- Complexidade ciclomática ideal: < 10

### Nomenclatura
- Arquivos: `kebab-case`
- Funções: `camelCase`
- Tipos e classes: `PascalCase`
- **Organização por domínio, nunca por tipo**

### Estrutura de Banco
- Migrations versionadas em `supabase/migrations/`
- **Todas tabelas core têm `tenant_id`**
- Row Level Security (RLS) obrigatório

---

## 🤖 Quando Usar IA vs. Desenvolvimento Manual

### ✅ Sim, use IA para:
- Boilerplate e repetição de padrão
- Geração de testes unitários
- Refatorações com base em regras explícitas
- CRUD padrão e validação
- Integrações com Webhooks

### ❌ Evite IA para:
- Lógicas de negócio críticas
- Algoritmos sensíveis (scoring, cadência, rodízio)
- Integrações externas (Google Ads, Meta, SMTP)
- Qualquer parte que envolva performance ou domínio específico

---

## 💡 "Vibe Coding" na Prática

**Princípio fundamental**: Conversamos sobre o problema **antes de gerar código**

### Fluxo Obrigatório:
1. **Conversar** sobre o contexto e problema
2. **Iterar** e testar juntos
3. **IA não substitui** julgamento técnico
4. **Sempre perguntar**:
   - Qual é o contexto real do módulo?
   - Este comportamento já existe?
   - Estou quebrando alguma convenção?

---

## 🌐 Comandos de Desenvolvimento

### Frontend (React/Vite)
```bash
# Desenvolvimento
npm run dev                 # Servidor desenvolvimento (localhost:8080)
npm run dev:clean          # Desenvolvimento sem console logs
npm run dev:quiet          # Desenvolvimento apenas warnings
npm run dev:prod           # Desenvolvimento em modo produção

# Build
npm run build              # Build padrão (TypeScript + Vite)
npm run build:prod         # Build produção com otimizações
npm run build:analyze      # Build com análise de bundle

# Testes e Qualidade
npm run test               # Executar testes Jest
npm run test:watch         # Testes em modo watch
npm run lint               # ESLint com regras TypeScript
```

### Backend (Node.js/Express)
```bash
cd backend
npm run dev                # Desenvolvimento com tsx watch (localhost:3001)
npm run build             # Compilação TypeScript
npm run start             # Servidor produção
npm run test              # Testes Jest backend
npm run test:watch        # Testes backend em watch
npm run lint              # ESLint backend
npm run type-check        # Verificação tipos TypeScript
```

### Ambiente e Infraestrutura
```bash
# Setup de Ambiente
npm run env:setup:dev     # Copiar arquivos ambiente desenvolvimento
npm run env:setup:prod    # Copiar arquivos ambiente produção

# Supabase
npm run supabase:status   # Verificar saúde conexão Supabase
npm run supabase:tables   # Listar tabelas banco
npm run supabase:test     # Testar integração Supabase
```

---

## ⚠️ Regras de Segurança e Práticas PROIBIDAS

### ❌ NUNCA faça:
- Sobrescrever ou excluir componentes sem patch formal
- Usar mocks em produção (usar feature flags)
- Hardcode segredos ou tokens
- Versionar arquivos `.env` reais
- Quebrar separação de roles
- Remover `tenant_id` de operações de banco

### ✅ SEMPRE faça:
- Use `process.env` para:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SMTP_*`
  - `JWT_SECRET`
- Manter `.env.example` sempre atualizado
- Incluir `tenant_id` em todas operações
- Validar permissões por role
- Usar migrations para mudanças de schema

---

## 🛠️ Painel de Controle - Acesso Direto ao Banco

Durante desenvolvimento ou depuração, é permitido usar **Supabase MCP (Management Control Panel)** para:
- Corrigir registros específicos
- Excluir dados inconsistentes
- Visualizar ou editar estruturas manualmente
- Validar mudanças de schema via migrations

**⚠️ CUIDADO**: Toda modificação deve estar alinhada com contexto do tenant (`tenant_id` correto) e separação de roles.

---

## 🔧 Arquitetura do Sistema

### Estado de Desenvolvimento Atual
- **Branch ativa**: `feature/enterprise-metrics`
- **Implementando**: Métricas enterprise onde 1 Lead pode ter múltiplas Opportunities
- **Modelo**: `leads_master` (pessoas/empresas únicas) → `pipeline_leads` (oportunidades)

### Multi-Tenant com Isolation
- **JWT tokens** com `tenant_id` e `role` claims
- **RLS (Row Level Security)** em todas tabelas
- **Cache Redis** com health monitoring
- **Performance** com virtualização para datasets grandes

### Padrões Arquiteturais

#### Sistema de Pipeline
- Etapas fixas: `Lead` → `Closed Won` / `Closed Lost`
- Campos customizáveis com validação
- Algoritmos de distribuição para atribuição
- Interface Kanban drag-and-drop usando @dnd-kit

#### Form Builder
- Criação dinâmica com tipos de campo
- Integração lead scoring
- Tracking UTM e analytics
- Notificações webhook para submissões

#### Autenticação & Autorização
- JWT com refresh tokens
- Renderização baseada em role
- Acesso com escopo de tenant
- Enforcement Supabase RLS

---

## 💾 Estrutura de Banco de Dados

- **Todas tabelas core** têm coluna `tenant_id` para isolamento
- **Migrations** armazenadas em `supabase/migrations/`
- **Service role** Supabase para operações admin
- **Cache Redis** para otimização de performance
- **Relacionamentos FK** com operações cascade
- **Migrations incrementais** numeradas

---

## 🔍 Troubleshooting Comum

### Problemas Frequentes
- **Falhas de build**: Verificar erros TypeScript com `npm run type-check`
- **Problemas auth**: Verificar formato token JWT e claims tenant_id
- **Erros banco**: Verificar conexão Supabase e políticas RLS
- **Problemas cache**: Limpar cache Redis ou reiniciar servidor dev

### Ferramentas de Debug
- **Frontend**: DevTools browser para debugging
- **Backend**: Logs Winston em `backend/logs/`
- **Banco**: Dashboard Supabase para inspeção
- **API**: Aba Network para debug request/response

---

## 📂 Localizações de Arquivos Importantes

### Principais
- **App principal**: `src/App.tsx` e `src/main.tsx`
- **Definições rotas**: `src/App.tsx` (React Router)
- **Cliente API**: `src/lib/api.ts` e `src/services/api.ts`
- **Backend entry**: `backend/src/index.ts`
- **Tipos banco**: `src/integrations/supabase/types.ts`

### Configuração
- **Config ambiente**: `src/config/` e `backend/src/config/`
- **Regras oficiais**: `documentos/CLAUDE.md` e `documentos/regra-principal.md`
- **Migrations**: `supabase/migrations/`

---

## 🎯 Ambiente e Variáveis

### Variáveis Ambiente Obrigatórias
```bash
# Configuração API
VITE_API_URL=http://localhost:3001
VITE_ENVIRONMENT=development

# Banco (Supabase)
VITE_SUPABASE_URL=https://marajvabdwkpgopytvhh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Autenticação
JWT_SECRET=b8JJePxoHsEJnrNJJnjGryTttSMkkrvQenegQJ2Y3IOfWJNZ9TW7nMvfz0hEWxR4...

# Email
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Cache
REDIS_URL=redis://localhost:6379

# Google Integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## 📋 Padrões de Desenvolvimento

### Estrutura de Componente
```typescript
interface ComponentProps {
  tenantId: string;
  // ... outras props
}

export const Component: React.FC<ComponentProps> = ({ tenantId }) => {
  // Hooks
  // Estado
  // Efeitos
  // Handlers
  // Render
};
```

### Padrão API Request
```typescript
// Use TanStack Query para data fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['leads', tenantId],
  queryFn: () => api.get(`/leads?tenant_id=${tenantId}`)
});
```

### Tratamento de Erro
- ErrorBoundary para catching de erros React
- Backend usa middleware centralizado de erro
- Log erros com Winston (backend) e console em desenvolvimento

---

Este CRM prioriza isolamento de tenant, segurança baseada em roles e arquitetura modular. **Sempre considere o contexto do tenant e role do usuário** ao implementar novas features ou modificar funcionalidades existentes.