-- =====================================================
-- PASSO 4 CORRIGIDO: Função de validação com tipos corretos
-- Execute esta versão corrigida
-- =====================================================

CREATE OR REPLACE FUNCTION validate_pipeline_name_unique(
  p_name TEXT,
  p_tenant_id TEXT,  -- Mudou de UUID para TEXT
  p_pipeline_id TEXT DEFAULT NULL  -- Mudou de UUID para TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  name_clean TEXT;
  existing_count INTEGER;
BEGIN
  name_clean := LOWER(TRIM(p_name));
  
  IF name_clean = '' OR name_clean IS NULL THEN
    RETURN '{"is_valid": false, "error": "Nome obrigatório"}'::jsonb;
  END IF;
  
  SELECT COUNT(*) INTO existing_count
  FROM pipelines
  WHERE tenant_id = p_tenant_id  -- Agora ambos são TEXT
    AND LOWER(TRIM(name)) = name_clean
    AND (p_pipeline_id IS NULL OR id != p_pipeline_id);
  
  IF existing_count = 0 THEN
    RETURN '{"is_valid": true}'::jsonb;
  ELSE
    RETURN jsonb_build_object(
      'is_valid', false,
      'error', 'Pipeline com este nome já existe',
      'suggestion', p_name || ' (2)'
    );
  END IF;
END;
$$; 