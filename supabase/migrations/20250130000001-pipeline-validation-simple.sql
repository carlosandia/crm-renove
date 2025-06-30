-- =====================================================
-- MIGRAÇÃO SIMPLIFICADA: VALIDAÇÃO DE NOMES ÚNICOS DE PIPELINES
-- Data: 2025-01-30
-- Aplicar no Supabase SQL Editor linha por linha
-- =====================================================

-- ETAPA 1: Criar índice único case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS idx_pipelines_unique_name_per_tenant
ON pipelines (tenant_id, LOWER(TRIM(name)));

-- ETAPA 2: Função de validação básica
CREATE OR REPLACE FUNCTION validate_pipeline_name_unique(
  p_name TEXT,
  p_tenant_id UUID,
  p_pipeline_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  name_clean TEXT;
  existing_count INTEGER;
  suggested_name TEXT;
BEGIN
  -- Limpar nome
  name_clean := LOWER(TRIM(p_name));
  
  -- Verificar se vazio
  IF name_clean = '' OR name_clean IS NULL THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'error', 'Nome da pipeline é obrigatório'
    );
  END IF;
  
  -- Contar existentes
  SELECT COUNT(*) INTO existing_count
  FROM pipelines
  WHERE tenant_id = p_tenant_id
    AND LOWER(TRIM(name)) = name_clean
    AND (p_pipeline_id IS NULL OR id != p_pipeline_id);
  
  -- Se válido
  IF existing_count = 0 THEN
    RETURN jsonb_build_object('is_valid', true);
  END IF;
  
  -- Gerar sugestão
  suggested_name := p_name || ' (2)';
  
  RETURN jsonb_build_object(
    'is_valid', false,
    'error', 'Pipeline com este nome já existe',
    'suggestion', suggested_name
  );
END;
$$ LANGUAGE plpgsql;

-- ETAPA 3: Função para frontend
CREATE OR REPLACE FUNCTION get_pipeline_name_suggestions(
  p_name TEXT,
  p_tenant_id UUID,
  p_pipeline_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  validation_result JSONB;
  similar_names TEXT[];
BEGIN
  -- Validar
  SELECT validate_pipeline_name_unique(p_name, p_tenant_id, p_pipeline_id)
  INTO validation_result;
  
  -- Buscar similares
  SELECT ARRAY_AGG(name)
  INTO similar_names
  FROM pipelines
  WHERE tenant_id = p_tenant_id
    AND LOWER(name) LIKE LOWER('%' || TRIM(p_name) || '%')
    AND (p_pipeline_id IS NULL OR id != p_pipeline_id)
  LIMIT 3;
  
  RETURN jsonb_build_object(
    'is_valid', (validation_result->>'is_valid')::BOOLEAN,
    'error', validation_result->>'error',
    'suggestion', validation_result->>'suggestion',
    'similar_names', COALESCE(similar_names, ARRAY[]::TEXT[])
  );
END;
$$ LANGUAGE plpgsql;

-- ETAPA 4: Permissões
GRANT EXECUTE ON FUNCTION validate_pipeline_name_unique TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_pipeline_name_suggestions TO authenticated, anon; 