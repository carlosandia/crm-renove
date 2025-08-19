# 📋 Mapeamento de Migração - Outcome Reasons

## 🎯 Objetivo
Migrar sistema complexo de motivos de ganho/perda para padrão simplificado seguindo a lógica da aba "Básico".

## 📊 Estado Atual (Complexo)
- **Tabela**: `pipeline_outcome_reasons` (dedicada)
- **8 Rotas API**: CRUD completo + especializadas
- **Campos**: id, pipeline_id, tenant_id, reason_type, reason_text, display_order, is_active, created_at, updated_at, created_by
- **Sistema**: React Query + auto-save + individual CRUD

## 🎯 Estado Destino (Simplificado)
- **Tabela**: `pipelines.outcome_reasons` (campo JSONB)
- **0 Rotas API**: Bulk save junto com pipeline
- **Campos**: reason_text, reason_type, display_order, is_active (apenas)
- **Sistema**: Form state + bulk save + manual save

## 🗃️ Dados Existentes Identificados
```sql
-- Exemplo de dados existentes
pipeline_id: 24529280-4e5f-4c59-8440-afc4780852cc
tenant_id: 65a7e014-38be-422a-bf45-47d93945df7c

Ganho:
- "Preço competitivo" (order: 0)
- "Bom atendimento" (order: 1) 
- "Qualidade do produto" (order: 2)

Perdido:
- "Não tem orçamento" (order: 0)
- "Concorrência" (order: 1)
- "Preço alto" (order: 2)
```

## 🔄 Estrutura de Migração

### Formato Antigo (Tabela Dedicada)
```sql
CREATE TABLE pipeline_outcome_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL,
  tenant_id text NOT NULL,
  reason_type varchar NOT NULL,
  reason_text varchar NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL
);
```

### Formato Novo (Campo JSONB)
```sql
-- Adicionar à tabela pipelines
ALTER TABLE pipelines 
ADD COLUMN outcome_reasons JSONB DEFAULT '{
  "ganho_reasons": [],
  "perdido_reasons": []
}'::jsonb;
```

### Estrutura JSON Destino
```json
{
  "ganho_reasons": [
    {
      "reason_text": "Preço competitivo",
      "reason_type": "ganho",
      "display_order": 0,
      "is_active": true
    }
  ],
  "perdido_reasons": [
    {
      "reason_text": "Não tem orçamento", 
      "reason_type": "perdido",
      "display_order": 0,
      "is_active": true
    }
  ]
}
```

## 📝 SQL de Migração

### 1. Adicionar Campo JSONB
```sql
-- Adicionar campo outcome_reasons na tabela pipelines
ALTER TABLE pipelines 
ADD COLUMN outcome_reasons JSONB DEFAULT '{
  "ganho_reasons": [],
  "perdido_reasons": []
}'::jsonb;
```

### 2. Migrar Dados Existentes
```sql
-- Migrar dados de pipeline_outcome_reasons para pipelines.outcome_reasons
UPDATE pipelines 
SET outcome_reasons = (
  SELECT jsonb_build_object(
    'ganho_reasons', COALESCE(ganho_array.reasons, '[]'::jsonb),
    'perdido_reasons', COALESCE(perdido_array.reasons, '[]'::jsonb)
  )
  FROM (
    -- Agrupar motivos de ganho
    SELECT 
      por_ganho.pipeline_id,
      jsonb_agg(
        jsonb_build_object(
          'reason_text', por_ganho.reason_text,
          'reason_type', 'ganho',
          'display_order', por_ganho.display_order,
          'is_active', por_ganho.is_active
        ) ORDER BY por_ganho.display_order
      ) as reasons
    FROM pipeline_outcome_reasons por_ganho
    WHERE por_ganho.reason_type IN ('ganho', 'won')
    AND por_ganho.pipeline_id = pipelines.id
    GROUP BY por_ganho.pipeline_id
  ) ganho_array
  FULL OUTER JOIN (
    -- Agrupar motivos de perdido
    SELECT 
      por_perdido.pipeline_id,
      jsonb_agg(
        jsonb_build_object(
          'reason_text', por_perdido.reason_text,
          'reason_type', 'perdido',
          'display_order', por_perdido.display_order,
          'is_active', por_perdido.is_active
        ) ORDER BY por_perdido.display_order
      ) as reasons
    FROM pipeline_outcome_reasons por_perdido
    WHERE por_perdido.reason_type IN ('perdido', 'lost', 'perda')
    AND por_perdido.pipeline_id = pipelines.id
    GROUP BY por_perdido.pipeline_id
  ) perdido_array ON ganho_array.pipeline_id = perdido_array.pipeline_id
  WHERE ganho_array.pipeline_id = pipelines.id 
     OR perdido_array.pipeline_id = pipelines.id
)
WHERE id IN (
  SELECT DISTINCT pipeline_id 
  FROM pipeline_outcome_reasons
);
```

### 3. Verificar Migração
```sql
-- Verificar se migração foi bem-sucedida
SELECT 
  p.id,
  p.name,
  jsonb_array_length(p.outcome_reasons->'ganho_reasons') as ganho_count,
  jsonb_array_length(p.outcome_reasons->'perdido_reasons') as perdido_count,
  p.outcome_reasons
FROM pipelines p
WHERE p.outcome_reasons IS NOT NULL
AND (
  jsonb_array_length(p.outcome_reasons->'ganho_reasons') > 0 
  OR jsonb_array_length(p.outcome_reasons->'perdido_reasons') > 0
)
ORDER BY p.created_at DESC;
```

## 🗑️ Limpeza Pós-Migração

### Arquivos a DELETAR
1. `/backend/src/routes/outcome-reasons.ts` (8 rotas API)
2. `/src/services/outcomeReasonsApi.ts` (API service)
3. `/src/hooks/useOutcomeReasonsApi.ts` (React Query hook)
4. `/src/shared/schemas/outcome-reasons.ts` (esquemas complexos)

### Tabela a MANTER (por segurança)
- `pipeline_outcome_reasons` - manter por 30 dias para rollback

## ✅ Validação Final

### Antes da Migração
```sql
SELECT COUNT(*) as total_motivos FROM pipeline_outcome_reasons;
```

### Após a Migração  
```sql
SELECT 
  COUNT(*) as pipelines_com_motivos,
  SUM(jsonb_array_length(outcome_reasons->'ganho_reasons')) as total_ganho,
  SUM(jsonb_array_length(outcome_reasons->'perdido_reasons')) as total_perdido
FROM pipelines 
WHERE outcome_reasons IS NOT NULL;
```

## 🔄 Rollback Plan
Se necessário reverter:
1. Remover campo `outcome_reasons` da tabela `pipelines`
2. Restaurar arquivos deletados do git
3. Dados em `pipeline_outcome_reasons` permanecem intactos