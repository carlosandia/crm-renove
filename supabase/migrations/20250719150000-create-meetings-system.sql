-- =====================================================================================
-- MIGRATION: Sistema de Reuniões Completo
-- Data: 2025-07-19 15:00:00
-- Autor: Claude (Arquiteto Sênior)
-- Descrição: Implementa sistema completo de gestão de reuniões com outcomes padronizados
-- =====================================================================================

-- AIDEV-NOTE: Tabela meetings é core business - campos no_show_reason são padrão do sistema
CREATE TABLE IF NOT EXISTS meetings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pipeline_lead_id uuid NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    lead_master_id uuid NOT NULL REFERENCES leads_master(id) ON DELETE CASCADE,
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    planned_at timestamptz NOT NULL,
    outcome text CHECK (outcome IN ('agendada', 'realizada', 'no_show', 'reagendada', 'cancelada')) DEFAULT 'agendada',
    no_show_reason text CHECK (no_show_reason IN ('nao_atendeu', 'esqueceu', 'sem_interesse', 'problema_tecnico', 'outro')),
    notes text,
    google_event_id text, -- TODO: Integração futura com Google Calendar
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- AIDEV-NOTE: Índices para performance em consultas frequentes
CREATE INDEX IF NOT EXISTS idx_meetings_tenant_id ON meetings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meetings_pipeline_lead_id ON meetings(pipeline_lead_id);
CREATE INDEX IF NOT EXISTS idx_meetings_lead_master_id ON meetings(lead_master_id);
CREATE INDEX IF NOT EXISTS idx_meetings_owner_id ON meetings(owner_id);
CREATE INDEX IF NOT EXISTS idx_meetings_planned_at ON meetings(planned_at);
CREATE INDEX IF NOT EXISTS idx_meetings_outcome ON meetings(outcome);

-- AIDEV-NOTE: Adicionar colunas de contador em leads_master para métricas rápidas
DO $$ 
BEGIN
    -- Adicionar attended_count se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads_master' AND column_name = 'attended_count'
    ) THEN
        ALTER TABLE leads_master ADD COLUMN attended_count int DEFAULT 0;
    END IF;
    
    -- Adicionar no_show_count se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads_master' AND column_name = 'no_show_count'
    ) THEN
        ALTER TABLE leads_master ADD COLUMN no_show_count int DEFAULT 0;
    END IF;
END $$;

-- AIDEV-NOTE: Trigger para atualizar contadores automaticamente
CREATE OR REPLACE FUNCTION update_meeting_counters()
RETURNS TRIGGER AS $$
BEGIN
    -- Se outcome mudou para 'realizada'
    IF NEW.outcome = 'realizada' AND (OLD.outcome IS NULL OR OLD.outcome != 'realizada') THEN
        UPDATE leads_master 
        SET attended_count = attended_count + 1
        WHERE id = NEW.lead_master_id;
        
        -- AIDEV-NOTE: Atualizar lifecycle_stage no pipeline_leads também se existe
        UPDATE pipeline_leads
        SET custom_data = COALESCE(custom_data, '{}'::jsonb) || 
            jsonb_build_object('lifecycle_stage', 
                CASE 
                    WHEN COALESCE(custom_data->>'lifecycle_stage', 'lead') = 'mql' THEN 'sql'
                    ELSE COALESCE(custom_data->>'lifecycle_stage', 'lead')
                END
            )
        WHERE id = NEW.pipeline_lead_id;
    END IF;
    
    -- Se outcome mudou para 'no_show'
    IF NEW.outcome = 'no_show' AND (OLD.outcome IS NULL OR OLD.outcome != 'no_show') THEN
        UPDATE leads_master 
        SET no_show_count = no_show_count + 1
        WHERE id = NEW.lead_master_id;
    END IF;
    
    -- Se outcome saiu de 'realizada'
    IF OLD.outcome = 'realizada' AND NEW.outcome != 'realizada' THEN
        UPDATE leads_master 
        SET attended_count = GREATEST(0, attended_count - 1)
        WHERE id = NEW.lead_master_id;
    END IF;
    
    -- Se outcome saiu de 'no_show'
    IF OLD.outcome = 'no_show' AND NEW.outcome != 'no_show' THEN
        UPDATE leads_master 
        SET no_show_count = GREATEST(0, no_show_count - 1)
        WHERE id = NEW.lead_master_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AIDEV-NOTE: Aplicar trigger em INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_update_meeting_counters ON meetings;
