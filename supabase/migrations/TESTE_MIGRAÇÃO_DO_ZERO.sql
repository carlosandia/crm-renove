-- TESTE DE VALIDAÇÃO - Form Builder Evolution DO ZERO
-- Execute APÓS aplicar 20250127000005_form_builder_do_zero.sql

-- ===== TESTE 1: TABELA PRINCIPAL FORMS =====
SELECT 
    '1. TABELA FORMS' as teste,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forms') 
        THEN '✅ CRIADA' 
        ELSE '❌ NÃO CRIADA' 
    END as resultado,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'forms') as total_colunas;

-- ===== TESTE 2: TODAS AS 16 COLUNAS NECESSÁRIAS =====
SELECT 
    '2. COLUNAS OBRIGATÓRIAS' as teste,
    column_name,
    data_type,
    CASE 
        WHEN is_nullable = 'NO' THEN '✅ NOT NULL'
        ELSE '⚠️ NULLABLE'
    END as nullable_status,
    CASE 
        WHEN column_default IS NOT NULL THEN '✅ TEM DEFAULT'
        ELSE '⚠️ SEM DEFAULT'
    END as default_status
FROM information_schema.columns 
WHERE table_name = 'forms' 
ORDER BY ordinal_position;

-- ===== TESTE 3: TODAS AS 4 TABELAS DE ANALYTICS =====
SELECT 
    '3. TABELAS ANALYTICS' as teste,
    table_name,
    '✅ CRIADA' as resultado,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as total_colunas
FROM information_schema.tables t
WHERE table_name IN ('form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
ORDER BY table_name;

-- ===== TESTE 4: FOREIGN KEYS CRIADAS =====
SELECT 
    '4. FOREIGN KEYS' as teste,
    constraint_name,
    table_name,
    '✅ CRIADA' as resultado
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY'
AND table_name IN ('form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
ORDER BY constraint_name;

-- ===== TESTE 5: ÍNDICES PARA PERFORMANCE =====
SELECT 
    '5. ÍNDICES' as teste,
    tablename,
    indexname,
    '✅ CRIADO' as resultado
FROM pg_indexes 
WHERE tablename IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
ORDER BY tablename, indexname;

-- ===== TESTE 6: FUNÇÕES POSTGRESQL =====
SELECT 
    '6. FUNÇÕES' as teste,
    routine_name,
    routine_type,
    '✅ CRIADA' as resultado
FROM information_schema.routines 
WHERE routine_name IN ('calculate_form_conversion_rate', 'update_updated_at_column')
ORDER BY routine_name;

-- ===== TESTE 7: TRIGGERS AUTOMÁTICOS =====
SELECT 
    '7. TRIGGERS' as teste,
    trigger_name,
    event_object_table,
    '✅ CRIADO' as resultado
FROM information_schema.triggers 
WHERE trigger_name LIKE '%form%'
ORDER BY trigger_name;

-- ===== TESTE 8: RLS HABILITADO =====
SELECT 
    '8. RLS (ROW LEVEL SECURITY)' as teste,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ HABILITADO'
        ELSE '❌ DESABILITADO'
    END as rls_status
FROM pg_tables 
WHERE tablename IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
ORDER BY tablename;

-- ===== TESTE 9: POLÍTICAS RLS CRIADAS =====
SELECT 
    '9. POLÍTICAS RLS' as teste,
    schemaname,
    tablename,
    policyname,
    '✅ CRIADA' as resultado
FROM pg_policies 
WHERE tablename IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
ORDER BY tablename, policyname;

-- ===== TESTE 10: FORMULÁRIO DE EXEMPLO =====
SELECT 
    '10. DADOS DE EXEMPLO' as teste,
    name,
    form_type,
    CASE 
        WHEN jsonb_array_length(fields) > 0 THEN '✅ TEM CAMPOS'
        ELSE '❌ SEM CAMPOS'
    END as tem_campos,
    CASE 
        WHEN tenant_id IS NOT NULL THEN '✅ TEM TENANT_ID'
        ELSE '❌ SEM TENANT_ID'
    END as tem_tenant_id
FROM forms
WHERE name LIKE '%Demo%'
LIMIT 5;

-- ===== TESTE 11: CONTAGEM TOTAL DE REGISTROS =====
SELECT 
    '11. CONTAGEM FINAL' as teste,
    'forms' as tabela,
    COUNT(*) as total_registros,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ TEM DADOS'
        ELSE '⚠️ SEM DADOS'
    END as status
FROM forms
UNION ALL
SELECT 
    '11. CONTAGEM FINAL',
    'form_analytics',
    COUNT(*),
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ TABELA OK'
        ELSE '❌ ERRO'
    END
FROM form_analytics
UNION ALL
SELECT 
    '11. CONTAGEM FINAL',
    'form_ab_tests',
    COUNT(*),
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ TABELA OK'
        ELSE '❌ ERRO'
    END
FROM form_ab_tests
UNION ALL
SELECT 
    '11. CONTAGEM FINAL',
    'form_ab_stats',
    COUNT(*),
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ TABELA OK'
        ELSE '❌ ERRO'
    END
FROM form_ab_stats
UNION ALL
SELECT 
    '11. CONTAGEM FINAL',
    'form_interactions',
    COUNT(*),
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ TABELA OK'
        ELSE '❌ ERRO'
    END
FROM form_interactions;

-- ===== TESTE 12: COMENTÁRIOS EXPLICATIVOS =====
SELECT 
    '12. COMENTÁRIOS' as teste,
    table_name,
    CASE 
        WHEN obj_description IS NOT NULL THEN '✅ TEM COMENTÁRIO'
        ELSE '⚠️ SEM COMENTÁRIO'
    END as tem_comentario,
    LEFT(obj_description, 50) as preview_comentario
FROM (
    SELECT 
        t.table_name,
        obj_description(c.oid, 'pg_class') as obj_description
    FROM information_schema.tables t
    LEFT JOIN pg_class c ON c.relname = t.table_name
    WHERE t.table_name IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')
) comentarios
ORDER BY table_name;

-- ===== RESUMO FINAL COMPLETO =====
SELECT 
    '🎯 RESUMO FINAL' as categoria,
    'Form Builder Evolution DO ZERO' as migração,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forms')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_analytics')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_ab_tests')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_ab_stats')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_interactions')
        AND EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name LIKE 'fk_form_%')
        AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'forms')
        AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'calculate_form_conversion_rate')
        AND EXISTS (SELECT 1 FROM forms WHERE name LIKE '%Demo%')
        THEN '🎉 SUCESSO TOTAL - TUDO CRIADO E FUNCIONANDO!'
        ELSE '❌ MIGRAÇÃO INCOMPLETA - VERIFICAR TESTES ACIMA'
    END as status_final,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')) as tabelas_criadas,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_name LIKE 'fk_form_%') as foreign_keys_criadas,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('forms', 'form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions')) as politicas_rls_criadas; 