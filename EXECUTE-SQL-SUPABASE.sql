-- EXECUTE ESTE SQL NO SUPABASE DASHBOARD
-- Para resolver o erro da tabela user_pipeline_links

-- 1. Criar tabela user_pipeline_links
CREATE TABLE IF NOT EXISTS user_pipeline_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, pipeline_id)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_user_id ON user_pipeline_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_pipeline_id ON user_pipeline_links(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_created_at ON user_pipeline_links(created_at DESC);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE user_pipeline_links ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de segurança
CREATE POLICY "Users can view their own pipeline links" ON user_pipeline_links
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can create pipeline links" ON user_pipeline_links
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Users can delete their own pipeline links" ON user_pipeline_links
    FOR DELETE USING (user_id = auth.uid());

-- 5. Verificar se foi criada corretamente
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_pipeline_links'
ORDER BY ordinal_position; 