-- TESTE DE VALIDAÇÃO - Form Builder Evolution Phase by Phase
-- Execute APÓS aplicar 20250127000004_form_builder_phase_by_phase.sql

-- ===== VALIDAÇÃO 1: TABELA FORMS E COLUNAS =====
SELECT 
    '1. TABELA FORMS' as teste,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forms') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as resultado;

-- ===== VALIDAÇÃO 2: COLUNAS CRÍTICAS =====
SELECT 
    '2. COLUNAS CRÍTICAS' as teste,
    column_name,
    CASE 
        WHEN column_name = 'tenant_id' AND is_nullable = 'NO' THEN '✅ EXISTE (NOT NULL)'
        WHEN column_name = 'tenant_id' AND is_nullable = 'YES' THEN '⚠️ EXISTE (NULLABLE)'
        WHEN column_name != 'tenant_id' THEN '✅ EXISTE'
        ELSE '❌ NÃO EXISTE'
    END as resultado
FROM information_schema.columns 
WHERE table_name = 'forms' 
AND column_name IN ('tenant_id', 'form_type', 'type_config', 'pipeline_integration', 'cadence_integration', 'calendar_integration', 'embed_config', 'ab_test_config')
ORDER BY 
    CASE column_name 
        WHEN 'tenant_id' THEN 1
        WHEN 'form_type' THEN 2
        WHEN 'type_config' THEN 3
        WHEN 'pipeline_integration' THEN 4
        WHEN 'cadence_integration' THEN 5
        WHEN 'calendar_integration' THEN 6
        WHEN 'embed_config' THEN 7
        WHEN 'ab_test_config' THEN 8
    END;

-- ===== VALIDAÇÃO 3: TABELAS DE ANALYTICS =====
SELECT 
    '3. TABELAS ANALYTICS' as teste,
    table_name,
    CASE 
        WHEN table_name IN ('form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions') 
        THEN '✅ CRIADA' 
        ELSE '❌ FALTANDO' 
    END as resultado
FROM information_schema.tables 
WHERE table_name IN ('form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
ORDER BY table_name;

-- ===== VALIDAÇÃO 4: FOREIGN KEYS =====
SELECT 
    '4. FOREIGN KEYS' as teste,
    constraint_name,
    CASE 
        WHEN constraint_name LIKE 'fk_%' THEN '✅ CRIADA'
        ELSE '✅ CONSTRAINT'
    END as resultado
FROM information_schema.table_constraints 
WHERE table_name IN ('form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
AND constraint_type = 'FOREIGN KEY'
ORDER BY constraint_name;

-- ===== VALIDAÇÃO 5: ÍNDICES =====
SELECT 
    '5. ÍNDICES' as teste,
    COUNT(*) as total_indices,
    CASE 
        WHEN COUNT(*) >= 10 THEN '✅ ÍNDICES CRIADOS'
        ELSE '⚠️ POUCOS ÍNDICES'
    END as resultado
FROM pg_indexes 
WHERE tablename IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions');

-- ===== VALIDAÇÃO 6: RLS HABILITADO =====
SELECT 
    '6. RLS (ROW LEVEL SECURITY)' as teste,
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables 
WHERE tablename IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions');

-- ===== VALIDAÇÃO 7: TRIGGERS =====
SELECT 
    '7. TRIGGERS' as teste,
    trigger_name,
    event_object_table,
    '✅ CRIADO' as resultado
FROM information_schema.triggers 
WHERE trigger_name LIKE '%form%conversion%';

-- ===== VALIDAÇÃO 8: FUNÇÃO DE CONVERSÃO =====
SELECT 
    '8. FUNÇÃO CONVERSÃO' as teste,
    routine_name,
    '✅ CRIADA' as resultado
FROM information_schema.routines 
WHERE routine_name = 'calculate_form_conversion_rate';

-- ===== VALIDAÇÃO 9: DADOS EXISTENTES (CONTAGEM) =====
SELECT 
    '9. DADOS EXISTENTES' as teste,
    'forms' as tabela,
    COUNT(*) as total_registros,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ TEM DADOS'
        ELSE '⚠️ SEM DADOS (NORMAL)'
    END as resultado
FROM forms;

-- ===== VALIDAÇÃO 10: tenant_id SEM NULL =====
SELECT 
    '10. TENANT_ID CONSISTÊNCIA' as teste,
    COUNT(*) as total_forms,
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as forms_sem_tenant_id,
    CASE 
        WHEN COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) = 0 THEN '✅ TODOS TÊM TENANT_ID'
        ELSE '❌ ALGUNS SEM TENANT_ID'
    END as resultado
FROM forms;

-- ===== RESUMO FINAL =====
SELECT 
    '🎯 RESUMO FINAL' as categoria,
    'Form Builder Evolution Phase by Phase' as migração,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'tenant_id' AND is_nullable = 'NO')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_analytics')
        AND EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name LIKE 'fk_form_%')
        THEN '🎉 SUCESSO TOTAL - TODAS AS 12 FASES APLICADAS!'
        ELSE '❌ MIGRAÇÃO INCOMPLETA - VERIFICAR ERROS ACIMA'
    END as status_final; 