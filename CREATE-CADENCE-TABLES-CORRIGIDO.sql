-- =========================================================
-- SISTEMA DE CADÊNCIA PARA PIPELINES - VERSÃO CORRIGIDA
-- Script sem dependências de tabelas que podem não existir
-- =========================================================

-- 1. Tabela de configuração de cadência por etapa
CREATE TABLE IF NOT EXISTS cadence_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    tenant_id UUID NOT NULL,
    
    -- Constraints básicas (sem FK para pipelines por enquanto)
    UNIQUE(pipeline_id, stage_name)
);

-- 2. Tabela de tarefas da cadência
CREATE TABLE IF NOT EXISTS cadence_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cadence_config_id UUID NOT NULL REFERENCES cadence_config(id) ON DELETE CASCADE,
    day_offset INTEGER NOT NULL, -- D+0, D+1, D+2, etc.
    task_order INTEGER NOT NULL DEFAULT 1, -- Para múltiplas tarefas no mesmo dia
    channel VARCHAR(50) NOT NULL, -- 'email', 'whatsapp', 'ligacao', 'sms', 'tarefa'
    action_type VARCHAR(50) NOT NULL, -- 'mensagem', 'ligacao', 'tarefa', 'email_followup'
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT,
    template_content TEXT, -- Template da mensagem/email
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_cadence_tasks_config FOREIGN KEY (cadence_config_id) REFERENCES cadence_config(id) ON DELETE CASCADE,
    CHECK (day_offset >= 0),
    CHECK (task_order >= 1),
    CHECK (channel IN ('email', 'whatsapp', 'ligacao', 'sms', 'tarefa', 'visita')),
    CHECK (action_type IN ('mensagem', 'ligacao', 'tarefa', 'email_followup', 'agendamento', 'proposta'))
);

-- 3. Tabela de execução de tarefas (histórico) - SEM FK para leads por enquanto
CREATE TABLE IF NOT EXISTS cadence_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cadence_task_id UUID NOT NULL REFERENCES cadence_tasks(id) ON DELETE CASCADE,
    lead_id UUID, -- ID do lead (sem FK por enquanto)
    pipeline_id UUID, -- ID da pipeline (sem FK por enquanto)
    assigned_to UUID, -- ID do vendedor responsável
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'skipped', 'failed'
    execution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL,
    
    -- Constraints
    CONSTRAINT fk_cadence_exec_task FOREIGN KEY (cadence_task_id) REFERENCES cadence_tasks(id) ON DELETE CASCADE,
    CHECK (status IN ('pending', 'completed', 'skipped', 'failed', 'in_progress'))
);

-- =========================================================
-- ÍNDICES PARA PERFORMANCE
-- =========================================================

-- Índices para cadence_config
CREATE INDEX IF NOT EXISTS idx_cadence_config_pipeline_id ON cadence_config(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cadence_config_tenant_id ON cadence_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cadence_config_active ON cadence_config(is_active) WHERE is_active = true;

-- Índices para cadence_tasks
CREATE INDEX IF NOT EXISTS idx_cadence_tasks_config_id ON cadence_tasks(cadence_config_id);
CREATE INDEX IF NOT EXISTS idx_cadence_tasks_day_offset ON cadence_tasks(day_offset);
CREATE INDEX IF NOT EXISTS idx_cadence_tasks_active ON cadence_tasks(is_active) WHERE is_active = true;

-- Índices para cadence_executions
CREATE INDEX IF NOT EXISTS idx_cadence_exec_lead_id ON cadence_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_cadence_exec_pipeline_id ON cadence_executions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cadence_exec_assigned_to ON cadence_executions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cadence_exec_due_date ON cadence_executions(due_date);
CREATE INDEX IF NOT EXISTS idx_cadence_exec_status ON cadence_executions(status);
CREATE INDEX IF NOT EXISTS idx_cadence_exec_tenant_id ON cadence_executions(tenant_id);

-- =========================================================
-- POLÍTICAS RLS (Row Level Security)
-- =========================================================

-- Habilitar RLS
ALTER TABLE cadence_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_executions ENABLE ROW LEVEL SECURITY;

-- Políticas para cadence_config (usando tenant_id diretamente)
DROP POLICY IF EXISTS "cadence_config_tenant_policy" ON cadence_config;
CREATE POLICY "cadence_config_tenant_policy" ON cadence_config
    FOR ALL USING (
        tenant_id = COALESCE(
            current_setting('app.current_tenant_id', true)::uuid,
            auth.jwt() ->> 'tenant_id'::text
        )::uuid
    );

-- Políticas para cadence_tasks
DROP POLICY IF EXISTS "cadence_tasks_tenant_policy" ON cadence_tasks;
CREATE POLICY "cadence_tasks_tenant_policy" ON cadence_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cadence_config cc 
            WHERE cc.id = cadence_config_id 
            AND cc.tenant_id = COALESCE(
                current_setting('app.current_tenant_id', true)::uuid,
                auth.jwt() ->> 'tenant_id'::text
            )::uuid
        )
    );

-- Políticas para cadence_executions
DROP POLICY IF EXISTS "cadence_executions_tenant_policy" ON cadence_executions;
CREATE POLICY "cadence_executions_tenant_policy" ON cadence_executions
    FOR ALL USING (
        tenant_id = COALESCE(
            current_setting('app.current_tenant_id', true)::uuid,
            auth.jwt() ->> 'tenant_id'::text
        )::uuid
    );

-- =========================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =========================================================

COMMENT ON TABLE cadence_config IS 'Configuração de cadência por etapa da pipeline';
COMMENT ON COLUMN cadence_config.stage_name IS 'Nome da etapa da pipeline';
COMMENT ON COLUMN cadence_config.stage_order IS 'Ordem da etapa na pipeline';

