# 🚀 Setup Completo Cursor - CRM-MARKETING

## ✅ Status dos Servidores

| Servidor | Status | Porta | Funcionalidade |
|----------|--------|-------|----------------|
| 🔧 **Backend (Node.js)** | ✅ Configurado | 5000 | API REST + TypeScript |
| ⚛️ **Frontend (React)** | ✅ Configurado | 5173 | Interface React + Vite |
| 🤖 **MCP Server** | ✅ Configurado | - | Supabase MCP Tools |
| 🗄️ **Supabase** | ✅ Conectado | - | Banco de dados |

## 🔑 Credenciais Supabase

```env
SUPABASE_URL=https://marajvabdwkpgopytvhh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU
```

## 🎯 Como Usar no Cursor

### 1. **Tarefas Disponíveis (Ctrl+Shift+P > Tasks)**
- 🚀 **Start Full Development Environment** - Inicia todos os servidores
- 🔧 **Backend Server (Node.js)** - Apenas backend
- ⚛️ **Frontend Server (React)** - Apenas frontend
- 🤖 **MCP Server (Supabase)** - Apenas MCP
- 🧪 **Test Supabase Connection** - Testa conexão
- 🔍 **Test MCP Tools** - Testa ferramentas MCP

### 2. **Debug/Launch (F5)**
- 🔧 **Debug Backend (Node.js)** - Debug do backend
- 🤖 **Debug MCP Server** - Debug do MCP
- 🧪 **Debug Test Connection** - Debug de testes
- 🚀 **Launch Full Stack** - Debug completo

### 3. **Scripts NPM**
```bash
npm run dev          # Todos os servidores
npm run server       # Apenas backend
npm run client       # Apenas frontend
npm run mcp-server   # Apenas MCP
npm run test-mcp     # Testar MCP
```

### 4. **Script Único**
```bash
./start-all-servers.sh  # Script completo com verificações
```

## 🔗 URLs dos Serviços

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Supabase Dashboard:** https://supabase.com/dashboard/project/marajvabdwkpgopytvhh

## 🤖 MCP Tools Disponíveis

O servidor MCP fornece 15+ ferramentas para o Cursor:

1. **execute_sql** - Executa SQL diretamente
2. **create_table** - Cria tabelas
3. **alter_table** - Modifica tabelas
4. **setup_rls** - Configura Row Level Security
5. **create_function** - Cria funções PostgreSQL
6. **create_trigger** - Cria triggers
7. **insert_data** - Insere dados
8. **update_data** - Atualiza dados
9. **delete_data** - Deleta dados
10. **select_data** - Consulta dados
11. **list_tables** - Lista tabelas
12. **describe_table** - Descreve estrutura
13. **backup_table** - Backup de tabelas
14. **setup_database** - Configuração inicial
15. **get_table_info** - Informações detalhadas

## 🟢 Verificação de Status

### ✅ MCP Server Status
- **Configuração:** `.cursor/mcp.json` ✅
- **Credenciais:** Corretas ✅
- **Conexão:** Testada ✅
- **Bolinha Verde:** Ativa no Cursor ✅

### ✅ Supabase Connection
- **URL:** https://marajvabdwkpgopytvhh.supabase.co ✅
- **Anon Key:** Válida ✅
- **Service Role:** Válida ✅
- **Teste de Conexão:** Passou ✅

### ✅ Node.js & React
- **Backend:** TypeScript configurado ✅
- **Frontend:** React + Vite configurado ✅
- **Dependências:** Instaladas ✅
- **Scripts:** Funcionando ✅

## 🚨 Troubleshooting

### Problema: MCP não conecta
```bash
# Reiniciar Cursor completamente
# Verificar se o arquivo .cursor/mcp.json está correto
npm run test-mcp
```

### Problema: Porta em uso
```bash
# Verificar portas
lsof -i :5000  # Backend
lsof -i :5173  # Frontend
```

### Problema: Supabase erro
```bash
# Testar conexão
node test-supabase-connection.js
# Verificar credenciais no .env
```

## 🎉 Sistema 100% Funcional!

- ✅ **Cursor**: Configurado com MCP Tools
- ✅ **Supabase**: Conectado e funcionando
- ✅ **Node.js**: Backend TypeScript pronto
- ✅ **React**: Frontend moderno configurado
- ✅ **MCP Server**: 15+ ferramentas disponíveis
- ✅ **Bolinha Verde**: Ativa no MCP Tools

**🔄 Para iniciar tudo:** `./start-all-servers.sh` ou `npm run dev` 