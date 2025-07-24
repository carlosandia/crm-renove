-- Migration: Adicionar sistema de qualificação de leads
-- Data: 2025-01-19
-- Descrição: Implementa estágios de lifecycle (lead, mql, sql) e regras de qualificação

-- 1. Criar ENUM para lifecycle stages
CREATE TYPE lead_lifecycle_stage AS ENUM ('lead', 'mql', 'sql');

-- 2. Adicionar coluna lifecycle_stage à tabela pipeline_leads
ALTER TABLE pipeline_leads 
ADD COLUMN lifecycle_stage lead_lifecycle_stage DEFAULT 'lead' NOT NULL;

-- 3. Adicionar índice para performance na busca por lifecycle_stage
CREATE INDEX idx_pipeline_leads_lifecycle_stage ON pipeline_leads(lifecycle_stage);
CREATE INDEX idx_pipeline_leads_tenant_lifecycle ON pipeline_leads(tenant_id, lifecycle_stage);

-- 4. Adicionar coluna qualification_rules à tabela pipelines para armazenar regras de qualificação
ALTER TABLE pipelines 
ADD COLUMN qualification_rules JSONB DEFAULT '{"mql": [], "sql": []}'::jsonb NOT NULL;

-- 5. Adicionar índice GIN para busca eficiente nas regras JSONB
CREATE INDEX idx_pipelines_qualification_rules ON pipelines USING GIN (qualification_rules);

-- 6. Criar tabela para histórico de mudanças de lifecycle_stage
CREATE TABLE lead_lifecycle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    from_stage lead_lifecycle_stage,
    to_stage lead_lifecycle_stage NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES users(id),
    automation_triggered BOOLEAN DEFAULT FALSE,
    rule_matched TEXT, -- Nome da regra que triggou a mudança (se automática)
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. Adicionar RLS para lead_lifecycle_history
ALTER TABLE lead_lifecycle_history ENABLE ROW LEVEL SECURITY;

-- Política para admins e super_admins verem todos os registros do tenant
CREATE POLICY lead_lifecycle_history_admin_access ON lead_lifecycle_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.tenant_id = lead_lifecycle_history.tenant_id
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Política para members verem apenas histórico de leads que podem acessar
CREATE POLICY lead_lifecycle_history_member_access ON lead_lifecycle_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.tenant_id = lead_lifecycle_history.tenant_id
            AND users.role = 'member'
        )
        AND EXISTS (
            SELECT 1 FROM pipeline_leads pl
            JOIN pipeline_members pm ON pm.pipeline_id = pl.pipeline_id
            WHERE pl.id = lead_lifecycle_history.pipeline_lead_id
            AND pm.member_id = auth.uid()
        )
    );

-- 8. Adicionar índices para performance na tabela de histórico
CREATE INDEX idx_lead_lifecycle_history_pipeline_lead ON lead_lifecycle_history(pipeline_lead_id);
CREATE INDEX idx_lead_lifecycle_history_tenant_date ON lead_lifecycle_history(tenant_id, changed_at DESC);
CREATE INDEX idx_lead_lifecycle_history_automation ON lead_lifecycle_history(automation_triggered, changed_at DESC);

-- 9. Função para avaliar regras de qualificação automaticamente
CREATE OR REPLACE FUNCTION evaluate_qualification_rules(
    p_pipeline_lead_id UUID,
    p_custom_data JSONB
) RETURNS TABLE (
    should_update BOOLEAN,
    new_stage lead_lifecycle_stage,
    rule_matched TEXT
) AS $$
DECLARE
    v_pipeline_id UUID;
    v_current_stage lead_lifecycle_stage;
    v_qualification_rules JSONB;
    v_mql_rules JSONB;
    v_sql_rules JSONB;
    v_rule JSONB;
    v_field_name TEXT;
    v_operator TEXT;
    v_expected_value TEXT;
    v_actual_value TEXT;
    v_rule_matches BOOLEAN;
    v_all_conditions_met BOOLEAN;
