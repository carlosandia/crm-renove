
-- Verificar e adicionar campos faltantes na tabela companies
DO $$
BEGIN
    -- Adicionar campos de expectativa mensal se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'industry') THEN
        ALTER TABLE companies ADD COLUMN industry TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'city') THEN
        ALTER TABLE companies ADD COLUMN city TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'state') THEN
        ALTER TABLE companies ADD COLUMN state TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'expected_leads_monthly') THEN
        ALTER TABLE companies ADD COLUMN expected_leads_monthly INTEGER NOT NULL DEFAULT 0 CHECK (expected_leads_monthly >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'expected_sales_monthly') THEN
        ALTER TABLE companies ADD COLUMN expected_sales_monthly INTEGER NOT NULL DEFAULT 0 CHECK (expected_sales_monthly >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'expected_followers_monthly') THEN
        ALTER TABLE companies ADD COLUMN expected_followers_monthly INTEGER NOT NULL DEFAULT 0 CHECK (expected_followers_monthly >= 0);
    END IF;
END $$;

-- Verificar e adicionar campos faltantes na tabela leads_master
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'is_mql') THEN
        ALTER TABLE leads_master ADD COLUMN is_mql BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'origem') THEN
        ALTER TABLE leads_master ADD COLUMN origem VARCHAR(50) DEFAULT 'Manual';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'valor') THEN
        ALTER TABLE leads_master ADD COLUMN valor DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'company_id') THEN
        ALTER TABLE leads_master ADD COLUMN company_id UUID REFERENCES companies(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'mql_date') THEN
        ALTER TABLE leads_master ADD COLUMN mql_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'closed_date') THEN
        ALTER TABLE leads_master ADD COLUMN closed_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_master_company_id ON leads_master(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_master_status ON leads_master(status);
CREATE INDEX IF NOT EXISTS idx_leads_master_origem ON leads_master(origem);
CREATE INDEX IF NOT EXISTS idx_leads_master_is_mql ON leads_master(is_mql);
CREATE INDEX IF NOT EXISTS idx_leads_master_created_at ON leads_master(created_at);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

-- Função para calcular métricas de empresa
CREATE OR REPLACE FUNCTION get_company_metrics(
    p_company_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    total_leads INTEGER := 0;
    mql_leads INTEGER := 0;
    closed_leads INTEGER := 0;
    avg_ticket DECIMAL(15,2) := 0;
    conversion_rate DECIMAL(5,2) := 0;
    avg_time_to_mql INTEGER := 0;
    avg_time_to_close INTEGER := 0;
BEGIN
    -- Definir período padrão se não fornecido
    IF p_start_date IS NULL THEN
        p_start_date := DATE_TRUNC('month', CURRENT_DATE);
    END IF;
    
    IF p_end_date IS NULL THEN
        p_end_date := CURRENT_DATE;
    END IF;
    
    -- Total de leads
    SELECT COUNT(*) INTO total_leads
    FROM leads_master
    WHERE company_id = p_company_id
    AND created_at::date BETWEEN p_start_date AND p_end_date;
    
    -- MQLs
    SELECT COUNT(*) INTO mql_leads
    FROM leads_master
    WHERE company_id = p_company_id
    AND is_mql = true
    AND created_at::date BETWEEN p_start_date AND p_end_date;
    
    -- Leads fechados (ganhos)
    SELECT COUNT(*) INTO closed_leads
    FROM leads_master
    WHERE company_id = p_company_id
    AND status = 'converted'
    AND created_at::date BETWEEN p_start_date AND p_end_date;
    
    -- Ticket médio
    SELECT COALESCE(AVG(valor), 0) INTO avg_ticket
    FROM leads_master
    WHERE company_id = p_company_id
    AND status = 'converted'
    AND valor > 0
    AND created_at::date BETWEEN p_start_date AND p_end_date;
    
    -- Taxa de conversão
    IF mql_leads > 0 THEN
        conversion_rate := ROUND((closed_leads::DECIMAL / mql_leads * 100), 2);
    END IF;
    
    -- Tempo médio para MQL (em dias)
    SELECT COALESCE(AVG(EXTRACT(days FROM (mql_date - created_at))), 0) INTO avg_time_to_mql
    FROM leads_master
    WHERE company_id = p_company_id
    AND is_mql = true
    AND mql_date IS NOT NULL
    AND created_at::date BETWEEN p_start_date AND p_end_date;
    
    -- Tempo médio para fechamento (em dias)
    SELECT COALESCE(AVG(EXTRACT(days FROM (closed_date - created_at))), 0) INTO avg_time_to_close
    FROM leads_master
    WHERE company_id = p_company_id
    AND status = 'converted'
    AND closed_date IS NOT NULL
    AND created_at::date BETWEEN p_start_date AND p_end_date;
    
    result := jsonb_build_object(
        'company_id', p_company_id,
        'period_start', p_start_date,
        'period_end', p_end_date,
        'total_leads', total_leads,
        'mql_leads', mql_leads,
        'closed_leads', closed_leads,
        'avg_ticket', avg_ticket,
        'conversion_rate', conversion_rate,
        'avg_time_to_mql', avg_time_to_mql,
        'avg_time_to_close', avg_time_to_close,
        'calculated_at', NOW()
    );
    
    RETURN result;
END;
$$;

-- Comentários para documentação
COMMENT ON COLUMN companies.industry IS 'Nicho de atuação da empresa';
COMMENT ON COLUMN companies.expected_leads_monthly IS 'Meta mensal de leads esperados';
COMMENT ON COLUMN companies.expected_sales_monthly IS 'Meta mensal de vendas esperadas';
COMMENT ON COLUMN companies.expected_followers_monthly IS 'Meta mensal de seguidores esperados';
COMMENT ON COLUMN leads_master.is_mql IS 'Indica se o lead foi qualificado como Marketing Qualified Lead';
COMMENT ON COLUMN leads_master.origem IS 'Canal de origem do lead: Meta, Google, Manual, Webhook, etc';
COMMENT ON COLUMN leads_master.valor IS 'Valor da oportunidade/venda em R$';
COMMENT ON COLUMN leads_master.company_id IS 'Referência para a empresa do lead';

-- Verificação final
SELECT 'Esquema de relatórios para super_admin configurado com sucesso!' as status;
