-- =====================================================
-- PASSO 4 FINAL: Remover versões antigas e criar função definitiva
-- Execute para resolver o conflito de funções
-- =====================================================

-- REMOVER TODAS AS VERSÕES DA FUNÇÃO (resolve ambiguidade)
DROP FUNCTION IF EXISTS validate_pipeline_name_unique(TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS validate_pipeline_name_unique(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS validate_pipeline_name_unique(TEXT, UUID);
DROP FUNCTION IF EXISTS validate_pipeline_name_unique(TEXT, TEXT);

-- CRIAR VERSÃO ÚNICA E DEFINITIVA (com tipos corretos)
CREATE OR REPLACE FUNCTION validate_pipeline_name_unique(
  p_name TEXT,
  p_tenant_id TEXT,
  p_pipeline_id TEXT DEFAULT NULL
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
  WHERE tenant_id = p_tenant_id
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