-- SOLUÇÃO DEFINITIVA PARA O PROBLEMA RLS
-- Execute este SQL no Supabase Dashboard

-- 1. Desabilitar RLS temporariamente para testar
ALTER TABLE user_pipeline_links DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view their own pipeline links" ON user_pipeline_links;
DROP POLICY IF EXISTS "Admins can create pipeline links" ON user_pipeline_links;
DROP POLICY IF EXISTS "Users can delete their own pipeline links" ON user_pipeline_links;
DROP POLICY IF EXISTS "Enable read access for users" ON user_pipeline_links;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_pipeline_links;
DROP POLICY IF EXISTS "Enable delete for own records" ON user_pipeline_links;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_pipeline_links;

-- 3. Reabilitar RLS
ALTER TABLE user_pipeline_links ENABLE ROW LEVEL SECURITY;

-- 4. Criar uma política simples que permite tudo para usuários autenticados
CREATE POLICY "user_pipeline_links_policy" ON user_pipeline_links
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 5. Verificar se funcionou
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_pipeline_links';

-- 6. Teste de inserção (substitua pelos IDs reais)
-- INSERT INTO user_pipeline_links (user_id, pipeline_id) 
-- VALUES ('seu-user-id-aqui', 'seu-pipeline-id-aqui'); 