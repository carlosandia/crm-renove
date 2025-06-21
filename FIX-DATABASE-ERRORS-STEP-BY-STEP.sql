-- ========================================
-- SCRIPT PARA CORRIGIR ERROS DO BANCO - VERSÃO CORRIGIDA
-- ========================================

-- 1. PRIMEIRO: Verificar se as colunas tenant_id existem nas tabelas principais
DO $$
BEGIN
    -- Adicionar tenant_id na tabela pipelines se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipelines' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE pipelines ADD COLUMN tenant_id UUID;
        -- Atualizar registros existentes com um UUID padrão
        UPDATE pipelines SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
        ALTER TABLE pipelines ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    -- Adicionar tenant_id na tabela leads se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN tenant_id UUID;
        -- Pegar tenant_id da pipeline relacionada
        UPDATE leads SET tenant_id = (
            SELECT p.tenant_id FROM pipelines p WHERE p.id = leads.pipeline_id
        ) WHERE tenant_id IS NULL;
        -- Para leads sem pipeline, usar UUID padrão
        UPDATE leads SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
        ALTER TABLE leads ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- 2. CRIAR TABELA pipeline_win_loss_reasons (sem tenant_id inicialmente)
CREATE TABLE IF NOT EXISTS pipeline_win_loss_reasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL,
    reason_type VARCHAR(10) NOT NULL CHECK (reason_type IN ('win', 'loss')),
    reason_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar tenant_id depois
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipeline_win_loss_reasons' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE pipeline_win_loss_reasons ADD COLUMN tenant_id UUID;
        -- Pegar tenant_id da pipeline relacionada
        UPDATE pipeline_win_loss_reasons SET tenant_id = (
            SELECT p.tenant_id FROM pipelines p WHERE p.id = pipeline_win_loss_reasons.pipeline_id
        ) WHERE tenant_id IS NULL;
        ALTER TABLE pipeline_win_loss_reasons ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- 3. CRIAR ÍNDICES para pipeline_win_loss_reasons
CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_pipeline_id ON pipeline_win_loss_reasons(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_tenant_id ON pipeline_win_loss_reasons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_type ON pipeline_win_loss_reasons(reason_type);

-- 4. CRIAR FOREIGN KEY para pipeline_win_loss_reasons
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_pipeline_win_loss_reasons_pipeline'
    ) THEN
        ALTER TABLE pipeline_win_loss_reasons 
        ADD CONSTRAINT fk_pipeline_win_loss_reasons_pipeline 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. VERIFICAR E CORRIGIR RELACIONAMENTO pipelines -> pipeline_stages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_pipeline_stages_pipeline_id'
    ) THEN
        ALTER TABLE pipeline_stages 
        ADD CONSTRAINT fk_pipeline_stages_pipeline_id 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. CRIAR TABELAS DE CADÊNCIA

-- Tabela de configuração de cadência
CREATE TABLE IF NOT EXISTS cadence_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar tenant_id depois
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cadence_config' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE cadence_config ADD COLUMN tenant_id UUID;
        -- Pegar tenant_id da pipeline relacionada
        UPDATE cadence_config SET tenant_id = (
            SELECT p.tenant_id FROM pipelines p WHERE p.id = cadence_config.pipeline_id
        ) WHERE tenant_id IS NULL;
        ALTER TABLE cadence_config ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- Tabela de tarefas de cadência
CREATE TABLE IF NOT EXISTS cadence_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cadence_config_id UUID NOT NULL,
    day_offset INTEGER NOT NULL DEFAULT 0,
    task_order INTEGER NOT NULL DEFAULT 1,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'ligacao', 'sms', 'tarefa', 'visita')),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('mensagem', 'ligacao', 'tarefa', 'email_followup', 'agendamento', 'proposta')),
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT,
    template_content TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar tenant_id depois
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cadence_tasks' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE cadence_tasks ADD COLUMN tenant_id UUID;
        -- Pegar tenant_id da configuração relacionada
        UPDATE cadence_tasks SET tenant_id = (
            SELECT cc.tenant_id FROM cadence_config cc WHERE cc.id = cadence_tasks.cadence_config_id
        ) WHERE tenant_id IS NULL;
        ALTER TABLE cadence_tasks ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- Tabela de execuções de cadência
CREATE TABLE IF NOT EXISTS cadence_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cadence_task_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    pipeline_id UUID NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
    execution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar tenant_id depois
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cadence_executions' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE cadence_executions ADD COLUMN tenant_id UUID;
        -- Pegar tenant_id da pipeline relacionada
        UPDATE cadence_executions SET tenant_id = (
            SELECT p.tenant_id FROM pipelines p WHERE p.id = cadence_executions.pipeline_id
        ) WHERE tenant_id IS NULL;
        ALTER TABLE cadence_executions ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- 7. CRIAR TABELA lead_tasks
