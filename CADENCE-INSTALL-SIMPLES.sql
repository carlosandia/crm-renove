-- =========================================================
-- SISTEMA DE CADÊNCIA - INSTALAÇÃO SIMPLES
-- Execute este script no seu banco Supabase
-- =========================================================

-- 1. Tabela de configuração de cadência
CREATE TABLE cadence_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    tenant_id UUID NOT NULL,
    UNIQUE(pipeline_id, stage_name)
);

-- 2. Tabela de tarefas da cadência
CREATE TABLE cadence_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cadence_config_id UUID NOT NULL REFERENCES cadence_config(id) ON DELETE CASCADE,
    day_offset INTEGER NOT NULL CHECK (day_offset >= 0),
    task_order INTEGER NOT NULL DEFAULT 1 CHECK (task_order >= 1),
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'ligacao', 'sms', 'tarefa', 'visita')),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('mensagem', 'ligacao', 'tarefa', 'email_followup', 'agendamento', 'proposta')),
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT,
    template_content TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de execução de tarefas
CREATE TABLE cadence_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cadence_task_id UUID NOT NULL REFERENCES cadence_tasks(id) ON DELETE CASCADE,
    lead_id UUID,
    pipeline_id UUID,
    assigned_to UUID,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'failed', 'in_progress')),
    execution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- Índices básicos
CREATE INDEX idx_cadence_config_pipeline ON cadence_config(pipeline_id);
CREATE INDEX idx_cadence_config_tenant ON cadence_config(tenant_id);
CREATE INDEX idx_cadence_tasks_config ON cadence_tasks(cadence_config_id);
CREATE INDEX idx_cadence_exec_lead ON cadence_executions(lead_id);
CREATE INDEX idx_cadence_exec_status ON cadence_executions(status);

-- Ativar RLS
ALTER TABLE cadence_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_executions ENABLE ROW LEVEL SECURITY;

-- Política simples baseada em auth
CREATE POLICY cadence_config_policy ON cadence_config FOR ALL USING (true);
CREATE POLICY cadence_tasks_policy ON cadence_tasks FOR ALL USING (true);
CREATE POLICY cadence_executions_policy ON cadence_executions FOR ALL USING (true); 