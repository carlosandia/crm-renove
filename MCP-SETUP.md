# 🔧 Configuração MCP Tools - CRM Marketing

## 📋 Arquivos de Configuração Criados:

### 1. **`.cursor/mcp.json`** - Configuração principal do Cursor
### 2. **`.vscode/settings.json`** - Configuração VSCode/Cursor
### 3. **`cursor-mcp.json`** - Configuração específica Cursor
### 4. **`mcp-config.json`** - Configuração do projeto
### 5. **`start-mcp.sh`** - Script de inicialização

---

## 🚀 Como Ativar MCP Tools no Cursor:

### **Método 1: Configuração Automática**
1. **Reinicie o Cursor** completamente
2. **Vá em**: `Cursor Settings` → `MCP Tools`
3. O servidor `supabase-crm-marketing` deve aparecer
4. **Clique na bolinha** para ativar (deve ficar verde)

### **Método 2: Configuração Manual**
1. **Abra**: `Cursor Settings` → `MCP Tools`
2. **Clique em**: `Add Custom MCP`
3. **Configure**:
   - **Name**: `supabase-crm-marketing`
   - **Command**: `node`
   - **Args**: `["supabase-mcp-server.js"]`
   - **Working Directory**: Deixe em branco (usa o workspace atual)

---

## 🔐 Variáveis de Ambiente Configuradas:

```bash
SUPABASE_URL=https://marajvabdwkpgopytvhh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ... (configurada)
SUPABASE_ANON_KEY=eyJhbGciOiJ... (configurada)
```

---

## 🛠️ Ferramentas MCP Disponíveis:

- ✅ `execute_sql` - Executar qualquer SQL
- ✅ `create_table` - Criar tabelas
- ✅ `insert_data` - Inserir dados
- ✅ `select_data` - Consultar dados
- ✅ `update_data` - Atualizar dados
- ✅ `delete_data` - Deletar dados
- ✅ `get_users` - Listar usuários
- ✅ `create_user` - Criar usuários
- ✅ `update_user_role` - Atualizar roles
- ✅ `get_customers` - Listar clientes
- ✅ `create_customer` - Criar clientes
- ✅ `setup_database` - Configurar banco

---

## 🧪 Testes Disponíveis:

```bash
# Testar MCP Server
npm run test-mcp

# Testar conexão Supabase
npm run test

# Iniciar MCP Server manualmente
npm run mcp-server
```

---

## 🔴 Solução de Problemas:

### **Se a bolinha não ficar verde:**
1. **Verifique os logs** no terminal do Cursor
2. **Reinicie o Cursor** completamente
3. **Execute**: `npm run test-mcp` para verificar se está funcionando
4. **Verifique** se o arquivo `supabase-mcp-server.js` existe
5. **Confirme** que as variáveis de ambiente estão no `.env`

### **Se aparecer erro de comando:**
1. **Verifique** se o Node.js está instalado
2. **Execute**: `which node` para ver o caminho
3. **Use caminho completo** se necessário: `/usr/local/bin/node`

---

## ✅ Status da Configuração:

- ✅ **MCP Server**: Funcionando
- ✅ **Supabase**: Conectado
- ✅ **Credenciais**: Configuradas
- ✅ **Ferramentas**: 12 disponíveis
- ✅ **Arquivos**: Todos criados

**🎯 Depois de reiniciar o Cursor, a bolinha deve ficar verde automaticamente!** 