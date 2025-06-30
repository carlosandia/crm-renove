-- =====================================================
-- PASSO 5 CORRIGIDO: Permissões e teste final
-- Execute APÓS executar o passo-4-funcao-validacao-corrigida.sql
-- =====================================================

-- Dar permissões para a aplicação usar a função
GRANT EXECUTE ON FUNCTION validate_pipeline_name_unique TO authenticated;
GRANT EXECUTE ON FUNCTION validate_pipeline_name_unique TO anon;

-- Teste rápido com tipos corretos (TEXT em vez de UUID)
SELECT validate_pipeline_name_unique(
  'Pipeline Teste', 
  'dc2f1fc5-53b5-4f54-bb56-009f58481b97'  -- Agora como TEXT
) as teste_validacao; 