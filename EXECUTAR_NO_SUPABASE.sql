-- ========================================
-- SCRIPT PARA RESOLVER O PROBLEMA DOS MOTIVOS
-- Execute este SQL no Supabase SQL Editor
-- ========================================

-- 1. Criar tabela pipeline_win_loss_reasons
CREATE TABLE IF NOT EXISTS pipeline_win_loss_reasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    reason_name VARCHAR(255) NOT NULL,
    reason_type VARCHAR(10) NOT NULL CHECK (reason_type IN ('win', 'loss')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_pipeline_id 
    ON pipeline_win_loss_reasons(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_type 
    ON pipeline_win_loss_reasons(pipeline_id, reason_type);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE pipeline_win_loss_reasons ENABLE ROW LEVEL SECURITY;

-- 4. Criar política RLS (permitir acesso total por enquanto)
CREATE POLICY "pipeline_win_loss_reasons_all_access" 
    ON pipeline_win_loss_reasons
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- 5. Criar função RPC para compatibilidade com o código
CREATE OR REPLACE FUNCTION create_win_loss_reasons_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Função vazia, a tabela já foi criada acima
    -- Esta função existe apenas para evitar erros no código
    RETURN;
END;
$$;

-- 6. Verificar se tudo foi criado corretamente
SELECT 
    'pipeline_win_loss_reasons' as tabela_criada,
    COUNT(*) as registros_existentes
FROM pipeline_win_loss_reasons;

-- 7. Mostrar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pipeline_win_loss_reasons'
ORDER BY ordinal_position;

-- ========================================
-- INSTRUÇÕES:
-- 1. Copie todo este código
-- 2. Acesse o Supabase Dashboard
-- 3. Vá para "SQL Editor"
-- 4. Cole o código e execute
-- 5. Teste a funcionalidade de motivos na aplicação
-- ======================================== 