-- Script para corrigir relacionamentos entre tabelas
-- Este script deve ser executado no SQL Editor do Supabase

-- 1. Verificar foreign keys existentes
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  a.attname as column_name,
  confrelid::regclass as foreign_table_name,
  af.attname as foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
WHERE c.contype = 'f'
AND conrelid::regclass::text IN ('pipeline_custom_fields', 'cadence_configs', 'cadence_tasks')
ORDER BY conrelid::regclass::text, conname;

-- 2. Criar foreign key para pipeline_custom_fields se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_pipeline_custom_fields_pipeline_id'
  ) THEN
    ALTER TABLE pipeline_custom_fields
    ADD CONSTRAINT fk_pipeline_custom_fields_pipeline_id
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key criada: pipeline_custom_fields.pipeline_id → pipelines.id';
  ELSE
    RAISE NOTICE 'Foreign key já existe: pipeline_custom_fields.pipeline_id → pipelines.id';
  END IF;
END $$;

-- 3. Verificar se cadence_configs tem coluna pipeline_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cadence_configs' 
    AND column_name = 'pipeline_id'
  ) THEN
    -- Criar foreign key para cadence_configs se pipeline_id existir
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'fk_cadence_configs_pipeline_id'
    ) THEN
      ALTER TABLE cadence_configs
      ADD CONSTRAINT fk_cadence_configs_pipeline_id
      FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
      RAISE NOTICE 'Foreign key criada: cadence_configs.pipeline_id → pipelines.id';
    ELSE
      RAISE NOTICE 'Foreign key já existe: cadence_configs.pipeline_id → pipelines.id';
    END IF;
  ELSE
    RAISE NOTICE 'Coluna pipeline_id não existe em cadence_configs';
  END IF;
END $$;

-- 4. Criar foreign key para cadence_tasks se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_cadence_tasks_cadence_config_id'
  ) THEN
    ALTER TABLE cadence_tasks
    ADD CONSTRAINT fk_cadence_tasks_cadence_config_id
    FOREIGN KEY (cadence_config_id) REFERENCES cadence_configs(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key criada: cadence_tasks.cadence_config_id → cadence_configs.id';
  ELSE
    RAISE NOTICE 'Foreign key já existe: cadence_tasks.cadence_config_id → cadence_configs.id';
  END IF;
END $$;

-- 5. Verificar foreign keys após correções
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  a.attname as column_name,
  confrelid::regclass as foreign_table_name,
  af.attname as foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
WHERE c.contype = 'f'
AND conrelid::regclass::text IN ('pipeline_custom_fields', 'cadence_configs', 'cadence_tasks')
ORDER BY conrelid::regclass::text, conname;