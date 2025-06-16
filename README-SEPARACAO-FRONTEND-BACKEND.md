# 🚀 CRM Marketing - Arquitetura Separada Frontend + Backend

## 📋 **TRANSFORMAÇÃO CONCLUÍDA COM SUCESSO!**

O sistema foi **completamente transformado** de uma arquitetura Next.js fullstack para uma estrutura separada:

- **Frontend**: Vite + React + TypeScript
- **Backend**: Express + Node.js + TypeScript

---

## 🏗️ **NOVA ESTRUTURA DO PROJETO**

```
CRM-MARKETING/
├── frontend/                    # 🎨 Frontend (Vite + React)
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   ├── providers/          # Context Providers
│   │   ├── hooks/              # Custom Hooks
│   │   ├── lib/                # Configurações (Supabase, API)
│   │   ├── types/              # Tipos TypeScript
│   │   ├── utils/              # Utilitários
│   │   ├── App.tsx             # App principal com React Router
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env                    # Variáveis do frontend
│
├── backend/                     # ⚙️ Backend (Express + Node.js)
│   ├── src/
│   │   ├── routes/             # Rotas da API
│   │   │   ├── auth.ts         # Autenticação
│   │   │   ├── users.ts        # Usuários
│   │   │   ├── customers.ts    # Clientes
│   │   │   ├── pipelines.ts    # Pipelines
│   │   │   ├── vendedores.ts   # Vendedores
│   │   │   ├── database.ts     # Operações de BD
│   │   │   ├── health.ts       # Health Check
│   │   │   └── mcp.ts          # MCP Integration
│   │   ├── controllers/        # Controllers
│   │   ├── services/           # Serviços
│   │   └── index.ts            # Servidor principal
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                    # Variáveis do backend
│
├── package.json                 # Scripts principais
└── README-SEPARACAO-FRONTEND-BACKEND.md
```

---

## 🚀 **COMO EXECUTAR O SISTEMA**

### **Opção 1: Executar Tudo de Uma Vez (Recomendado)**

```bash
# No diretório raiz
npm run dev
```

