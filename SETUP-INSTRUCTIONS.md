# 🚀 CRM-MARKETING - Instruções de Configuração

## 📋 Status do Projeto
- ✅ Repositório local inicializado
- ✅ MCP Server para Supabase criado
- ✅ Dependências instaladas
- ⏳ **PENDENTE**: Criar repositório no GitHub
- ⏳ **PENDENTE**: Configurar variáveis do Supabase

## 🔧 Próximos Passos

### 1. Criar Repositório no GitHub
1. Acesse: https://github.com/new (já abriu automaticamente)
2. **Repository name**: `CRM-MARKETING`
3. **Description**: "Sistema CRM para Marketing com MCP Server para Supabase"
4. Escolha **Público** ou **Privado**
5. **NÃO** marque "Add a README file"
6. Clique em **"Create repository"**

### 2. Configurar Supabase
1. Acesse seu projeto no Supabase
2. Vá em **Settings** → **API**
3. Copie:
   - **Project URL**
   - **Service Role Key** (secret)

### 3. Configurar Variáveis de Ambiente
```bash
# Crie o arquivo .env na raiz do projeto
cp env.example .env

# Edite o arquivo .env com suas credenciais:
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

### 4. Testar Conexão com Supabase
```bash
npm run test
```

### 5. Iniciar MCP Server
```bash
npm start
```

## 🛠️ Funcionalidades do MCP Server

### 📊 Comandos Disponíveis:
- **execute_sql**: Executa qualquer comando SQL
- **create_table**: Cria novas tabelas
- **insert_data**: Insere dados
- **select_data**: Consulta dados
- **alter_table**: Modifica estrutura de tabelas
- **setup_rls**: Configura Row Level Security

### 💡 Exemplos de Uso:

#### Criar Tabela:
```javascript
{
  "name": "create_table",
  "arguments": {
    "table_name": "clientes",
    "columns": [
      { "name": "id", "type": "SERIAL", "constraints": "PRIMARY KEY" },
      { "name": "nome", "type": "TEXT", "constraints": "NOT NULL" },
      { "name": "email", "type": "TEXT", "constraints": "UNIQUE" },
      { "name": "created_at", "type": "TIMESTAMP", "constraints": "DEFAULT NOW()" }
    ]
  }
}
```

#### Executar SQL Direto:
```javascript
{
  "name": "execute_sql",
  "arguments": {
    "query": "CREATE TABLE leads (id SERIAL PRIMARY KEY, name TEXT, status TEXT DEFAULT 'novo')"
  }
}
```

#### Inserir Dados:
```javascript
{
  "name": "insert_data",
  "arguments": {
    "table_name": "clientes",
    "data": {
      "nome": "João Silva",
      "email": "joao@email.com"
    }
  }
}
```

## 🔒 Permissões Necessárias

O **Service Role Key** fornece acesso completo ao banco, incluindo:
- ✅ Criar/alterar/deletar tabelas
- ✅ Inserir/atualizar/deletar dados
- ✅ Configurar RLS (Row Level Security)
- ✅ Executar SQL direto
- ✅ Gerenciar índices e triggers

## 📁 Estrutura do Projeto
```
CRM-MARKETING/
├── README.md                 # Documentação principal
├── package.json             # Dependências e scripts
├── .gitignore              # Arquivos ignorados pelo Git
├── env.example             # Exemplo de variáveis de ambiente
├── supabase-mcp-server.js  # Servidor MCP principal
├── test-connection.js      # Teste de conexão
└── SETUP-INSTRUCTIONS.md   # Este arquivo
```

## 🚨 Segurança
- ⚠️ **NUNCA** commite o arquivo `.env`
- 🔑 Use sempre o **Service Role Key** para o MCP Server
- 🛡️ Configure RLS nas tabelas de produção
- 🔒 Mantenha as credenciais seguras

---

## ✅ Checklist Final
- [ ] Repositório GitHub criado
- [ ] Arquivo `.env` configurado
- [ ] Teste de conexão passou
- [ ] MCP Server funcionando
- [ ] Push inicial feito para GitHub

**Quando completar todos os passos, execute:**
```bash
git push -u origin main
``` 