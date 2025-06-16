# 🚀 Como Ativar o Servidor MCP no Cursor

## ✅ Status Atual
- **Supabase**: 🟢 Conectado
- **Servidor MCP**: 🟢 Funcionando
- **Configuração**: 🟢 Completa
- **6 Ferramentas Disponíveis**: 🟢 Prontas

## 📋 Passos para Ativar no Cursor

### 1. Abrir Configurações do Cursor
```
Pressione: Cmd + , (Mac) ou Ctrl + , (Windows/Linux)
```

### 2. Navegar para MCP Tools
- No menu lateral, clique em **"MCP Tools"**
- Você verá uma lista de servidores disponíveis

### 3. Ativar o Servidor
- Encontre o servidor **"supabase-crm"**
- Clique no botão de **toggle/switch** para ativá-lo
- O status deve mudar de "Disabled" para "Enabled"

### 4. Verificar Indicador
- Após ativar, você deve ver um **indicador VERDE** 🟢
- Isso significa que a conexão está ativa

### 5. Reiniciar (se necessário)
Se o indicador não ficar verde:
```
Cmd + Shift + P (Mac) ou Ctrl + Shift + P (Windows/Linux)
Digite: "Developer: Reload Window"
```

## 🛠️ Ferramentas Disponíveis

Após ativar, você terá acesso a:

1. **`execute_sql`** - Executar comandos SQL
2. **`list_tables`** - Listar tabelas do banco
3. **`select_data`** - Consultar dados
4. **`insert_data`** - Inserir dados
5. **`update_data`** - Atualizar dados
6. **`delete_data`** - Remover dados

## 🎯 Como Usar

Após ativar, você pode usar as ferramentas MCP diretamente no chat:

```
"Por favor, liste todas as tabelas do banco de dados"
"Selecione os primeiros 5 usuários da tabela users"
"Insira um novo usuário com nome João e email joao@teste.com"
```

## 🔧 Configuração Atual

**Arquivo**: `.cursor/mcp.json`
```json
{
  "mcpServers": {
    "supabase-crm": {
      "command": "node",
      "args": ["supabase-mcp-final.js"],
      "cwd": "/Users/carlosandia/CRM-MARKETING",
      "env": {
        "SUPABASE_URL": "https://marajvabdwkpgopytvhh.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "[key_configurada]"
      }
    }
  }
}
```

## ⚡ Teste Rápido

Para verificar se está funcionando:
```bash
node test-mcp-cursor.js
```

## 🎉 Resultado Esperado

Quando tudo estiver funcionando, você verá:
- ✅ Indicador verde na interface MCP Tools
- ✅ Ferramentas MCP disponíveis no chat
- ✅ Conexão ativa com Supabase

---

**🚨 IMPORTANTE**: 
- Certifique-se de que o indicador está VERDE 🟢
- Se aparecer vermelho 🔴, reinicie o Cursor
- Se continuar com problemas, execute o teste: `node test-mcp-cursor.js` 