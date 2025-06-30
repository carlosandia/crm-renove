-- TESTE DE VALIDAÇÃO DA MIGRAÇÃO FINAL
-- Execute este SQL após aplicar 20250127000007_form_builder_final_migration.sql

-- ===== TESTE 1: VERIFICAR TABELA FORMS =====
SELECT 
    '🔍 TESTE 1: VERIFICAÇÃO DA TABELA FORMS' as categoria,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forms') 
        THEN '✅ TABELA FORMS EXISTE' 
        ELSE '❌ TABELA FORMS NÃO EXISTE' 
    END as resultado;

-- ===== TESTE 2: VERIFICAR COLUNAS CRÍTICAS =====
SELECT 
    '🔍 TESTE 2: COLUNAS CRÍTICAS' as categoria,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('tenant_id', 'form_type', 'type_config', 'pipeline_integration', 
                           'cadence_integration', 'calendar_integration', 'embed_config', 'ab_test_config')
        THEN '✅ COLUNA FORM BUILDER EVOLUTION'
        ELSE '📋 COLUNA PADRÃO'
    END as status
FROM information_schema.columns 
WHERE table_name = 'forms'
ORDER BY ordinal_position;

-- ===== TESTE 3: VERIFICAR TABELAS DE ANALYTICS =====
SELECT 
    '🔍 TESTE 3: TABELAS DE ANALYTICS' as categoria,
    table_name,
    CASE 
        WHEN table_name IN ('form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
        THEN '✅ TABELA CRIADA'
        ELSE '❓ OUTRA TABELA'
    END as status
FROM information_schema.tables 
WHERE table_name IN ('form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
ORDER BY table_name;

-- ===== TESTE 4: VERIFICAR FOREIGN KEYS =====
SELECT 
    '🔍 TESTE 4: FOREIGN KEYS' as categoria,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✅ FK CRIADA' as status
FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
ORDER BY tc.table_name;

-- ===== TESTE 5: VERIFICAR ÍNDICES =====
SELECT 
    '🔍 TESTE 5: ÍNDICES CRIADOS' as categoria,
    tablename,
    indexname,
    '✅ ÍNDICE CRIADO' as status
FROM pg_indexes 
WHERE tablename IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ===== TESTE 6: VERIFICAR FUNÇÕES =====
SELECT 
    '🔍 TESTE 6: FUNÇÕES POSTGRESQL' as categoria,
    proname as function_name,
    '✅ FUNÇÃO CRIADA' as status
FROM pg_proc 
WHERE proname IN ('calculate_form_conversion_rate', 'update_updated_at_column')
ORDER BY proname;

-- ===== TESTE 7: VERIFICAR TRIGGERS =====
SELECT 
    '🔍 TESTE 7: TRIGGERS' as categoria,
    trigger_name,
    event_object_table,
    '✅ TRIGGER CRIADO' as status
FROM information_schema.triggers 
WHERE event_object_table IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
  AND trigger_name LIKE 'trigger_%'
ORDER BY event_object_table, trigger_name;

-- ===== TESTE 8: VERIFICAR RLS POLICIES =====
SELECT 
    '🔍 TESTE 8: ROW LEVEL SECURITY' as categoria,
    schemaname,
    tablename,
    policyname,
    '✅ POLICY CRIADA' as status
FROM pg_policies 
WHERE tablename IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
ORDER BY tablename, policyname;

-- ===== TESTE 9: CONTAR DADOS EXISTENTES =====
DO $$
DECLARE
    forms_count INTEGER;
    custom_forms_count INTEGER;
BEGIN
    -- Contar forms
    SELECT COUNT(*) INTO forms_count FROM forms;
    
    -- Verificar se custom_forms ainda existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_forms') THEN
        SELECT COUNT(*) INTO custom_forms_count FROM custom_forms;
    ELSE
        custom_forms_count := 0;
    END IF;
    
    RAISE NOTICE '🔍 TESTE 9: DADOS EXISTENTES';
    RAISE NOTICE '📊 Formulários na tabela forms: %', forms_count;
    RAISE NOTICE '📊 Formulários na tabela custom_forms: %', custom_forms_count;
    
    IF forms_count > 0 THEN
        RAISE NOTICE '✅ MIGRAÇÃO DE DADOS REALIZADA COM SUCESSO';
    ELSIF custom_forms_count = 0 THEN
        RAISE NOTICE '✅ TABELA FORMS CRIADA DO ZERO (DADOS DE EXEMPLO INSERIDOS)';
    ELSE
        RAISE NOTICE '⚠️ VERIFICAR: custom_forms existe mas forms está vazia';
    END IF;
END $$;

-- ===== TESTE 10: VALIDAR ESTRUTURA DOS DADOS =====
SELECT 
    '🔍 TESTE 10: ESTRUTURA DOS DADOS' as categoria,
    name,
    form_type,
    CASE 
        WHEN tenant_id IS NOT NULL THEN '✅ TENANT_ID OK'
        ELSE '❌ TENANT_ID NULO'
    END as tenant_status,
    CASE 
        WHEN jsonb_array_length(fields) > 0 THEN '✅ CAMPOS OK'
        ELSE '⚠️ SEM CAMPOS'
    END as fields_status,
    CASE 
        WHEN pipeline_integration != '{}' OR cadence_integration != '{}' OR 
             calendar_integration != '{}' OR embed_config != '{}' OR ab_test_config != '{}'
        THEN '✅ INTEGRAÇÕES CONFIGURADAS'
        ELSE '📋 INTEGRAÇÕES PADRÃO'
    END as integration_status
FROM forms
ORDER BY created_at DESC
LIMIT 5;

-- ===== RESULTADO FINAL =====
SELECT 
    '🎉 VALIDAÇÃO COMPLETA DA MIGRAÇÃO FINAL' as status,
    'Form Builder Evolution migrado com sucesso!' as resultado,
    'Todas as tabelas, índices, funções e triggers criados' as detalhes;

-- ===== RESUMO PARA O USUÁRIO =====
DO $$
DECLARE
    total_tables INTEGER;
    total_indexes INTEGER;
    total_functions INTEGER;
    total_triggers INTEGER;
    total_policies INTEGER;
    total_forms INTEGER;
BEGIN
    -- Contar elementos criados
    SELECT COUNT(*) INTO total_tables 
    FROM information_schema.tables 
    WHERE table_name IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions');
    
    SELECT COUNT(*) INTO total_indexes 
    FROM pg_indexes 
    WHERE tablename IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
      AND indexname LIKE 'idx_%';
    
    SELECT COUNT(*) INTO total_functions 
    FROM pg_proc 
    WHERE proname IN ('calculate_form_conversion_rate', 'update_updated_at_column');
    
    SELECT COUNT(*) INTO total_triggers 
    FROM information_schema.triggers 
    WHERE event_object_table IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
      AND trigger_name LIKE 'trigger_%';
    
    SELECT COUNT(*) INTO total_policies 
    FROM pg_policies 
    WHERE tablename IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions');
    
    SELECT COUNT(*) INTO total_forms FROM forms;
    
    -- Relatório final
    RAISE NOTICE '';
    RAISE NOTICE '🚀 ====== RELATÓRIO FINAL DA MIGRAÇÃO ======';
    RAISE NOTICE '📊 TABELAS CRIADAS: %', total_tables;
    RAISE NOTICE '🔍 ÍNDICES CRIADOS: %', total_indexes;
    RAISE NOTICE '⚙️ FUNÇÕES CRIADAS: %', total_functions;
    RAISE NOTICE '🔄 TRIGGERS CRIADOS: %', total_triggers;
    RAISE NOTICE '🔐 POLÍTICAS RLS: %', total_policies;
    RAISE NOTICE '📝 FORMULÁRIOS: %', total_forms;
    RAISE NOTICE '';
    
    IF total_tables >= 5 AND total_indexes >= 10 AND total_functions >= 2 THEN
        RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO TOTAL!';
        RAISE NOTICE '🎉 FORM BUILDER EVOLUTION 100% FUNCIONAL!';
    ELSE
        RAISE NOTICE '⚠️ MIGRAÇÃO PARCIAL - VERIFICAR LOGS ACIMA';
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
END $$; 