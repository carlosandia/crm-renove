-- ============================================
-- MIGRAÇÃO: CORREÇÃO DA ESTRUTURA LEADS_MASTER
-- Adicionar colunas faltantes de forma defensiva
-- Data: 2025-01-28
-- ============================================

-- Função auxiliar para verificar se uma coluna existe
CREATE OR REPLACE FUNCTION column_exists_check(target_table text, target_column text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' 
        AND c.table_name = target_table 
        AND c.column_name = target_column
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICAR E CRIAR TABELA LEADS_MASTER
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Verificando estrutura da tabela leads_master...';
    
    -- Verificar se a tabela existe, se não, criar
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads_master') THEN
        RAISE NOTICE 'Tabela leads_master não existe. Criando...';
        CREATE TABLE leads_master (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela leads_master criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela leads_master já existe';
    END IF;

    -- Adicionar colunas básicas obrigatórias
    IF NOT column_exists_check('leads_master', 'first_name') THEN
        ALTER TABLE leads_master ADD COLUMN first_name VARCHAR(255);
        RAISE NOTICE 'Coluna first_name adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'last_name') THEN
        ALTER TABLE leads_master ADD COLUMN last_name VARCHAR(255);
        RAISE NOTICE 'Coluna last_name adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'email') THEN
        ALTER TABLE leads_master ADD COLUMN email VARCHAR(255);
        RAISE NOTICE 'Coluna email adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'phone') THEN
        ALTER TABLE leads_master ADD COLUMN phone VARCHAR(50);
        RAISE NOTICE 'Coluna phone adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'company') THEN
        ALTER TABLE leads_master ADD COLUMN company VARCHAR(255);
        RAISE NOTICE 'Coluna company adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'job_title') THEN
        ALTER TABLE leads_master ADD COLUMN job_title VARCHAR(255);
        RAISE NOTICE 'Coluna job_title adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'lead_source') THEN
        ALTER TABLE leads_master ADD COLUMN lead_source VARCHAR(255);
        RAISE NOTICE 'Coluna lead_source adicionada';
    END IF;

    -- Adicionar colunas de localização (que causaram o erro original)
    IF NOT column_exists_check('leads_master', 'city') THEN
        ALTER TABLE leads_master ADD COLUMN city VARCHAR(255);
        RAISE NOTICE 'Coluna city adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'state') THEN
        ALTER TABLE leads_master ADD COLUMN state VARCHAR(255);
        RAISE NOTICE 'Coluna state adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'country') THEN
        ALTER TABLE leads_master ADD COLUMN country VARCHAR(255);
        RAISE NOTICE 'Coluna country adicionada';
    END IF;

    -- Adicionar colunas de observações
    IF NOT column_exists_check('leads_master', 'notes') THEN
        ALTER TABLE leads_master ADD COLUMN notes TEXT;
        RAISE NOTICE 'Coluna notes adicionada';
    END IF;

    -- Adicionar colunas de relacionamento
    IF NOT column_exists_check('leads_master', 'tenant_id') THEN
        ALTER TABLE leads_master ADD COLUMN tenant_id UUID;
        RAISE NOTICE 'Coluna tenant_id adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'created_by') THEN
        ALTER TABLE leads_master ADD COLUMN created_by UUID;
        RAISE NOTICE 'Coluna created_by adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'assigned_to') THEN
        ALTER TABLE leads_master ADD COLUMN assigned_to UUID;
        RAISE NOTICE 'Coluna assigned_to adicionada';
    END IF;

    -- Adicionar colunas de metadata de lead
    IF NOT column_exists_check('leads_master', 'lead_temperature') THEN
        ALTER TABLE leads_master ADD COLUMN lead_temperature VARCHAR(50);
        RAISE NOTICE 'Coluna lead_temperature adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'status') THEN
        ALTER TABLE leads_master ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        RAISE NOTICE 'Coluna status adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'estimated_value') THEN
        ALTER TABLE leads_master ADD COLUMN estimated_value DECIMAL(15,2);
        RAISE NOTICE 'Coluna estimated_value adicionada';
    END IF;

    -- Adicionar colunas de tracking
    IF NOT column_exists_check('leads_master', 'last_contact_date') THEN
        ALTER TABLE leads_master ADD COLUMN last_contact_date TIMESTAMPTZ;
        RAISE NOTICE 'Coluna last_contact_date adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'next_action_date') THEN
        ALTER TABLE leads_master ADD COLUMN next_action_date TIMESTAMPTZ;
        RAISE NOTICE 'Coluna next_action_date adicionada';
    END IF;

    -- Adicionar colunas UTM
    IF NOT column_exists_check('leads_master', 'utm_source') THEN
        ALTER TABLE leads_master ADD COLUMN utm_source VARCHAR(255);
        RAISE NOTICE 'Coluna utm_source adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'utm_medium') THEN
        ALTER TABLE leads_master ADD COLUMN utm_medium VARCHAR(255);
        RAISE NOTICE 'Coluna utm_medium adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'utm_campaign') THEN
        ALTER TABLE leads_master ADD COLUMN utm_campaign VARCHAR(255);
        RAISE NOTICE 'Coluna utm_campaign adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'utm_term') THEN
        ALTER TABLE leads_master ADD COLUMN utm_term VARCHAR(255);
        RAISE NOTICE 'Coluna utm_term adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'utm_content') THEN
        ALTER TABLE leads_master ADD COLUMN utm_content VARCHAR(255);
        RAISE NOTICE 'Coluna utm_content adicionada';
    END IF;

    -- Adicionar outras colunas úteis
    IF NOT column_exists_check('leads_master', 'lead_score') THEN
        ALTER TABLE leads_master ADD COLUMN lead_score INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna lead_score adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'probability') THEN
        ALTER TABLE leads_master ADD COLUMN probability INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna probability adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'campaign_name') THEN
        ALTER TABLE leads_master ADD COLUMN campaign_name VARCHAR(255);
        RAISE NOTICE 'Coluna campaign_name adicionada';
    END IF;

    -- Adicionar colunas de tracking web
    IF NOT column_exists_check('leads_master', 'referrer') THEN
        ALTER TABLE leads_master ADD COLUMN referrer TEXT;
        RAISE NOTICE 'Coluna referrer adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'landing_page') THEN
        ALTER TABLE leads_master ADD COLUMN landing_page TEXT;
        RAISE NOTICE 'Coluna landing_page adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'ip_address') THEN
        ALTER TABLE leads_master ADD COLUMN ip_address INET;
        RAISE NOTICE 'Coluna ip_address adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'user_agent') THEN
        ALTER TABLE leads_master ADD COLUMN user_agent TEXT;
        RAISE NOTICE 'Coluna user_agent adicionada';
    END IF;

    -- Adicionar colunas extras que podem aparecer no frontend
    IF NOT column_exists_check('leads_master', 'position') THEN
        ALTER TABLE leads_master ADD COLUMN position VARCHAR(255);
        RAISE NOTICE 'Coluna position adicionada';
    END IF;

    IF NOT column_exists_check('leads_master', 'source') THEN
        ALTER TABLE leads_master ADD COLUMN source VARCHAR(255);
        RAISE NOTICE 'Coluna source adicionada';
    END IF;

    RAISE NOTICE 'Verificação de colunas concluída';
