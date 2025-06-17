-- ============================================
-- TABELA PARA VÍNCULOS USUÁRIO-PIPELINE
-- ============================================

-- Criar tabela de vínculos entre usuários e pipelines
CREATE TABLE IF NOT EXISTS user_pipeline_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar vínculos duplicados
    UNIQUE(user_id, pipeline_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_user_id ON user_pipeline_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_pipeline_id ON user_pipeline_links(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_user_pipeline_links_created_at ON user_pipeline_links(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE user_pipeline_links ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- Usuários podem ver seus próprios vínculos
CREATE POLICY "Users can view their own pipeline links" ON user_pipeline_links
    FOR SELECT USING (user_id = auth.uid());

-- Usuários podem criar seus próprios vínculos (apenas admins)
CREATE POLICY "Admins can create pipeline links" ON user_pipeline_links
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Usuários podem deletar seus próprios vínculos
CREATE POLICY "Users can delete their own pipeline links" ON user_pipeline_links
    FOR DELETE USING (user_id = auth.uid());

-- Comentários para documentação
COMMENT ON TABLE user_pipeline_links IS 'Vínculos entre usuários e pipelines para controle de acesso';
COMMENT ON COLUMN user_pipeline_links.user_id IS 'ID do usuário vinculado';
COMMENT ON COLUMN user_pipeline_links.pipeline_id IS 'ID da pipeline vinculada';

-- Verificar se a tabela foi criada
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_pipeline_links'
ORDER BY ordinal_position; 