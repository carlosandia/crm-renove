-- EXECUTE ESTE SQL NO SUPABASE PARA LIMPAR TUDO

-- 1. Desabilitar RLS completamente
ALTER TABLE user_pipeline_links DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas possíveis (forçando remoção)
DO $$
DECLARE
    pol_name TEXT;
BEGIN
    -- Buscar e remover todas as políticas da tabela
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_pipeline_links'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON user_pipeline_links';
    END LOOP;
END $$;

-- 3. Verificar se todas foram removidas
SELECT 
    COUNT(*) as total_politicas_restantes
FROM pg_policies 
WHERE tablename = 'user_pipeline_links';

-- 4. Reabilitar RLS
ALTER TABLE user_pipeline_links ENABLE ROW LEVEL SECURITY;

-- 5. Criar política com timestamp único
CREATE POLICY user_pipeline_links_final_policy ON user_pipeline_links
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 6. Confirmar que funcionou
SELECT 
    'SUCCESS: Política criada com sucesso!' as status,
    policyname
FROM pg_policies 
WHERE tablename = 'user_pipeline_links'; 