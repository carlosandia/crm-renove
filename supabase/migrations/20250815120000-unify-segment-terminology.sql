-- =====================================
-- MIGRAÇÃO: UNIFICAÇÃO DA TERMINOLOGIA
-- industry/segment → segmento
-- =====================================
-- Data: 2025-08-15
-- Objetivo: Eliminar inconsistências terminológicas conforme CLAUDE.md
-- Ref: Warning repetitivo "Empresa sem nicho definido" (CompanyList.tsx:110)

-- FASE 1: Criar novo campo 'segmento' unificado
-- =============================================

-- 1.1: Adicionar campo segmento na tabela companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS segmento TEXT;

-- 1.2: Migrar dados existentes (priorizar 'industry' sobre 'segment')
-- Regra: Se industry existe e não está vazio, usar industry
--        Senão, usar segment se existe
--        Senão, usar valor padrão
UPDATE companies 
SET segmento = CASE 
  WHEN industry IS NOT NULL AND TRIM(industry) != '' THEN TRIM(industry)
  WHEN segment IS NOT NULL AND TRIM(segment) != '' THEN TRIM(segment)
  ELSE 'Não definido'
END
WHERE segmento IS NULL;

-- 1.3: Validar migração de dados
-- AIDEV-NOTE: Log para verificar se migração foi bem-sucedida
DO $$
DECLARE
  total_companies INTEGER;
  companies_with_segmento INTEGER;
  companies_migrated_from_industry INTEGER;
  companies_migrated_from_segment INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_companies FROM companies;
  SELECT COUNT(*) INTO companies_with_segmento FROM companies WHERE segmento IS NOT NULL AND TRIM(segmento) != '';
  SELECT COUNT(*) INTO companies_migrated_from_industry FROM companies WHERE industry IS NOT NULL AND TRIM(industry) != '';
  SELECT COUNT(*) INTO companies_migrated_from_segment FROM companies WHERE segment IS NOT NULL AND TRIM(segment) != '';
  
  RAISE NOTICE 'MIGRAÇÃO SEGMENTO - Total empresas: %', total_companies;
  RAISE NOTICE 'MIGRAÇÃO SEGMENTO - Com segmento definido: %', companies_with_segmento;
  RAISE NOTICE 'MIGRAÇÃO SEGMENTO - Migradas de industry: %', companies_migrated_from_industry;
  RAISE NOTICE 'MIGRAÇÃO SEGMENTO - Migradas de segment: %', companies_migrated_from_segment;
END $$;

-- FASE 2: Atualizar constraints e indexes
-- ========================================

-- 2.1: Adicionar constraint NOT NULL no campo segmento
-- (depois de garantir que todos registros têm valor)
ALTER TABLE companies 
ALTER COLUMN segmento SET NOT NULL;

-- 2.2: Adicionar índice para performance em consultas por segmento
CREATE INDEX IF NOT EXISTS idx_companies_segmento 
ON companies (segmento);

-- 2.3: Adicionar índice composto para busca por nome + segmento
CREATE INDEX IF NOT EXISTS idx_companies_name_segmento 
ON companies (name, segmento);

-- FASE 3: Limpar campos obsoletos (AGUARDAR CONFIRMAÇÃO BACKEND)
-- =============================================================
-- AIDEV-NOTE: Estes drops serão executados após backend ser atualizado
-- para usar 'segmento' ao invés de 'industry'/'segment'

-- ⚠️ IMPORTANTE: Executar apenas após backend estar atualizado
-- DROP INDEX IF EXISTS idx_companies_industry;
-- DROP INDEX IF EXISTS idx_companies_segment;
-- ALTER TABLE companies DROP COLUMN IF EXISTS industry;
-- ALTER TABLE companies DROP COLUMN IF EXISTS segment;

-- FASE 4: Atualizar RLS policies se necessário
-- =============================================

-- Verificar se existem policies específicas para industry/segment
-- e atualizá-las para usar 'segmento'
-- (A ser verificado conforme políticas existentes)

-- FASE 5: Logs de validação final
-- ===============================

DO $$
DECLARE
  sample_companies RECORD;
  validation_count INTEGER;
BEGIN
  -- Mostrar algumas empresas como exemplo da migração
  RAISE NOTICE 'EXEMPLOS DE MIGRAÇÃO:';
  
  FOR sample_companies IN 
    SELECT name, segmento, 
           CASE WHEN industry IS NOT NULL THEN industry ELSE 'NULL' END as old_industry,
           CASE WHEN segment IS NOT NULL THEN segment ELSE 'NULL' END as old_segment
    FROM companies 
    ORDER BY created_at DESC 
    LIMIT 5
  LOOP
    RAISE NOTICE 'Empresa: % | Segmento: % | Industry: % | Segment: %', 
      sample_companies.name, 
      sample_companies.segmento,
      sample_companies.old_industry,
      sample_companies.old_segment;
  END LOOP;
  
  -- Validar que não há registros com segmento vazio
  SELECT COUNT(*) INTO validation_count 
  FROM companies 
  WHERE segmento IS NULL OR TRIM(segmento) = '';
  
  IF validation_count > 0 THEN
    RAISE EXCEPTION 'ERRO: % empresas ainda sem segmento definido!', validation_count;
  ELSE
    RAISE NOTICE 'VALIDAÇÃO OK: Todas as % empresas têm segmento definido', 
      (SELECT COUNT(*) FROM companies);
  END IF;
END $$;

-- =====================================
-- MIGRAÇÃO CONCLUÍDA - SEGMENTO UNIFICADO
-- =====================================
-- ✅ Campo 'segmento' criado e populado
-- ✅ Dados migrados de 'industry' e 'segment'
-- ✅ Índices criados para performance
-- ✅ Constraint NOT NULL aplicada
-- ⚠️  Campos 'industry' e 'segment' mantidos temporariamente
-- 📋 Próximo passo: Atualizar backend para usar 'segmento'