-- =====================================================
-- PASSO 5 FINAL: Permissões e teste com UUID
-- Execute APÓS executar passo-4-funcao-com-uuid.sql
-- =====================================================

-- Dar permissões para a aplicação usar a função
GRANT EXECUTE ON FUNCTION validate_pipeline_name_unique TO authenticated;
GRANT EXECUTE ON FUNCTION validate_pipeline_name_unique TO anon;

-- Teste rápido com UUID correto
SELECT validate_pipeline_name_unique(
  'Pipeline Teste', 
  'dc2f1fc5-53b5-4f54-bb56-009f58481b97'::uuid
) as teste_validacao; 