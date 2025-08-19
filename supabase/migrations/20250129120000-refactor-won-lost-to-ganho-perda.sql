-- ============================================
-- 🔧 MIGRATION: Refatoração won/lost → ganho/perda
-- ============================================
-- 
-- Atualiza sistema de motivos para usar nomenclatura em português
-- mantendo compatibilidade com dados existentes
-- 
-- Data: 2025-01-29
-- Versão: 1.0.0
-- ============================================

-- 📋 ETAPA 1: Atualizar constraints para aceitar novos valores
-- ============================================

-- Remover constraints existentes
ALTER TABLE pipeline_outcome_reasons 
DROP CONSTRAINT IF EXISTS pipeline_outcome_reasons_reason_type_check;

ALTER TABLE lead_outcome_history 
DROP CONSTRAINT IF EXISTS lead_outcome_history_outcome_type_check;

ALTER TABLE lead_outcome_history 
DROP CONSTRAINT IF EXISTS valid_outcome_type;

-- Adicionar novos constraints com valores em português + compatibilidade
ALTER TABLE pipeline_outcome_reasons 
ADD CONSTRAINT pipeline_outcome_reasons_reason_type_check 
CHECK (reason_type IN ('won', 'lost', 'loss', 'win', 'ganho', 'perda'));

ALTER TABLE lead_outcome_history 
ADD CONSTRAINT lead_outcome_history_outcome_type_check 
CHECK (outcome_type IN ('won', 'lost', 'loss', 'win', 'ganho', 'perda'));

-- 📋 ETAPA 2: Função para mapear valores antigos para novos
-- ============================================

CREATE OR REPLACE FUNCTION map_outcome_type_to_portuguese(old_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE old_type
    WHEN 'won', 'win' THEN RETURN 'ganho';
    WHEN 'lost', 'loss' THEN RETURN 'perda';
    WHEN 'ganho' THEN RETURN 'ganho';
    WHEN 'perda' THEN RETURN 'perda';
    ELSE RETURN old_type; -- Preservar valores desconhecidos
  END CASE;
END;
$$;

-- 📋 ETAPA 3: Migrar dados existentes para novos valores
-- ============================================

-- Migrar pipeline_outcome_reasons
UPDATE pipeline_outcome_reasons 
SET reason_type = map_outcome_type_to_portuguese(reason_type)
WHERE reason_type IN ('won', 'lost', 'loss', 'win');

-- Migrar lead_outcome_history
UPDATE lead_outcome_history 
SET outcome_type = map_outcome_type_to_portuguese(outcome_type)
WHERE outcome_type IN ('won', 'lost', 'loss', 'win');

-- 📋 ETAPA 4: Atualizar função get_pipeline_outcome_reasons
-- ============================================

CREATE OR REPLACE FUNCTION get_pipeline_outcome_reasons(
  p_pipeline_id uuid,
  p_reason_type text DEFAULT 'all',
  p_active_only boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  pipeline_id uuid,
  tenant_id text,
  reason_type varchar,
  reason_text varchar,
  display_order integer,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mapear valores antigos para novos na consulta
  IF p_reason_type IN ('won', 'win') THEN
    p_reason_type := 'ganho';
  ELSIF p_reason_type IN ('lost', 'loss') THEN
    p_reason_type := 'perda';
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.pipeline_id,
    r.tenant_id,
    r.reason_type,
    r.reason_text,
    r.display_order,
    r.is_active,
    r.created_at,
    r.updated_at
  FROM pipeline_outcome_reasons r
  WHERE r.pipeline_id = p_pipeline_id
    AND r.tenant_id = auth.jwt() ->> 'tenant_id'
    AND (p_reason_type = 'all' OR r.reason_type = p_reason_type)
    AND (NOT p_active_only OR r.is_active = true)
  ORDER BY r.reason_type, r.display_order;
END;
$$;

-- 📋 ETAPA 5: Comentários atualizados
-- ============================================

COMMENT ON COLUMN pipeline_outcome_reasons.reason_type IS 'Tipo do motivo: ganho ou perda (aceita won/lost para compatibilidade)';
COMMENT ON COLUMN lead_outcome_history.outcome_type IS 'Tipo do resultado: ganho ou perda (aceita won/lost para compatibilidade)';

-- 📋 ETAPA 6: Verificação da migração
-- ============================================

DO $$
DECLARE
  total_count INTEGER;
  ganho_count INTEGER;
  perda_count INTEGER;
  old_values_count INTEGER;
BEGIN
  -- Contar registros totais
  SELECT COUNT(*) INTO total_count FROM pipeline_outcome_reasons;
  
  -- Contar novos valores
  SELECT COUNT(*) INTO ganho_count FROM pipeline_outcome_reasons WHERE reason_type = 'ganho';
  SELECT COUNT(*) INTO perda_count FROM pipeline_outcome_reasons WHERE reason_type = 'perda';
  
  -- Contar valores antigos restantes
  SELECT COUNT(*) INTO old_values_count 
  FROM pipeline_outcome_reasons 
  WHERE reason_type IN ('won', 'lost', 'loss', 'win');
  
  RAISE NOTICE 'Migration concluída:';
  RAISE NOTICE '  Total de registros: %', total_count;
  RAISE NOTICE '  Ganho: %', ganho_count;
  RAISE NOTICE '  Perda: %', perda_count;
  RAISE NOTICE '  Valores antigos restantes: %', old_values_count;
  
  IF old_values_count > 0 THEN
    RAISE WARNING 'Ainda existem % registros com valores antigos!', old_values_count;
  ELSE
    RAISE NOTICE '✅ Todos os registros foram migrados com sucesso!';
  END IF;
END;
$$;