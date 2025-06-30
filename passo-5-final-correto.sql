-- =====================================================
-- PASSO 5 FINAL: Permissões e teste com tipos corretos
-- Execute APÓS executar funcao-correta-final.sql
-- =====================================================

-- Dar permissões para a aplicação usar a função
GRANT EXECUTE ON FUNCTION validate_pipeline_name_unique TO authenticated;
GRANT EXECUTE ON FUNCTION validate_pipeline_name_unique TO anon;

-- Teste com tipos corretos conforme verificação:
-- tenant_id = TEXT, pipeline_id = UUID
SELECT validate_pipeline_name_unique(
  'Pipeline Teste Final', 
  'dc2f1fc5-53b5-4f54-bb56-009f58481b97',  -- TEXT (tenant_id)
  NULL::UUID  -- UUID (pipeline_id, opcional)
) as teste_validacao; 