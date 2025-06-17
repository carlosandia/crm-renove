-- Script para corrigir a estrutura das tabelas de pipeline
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar coluna is_active na tabela pipelines se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipelines' AND column_name = 'is_active') THEN
        ALTER TABLE pipelines ADD COLUMN is_active BOOLEAN DEFAULT true;
        UPDATE pipelines SET is_active = true WHERE is_active IS NULL;
    END IF;
END $$;

-- 2. Verificar se a tabela pipeline_members existe e tem a estrutura correta
CREATE TABLE IF NOT EXISTS pipeline_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  member_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pipeline_id, member_id)
);

-- 3. Verificar se a tabela leads existe para contagem
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  stage_id UUID,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Habilitar RLS se não estiver habilitado
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas permissivas para teste
DROP POLICY IF EXISTS "pipelines_all_access" ON pipelines;
DROP POLICY IF EXISTS "pipeline_members_all_access" ON pipeline_members;
DROP POLICY IF EXISTS "leads_all_access" ON leads;

CREATE POLICY "pipelines_all_access" ON pipelines
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "pipeline_members_all_access" ON pipeline_members
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "leads_all_access" ON leads
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_is_active ON pipelines(is_active);
CREATE INDEX IF NOT EXISTS idx_pipeline_members_pipeline_id ON pipeline_members(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_members_member_id ON pipeline_members(member_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_id ON leads(pipeline_id);

-- 7. Verificação final
SELECT 
    'Estrutura de pipeline corrigida com sucesso!' as status,
    COUNT(*) as total_pipelines
FROM pipelines; 