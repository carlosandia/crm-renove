-- ========================================
-- SCRIPT MÍNIMO E SEGURO - SÓ TABELAS ESSENCIAIS
-- ========================================

-- 1. CRIAR TABELA pipeline_win_loss_reasons (resolve o erro principal)
CREATE TABLE IF NOT EXISTS pipeline_win_loss_reasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL,
    reason_type VARCHAR(10) NOT NULL CHECK (reason_type IN ('win', 'loss')),
    reason_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID DEFAULT gen_random_uuid()
);

-- 2. CRIAR TABELAS DE CADÊNCIA (sem foreign keys por enquanto)

-- Tabela de configuração de cadência
CREATE TABLE IF NOT EXISTS cadence_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID DEFAULT gen_random_uuid(),
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    tenant_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    tenant_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR TABELA lead_tasks (independente)
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
    tenant_id UUID DEFAULT gen_random_uuid(),
    vendedor_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CRIAR ÍNDICES BÁSICOS
CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_pipeline_id ON pipeline_win_loss_reasons(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cadence_config_pipeline_id ON cadence_config(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cadence_tasks_config_id ON cadence_tasks(cadence_config_id);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_task_id ON cadence_executions(cadence_task_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON lead_tasks(lead_id);

-- 5. FOREIGN KEYS INTERNOS (só entre as tabelas que criamos)
DO $$
BEGIN
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
END $$;

-- 6. HABILITAR RLS
ALTER TABLE pipeline_win_loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tasks ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS RLS BÁSICAS (permitir tudo por enquanto)
DROP POLICY IF EXISTS "pipeline_win_loss_reasons_policy" ON pipeline_win_loss_reasons;
CREATE POLICY "pipeline_win_loss_reasons_policy" ON pipeline_win_loss_reasons FOR ALL USING (true);

DROP POLICY IF EXISTS "cadence_config_policy" ON cadence_config;
CREATE POLICY "cadence_config_policy" ON cadence_config FOR ALL USING (true);

DROP POLICY IF EXISTS "cadence_tasks_policy" ON cadence_tasks;
CREATE POLICY "cadence_tasks_policy" ON cadence_tasks FOR ALL USING (true);

DROP POLICY IF EXISTS "cadence_executions_policy" ON cadence_executions;
CREATE POLICY "cadence_executions_policy" ON cadence_executions FOR ALL USING (true);

DROP POLICY IF EXISTS "lead_tasks_policy" ON lead_tasks;
CREATE POLICY "lead_tasks_policy" ON lead_tasks FOR ALL USING (true);

-- 8. VERIFICAÇÃO FINAL
SELECT 'Script mínimo executado com sucesso!' as status;

SELECT 
    table_name,
    '✅ TABELA CRIADA' as status
FROM information_schema.tables 
WHERE table_name IN (
    'pipeline_win_loss_reasons',
    'cadence_config', 
    'cadence_tasks', 
    'cadence_executions', 
    'lead_tasks'
) 
ORDER BY table_name; 