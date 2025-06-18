# 🗄️ Estrutura do Banco de Dados - CRM Marketing

## 📁 Organização dos Arquivos

### `/core/`
- **`database-schema.sql`** - Esquema principal unificado do banco
  - Todas as tabelas principais (users, customers, pipelines, etc.)
  - Índices otimizados para performance
  - Políticas RLS configuradas
  - Triggers e funções essenciais

### `/functions/`
- **`create-exec-sql-function.sql`** - Funções SQL auxiliares
  - Funções para execução dinâmica de SQL
  - Utilitários para MCP Server

### `/migrations/`
- **`create_win_loss_reasons_table.sql`** - Scripts de migração específicos
  - Scripts para adições pontuais ao schema

## 🚀 Como Usar

### 1. Configuração Inicial
```sql
-- Execute primeiro o schema principal:
psql -f database/core/database-schema.sql

-- Depois as funções auxiliares:
psql -f database/functions/create-exec-sql-function.sql
```

### 2. Migrações
```sql
-- Execute conforme necessidade:
psql -f database/migrations/create_win_loss_reasons_table.sql
```

## 📋 Schema Principal

O arquivo `database-schema.sql` contém:

- **Seção 1**: Tabelas principais (users, customers)
- **Seção 2**: Sistema de pipelines completo
- **Seção 3**: Índices otimizados para performance
- **Seção 4**: Row Level Security (RLS)
- **Seção 5**: Políticas de segurança
- **Seção 6**: Funções e triggers
- **Seção 7**: Documentação inline

## ✅ Benefícios da Refatoração

1. **Eliminação de Duplicação**: Consolidou 5+ arquivos duplicados
2. **Organização Clara**: Estrutura hierárquica por tipo
3. **Manutenção Simplificada**: Um arquivo principal com tudo
4. **Documentação Integrada**: Comentários explicativos
5. **Performance Otimizada**: Todos os índices necessários 