CREATE TRIGGER trigger_update_meeting_counters
    AFTER INSERT OR UPDATE OF outcome ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_counters();

-- AIDEV-NOTE: RLS para isolamento multi-tenant obrigatório
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Policy para Super Admin (acesso total)
CREATE POLICY "Super Admin full access to meetings" ON meetings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Policy para Admin (apenas seu tenant)
CREATE POLICY "Admin access to tenant meetings" ON meetings
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy para Member (apenas meetings onde é owner ou pipeline_lead atribuído)
CREATE POLICY "Member access to own meetings" ON meetings
    FOR ALL USING (
        owner_id = auth.uid() 
        OR pipeline_lead_id IN (
            SELECT id FROM pipeline_leads 
            WHERE assigned_to = auth.uid()
        )
    );

-- AIDEV-NOTE: View para métricas de pipeline (performance otimizada)
CREATE OR REPLACE VIEW pipeline_meeting_metrics AS
SELECT 
    p.id as pipeline_id,
    p.tenant_id,
    COUNT(CASE WHEN m.outcome = 'agendada' THEN 1 END) as scheduled_count,
    COUNT(CASE WHEN m.outcome = 'realizada' THEN 1 END) as attended_count,
    COUNT(CASE WHEN m.outcome = 'no_show' THEN 1 END) as no_show_count,
    COUNT(CASE WHEN m.outcome = 'reagendada' THEN 1 END) as rescheduled_count,
    COUNT(CASE WHEN m.outcome = 'cancelada' THEN 1 END) as canceled_count,
    COUNT(m.id) as total_meetings,
    ROUND(
        CASE 
            WHEN COUNT(m.id) > 0 
            THEN (COUNT(CASE WHEN m.outcome = 'no_show' THEN 1 END)::decimal / COUNT(m.id)::decimal) * 100 
            ELSE 0 
        END, 
        2
    ) as no_show_rate,
    ROUND(
        CASE 
            WHEN COUNT(m.id) > 0 
            THEN (COUNT(CASE WHEN m.outcome = 'realizada' THEN 1 END)::decimal / COUNT(m.id)::decimal) * 100 
            ELSE 0 
        END, 
        2
    ) as attend_rate
FROM pipelines p
LEFT JOIN pipeline_leads pl ON pl.pipeline_id = p.id
LEFT JOIN meetings m ON m.pipeline_lead_id = pl.id
GROUP BY p.id, p.tenant_id;

-- AIDEV-NOTE: Grant permissions na view para roles apropriados
GRANT SELECT ON pipeline_meeting_metrics TO authenticated;

-- AIDEV-NOTE: Comentários para documentação
COMMENT ON TABLE meetings IS 'Tabela principal para gestão de reuniões com outcomes padronizados';
COMMENT ON COLUMN meetings.outcome IS 'Status da reunião: agendada, realizada, no_show, reagendada, cancelada';
COMMENT ON COLUMN meetings.no_show_reason IS 'Motivo do no-show (campo padrão do sistema)';
COMMENT ON COLUMN meetings.google_event_id IS 'ID do evento no Google Calendar (integração futura)';
COMMENT ON VIEW pipeline_meeting_metrics IS 'Métricas agregadas de reuniões por pipeline para dashboards';

-- AIDEV-NOTE: Função para recalcular contadores (utilitário de manutenção)
CREATE OR REPLACE FUNCTION recalculate_meeting_counters()
RETURNS void AS $$
BEGIN
    UPDATE leads_master SET 
        attended_count = (
            SELECT COUNT(*) 
            FROM meetings 
            WHERE meetings.lead_master_id = leads_master.id 
            AND meetings.outcome = 'realizada'
        ),
        no_show_count = (
            SELECT COUNT(*) 
            FROM meetings 
            WHERE meetings.lead_master_id = leads_master.id 
            AND meetings.outcome = 'no_show'
        );
END;
$$ LANGUAGE plpgsql;

-- AIDEV-NOTE: Grant execute para função utilitária
GRANT EXECUTE ON FUNCTION recalculate_meeting_counters() TO authenticated;

-- Inserir dados de exemplo para desenvolvimento (apenas se não existirem)
DO $$
BEGIN
    -- Verificar se já existem dados de exemplo
    IF NOT EXISTS (SELECT 1 FROM meetings LIMIT 1) THEN
        -- TODO: Inserir dados de exemplo quando houver leads de teste
        -- Comentado por segurança - será inserido via seed separado
    END IF;
END $$;