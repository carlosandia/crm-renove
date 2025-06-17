-- ============================================
-- SISTEMA DE CADÊNCIAS SEQUENCIAIS
-- ============================================

-- Tabela para templates de sequências
CREATE TABLE IF NOT EXISTS sequence_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    trigger_event VARCHAR(50) NOT NULL CHECK (trigger_event IN ('stage_entry', 'manual', 'lead_created', 'field_updated')),
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para tarefas das sequências
CREATE TABLE IF NOT EXISTS sequence_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sequence_id UUID NOT NULL REFERENCES sequence_templates(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('email', 'call', 'sms', 'meeting', 'reminder', 'linkedin', 'whatsapp')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    delay_days INTEGER DEFAULT 0,
    delay_hours INTEGER DEFAULT 0,
    template_content TEXT,
    is_required BOOLEAN DEFAULT false,
    auto_complete BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para condições das tarefas
CREATE TABLE IF NOT EXISTS sequence_conditions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES sequence_tasks(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    operator VARCHAR(20) NOT NULL CHECK (operator IN ('equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'exists', 'not_exists')),
    field_value TEXT,
    action VARCHAR(20) NOT NULL CHECK (action IN ('skip', 'pause', 'branch', 'complete')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para execuções de sequências (histórico)
CREATE TABLE IF NOT EXISTS sequence_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sequence_id UUID NOT NULL REFERENCES sequence_templates(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    current_task_index INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para execuções individuais de tarefas
CREATE TABLE IF NOT EXISTS sequence_task_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_id UUID NOT NULL REFERENCES sequence_executions(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES sequence_tasks(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
    assigned_to UUID REFERENCES users(id),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    result_data JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sequence_templates_tenant_id ON sequence_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sequence_templates_pipeline_id ON sequence_templates(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_sequence_templates_stage_id ON sequence_templates(stage_id);
CREATE INDEX IF NOT EXISTS idx_sequence_templates_trigger_event ON sequence_templates(trigger_event);
CREATE INDEX IF NOT EXISTS idx_sequence_templates_is_active ON sequence_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_sequence_tasks_sequence_id ON sequence_tasks(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_tasks_order_index ON sequence_tasks(sequence_id, order_index);

CREATE INDEX IF NOT EXISTS idx_sequence_executions_sequence_id ON sequence_executions(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_executions_lead_id ON sequence_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_sequence_executions_status ON sequence_executions(status);

CREATE INDEX IF NOT EXISTS idx_sequence_task_executions_execution_id ON sequence_task_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_sequence_task_executions_task_id ON sequence_task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_sequence_task_executions_status ON sequence_task_executions(status);
CREATE INDEX IF NOT EXISTS idx_sequence_task_executions_assigned_to ON sequence_task_executions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sequence_task_executions_scheduled_for ON sequence_task_executions(scheduled_for);

-- RLS (Row Level Security)
ALTER TABLE sequence_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_task_executions ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança corrigidas
CREATE POLICY "Users can access sequences from their tenant" ON sequence_templates
    FOR ALL USING (
        tenant_id IN (
            SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can access tasks from their sequences" ON sequence_tasks
    FOR ALL USING (
        sequence_id IN (
            SELECT st.id FROM sequence_templates st
            JOIN users u ON st.tenant_id = u.tenant_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can access conditions from their sequences" ON sequence_conditions
    FOR ALL USING (
        task_id IN (
            SELECT st.id FROM sequence_tasks st
            JOIN sequence_templates s ON st.sequence_id = s.id
            JOIN users u ON s.tenant_id = u.tenant_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can access executions from their sequences" ON sequence_executions
    FOR ALL USING (
        sequence_id IN (
            SELECT st.id FROM sequence_templates st
            JOIN users u ON st.tenant_id = u.tenant_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can access task executions from their sequences" ON sequence_task_executions
    FOR ALL USING (
        execution_id IN (
            SELECT se.id FROM sequence_executions se
            JOIN sequence_templates s ON se.sequence_id = s.id
            JOIN users u ON s.tenant_id = u.tenant_id
            WHERE u.id = auth.uid()
        )
    );

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_sequence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sequence_templates_updated_at
    BEFORE UPDATE ON sequence_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_sequence_updated_at();

CREATE TRIGGER trigger_update_sequence_tasks_updated_at
    BEFORE UPDATE ON sequence_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_sequence_updated_at();

CREATE TRIGGER trigger_update_sequence_executions_updated_at
    BEFORE UPDATE ON sequence_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_sequence_updated_at();

CREATE TRIGGER trigger_update_sequence_task_executions_updated_at
    BEFORE UPDATE ON sequence_task_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_sequence_updated_at();

-- Função para disparar sequências automaticamente
CREATE OR REPLACE FUNCTION trigger_sequence_on_stage_entry()
RETURNS TRIGGER AS $$
DECLARE
    sequence_rec RECORD;
BEGIN
    -- Buscar sequências ativas para a etapa que o lead acabou de entrar
    FOR sequence_rec IN 
        SELECT id FROM sequence_templates 
        WHERE stage_id = NEW.stage_id 
        AND trigger_event = 'stage_entry' 
        AND is_active = true
    LOOP
        -- Criar uma nova execução de sequência
        INSERT INTO sequence_executions (sequence_id, lead_id, status, current_task_index)
        VALUES (sequence_rec.id, NEW.id, 'active', 0);
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para disparar sequências quando lead muda de etapa
CREATE TRIGGER trigger_pipeline_leads_sequence_trigger
    AFTER UPDATE OF stage_id ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sequence_on_stage_entry();

-- Comentários
COMMENT ON TABLE sequence_templates IS 'Templates de sequências de cadência automatizada';
COMMENT ON TABLE sequence_tasks IS 'Tarefas individuais das sequências';
COMMENT ON TABLE sequence_conditions IS 'Condições para execução ou pulo de tarefas';
COMMENT ON TABLE sequence_executions IS 'Execuções ativas/históricas das sequências';
COMMENT ON TABLE sequence_task_executions IS 'Execuções individuais de tarefas';

COMMENT ON COLUMN sequence_templates.trigger_event IS 'Evento que dispara a sequência: stage_entry, manual, lead_created, field_updated';
COMMENT ON COLUMN sequence_tasks.task_type IS 'Tipo da tarefa: email, call, sms, meeting, reminder, linkedin, whatsapp';
COMMENT ON COLUMN sequence_tasks.delay_days IS 'Dias para aguardar antes de executar a tarefa';
COMMENT ON COLUMN sequence_tasks.delay_hours IS 'Horas para aguardar antes de executar a tarefa';
COMMENT ON COLUMN sequence_tasks.auto_complete IS 'Se a tarefa deve ser marcada como concluída automaticamente';
COMMENT ON COLUMN sequence_executions.current_task_index IS 'Índice da tarefa atual na sequência';
COMMENT ON COLUMN sequence_task_executions.scheduled_for IS 'Quando a tarefa está agendada para ser executada'; 