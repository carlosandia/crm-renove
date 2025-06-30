-- =====================================================
-- PASSO 2: Corrigir duplicatas automaticamente
-- Execute APÓS confirmar que o PASSO 1 mostrou duplicatas
-- =====================================================

DO $$
DECLARE
  duplicate_record RECORD;
  counter INTEGER;
  new_name TEXT;
BEGIN
  FOR duplicate_record IN 
    SELECT 
      tenant_id,
      LOWER(TRIM(name)) as normalized_name,
      ARRAY_AGG(id ORDER BY created_at) as pipeline_ids,
      ARRAY_AGG(name ORDER BY created_at) as original_names
    FROM pipelines 
    GROUP BY tenant_id, LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  LOOP
    counter := 1;
    
    FOR i IN 2..array_length(duplicate_record.pipeline_ids, 1) LOOP
      counter := counter + 1;
      new_name := duplicate_record.original_names[1] || ' (' || counter || ')';
      
      UPDATE pipelines 
      SET name = new_name
      WHERE id = duplicate_record.pipeline_ids[i];
      
      RAISE NOTICE 'Renomeado: % -> %', duplicate_record.original_names[i], new_name;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Duplicatas corrigidas com sucesso!';
END $$; 