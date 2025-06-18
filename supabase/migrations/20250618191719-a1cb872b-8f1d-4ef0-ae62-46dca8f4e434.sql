
-- Verificar e adicionar campos faltantes na tabela companies se não existirem
DO $$
BEGIN
    -- Adicionar campo industry se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'industry') THEN
        ALTER TABLE companies ADD COLUMN industry TEXT NOT NULL DEFAULT '';
        UPDATE companies SET industry = COALESCE(segment, '') WHERE industry = '';
    END IF;
    
    -- Adicionar campo city se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'city') THEN
        ALTER TABLE companies ADD COLUMN city TEXT NOT NULL DEFAULT '';
    END IF;
    
    -- Adicionar campo state se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'state') THEN
        ALTER TABLE companies ADD COLUMN state TEXT NOT NULL DEFAULT '';
    END IF;
    
    -- Adicionar campos de expectativa mensal se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'expected_leads_monthly') THEN
        ALTER TABLE companies ADD COLUMN expected_leads_monthly INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'expected_sales_monthly') THEN
        ALTER TABLE companies ADD COLUMN expected_sales_monthly INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'expected_followers_monthly') THEN
        ALTER TABLE companies ADD COLUMN expected_followers_monthly INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Verificar e adicionar campos faltantes na tabela leads_master