CREATE TABLE IF NOT EXISTS lead_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    pipeline_id UUID NOT NULL,
    etapa_id UUID,
    etapa_nome VARCHAR(255),
    data_programada TIMESTAMP WITH TIME ZONE NOT NULL,
    canal VARCHAR(50) NOT NULL CHECK (canal IN ('email', 'whatsapp', 'ligacao', 'sms', 'tarefa', 'visita')),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('mensagem', 'ligacao', 'tarefa', 'email_followup', 'agendamento', 'proposta')),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    template_conteudo TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'cancelada')),
    data_conclusao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    vendedor_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar tenant_id depois
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_tasks' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE lead_tasks ADD COLUMN tenant_id UUID;
        -- Pegar tenant_id da pipeline relacionada
        UPDATE lead_tasks SET tenant_id = (
            SELECT p.tenant_id FROM pipelines p WHERE p.id = lead_tasks.pipeline_id
        ) WHERE tenant_id IS NULL;
        ALTER TABLE lead_tasks ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- 8. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_cadence_config_pipeline_id ON cadence_config(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cadence_config_tenant_id ON cadence_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cadence_config_stage ON cadence_config(stage_name, stage_order);

CREATE INDEX IF NOT EXISTS idx_cadence_tasks_config_id ON cadence_tasks(cadence_config_id);
CREATE INDEX IF NOT EXISTS idx_cadence_tasks_tenant_id ON cadence_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cadence_tasks_day_order ON cadence_tasks(day_offset, task_order);

CREATE INDEX IF NOT EXISTS idx_cadence_executions_task_id ON cadence_executions(cadence_task_id);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_lead_id ON cadence_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_pipeline_id ON cadence_executions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_tenant_id ON cadence_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_status ON cadence_executions(status);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_scheduled ON cadence_executions(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_pipeline_id ON lead_tasks(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_tenant_id ON lead_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON lead_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_data_programada ON lead_tasks(data_programada);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_vendedor_id ON lead_tasks(vendedor_id);

-- 9. CRIAR FOREIGN KEYS
DO $$
BEGIN
    -- FK cadence_config -> pipelines
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cadence_config_pipeline'
    ) THEN
        ALTER TABLE cadence_config 
        ADD CONSTRAINT fk_cadence_config_pipeline 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    END IF;

    -- FK cadence_tasks -> cadence_config
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cadence_tasks_config'
    ) THEN
        ALTER TABLE cadence_tasks 
        ADD CONSTRAINT fk_cadence_tasks_config 
        FOREIGN KEY (cadence_config_id) REFERENCES cadence_config(id) ON DELETE CASCADE;
    END IF;

    -- FK cadence_executions -> cadence_tasks
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cadence_executions_task'
    ) THEN
        ALTER TABLE cadence_executions 
        ADD CONSTRAINT fk_cadence_executions_task 
        FOREIGN KEY (cadence_task_id) REFERENCES cadence_tasks(id) ON DELETE CASCADE;
    END IF;

    -- FK cadence_executions -> pipelines
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cadence_executions_pipeline'
    ) THEN
        ALTER TABLE cadence_executions 
        ADD CONSTRAINT fk_cadence_executions_pipeline 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    END IF;

    -- FK lead_tasks -> pipelines
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_lead_tasks_pipeline'
    ) THEN
        ALTER TABLE lead_tasks 
        ADD CONSTRAINT fk_lead_tasks_pipeline 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 10. HABILITAR RLS
ALTER TABLE pipeline_win_loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tasks ENABLE ROW LEVEL SECURITY;

-- 11. CRIAR POLÍTICAS RLS
DROP POLICY IF EXISTS "pipeline_win_loss_reasons_tenant_isolation" ON pipeline_win_loss_reasons;
CREATE POLICY "pipeline_win_loss_reasons_tenant_isolation" ON pipeline_win_loss_reasons
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS "cadence_config_tenant_isolation" ON cadence_config;
CREATE POLICY "cadence_config_tenant_isolation" ON cadence_config
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS "cadence_tasks_tenant_isolation" ON cadence_tasks;
CREATE POLICY "cadence_tasks_tenant_isolation" ON cadence_tasks
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS "cadence_executions_tenant_isolation" ON cadence_executions;
CREATE POLICY "cadence_executions_tenant_isolation" ON cadence_executions
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS "lead_tasks_tenant_isolation" ON lead_tasks;
CREATE POLICY "lead_tasks_tenant_isolation" ON lead_tasks
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

-- 12. VERIFICAÇÃO FINAL
SELECT 'Script executado com sucesso! Tabelas verificadas:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
    'pipeline_win_loss_reasons',
    'cadence_config', 
    'cadence_tasks', 
    'cadence_executions', 
    'lead_tasks'
) 
ORDER BY table_name; 