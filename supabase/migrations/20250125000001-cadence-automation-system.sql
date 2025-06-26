-- =====================================================
-- MIGRAÇÃO: SISTEMA DE CADÊNCIAS AUTOMATIZADAS
-- Data: 2025-01-25
-- Descrição: Implementa sistema de cadências de follow-up
--           automatizadas por etapa da pipeline
-- =====================================================

-- 1. CRIAR TABELA DE TEMPLATES DE CADÊNCIA
-- =====================================================
CREATE TABLE IF NOT EXISTS cadence_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Configurações de execução
    auto_start BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(tenant_id, pipeline_id, stage_id, name)
);

-- 2. CRIAR TABELA DE PASSOS DA CADÊNCIA
-- =====================================================
CREATE TABLE IF NOT EXISTS cadence_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cadence_template_id UUID NOT NULL REFERENCES cadence_templates(id) ON DELETE CASCADE,
    
    -- Configurações do passo
    step_order INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Timing
    delay_days INTEGER DEFAULT 0,
    delay_hours INTEGER DEFAULT 0,
    delay_minutes INTEGER DEFAULT 0,
    
    -- Tipo de ação
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'call_phone',
        'call_whatsapp', 
        'send_email',
        'send_sms',
        'send_whatsapp_message',
        'schedule_meeting',
        'create_task',
        'wait',
        'update_temperature',
        'move_stage',
        'add_tag',
        'send_notification'
    )),
    
    -- Configurações específicas da ação
    action_config JSONB DEFAULT '{}',
    
    -- Templates de conteúdo
    email_subject VARCHAR(500),
    email_template TEXT,
    whatsapp_template TEXT,
    sms_template TEXT,
    task_description TEXT,
    
    -- Condições para execução
    execution_conditions JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR TABELA DE EXECUÇÕES DE CADÊNCIA
-- =====================================================
CREATE TABLE IF NOT EXISTS cadence_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cadence_template_id UUID NOT NULL REFERENCES cadence_templates(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    
    -- Status da execução
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN (
        'active',
        'paused',
        'completed',
        'cancelled',
        'failed'
    )),
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paused_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Progresso
    current_step_order INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 0,
    
    -- Metadados
    execution_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(cadence_template_id, lead_id)
);