DO $$
BEGIN
    -- Adicionar campo is_mql se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'is_mql') THEN
        ALTER TABLE leads_master ADD COLUMN is_mql BOOLEAN DEFAULT false;
    END IF;
    
    -- Adicionar campo origem se não existir (já existe, mas verificar)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'origem') THEN
        ALTER TABLE leads_master ADD COLUMN origem VARCHAR(50) DEFAULT 'Manual';
    END IF;
    
    -- Adicionar campo valor se não existir (já existe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'valor') THEN
        ALTER TABLE leads_master ADD COLUMN valor DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Adicionar campo company_id se não existir (já existe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'company_id') THEN
        ALTER TABLE leads_master ADD COLUMN company_id UUID;
        -- Adicionar foreign key constraint
        ALTER TABLE leads_master ADD CONSTRAINT fk_leads_company 
        FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;
    
    -- Adicionar campo mql_date se não existir (já existe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'mql_date') THEN
        ALTER TABLE leads_master ADD COLUMN mql_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Adicionar campo closed_date se não existir (já existe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_master' AND column_name = 'closed_date') THEN
        ALTER TABLE leads_master ADD COLUMN closed_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Criar índices para performance se não existirem
CREATE INDEX IF NOT EXISTS idx_leads_master_company_id ON leads_master(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_master_status ON leads_master(status);
CREATE INDEX IF NOT EXISTS idx_leads_master_origem ON leads_master(origem);
CREATE INDEX IF NOT EXISTS idx_leads_master_is_mql ON leads_master(is_mql);
CREATE INDEX IF NOT EXISTS idx_leads_master_created_at ON leads_master(created_at);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

-- Função para calcular métricas consolidadas de todas as empresas
CREATE OR REPLACE FUNCTION get_consolidated_metrics(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    total_companies INTEGER := 0;
    total_leads INTEGER := 0;
    total_mqls INTEGER := 0;
    total_sales INTEGER := 0;
    avg_conversion_rate DECIMAL(5,2) := 0;
    global_avg_ticket DECIMAL(15,2) := 0;
    total_revenue DECIMAL(15,2) := 0;
BEGIN
    -- Definir período padrão se não fornecido
    IF p_start_date IS NULL THEN
        p_start_date := DATE_TRUNC('month', CURRENT_DATE);
    END IF;
    
    IF p_end_date IS NULL THEN
        p_end_date := CURRENT_DATE;
    END IF;
    
    -- Total de empresas ativas
    SELECT COUNT(*) INTO total_companies
    FROM companies
    WHERE is_active = true;
    
    -- Total de leads no período
    SELECT COUNT(*) INTO total_leads
    FROM leads_master
    WHERE created_at::date BETWEEN p_start_date AND p_end_date;
    
    -- Total de MQLs no período
    SELECT COUNT(*) INTO total_mqls
    FROM leads_master
    WHERE is_mql = true
    AND created_at::date BETWEEN p_start_date AND p_end_date;
    
    -- Total de vendas no período
    SELECT COUNT(*) INTO total_sales
    FROM leads_master
    WHERE status = 'converted'
    AND created_at::date BETWEEN p_start_date AND p_end_date;
    
    -- Taxa de conversão média global
    IF total_mqls > 0 THEN
        avg_conversion_rate := ROUND((total_sales::DECIMAL / total_mqls * 100), 2);
    END IF;
    
    -- Ticket médio global e receita total
    SELECT 
        COALESCE(AVG(valor), 0),
        COALESCE(SUM(valor), 0)
    INTO global_avg_ticket, total_revenue
    FROM leads_master
    WHERE status = 'converted'
    AND valor > 0
    AND created_at::date BETWEEN p_start_date AND p_end_date;
    
    result := jsonb_build_object(
        'period_start', p_start_date,
        'period_end', p_end_date,
        'total_companies', total_companies,
        'total_leads', total_leads,
        'total_mqls', total_mqls,
        'total_sales', total_sales,
        'avg_conversion_rate', avg_conversion_rate,
        'global_avg_ticket', global_avg_ticket,
        'total_revenue', total_revenue,
        'calculated_at', NOW()
    );
    
    RETURN result;
END;
$$;

-- Função para calcular métricas por empresa
CREATE OR REPLACE FUNCTION get_companies_performance_report(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_company_filter TEXT DEFAULT NULL,
    p_origem_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
    company_id UUID,
    company_name TEXT,
    city TEXT,
    state TEXT,
    industry TEXT,
    expected_leads_monthly INTEGER,
    leads_received INTEGER,
    expected_sales_monthly INTEGER,
    sales_closed INTEGER,
    expected_followers_monthly INTEGER,
    conversion_rate DECIMAL(5,2),
    avg_ticket DECIMAL(15,2),
    origem_breakdown JSONB,
    time_to_mql_days INTEGER,
    time_to_close_days INTEGER,
    stalled_leads INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Definir período padrão se não fornecido
    IF p_start_date IS NULL THEN
        p_start_date := DATE_TRUNC('month', CURRENT_DATE);
    END IF;
    
    IF p_end_date IS NULL THEN
        p_end_date := CURRENT_DATE;
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.city,
        c.state,
        c.industry,
        c.expected_leads_monthly,
        COALESCE(stats.leads_count, 0)::INTEGER,
        c.expected_sales_monthly,
        COALESCE(stats.sales_count, 0)::INTEGER,
        c.expected_followers_monthly,
        COALESCE(stats.conversion_rate, 0)::DECIMAL(5,2),
        COALESCE(stats.avg_ticket, 0)::DECIMAL(15,2),
        COALESCE(stats.origem_breakdown, '{}'::JSONB),
        COALESCE(stats.avg_time_to_mql, 0)::INTEGER,
        COALESCE(stats.avg_time_to_close, 0)::INTEGER,
        COALESCE(stats.stalled_leads, 0)::INTEGER
    FROM companies c
    LEFT JOIN (
        SELECT 
            lm.company_id,
            COUNT(*) as leads_count,
            COUNT(*) FILTER (WHERE lm.status = 'converted') as sales_count,
            COUNT(*) FILTER (WHERE lm.is_mql = true) as mql_count,
            CASE 
                WHEN COUNT(*) FILTER (WHERE lm.is_mql = true) > 0 
                THEN ROUND((COUNT(*) FILTER (WHERE lm.status = 'converted')::DECIMAL / COUNT(*) FILTER (WHERE lm.is_mql = true) * 100), 2)
                ELSE 0 
            END as conversion_rate,
            AVG(lm.valor) FILTER (WHERE lm.status = 'converted' AND lm.valor > 0) as avg_ticket,
            jsonb_object_agg(
                COALESCE(lm.origem, 'Não informado'), 
                COUNT(*) FILTER (WHERE lm.origem IS NOT NULL)
            ) as origem_breakdown,
            AVG(EXTRACT(days FROM (lm.mql_date - lm.created_at))) FILTER (WHERE lm.mql_date IS NOT NULL) as avg_time_to_mql,
            AVG(EXTRACT(days FROM (lm.closed_date - lm.created_at))) FILTER (WHERE lm.closed_date IS NOT NULL) as avg_time_to_close,
            COUNT(*) FILTER (WHERE lm.updated_at < NOW() - INTERVAL '5 days' AND lm.status NOT IN ('converted', 'lost')) as stalled_leads
        FROM leads_master lm
        WHERE lm.created_at::date BETWEEN p_start_date AND p_end_date
        AND (p_origem_filter IS NULL OR lm.origem = p_origem_filter)
        GROUP BY lm.company_id
    ) stats ON c.id = stats.company_id
    WHERE c.is_active = true
    AND (p_company_filter IS NULL OR c.name ILIKE '%' || p_company_filter || '%')
    ORDER BY c.name;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION get_consolidated_metrics IS 'Retorna métricas consolidadas de todas as empresas para o dashboard super_admin';
COMMENT ON FUNCTION get_companies_performance_report IS 'Retorna relatório detalhado de performance por empresa para super_admin';

-- Verificação final
SELECT 'Esquema de relatórios para super_admin configurado com sucesso!' as status;
