-- EXECUTE ESTE SQL NO SUPABASE PARA CORRIGIR RLS DEFINITIVAMENTE

-- 1. Remover políticas existentes que podem estar causando problemas
DROP POLICY IF EXISTS "Users can view their own pipeline links" ON user_pipeline_links;
DROP POLICY IF EXISTS "Admins can create pipeline links" ON user_pipeline_links;
DROP POLICY IF EXISTS "Users can delete their own pipeline links" ON user_pipeline_links;
DROP POLICY IF EXISTS "Enable read access for users" ON user_pipeline_links;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_pipeline_links;
DROP POLICY IF EXISTS "Enable delete for own records" ON user_pipeline_links;

-- 2. Criar políticas mais simples e funcionais
CREATE POLICY "Allow all operations for authenticated users" ON user_pipeline_links
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_pipeline_links';

-- 4. Verificar se a tabela está funcionando
SELECT COUNT(*) as total_links FROM user_pipeline_links; 