-- 4. CRIAR TABELA DE EXECUÇÕES DE PASSOS
-- =====================================================
CREATE TABLE IF NOT EXISTS cadence_step_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cadence_execution_id UUID NOT NULL REFERENCES cadence_executions(id) ON DELETE CASCADE,
    cadence_step_id UUID NOT NULL REFERENCES cadence_steps(id) ON DELETE CASCADE,
    
    -- Status do passo
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'scheduled',
        'executing',
        'completed',
        'failed',
        'skipped',
        'cancelled'
    )),
    
    -- Timing
    scheduled_for TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Resultados
    execution_result JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Tentativas
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Responsável pela execução (member que deve executar)
    assigned_to UUID REFERENCES auth.users(id),
    executed_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. FUNÇÃO PARA INICIAR CADÊNCIA AUTOMATICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION start_cadence_for_lead(
    p_lead_id UUID,
    p_stage_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    template_record cadence_templates%ROWTYPE;
    execution_id UUID;
    step_record RECORD;
    total_steps INTEGER;
BEGIN
    -- Buscar template ativo para a etapa
    SELECT * INTO template_record
    FROM cadence_templates 
    WHERE stage_id = p_stage_id 
    AND is_active = true 
    AND auto_start = true
    ORDER BY priority ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Verificar se já existe execução ativa
    IF EXISTS (
        SELECT 1 FROM cadence_executions 
        WHERE lead_id = p_lead_id 
        AND cadence_template_id = template_record.id 
        AND status = 'active'
    ) THEN
        RETURN false;
    END IF;
    
    -- Contar total de passos
    SELECT COUNT(*) INTO total_steps
    FROM cadence_steps 
    WHERE cadence_template_id = template_record.id 
    AND is_active = true;
    
    -- Criar execução
    INSERT INTO cadence_executions (
        cadence_template_id,
        lead_id,
        status,
        total_steps,
        execution_data
    ) VALUES (
        template_record.id,
        p_lead_id,
        'active',
        total_steps,
        jsonb_build_object(
            'template_name', template_record.name,
            'auto_started', true,
            'started_by_system', true
        )
    ) RETURNING id INTO execution_id;
    
    -- Criar execuções de passos
    FOR step_record IN 
        SELECT * FROM cadence_steps 
        WHERE cadence_template_id = template_record.id 
        AND is_active = true
        ORDER BY step_order ASC
    LOOP
        INSERT INTO cadence_step_executions (
            cadence_execution_id,
            cadence_step_id,
            status,
            scheduled_for,
            max_attempts
        ) VALUES (
            execution_id,
            step_record.id,
            CASE 
                WHEN step_record.step_order = 1 THEN 'scheduled'
                ELSE 'pending'
            END,
            CASE 
                WHEN step_record.step_order = 1 THEN 
                    NOW() + INTERVAL '1 day' * step_record.delay_days + 
                    INTERVAL '1 hour' * step_record.delay_hours + 
                    INTERVAL '1 minute' * step_record.delay_minutes
                ELSE NULL
            END,
            COALESCE((step_record.action_config->>'max_attempts')::INTEGER, 3)
        );
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. FUNÇÃO PARA OBTER TAREFAS PENDENTES DE CADÊNCIA
-- =====================================================
CREATE OR REPLACE FUNCTION get_pending_cadence_tasks(
    p_user_id UUID,
    p_tenant_id UUID DEFAULT NULL
) RETURNS TABLE (
    execution_id UUID,
    step_execution_id UUID,
    lead_id UUID,
    lead_name TEXT,
    pipeline_name TEXT,
    stage_name TEXT,
    step_name TEXT,
    action_type TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    template_content TEXT,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id as execution_id,
        cse.id as step_execution_id,
        pl.id as lead_id,
        COALESCE(pl.custom_data->>'nome_lead', pl.custom_data->>'nome', 'Lead sem nome') as lead_name,
        p.name as pipeline_name,
        ps.name as stage_name,
        cs.name as step_name,
        cs.action_type,
        cse.scheduled_for,
        CASE cs.action_type
            WHEN 'send_email' THEN cs.email_template
            WHEN 'send_whatsapp_message' THEN cs.whatsapp_template
            WHEN 'send_sms' THEN cs.sms_template
            WHEN 'create_task' THEN cs.task_description
            ELSE cs.description
        END as template_content,
        ct.priority
    FROM cadence_step_executions cse
    JOIN cadence_executions ce ON cse.cadence_execution_id = ce.id
    JOIN cadence_templates ct ON ce.cadence_template_id = ct.id
    JOIN cadence_steps cs ON cse.cadence_step_id = cs.id
    JOIN pipeline_leads pl ON ce.lead_id = pl.id
    JOIN pipelines p ON pl.pipeline_id = p.id
    JOIN pipeline_stages ps ON pl.stage_id = ps.id
    WHERE cse.status = 'scheduled'
    AND cse.scheduled_for <= NOW()
    AND ce.status = 'active'
    AND (cse.assigned_to = p_user_id OR cse.assigned_to IS NULL)
    AND (p_tenant_id IS NULL OR ct.tenant_id = p_tenant_id)
    ORDER BY cse.scheduled_for ASC, ct.priority ASC;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGER PARA INICIAR CADÊNCIAS AUTOMATICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_start_cadence() RETURNS TRIGGER AS $$
BEGIN
    -- Quando lead é inserido ou muda de etapa
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.stage_id != NEW.stage_id) THEN
        -- Tentar iniciar cadência para a nova etapa
        PERFORM start_cadence_for_lead(NEW.id, NEW.stage_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS pipeline_leads_cadence_trigger ON pipeline_leads;
CREATE TRIGGER pipeline_leads_cadence_trigger
    AFTER INSERT OR UPDATE ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_start_cadence();

-- 8. INSERIR TEMPLATES PADRÃO
-- =====================================================
-- Inserir templates de cadência padrão para pipelines existentes
DO $$
DECLARE
    pipeline_record RECORD;
    stage_record RECORD;
    template_id UUID;
BEGIN
    -- Para cada pipeline existente
    FOR pipeline_record IN 
        SELECT p.*, t.id as tenant_id 
        FROM pipelines p 
        JOIN tenants t ON p.tenant_id = t.id
    LOOP
        -- Para cada etapa da pipeline
        FOR stage_record IN 
            SELECT * FROM pipeline_stages 
            WHERE pipeline_id = pipeline_record.id 
            AND name = 'Novos Leads'
        LOOP
            -- Verificar se já existe template
            IF NOT EXISTS (
                SELECT 1 FROM cadence_templates 
                WHERE pipeline_id = pipeline_record.id 
                AND stage_id = stage_record.id
            ) THEN
                -- Criar template de cadência padrão
                INSERT INTO cadence_templates (
                    tenant_id,
                    pipeline_id,
                    stage_id,
                    name,
                    description,
                    is_active,
                    auto_start,
                    priority
                ) VALUES (
                    pipeline_record.tenant_id,
                    pipeline_record.id,
                    stage_record.id,
                    'Cadência Padrão - Novos Leads',
                    'Sequência automática de follow-up para leads na etapa inicial',
                    true,
                    true,
                    1
                ) RETURNING id INTO template_id;
                
                -- Inserir passos padrão
                INSERT INTO cadence_steps (cadence_template_id, step_order, name, action_type, delay_days, delay_hours, whatsapp_template, task_description, email_subject, email_template) VALUES
                (template_id, 1, 'Contato Inicial WhatsApp', 'send_whatsapp_message', 0, 0, 'Olá! Vi seu interesse em nossos serviços. Como posso ajudar?', 'Enviar mensagem inicial via WhatsApp', '', ''),
                (template_id, 2, 'Ligação de Follow-up', 'call_phone', 0, 2, '', 'Ligar para o lead para apresentação inicial', '', ''),
                (template_id, 3, 'Segunda Ligação', 'call_phone', 0, 4, '', 'Segunda tentativa de contato telefônico', '', ''),
                (template_id, 4, 'Email de Follow-up', 'send_email', 1, 0, '', 'Enviar email com informações detalhadas', 'Continuando nossa conversa', 'Olá! Notei seu interesse em nossos serviços. Gostaria de agendar uma conversa para entender melhor suas necessidades?'),
                (template_id, 5, 'Ligação Final', 'call_phone', 2, 0, '', 'Última tentativa de contato antes de marcar como frio', '', '');
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 9. POLÍTICAS RLS
-- =====================================================
ALTER TABLE cadence_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_step_executions ENABLE ROW LEVEL SECURITY;

-- Políticas para Super Admin (acesso total)
CREATE POLICY "Super Admin full access cadence_templates" ON cadence_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- Políticas para Admin (apenas sua empresa)
CREATE POLICY "Admin access cadence_templates" ON cadence_templates
    FOR ALL USING (
        tenant_id IN (
            SELECT ur.tenant_id FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

CREATE POLICY "Admin access cadence_steps" ON cadence_steps
    FOR ALL USING (
        cadence_template_id IN (
            SELECT ct.id FROM cadence_templates ct
            JOIN user_roles ur ON ct.tenant_id = ur.tenant_id
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- Políticas para Member (acesso limitado)
CREATE POLICY "Member access cadence_executions" ON cadence_executions
    FOR SELECT USING (
        lead_id IN (
            SELECT pl.id FROM pipeline_leads pl
            JOIN pipelines p ON pl.pipeline_id = p.id
            JOIN user_roles ur ON p.tenant_id = ur.tenant_id
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'member'
        )
    );

CREATE POLICY "Member access cadence_step_executions" ON cadence_step_executions
    FOR ALL USING (
        assigned_to = auth.uid() OR 
        cadence_execution_id IN (
            SELECT ce.id FROM cadence_executions ce
            JOIN pipeline_leads pl ON ce.lead_id = pl.id
            JOIN pipelines p ON pl.pipeline_id = p.id
            JOIN user_roles ur ON p.tenant_id = ur.tenant_id
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'member'
        )
    );

-- 10. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_cadence_templates_stage ON cadence_templates(stage_id, is_active, auto_start);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_lead ON cadence_executions(lead_id, status);
CREATE INDEX IF NOT EXISTS idx_cadence_step_executions_scheduled ON cadence_step_executions(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_cadence_step_executions_assigned ON cadence_step_executions(assigned_to, status);

-- 11. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE cadence_templates IS 'Templates de cadências de follow-up por etapa da pipeline';
COMMENT ON TABLE cadence_steps IS 'Passos individuais de cada cadência';
COMMENT ON TABLE cadence_executions IS 'Execuções ativas de cadências para leads específicos';
COMMENT ON TABLE cadence_step_executions IS 'Execuções de passos individuais com status e timing';

-- =====================================================
-- FIM DA MIGRAÇÃO: SISTEMA DE CADÊNCIAS AUTOMATIZADAS
-- ===================================================== 