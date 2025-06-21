-- ============================================
-- IMPLEMENTAR LÓGICA CORRETA DOS GRANDES CRMS
-- Lead Master + Oportunidades Vinculadas
-- ============================================

-- 1. ADICIONAR CAMPO LEAD_ID NA TABELA PIPELINE_LEADS
DO $$ 
BEGIN
    -- Adicionar campo lead_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pipeline_leads' AND column_name = 'lead_id') THEN
        ALTER TABLE pipeline_leads ADD COLUMN lead_id UUID REFERENCES leads_master(id) ON DELETE CASCADE;
        RAISE NOTICE 'Campo lead_id adicionado à tabela pipeline_leads';
    END IF;
END $$;

-- 2. CRIAR ÍNDICE PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_lead_id ON pipeline_leads(lead_id);

-- 3. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON COLUMN pipeline_leads.lead_id IS 'Referência ao lead principal na tabela leads_master';

-- 4. FUNÇÃO PARA CRIAR LEAD + OPORTUNIDADE (LÓGICA DOS GRANDES CRMS)
CREATE OR REPLACE FUNCTION create_lead_with_opportunity(
    p_lead_data JSONB,
    p_opportunity_data JSONB,
    p_pipeline_id UUID,
    p_stage_id UUID,
    p_created_by UUID,
    p_assigned_to UUID DEFAULT NULL
) RETURNS TABLE(
    lead_id UUID,
    opportunity_id UUID,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_lead_id UUID;
    v_opportunity_id UUID;
    v_tenant_id UUID;
BEGIN
    -- Buscar tenant_id do usuário
    SELECT tenant_id INTO v_tenant_id FROM users WHERE id = p_created_by;
    
    IF v_tenant_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, false, 'Usuário não encontrado';
        RETURN;
    END IF;
    
    -- 1. CRIAR LEAD PRINCIPAL (leads_master)
    INSERT INTO leads_master (
        first_name,
        last_name,
        email,
        phone,
        company,
        job_title,
        lead_temperature,
        status,
        lead_source,
        estimated_value,
        tenant_id,
        assigned_to,
        created_by,
        origem
    ) VALUES (
        COALESCE(p_lead_data->>'first_name', p_lead_data->>'nome_lead', 'Nome não informado'),
        COALESCE(p_lead_data->>'last_name', ''),
        p_lead_data->>'email',
        p_lead_data->>'phone',
        p_lead_data->>'company',
        p_lead_data->>'job_title',
        COALESCE(p_lead_data->>'lead_temperature', 'Frio'),
        COALESCE(p_lead_data->>'status', 'Novo'),
        COALESCE(p_lead_data->>'lead_source', 'Pipeline'),
        COALESCE((p_opportunity_data->>'valor')::DECIMAL, 0),
        v_tenant_id,
        p_assigned_to,
        p_created_by,
        'Pipeline'
    ) RETURNING id INTO v_lead_id;
    
    -- 2. CRIAR OPORTUNIDADE VINCULADA (pipeline_leads)
    INSERT INTO pipeline_leads (
        lead_id,
        pipeline_id,
        stage_id,
        lead_data,
        created_by,
        assigned_to
    ) VALUES (
        v_lead_id,
        p_pipeline_id,
        p_stage_id,
        p_opportunity_data,
        p_created_by,
        p_assigned_to
    ) RETURNING id INTO v_opportunity_id;
    
    RETURN QUERY SELECT v_lead_id, v_opportunity_id, true, 'Lead e oportunidade criados com sucesso';
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, false, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNÇÃO PARA BUSCAR OPORTUNIDADES COM DADOS DO LEAD
CREATE OR REPLACE FUNCTION get_pipeline_opportunities_with_leads(p_pipeline_id UUID)
RETURNS TABLE(
    opportunity_id UUID,
    lead_id UUID,
    stage_id UUID,
    lead_name TEXT,
    lead_email TEXT,
    lead_phone TEXT,
    company TEXT,
    opportunity_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id as opportunity_id,
        pl.lead_id,
        pl.stage_id,
        CONCAT(lm.first_name, ' ', COALESCE(lm.last_name, '')) as lead_name,
        lm.email as lead_email,
        lm.phone as lead_phone,
        lm.company,
        pl.lead_data as opportunity_data,
        pl.created_at,
        pl.updated_at,
        pl.assigned_to
    FROM pipeline_leads pl
    LEFT JOIN leads_master lm ON pl.lead_id = lm.id
    WHERE pl.pipeline_id = p_pipeline_id
    ORDER BY pl.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. FUNÇÃO PARA BUSCAR LEADS COM SUAS OPORTUNIDADES
CREATE OR REPLACE FUNCTION get_leads_with_opportunities(p_tenant_id UUID)
RETURNS TABLE(
    lead_id UUID,
    lead_name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    lead_temperature TEXT,
    status TEXT,
    opportunities_count INTEGER,
    total_value DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lm.id as lead_id,
        CONCAT(lm.first_name, ' ', COALESCE(lm.last_name, '')) as lead_name,
        lm.email,
        lm.phone,
        lm.company,
        lm.lead_temperature,
        lm.status,
        COUNT(pl.id)::INTEGER as opportunities_count,
        COALESCE(SUM((pl.lead_data->>'valor')::DECIMAL), 0) as total_value,
        lm.created_at
    FROM leads_master lm
    LEFT JOIN pipeline_leads pl ON lm.id = pl.lead_id
    WHERE lm.tenant_id = p_tenant_id
    GROUP BY lm.id, lm.first_name, lm.last_name, lm.email, lm.phone, 
             lm.company, lm.lead_temperature, lm.status, lm.created_at
    ORDER BY lm.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Log de sucesso
DO $$ 
BEGIN
    RAISE NOTICE 'Lógica de CRM profissional implementada com sucesso!';
    RAISE NOTICE 'Agora pipeline_leads referencia leads_master através do campo lead_id';
    RAISE NOTICE 'Use a função create_lead_with_opportunity() para criar lead + oportunidade';
END $$; 