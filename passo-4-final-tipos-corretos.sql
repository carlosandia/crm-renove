-- =====================================================
-- VERIFICAR TIPOS DA TABELA PIPELINES PRIMEIRO
-- Execute esta query para ver os tipos corretos:
-- =====================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pipelines' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ✅ Execute isso primeiro para ver se tenant_id é UUID ou TEXT
-- ✅ Depois execute a função abaixo com os tipos corretos 