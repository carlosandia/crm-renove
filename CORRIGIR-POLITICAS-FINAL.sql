-- EXECUTE ESTE SQL NO SUPABASE PARA CORRIGIR DEFINITIVAMENTE

-- 1. Desabilitar RLS temporariamente para limpar tudo
ALTER TABLE user_pipeline_links DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas existentes (incluindo a que já existe)
DROP POLICY IF EXISTS "allow_all_user_pipeline_links" ON user_pipeline_links;
DROP POLICY IF EXISTS "Users can view their own pipeline links" ON user_pipeline_links;
DROP POLICY IF EXISTS "Admins can create pipeline links" ON user_pipeline_links;
DROP POLICY IF EXISTS "Users can delete their own pipeline links" ON user_pipeline_links;
DROP POLICY IF EXISTS "Enable read access for users" ON user_pipeline_links;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_pipeline_links;
DROP POLICY IF EXISTS "Enable delete for own records" ON user_pipeline_links;
DROP POLICY IF EXISTS "allow_all_operations" ON user_pipeline_links;
DROP POLICY IF EXISTS "user_pipeline_links_policy" ON user_pipeline_links;

-- 3. Reabilitar RLS
ALTER TABLE user_pipeline_links ENABLE ROW LEVEL SECURITY;

-- 4. Criar nova política com nome único
CREATE POLICY "user_pipeline_links_allow_all_v2" ON user_pipeline_links
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 5. Verificar se funcionou
SELECT 
    schemaname, 
    tablename, 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'user_pipeline_links';

-- 6. Teste de inserção (substitua pelos IDs reais do seu usuário e pipeline)
-- SELECT 'Teste: Pronto para vincular pipelines!' as status; 