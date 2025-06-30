-- ANÁLISE COMPLETA DO BANCO ATUAL
-- Execute este SQL primeiro para entender o estado atual

-- 1. VERIFICAR SE A TABELA FORMS EXISTE
SELECT 
    'TABELA FORMS' as categoria,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forms') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status;

-- 2. LISTAR TODAS AS COLUNAS DA TABELA FORMS (SE EXISTIR)
SELECT 
    'COLUNAS ATUAIS DA TABELA FORMS' as categoria,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'forms'
ORDER BY ordinal_position;

-- 3. VERIFICAR COLUNAS ESPECÍFICAS CRÍTICAS
SELECT 
    'VERIFICAÇÃO COLUNAS CRÍTICAS' as categoria,
    'tenant_id' as coluna_necessaria,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'tenant_id') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status
UNION ALL
SELECT 
    'VERIFICAÇÃO COLUNAS CRÍTICAS',
    'form_type',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'form_type') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END
UNION ALL
SELECT 
    'VERIFICAÇÃO COLUNAS CRÍTICAS',
    'fields',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'fields') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END;

-- 4. VERIFICAR CONSTRAINTS E ÍNDICES EXISTENTES
SELECT 
    'CONSTRAINTS EXISTENTES' as categoria,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'forms';

-- 5. VERIFICAR ÍNDICES EXISTENTES
SELECT 
    'ÍNDICES EXISTENTES' as categoria,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'forms';

-- 6. VERIFICAR OUTRAS TABELAS RELACIONADAS
SELECT 
    'TABELAS RELACIONADAS' as categoria,
    table_name,
    CASE 
        WHEN table_name = 'form_analytics' THEN 'Analytics'
        WHEN table_name = 'form_ab_tests' THEN 'A/B Tests'
        WHEN table_name = 'form_ab_stats' THEN 'A/B Stats'
        WHEN table_name = 'form_interactions' THEN 'Interactions'
        WHEN table_name = 'pipelines' THEN 'Pipelines (para referência)'
        WHEN table_name = 'users' THEN 'Users (para referência)'
        ELSE 'Outra'
    END as descricao
FROM information_schema.tables 
WHERE table_name IN ('form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions', 'pipelines', 'users')
ORDER BY table_name;

-- 7. VERIFICAR ESTRUTURA DE TABELAS QUE TÊM tenant_id (PARA REFERÊNCIA)
SELECT 
    'TABELAS COM tenant_id' as categoria,
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE column_name = 'tenant_id' 
AND table_name IN ('users', 'pipelines', 'companies', 'leads', 'deals')
ORDER BY table_name;

-- 8. VERIFICAR DADOS EXISTENTES NA TABELA FORMS (SE EXISTIR)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forms') THEN
        -- Contar registros
        RAISE NOTICE 'DADOS EXISTENTES: Verificando...';
        
        -- Se a tabela existir, mostrar contagem
        PERFORM pg_advisory_lock(12345);
        RAISE NOTICE 'Tabela forms encontrada - executando contagem';
        PERFORM pg_advisory_unlock(12345);
    ELSE
        RAISE NOTICE 'DADOS EXISTENTES: Tabela forms não existe';
    END IF;
END $$;

-- 9. CONTAGEM DE DADOS (TENTATIVA SEGURA)
SELECT 
    'DADOS ATUAIS' as categoria,
    COUNT(*) as total_forms
FROM forms
WHERE 1=1; -- Esta query pode falhar se a tabela não existir, mas isso é esperado

-- 10. RESUMO FINAL PARA DECISÃO
SELECT 
    'RESUMO PARA MIGRAÇÃO' as categoria,
    'Baseado na análise acima, determinar:' as instrucao,
    '1. Se a tabela forms existe' as passo1,
    '2. Quais colunas faltam' as passo2,
    '3. Se há dados existentes' as passo3,
    '4. Estratégia de migração' as passo4; 