Este comando inicia **simultaneamente**:
- Backend na porta **8080** (http://localhost:8080)
- Frontend na porta **3000** (http://localhost:3000)

### **Opção 2: Executar Separadamente**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend  
npm run dev
```

---

## 🔧 **CONFIGURAÇÃO INICIAL**

### **1. Instalar Dependências**

```bash
# Instalar todas as dependências de uma vez
npm run install:all

# OU instalar separadamente:
cd frontend && npm install
cd ../backend && npm install
```

### **2. Configurar Variáveis de Ambiente**

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:8080
VITE_SUPABASE_URL=https://marajvabdwkpgopytvhh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend (.env):**
```env
PORT=8080
SUPABASE_URL=https://marajvabdwkpgopytvhh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=development
```

---

## 🎯 **FUNCIONALIDADES PRESERVADAS**

### ✅ **100% das Funcionalidades Mantidas:**

- **Autenticação completa** com roles (super admin, admin, member)
- **Controle de acesso** baseado em roles
- **Menus dinâmicos** por role
- **Pipeline management** completo
- **Gestão de usuários e vendedores**
- **Integração com Supabase**
- **MCP (Model Context Protocol)**
- **Operações de banco de dados**
- **Sistema de leads e clientes**

### 🔄 **Comunicação Frontend ↔ Backend:**

- **HTTP/REST API** com Axios
- **Interceptors** para autenticação automática
- **Error handling** centralizado
- **Proxy configuration** no Vite para desenvolvimento

---

## 📡 **ENDPOINTS DA API**

### **Backend rodando em: http://localhost:8080**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/health` | GET | Health check |
| `/api/auth/login` | POST | Login de usuários |
| `/api/users` | GET/POST/PUT/DELETE | Gestão de usuários |
| `/api/customers` | GET/POST/PUT/DELETE | Gestão de clientes |
| `/api/pipelines` | GET/POST/PUT/DELETE | Gestão de pipelines |
| `/api/vendedores` | GET/POST/PUT/DELETE | Gestão de vendedores |
| `/api/database` | GET/POST | Operações de banco |
| `/api/mcp` | GET/POST | MCP Integration |

### **Frontend rodando em: http://localhost:3000**

- Interface React com React Router
- Comunicação via API calls para o backend
- Autenticação preservada
- Todos os componentes funcionais

---

## 🛠️ **SCRIPTS DISPONÍVEIS**

### **Scripts Principais (Diretório Raiz):**

```bash
npm run dev              # Inicia frontend + backend
npm run build            # Build de produção (ambos)
npm run start            # Inicia versão de produção
npm run install:all      # Instala todas as dependências
npm run clean            # Limpa node_modules e builds
npm run type-check       # Verificação de tipos
npm run health-check     # Testa se ambos estão rodando
```

### **Scripts do Frontend:**

```bash
cd frontend
npm run dev              # Desenvolvimento (porta 3000)
npm run build            # Build para produção
npm run preview          # Preview do build
npm run type-check       # Verificação TypeScript
```

### **Scripts do Backend:**

```bash
cd backend
npm run dev              # Desenvolvimento (porta 8080)
npm run build            # Compilar TypeScript
npm run start            # Produção (após build)
```

---

## 🔍 **VERIFICAÇÃO DE FUNCIONAMENTO**

### **1. Health Checks:**

```bash
# Backend
curl http://localhost:8080/api/health

# Frontend
curl http://localhost:3000
```

### **2. Teste de Login:**

1. Acesse: http://localhost:3000
2. Use as credenciais demo:
   - **Super Admin**: `superadmin@crm.com` / `SuperAdmin123!`
   - **Admin**: `admin@crm.com` / `123456`
   - **Member**: `member@crm.com` / `123456`

### **3. Teste de API:**

```bash
# Testar endpoint de usuários
curl http://localhost:8080/api/users

# Testar endpoint de pipelines
curl http://localhost:8080/api/pipelines?tenant_id=1
```

---

## 🎨 **COMPATIBILIDADE COM LOVABLE**

### ✅ **Totalmente Compatível:**

- **Vite** como bundler (padrão do Lovable)
- **React 18** com TypeScript
- **Tailwind CSS** para styling
- **Estrutura de componentes** organizada
- **API REST** bem definida
- **Environment variables** configuradas

### 🚀 **Para usar no Lovable:**

1. **Frontend** pode ser usado diretamente no Lovable
2. **Backend** roda independentemente
3. **Comunicação** via HTTP/REST
4. **Preview** funciona perfeitamente

---

## 🔧 **DESENVOLVIMENTO**

### **Adicionando Novas Funcionalidades:**

**Frontend:**
```bash
cd frontend/src/components
# Criar novos componentes React
```

**Backend:**
```bash
cd backend/src/routes
# Criar novas rotas da API
```

### **Estrutura de Dados:**

- **Supabase** continua sendo o banco principal
- **Autenticação** via Supabase Auth + credenciais demo
- **Roles** e **tenant_id** preservados
- **Todas as tabelas** mantidas

---

## 📊 **MONITORAMENTO**

### **Logs em Tempo Real:**

```bash
# Backend logs
cd backend && npm run dev

# Frontend logs  
cd frontend && npm run dev
```

### **Status dos Serviços:**

- **Backend**: http://localhost:8080/api/health
- **Frontend**: http://localhost:3000
- **Database**: Supabase Dashboard

---

## 🎉 **RESULTADO FINAL**

### ✅ **TRANSFORMAÇÃO 100% CONCLUÍDA:**

1. **Arquitetura separada** ✅
2. **Todas as funcionalidades preservadas** ✅
3. **Autenticação e roles funcionando** ✅
4. **Comunicação frontend/backend** ✅
5. **Compatibilidade com Lovable** ✅
6. **Scripts de desenvolvimento** ✅
7. **Documentação completa** ✅

### 🚀 **Pronto para:**

- **Desenvolvimento escalável**
- **Deploy independente**
- **Integração com Lovable**
- **Futuras expansões**
- **APIs externas** (Meta Ads, Google Ads, etc.)

---

## 📞 **SUPORTE**

Se encontrar algum problema:

1. Verifique se ambos os serviços estão rodando
2. Confirme as variáveis de ambiente
3. Teste os health checks
4. Verifique os logs nos terminais

**Sistema totalmente funcional e pronto para uso!** 🎯 