BEGIN
    -- Buscar dados do pipeline_lead
    SELECT pl.pipeline_id, pl.lifecycle_stage, p.qualification_rules
    INTO v_pipeline_id, v_current_stage, v_qualification_rules
    FROM pipeline_leads pl
    JOIN pipelines p ON p.id = pl.pipeline_id
    WHERE pl.id = p_pipeline_lead_id;

    -- Se não encontrou dados, retornar sem atualização
    IF v_pipeline_id IS NULL THEN
        RETURN QUERY SELECT FALSE, v_current_stage, NULL::TEXT;
        RETURN;
    END IF;

    -- Extrair regras MQL e SQL
    v_mql_rules := v_qualification_rules->'mql';
    v_sql_rules := v_qualification_rules->'sql';

    -- Avaliar regras SQL primeiro (mais alta prioridade)
    IF v_current_stage != 'sql' AND jsonb_array_length(v_sql_rules) > 0 THEN
        FOR v_rule IN SELECT * FROM jsonb_array_elements(v_sql_rules)
        LOOP
            v_all_conditions_met := TRUE;
            
            -- Verificar cada condição da regra
            FOR v_field_name, v_operator, v_expected_value IN 
                SELECT condition->>'field', condition->>'operator', condition->>'value'
                FROM jsonb_array_elements(v_rule->'conditions') AS condition
            LOOP
                v_actual_value := p_custom_data->>v_field_name;
                v_rule_matches := FALSE;
                
                -- Avaliar condição baseada no operador
                CASE v_operator
                    WHEN 'equals' THEN
                        v_rule_matches := (v_actual_value = v_expected_value);
                    WHEN 'not_equals' THEN
                        v_rule_matches := (v_actual_value != v_expected_value OR v_actual_value IS NULL);
                    WHEN 'contains' THEN
                        v_rule_matches := (v_actual_value ILIKE '%' || v_expected_value || '%');
                    WHEN 'not_empty' THEN
                        v_rule_matches := (v_actual_value IS NOT NULL AND v_actual_value != '');
                    WHEN 'empty' THEN
                        v_rule_matches := (v_actual_value IS NULL OR v_actual_value = '');
                    WHEN 'greater_than' THEN
                        v_rule_matches := (v_actual_value::NUMERIC > v_expected_value::NUMERIC);
                    WHEN 'less_than' THEN
                        v_rule_matches := (v_actual_value::NUMERIC < v_expected_value::NUMERIC);
                    ELSE
                        v_rule_matches := FALSE;
                END CASE;
                
                -- Se uma condição falhou, toda a regra falha
                IF NOT v_rule_matches THEN
                    v_all_conditions_met := FALSE;
                    EXIT;
                END IF;
            END LOOP;
            
            -- Se todas as condições foram atendidas, retornar SQL
            IF v_all_conditions_met THEN
                RETURN QUERY SELECT TRUE, 'sql'::lead_lifecycle_stage, v_rule->>'name';
                RETURN;
            END IF;
        END LOOP;
    END IF;

    -- Avaliar regras MQL se não qualificou para SQL
    IF v_current_stage = 'lead' AND jsonb_array_length(v_mql_rules) > 0 THEN
        FOR v_rule IN SELECT * FROM jsonb_array_elements(v_mql_rules)
        LOOP
            v_all_conditions_met := TRUE;
            
            -- Verificar cada condição da regra
            FOR v_field_name, v_operator, v_expected_value IN 
                SELECT condition->>'field', condition->>'operator', condition->>'value'
                FROM jsonb_array_elements(v_rule->'conditions') AS condition
            LOOP
                v_actual_value := p_custom_data->>v_field_name;
                v_rule_matches := FALSE;
                
                -- Avaliar condição baseada no operador
                CASE v_operator
                    WHEN 'equals' THEN
                        v_rule_matches := (v_actual_value = v_expected_value);
                    WHEN 'not_equals' THEN
                        v_rule_matches := (v_actual_value != v_expected_value OR v_actual_value IS NULL);
                    WHEN 'contains' THEN
                        v_rule_matches := (v_actual_value ILIKE '%' || v_expected_value || '%');
                    WHEN 'not_empty' THEN
                        v_rule_matches := (v_actual_value IS NOT NULL AND v_actual_value != '');
                    WHEN 'empty' THEN
                        v_rule_matches := (v_actual_value IS NULL OR v_actual_value = '');
                    WHEN 'greater_than' THEN
                        v_rule_matches := (v_actual_value::NUMERIC > v_expected_value::NUMERIC);
                    WHEN 'less_than' THEN
                        v_rule_matches := (v_actual_value::NUMERIC < v_expected_value::NUMERIC);
                    ELSE
                        v_rule_matches := FALSE;
                END CASE;
                
                -- Se uma condição falhou, toda a regra falha
                IF NOT v_rule_matches THEN
                    v_all_conditions_met := FALSE;
                    EXIT;
                END IF;
            END LOOP;
            
            -- Se todas as condições foram atendidas, retornar MQL
            IF v_all_conditions_met THEN
                RETURN QUERY SELECT TRUE, 'mql'::lead_lifecycle_stage, v_rule->>'name';
                RETURN;
            END IF;
        END LOOP;
    END IF;

    -- Nenhuma regra se aplicou
    RETURN QUERY SELECT FALSE, v_current_stage, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger para avaliar regras automaticamente quando custom_data é atualizado
