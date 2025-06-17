-- Script para criar tabela de motivos de ganho/perda
-- Execute este script no Supabase SQL Editor

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

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_pipeline_id ON pipeline_win_loss_reasons(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_type ON pipeline_win_loss_reasons(pipeline_id, reason_type);

-- 3. Habilitar RLS
ALTER TABLE pipeline_win_loss_reasons ENABLE ROW LEVEL SECURITY;

-- 4. Criar política RLS
CREATE POLICY "pipeline_win_loss_reasons_all_access" ON pipeline_win_loss_reasons
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Criar função RPC para criar a tabela automaticamente
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

-- 6. Verificar se a tabela foi criada
SELECT 
    'pipeline_win_loss_reasons' as tabela,
    COUNT(*) as total_registros
FROM pipeline_win_loss_reasons; 