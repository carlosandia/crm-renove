-- =====================================================
-- MIGRAÇÃO FINAL - CORREÇÃO PARA SUPABASE
-- Data: 2025-01-25
-- Descrição: Correções finais compatíveis com Supabase
-- =====================================================

-- 1. VERIFICAR E CRIAR TABELAS ESSENCIAIS
-- =====================================================

-- Garantir que a tabela users existe
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member',
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir que a tabela pipelines existe
CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tenant_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ADICIONAR COLUNAS FALTANTES DE FORMA SEGURA
-- =====================================================

-- Adicionar colunas na pipeline_leads se não existirem
DO $$ 
BEGIN
    -- Coluna temperature
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipeline_leads' AND column_name = 'temperature'
    ) THEN
        ALTER TABLE pipeline_leads ADD COLUMN temperature INTEGER DEFAULT 50;
    END IF;
    
    -- Coluna status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipeline_leads' AND column_name = 'status'
    ) THEN
        ALTER TABLE pipeline_leads ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
END $$;

-- Adicionar colunas na pipeline_stages se não existirem
DO $$ 
BEGIN
    -- Coluna is_system_stage
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipeline_stages' AND column_name = 'is_system_stage'
    ) THEN
        ALTER TABLE pipeline_stages ADD COLUMN is_system_stage BOOLEAN DEFAULT false;
    END IF;
    
    -- Coluna updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipeline_stages' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE pipeline_stages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. CRIAR ÍNDICES ESSENCIAIS
-- =====================================================

-- Índices para pipeline_leads
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_pipeline_id ON pipeline_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage_id ON pipeline_leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_temperature ON pipeline_leads(temperature);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_status ON pipeline_leads(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_tenant_id ON pipeline_leads(tenant_id);

-- Índices para pipeline_stages
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant_id ON pipeline_stages(tenant_id);

-- Índices para pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_created_by ON pipelines(created_by);

-- 4. CRIAR FUNÇÃO PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. CRIAR TRIGGERS
-- =====================================================

-- Trigger para pipeline_stages
DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at 
    BEFORE UPDATE ON pipeline_stages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para pipelines
DROP TRIGGER IF EXISTS update_pipelines_updated_at ON pipelines;
CREATE TRIGGER update_pipelines_updated_at 
    BEFORE UPDATE ON pipelines 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. POLÍTICAS RLS PERMISSIVAS PARA DESENVOLVIMENTO
-- =====================================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para desenvolvimento
DO $$ 
BEGIN
    -- Política para users
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'dev_all_access'
    ) THEN
        CREATE POLICY dev_all_access ON users FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- Política para pipelines
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pipelines' AND policyname = 'dev_all_access'
    ) THEN
        CREATE POLICY dev_all_access ON pipelines FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- Política para pipeline_stages
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pipeline_stages' AND policyname = 'dev_all_access'
    ) THEN
        CREATE POLICY dev_all_access ON pipeline_stages FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- Política para pipeline_leads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pipeline_leads' AND policyname = 'dev_all_access'
    ) THEN
        CREATE POLICY dev_all_access ON pipeline_leads FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 7. ATUALIZAR DADOS EXISTENTES
-- =====================================================

-- Sincronizar temperature_level com temperature (apenas se necessário)
UPDATE pipeline_leads 
SET temperature = CASE 
    WHEN temperature_level = 'hot' THEN 75
    WHEN temperature_level = 'warm' THEN 50
    WHEN temperature_level = 'cold' THEN 25
    ELSE 50
END
WHERE temperature_level IS NOT NULL AND (temperature IS NULL OR temperature = 50);

-- Marcar etapas do sistema
UPDATE pipeline_stages 
SET is_system_stage = true 
WHERE name IN ('Novos leads', 'Ganho', 'Perdido') 
  AND (is_system_stage IS NULL OR is_system_stage = false);

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA - SISTEMA PRONTO
-- ===================================================== 