END $$;

-- ============================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

DO $$
BEGIN
    -- Índice único para email (se não existir)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_master_email_unique') THEN
        CREATE UNIQUE INDEX idx_leads_master_email_unique ON leads_master(email) WHERE email IS NOT NULL;
        RAISE NOTICE 'Índice único para email criado';
    END IF;

    -- Índices para performance
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_master_tenant_id') THEN
        CREATE INDEX idx_leads_master_tenant_id ON leads_master(tenant_id);
        RAISE NOTICE 'Índice para tenant_id criado';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_master_created_by') THEN
        CREATE INDEX idx_leads_master_created_by ON leads_master(created_by);
        RAISE NOTICE 'Índice para created_by criado';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_master_assigned_to') THEN
        CREATE INDEX idx_leads_master_assigned_to ON leads_master(assigned_to);
        RAISE NOTICE 'Índice para assigned_to criado';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_master_email') THEN
        CREATE INDEX idx_leads_master_email ON leads_master(email);
        RAISE NOTICE 'Índice para email criado';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_master_phone') THEN
        CREATE INDEX idx_leads_master_phone ON leads_master(phone);
        RAISE NOTICE 'Índice para phone criado';
    END IF;

    RAISE NOTICE 'Criação de índices concluída';
END $$;

-- ============================================
-- CRIAR FUNÇÃO E TRIGGER PARA UPDATED_AT
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_leads_master_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_leads_master_timestamp') THEN
        CREATE TRIGGER trigger_update_leads_master_timestamp
            BEFORE UPDATE ON leads_master
            FOR EACH ROW
            EXECUTE FUNCTION update_leads_master_timestamp();
        RAISE NOTICE 'Trigger para updated_at criado';
    ELSE
        RAISE NOTICE 'Trigger para updated_at já existe';
    END IF;
END $$;

-- ============================================
-- VERIFICAR ESTRUTURA FINAL
-- ============================================

DO $$
DECLARE
    col_count INTEGER;
    table_exists BOOLEAN;
BEGIN
    -- Verificar se tabela existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'leads_master'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO col_count
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leads_master';
        
        RAISE NOTICE '✅ Tabela leads_master possui % colunas', col_count;
        RAISE NOTICE '✅ Estrutura corrigida com sucesso!';
        RAISE NOTICE '✅ Migração 20250128000001 executada com sucesso!';
    ELSE
        RAISE NOTICE '❌ Erro: Tabela leads_master não foi criada';
    END IF;
END $$;

-- Limpar função auxiliar
DROP FUNCTION IF EXISTS column_exists_check(text, text);

-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================

COMMENT ON TABLE leads_master IS 'Tabela master para leads - contém dados centralizados de todos os leads';
COMMENT ON COLUMN leads_master.id IS 'ID único do lead';
COMMENT ON COLUMN leads_master.email IS 'Email do lead - único quando não nulo';
COMMENT ON COLUMN leads_master.lead_temperature IS 'Temperatura do lead (quente, morno, frio)';
COMMENT ON COLUMN leads_master.status IS 'Status do lead (active, inactive, converted, etc.)';
COMMENT ON COLUMN leads_master.estimated_value IS 'Valor estimado da oportunidade';
COMMENT ON COLUMN leads_master.tenant_id IS 'ID do tenant/empresa';
COMMENT ON COLUMN leads_master.created_by IS 'ID do usuário que criou o lead';
COMMENT ON COLUMN leads_master.assigned_to IS 'ID do usuário responsável pelo lead'; 