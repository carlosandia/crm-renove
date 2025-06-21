-- SCRIPT TEMPORÁRIO PARA DESABILITAR RLS NAS TABELAS DE FORMULÁRIOS
-- Execute este script no painel SQL do Supabase APENAS PARA TESTE

-- ⚠️ ATENÇÃO: Este script é APENAS para desenvolvimento/teste
-- Em produção, use as políticas RLS adequadas

-- 1. Desabilitar RLS temporariamente
ALTER TABLE public.custom_forms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions DISABLE ROW LEVEL SECURITY;

-- 2. Verificar status do RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('custom_forms', 'form_fields', 'form_submissions')
ORDER BY tablename;

-- 3. Para REABILITAR RLS depois dos testes, execute:
-- ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
