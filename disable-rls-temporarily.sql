-- ============================================
-- DESABILITAR RLS TEMPORARIAMENTE PARA TESTES
-- ============================================

-- Desabilitar RLS nas tabelas principais
ALTER TABLE pipeline_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages DISABLE ROW LEVEL SECURITY;

-- Verificar se campo lead_id existe, se não, adicionar como nullable
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'lead_id') THEN
        ALTER TABLE pipeline_leads ADD COLUMN lead_id UUID REFERENCES leads_master(id) ON DELETE SET NULL;
        RAISE NOTICE 'Campo lead_id adicionado à tabela pipeline_leads (nullable)';
    ELSE
        RAISE NOTICE 'Campo lead_id já existe na tabela pipeline_leads';
    END IF;
END $$;

-- Criar índice se não existir
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_lead_id ON pipeline_leads(lead_id);

-- Log de status
DO $$ 
BEGIN
    RAISE NOTICE '✅ RLS desabilitado temporariamente para testes';
    RAISE NOTICE '✅ Campo lead_id configurado (nullable)';
    RAISE NOTICE '🧪 Sistema pronto para testes de criação';
    RAISE NOTICE '📝 Lembre-se de reabilitar RLS em produção!';
END $$; 