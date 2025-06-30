-- =====================================================
-- PASSO 1: Identificar duplicatas existentes
-- Cole e execute APENAS esta query primeiro:
-- =====================================================

SELECT 
  tenant_id,
  LOWER(TRIM(name)) as normalized_name,
  COUNT(*) as total_duplicates,
  ARRAY_AGG(id ORDER BY created_at) as pipeline_ids,
  ARRAY_AGG(name ORDER BY created_at) as original_names
FROM pipelines 
GROUP BY tenant_id, LOWER(TRIM(name))
HAVING COUNT(*) > 1
ORDER BY total_duplicates DESC; 