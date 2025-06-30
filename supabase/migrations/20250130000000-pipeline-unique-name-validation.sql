-- =====================================================
-- MIGRAÇÃO: VALIDAÇÃO DE NOMES ÚNICOS DE PIPELINES
-- Data: 2025-01-30
-- Descrição: Implementa validação enterprise para nomes únicos
--           de pipelines por tenant (case-insensitive)
-- =====================================================

-- 1. CRIAR ÍNDICE ÚNICO CASE-INSENSITIVE
-- =====================================================
-- Este índice garante que não podem existir duas pipelines com o mesmo nome
-- (ignorando maiúsculas/minúsculas) dentro do mesmo tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_pipelines_unique_name_per_tenant
ON pipelines (tenant_id, LOWER(TRIM(name)));

-- 2. FUNÇÃO DE VALIDAÇÃO DE NOME ÚNICO
-- =====================================================
-- Função que verifica se um nome de pipeline já existe para um tenant
-- Retorna sugestões automáticas caso o nome já esteja em uso
CREATE OR REPLACE FUNCTION validate_pipeline_name_unique(
  p_name TEXT,
  p_tenant_id UUID,
  p_pipeline_id UUID DEFAULT NULL -- Para edição, excluir o próprio pipeline
)
RETURNS JSONB AS $$
DECLARE
  name_clean TEXT;
  existing_count INTEGER;
  suggested_name TEXT;
  counter INTEGER := 1;
  result JSONB;
BEGIN
  -- Limpar e normalizar o nome
  name_clean := LOWER(TRIM(p_name));
  
  -- Verificar se nome está vazio
  IF name_clean = '' OR name_clean IS NULL THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'error', 'Nome da pipeline é obrigatório',
      'suggestion', NULL
    );
  END IF;
  
  -- Contar pipelines existentes com o mesmo nome (case-insensitive)
  SELECT COUNT(*) INTO existing_count
  FROM pipelines
  WHERE tenant_id = p_tenant_id
    AND LOWER(TRIM(name)) = name_clean
    AND is_active = true
    AND (p_pipeline_id IS NULL OR id != p_pipeline_id);
  
  -- Se não há conflito, nome é válido
  IF existing_count = 0 THEN
    RETURN jsonb_build_object(
      'is_valid', true,
      'error', NULL,
      'suggestion', NULL
    );
  END IF;
  
  -- Gerar sugestão automática para nome único
  suggested_name := p_name;
  LOOP
    counter := counter + 1;
    suggested_name := p_name || ' (' || counter || ')';
    
    SELECT COUNT(*) INTO existing_count
    FROM pipelines
    WHERE tenant_id = p_tenant_id
      AND LOWER(TRIM(name)) = LOWER(TRIM(suggested_name))
      AND is_active = true
      AND (p_pipeline_id IS NULL OR id != p_pipeline_id);
      
    -- Se encontrou nome único, parar
    IF existing_count = 0 THEN
      EXIT;
    END IF;
    
    -- Prevenir loop infinito
    IF counter > 100 THEN
      suggested_name := p_name || ' (' || EXTRACT(EPOCH FROM NOW())::INT || ')';
      EXIT;
    END IF;
  END LOOP;
  
  -- Retornar resultado com sugestão
  RETURN jsonb_build_object(
    'is_valid', false,
    'error', 'Já existe uma pipeline com este nome nesta empresa',
    'suggestion', suggested_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER PARA VALIDAÇÃO AUTOMÁTICA
-- =====================================================
-- Trigger que executa a validação automaticamente antes de INSERT/UPDATE
CREATE OR REPLACE FUNCTION trigger_validate_pipeline_name()
RETURNS TRIGGER AS $$
DECLARE
  validation_result JSONB;
BEGIN
  -- Executar validação
  SELECT validate_pipeline_name_unique(
    NEW.name,
    NEW.tenant_id,
    CASE WHEN TG_OP = 'UPDATE' THEN NEW.id ELSE NULL END
  ) INTO validation_result;
  
  -- Se não é válido, impedir operação
  IF NOT (validation_result->>'is_valid')::BOOLEAN THEN
    RAISE EXCEPTION 'PIPELINE_NAME_CONFLICT: %', validation_result->>'error'
      USING HINT = validation_result->>'suggestion';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para INSERT
DROP TRIGGER IF EXISTS trigger_pipeline_name_validation_insert ON pipelines;
CREATE TRIGGER trigger_pipeline_name_validation_insert
  BEFORE INSERT ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION trigger_validate_pipeline_name();

-- Criar trigger para UPDATE
DROP TRIGGER IF EXISTS trigger_pipeline_name_validation_update ON pipelines;
CREATE TRIGGER trigger_pipeline_name_validation_update
  BEFORE UPDATE ON pipelines
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name OR OLD.tenant_id IS DISTINCT FROM NEW.tenant_id)
  EXECUTE FUNCTION trigger_validate_pipeline_name();

-- 4. FUNÇÃO PARA OBTER SUGESTÕES (USADO PELO FRONTEND)
-- =====================================================
-- Função que o frontend pode chamar para validar e obter sugestões
-- antes mesmo de submeter o formulário
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
  -- Validar nome principal
  SELECT validate_pipeline_name_unique(p_name, p_tenant_id, p_pipeline_id)
  INTO validation_result;
  
  -- Buscar nomes similares para inspiração
  SELECT ARRAY_AGG(DISTINCT name ORDER BY name)
  INTO similar_names
  FROM pipelines
  WHERE tenant_id = p_tenant_id
    AND is_active = true
    AND (p_pipeline_id IS NULL OR id != p_pipeline_id)
    AND (
      LOWER(name) LIKE LOWER('%' || TRIM(p_name) || '%')
      OR LOWER(TRIM(p_name)) LIKE LOWER('%' || name || '%')
    )
  LIMIT 5;
  
  -- Retornar resultado completo
  RETURN jsonb_build_object(
    'validation', validation_result,
    'similar_names', COALESCE(similar_names, ARRAY[]::TEXT[]),
    'timestamp', EXTRACT(EPOCH FROM NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================
COMMENT ON INDEX idx_pipelines_unique_name_per_tenant IS 
'Índice único case-insensitive para nomes de pipelines por tenant - previne duplicatas';

COMMENT ON FUNCTION validate_pipeline_name_unique IS 
'Valida se nome de pipeline é único dentro do tenant e gera sugestões automáticas';

COMMENT ON FUNCTION get_pipeline_name_suggestions IS 
'Função para frontend obter validação e sugestões de nomes antes de submeter formulário';

-- 6. GRANT PERMISSIONS
-- =====================================================
-- Permitir que a aplicação execute as funções
GRANT EXECUTE ON FUNCTION validate_pipeline_name_unique TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_pipeline_name_suggestions TO authenticated, anon;

-- 7. LOG DA MIGRAÇÃO
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA: Pipeline Name Validation Enterprise';
  RAISE NOTICE '📋 Recursos implementados:';
  RAISE NOTICE '   • Índice único case-insensitive (nome + tenant_id)';
  RAISE NOTICE '   • Função de validação com sugestões automáticas';
  RAISE NOTICE '   • Triggers automáticos para INSERT/UPDATE';
  RAISE NOTICE '   • API para frontend (get_pipeline_name_suggestions)';
  RAISE NOTICE '   • Validação enterprise igual grandes CRMs';
  RAISE NOTICE '🎯 Sistema agora previne pipelines com nomes duplicados por empresa';
END $$; 