COMMENT ON TABLE cadence_tasks IS 'Tarefas individuais da cadência';
COMMENT ON COLUMN cadence_tasks.day_offset IS 'Dias após entrada na etapa (D+0, D+1, D+2...)';
COMMENT ON COLUMN cadence_tasks.task_order IS 'Ordem da tarefa no mesmo dia';
COMMENT ON COLUMN cadence_tasks.channel IS 'Canal de comunicação da tarefa';
COMMENT ON COLUMN cadence_tasks.action_type IS 'Tipo de ação a ser executada';
COMMENT ON COLUMN cadence_tasks.template_content IS 'Template de mensagem/email';

COMMENT ON TABLE cadence_executions IS 'Histórico de execução das tarefas de cadência';
COMMENT ON COLUMN cadence_executions.due_date IS 'Data limite para execução da tarefa';
COMMENT ON COLUMN cadence_executions.status IS 'Status da execução da tarefa';
COMMENT ON COLUMN cadence_executions.lead_id IS 'ID do lead (referência manual)';
COMMENT ON COLUMN cadence_executions.pipeline_id IS 'ID da pipeline (referência manual)';

-- =========================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =========================================================

-- Trigger para atualizar updated_at em cadence_config
CREATE OR REPLACE FUNCTION update_cadence_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cadence_config_updated_at ON cadence_config;
CREATE TRIGGER trigger_cadence_config_updated_at
    BEFORE UPDATE ON cadence_config
    FOR EACH ROW
    EXECUTE FUNCTION update_cadence_config_updated_at();

-- Trigger para atualizar updated_at em cadence_tasks
CREATE OR REPLACE FUNCTION update_cadence_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cadence_tasks_updated_at ON cadence_tasks;
CREATE TRIGGER trigger_cadence_tasks_updated_at
    BEFORE UPDATE ON cadence_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_cadence_tasks_updated_at();

-- Trigger para atualizar updated_at em cadence_executions
CREATE OR REPLACE FUNCTION update_cadence_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cadence_executions_updated_at ON cadence_executions;
CREATE TRIGGER trigger_cadence_executions_updated_at
    BEFORE UPDATE ON cadence_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_cadence_executions_updated_at();

-- =========================================================
-- FUNÇÃO PARA GERAR TAREFAS DE CADÊNCIA (VERSÃO SIMPLES)
-- =========================================================

-- Função básica para criar tarefas de cadência quando lead muda de etapa
CREATE OR REPLACE FUNCTION generate_cadence_tasks_for_lead(
    p_lead_id UUID,
    p_pipeline_id UUID,
    p_stage_name VARCHAR,
    p_assigned_to UUID,
    p_tenant_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_cadence_config_id UUID;
    v_task_record RECORD;
    v_tasks_created INTEGER := 0;
    v_entry_date TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Buscar configuração de cadência para a etapa
    SELECT id INTO v_cadence_config_id
    FROM cadence_config
    WHERE pipeline_id = p_pipeline_id
      AND stage_name = p_stage_name
      AND is_active = true
      AND tenant_id = p_tenant_id;

    -- Se não há configuração, retornar 0
    IF v_cadence_config_id IS NULL THEN
        RETURN 0;
    END IF;

    -- Criar tarefas para cada configuração de cadência
    FOR v_task_record IN
        SELECT *
        FROM cadence_tasks
        WHERE cadence_config_id = v_cadence_config_id
          AND is_active = true
        ORDER BY day_offset, task_order
    LOOP
        -- Inserir tarefa de execução
        INSERT INTO cadence_executions (
            cadence_task_id,
            lead_id,
            pipeline_id,
            assigned_to,
            due_date,
            status,
            tenant_id
        ) VALUES (
            v_task_record.id,
            p_lead_id,
            p_pipeline_id,
            p_assigned_to,
            v_entry_date + INTERVAL '1 day' * v_task_record.day_offset,
            'pending',
            p_tenant_id
        );

        v_tasks_created := v_tasks_created + 1;
    END LOOP;

    RETURN v_tasks_created;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_cadence_tasks_for_lead IS 'Gera tarefas de cadência para um lead em uma etapa específica (versão sem FK)';

-- =========================================================
-- DADOS DE EXEMPLO PARA TESTE (OPCIONAL)
-- =========================================================

-- Inserir dados de exemplo apenas se não existirem
DO $$
BEGIN
    -- Verificar se já existem dados
    IF NOT EXISTS (SELECT 1 FROM cadence_config LIMIT 1) THEN
        -- Inserir configuração de exemplo
        INSERT INTO cadence_config (
            pipeline_id,
            stage_name,
            stage_order,
            tenant_id,
            created_by
        ) VALUES (
            gen_random_uuid(), -- pipeline_id fictício
            'Novo Lead',
            0,
            gen_random_uuid(), -- tenant_id fictício
            'system'
        );
        
        RAISE NOTICE 'Dados de exemplo inseridos para teste';
    END IF;
END $$;

-- =========================================================
-- VERIFICAÇÃO FINAL
-- =========================================================

-- Verificar se as tabelas foram criadas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cadence_config') THEN
        RAISE NOTICE '✅ Tabela cadence_config criada com sucesso';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cadence_tasks') THEN
        RAISE NOTICE '✅ Tabela cadence_tasks criada com sucesso';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cadence_executions') THEN
        RAISE NOTICE '✅ Tabela cadence_executions criada com sucesso';
    END IF;
    
    RAISE NOTICE '🎯 Sistema de Cadência instalado com sucesso!';
END $$; 