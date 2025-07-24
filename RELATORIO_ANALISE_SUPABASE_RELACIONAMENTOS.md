# Relatório de Análise: Relacionamentos Supabase

## 📋 Resumo Executivo

Após análise completa do banco de dados Supabase, identifiquei que o erro **PGRST200** está ocorrendo devido à ausência de foreign keys configuradas no schema do PostgREST, mesmo que as colunas de relacionamento existam nas tabelas.

## 🔍 Problemas Identificados

### 1. Erro PGRST200 nos Joins
- **Erro**: `Could not find a relationship between 'pipelines' and 'pipeline_custom_fields' in the schema cache`
- **Causa**: Foreign keys não estão configuradas no PostgREST
- **Impact**: Joins automáticos do Supabase não funcionam

### 2. Estrutura das Tabelas

| Tabela | Registros | Colunas FK | Status |
|--------|-----------|------------|---------|
| `pipelines` | 56 | - | ✅ OK |
| `pipeline_custom_fields` | 38 | `pipeline_id` | ✅ Coluna existe |
| `cadence_configs` | 0 | ❌ `pipeline_id` ausente | ⚠️ Problema |
| `cadence_tasks` | 1 | `cadence_config_id` | ✅ Coluna existe |

### 3. Relacionamentos Funcionais

✅ **Funcionam manualmente**:
- `pipeline_custom_fields.pipeline_id` → `pipelines.id`
- `cadence_tasks.cadence_config_id` → `cadence_configs.id`

❌ **Não funcionam via PostgREST**:
- Joins automáticos falham
- Cache do schema não reconhece relacionamentos

## 🛠️ Solução Implementada

### Arquivo SQL Criado: `fix-relationships.sql`

```sql
-- 1. Criar FK: pipeline_custom_fields → pipelines
ALTER TABLE pipeline_custom_fields
ADD CONSTRAINT fk_pipeline_custom_fields_pipeline_id
FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;

-- 2. Criar FK: cadence_tasks → cadence_configs  
ALTER TABLE cadence_tasks
ADD CONSTRAINT fk_cadence_tasks_cadence_config_id
FOREIGN KEY (cadence_config_id) REFERENCES cadence_configs(id) ON DELETE CASCADE;

-- 3. Verificar se cadence_configs precisa de pipeline_id
-- (Condicional - só se a coluna existir)
```

## 📝 Próximos Passos

### 1. Executar Correção (URGENTE)
```bash
# No Supabase Dashboard → SQL Editor
# Execute o arquivo: fix-relationships.sql
```

### 2. Aguardar Cache (5-10 minutos)
- O PostgREST precisa atualizar o cache do schema
- Relacionamentos aparecerão automaticamente após atualização

### 3. Verificar Funcionamento
```javascript
// Teste este código após correção:
const { data } = await supabase
  .from('pipelines')
  .select(`
    id,
    name,
    pipeline_custom_fields (
      id,
      field_name,
      field_type
    )
  `);
```

## ⚠️ Problemas Adicionais Encontrados

### 1. Cadence Configs Vazia
- **Problema**: 0 registros em `cadence_configs`
- **Impact**: 1 task órfã em `cadence_tasks`
- **Solução**: Criar cadence_config ou limpar task órfã

### 2. Coluna Ausente
- **Problema**: `cadence_configs` não tem `pipeline_id`
- **Impact**: Não há relacionamento com pipelines
- **Solução**: Adicionar coluna se necessário para o negócio

## 🎯 Status Final

| Relacionamento | Status Atual | Após Correção |
|----------------|--------------|---------------|
| pipelines ←→ pipeline_custom_fields | ❌ Falha | ✅ Funcionará |
| cadence_configs ←→ cadence_tasks | ❌ Falha | ✅ Funcionará |

## 📋 Lista de Tabelas e Relacionamentos

### Tabelas Verificadas:
1. **pipelines** (56 registros) - Tabela principal
2. **pipeline_custom_fields** (38 registros) - Relaciona com pipelines via `pipeline_id`
3. **cadence_configs** (0 registros) - Vazia, sem `pipeline_id`
4. **cadence_tasks** (1 registro) - Relaciona com cadence_configs via `cadence_config_id`

### Foreign Keys a Criar:
1. `pipeline_custom_fields.pipeline_id` → `pipelines.id`
2. `cadence_tasks.cadence_config_id` → `cadence_configs.id`

---

**Data**: 2025-07-12  
**Análise**: Completa  
**Arquivos**: `fix-relationships.sql` (pronto para execução)