CREATE OR REPLACE FUNCTION trigger_qualification_evaluation() 
RETURNS TRIGGER AS $$
DECLARE
    v_evaluation RECORD;
BEGIN
    -- Avaliar regras de qualificação
    SELECT * INTO v_evaluation 
    FROM evaluate_qualification_rules(NEW.id, NEW.custom_data) 
    LIMIT 1;
    
    -- Se deve atualizar o stage
    IF v_evaluation.should_update THEN
        -- Atualizar lifecycle_stage
        UPDATE pipeline_leads 
        SET lifecycle_stage = v_evaluation.new_stage,
            updated_at = NOW()
        WHERE id = NEW.id;
        
        -- Registrar no histórico
        INSERT INTO lead_lifecycle_history (
            pipeline_lead_id,
            tenant_id,
            from_stage,
            to_stage,
            changed_by,
            automation_triggered,
            rule_matched
        ) VALUES (
            NEW.id,
            NEW.tenant_id,
            OLD.lifecycle_stage,
            v_evaluation.new_stage,
            NEW.updated_by,
            TRUE,
            v_evaluation.rule_matched
        );
        
        -- Atualizar NEW para próximos triggers
        NEW.lifecycle_stage := v_evaluation.new_stage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
CREATE TRIGGER trigger_auto_qualification
    AFTER UPDATE OF custom_data ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_qualification_evaluation();

-- 11. Função helper para buscar estatísticas de qualificação
CREATE OR REPLACE FUNCTION get_qualification_stats(p_tenant_id TEXT, p_pipeline_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_leads BIGINT,
    leads_count BIGINT,
    mql_count BIGINT,
    sql_count BIGINT,
    mql_conversion_rate NUMERIC,
    sql_conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE lifecycle_stage = 'lead') as leads_count,
        COUNT(*) FILTER (WHERE lifecycle_stage = 'mql') as mql_count,
        COUNT(*) FILTER (WHERE lifecycle_stage = 'sql') as sql_count,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE lifecycle_stage = 'mql'))::NUMERIC * 100.0 / COUNT(*), 2)
            ELSE 0
        END as mql_conversion_rate,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE lifecycle_stage = 'sql'))::NUMERIC * 100.0 / COUNT(*), 2)
            ELSE 0
        END as sql_conversion_rate
    FROM pipeline_leads pl
    WHERE pl.tenant_id = p_tenant_id
    AND (p_pipeline_id IS NULL OR pl.pipeline_id = p_pipeline_id);
END;
$$ LANGUAGE plpgsql;

-- 12. Comentários nas tabelas e colunas
COMMENT ON COLUMN pipeline_leads.lifecycle_stage IS 'Estágio de qualificação do lead: lead (inicial), mql (marketing qualified), sql (sales qualified)';
COMMENT ON COLUMN pipelines.qualification_rules IS 'Regras de qualificação automática em formato JSON: {"mql": [regras], "sql": [regras]}';
COMMENT ON TABLE lead_lifecycle_history IS 'Histórico de mudanças de estágio de qualificação dos leads';
COMMENT ON FUNCTION evaluate_qualification_rules IS 'Avalia regras de qualificação automática baseadas nos custom_data do lead';
COMMENT ON FUNCTION get_qualification_stats IS 'Retorna estatísticas de conversão de qualificação de leads';