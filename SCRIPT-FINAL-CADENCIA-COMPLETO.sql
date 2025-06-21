-- ========================================
-- SCRIPT FINAL - SISTEMA DE CADÊNCIA COMPLETO
-- Execute este script no Supabase SQL Editor
-- ========================================

-- 1. CRIAR TABELA pipeline_win_loss_reasons (resolve erro principal do console)
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

-- 2. TABELAS DO SISTEMA DE CADÊNCIA

-- Configuração de cadência por pipeline + etapa
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

-- Tarefas da cadência (D+0, D+1, D+2, etc.)
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

-- Execuções de cadência (controle de tarefas executadas)
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

-- Tarefas individuais dos leads (geradas automaticamente)
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
    assigned_to UUID,
    day_offset INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_pipeline_id ON pipeline_win_loss_reasons(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cadence_config_pipeline_id ON cadence_config(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cadence_config_tenant ON cadence_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cadence_tasks_config_id ON cadence_tasks(cadence_config_id);
CREATE INDEX IF NOT EXISTS idx_cadence_tasks_tenant ON cadence_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_task_id ON cadence_executions(cadence_task_id);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_lead ON cadence_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assigned_to ON lead_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON lead_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_data_programada ON lead_tasks(data_programada);

-- 4. FOREIGN KEYS (relacionamentos)
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

-- 5. HABILITAR ROW LEVEL SECURITY
ALTER TABLE pipeline_win_loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tasks ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS RLS (permissões por tenant)
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

-- 7. FUNÇÃO PARA GERAR TAREFAS AUTOMÁTICAS
CREATE OR REPLACE FUNCTION generate_lead_tasks_on_stage_entry()
RETURNS TRIGGER AS $$
DECLARE
    config_record RECORD;
    task_record RECORD;
    scheduled_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Buscar configuração de cadência para esta pipeline + etapa
    FOR config_record IN 
        SELECT * FROM cadence_config 
        WHERE pipeline_id = NEW.pipeline_id 
        AND stage_name = NEW.current_stage
        AND is_active = true
    LOOP
        -- Para cada tarefa configurada nesta cadência
        FOR task_record IN
            SELECT * FROM cadence_tasks 
            WHERE cadence_config_id = config_record.id 
            AND is_active = true
            ORDER BY day_offset, task_order
        LOOP
            -- Calcular data de agendamento
            scheduled_date := NOW() + (task_record.day_offset || ' days')::INTERVAL;
            
            -- Inserir tarefa individual
            INSERT INTO lead_tasks (
                lead_id,
                pipeline_id,
                etapa_nome,
                data_programada,
                canal,
                tipo,
                titulo,
                descricao,
                template_conteudo,
                status,
                tenant_id,
                assigned_to,
                day_offset
            ) VALUES (
                NEW.id,
                NEW.pipeline_id,
                NEW.current_stage,
                scheduled_date,
                task_record.channel,
                task_record.action_type,
                task_record.task_title,
                task_record.task_description,
                task_record.template_content,
                'pendente',
                NEW.tenant_id,
                NEW.assigned_to,
                task_record.day_offset
            );
        END LOOP;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGER PARA GERAR TAREFAS AUTOMATICAMENTE
DO $$
BEGIN
    -- Remover trigger se existir
    DROP TRIGGER IF EXISTS trigger_lead_cadence_tasks ON pipeline_leads;
    
    -- Criar novo trigger
    CREATE TRIGGER trigger_lead_cadence_tasks
        AFTER UPDATE OF current_stage ON pipeline_leads
        FOR EACH ROW
        WHEN (OLD.current_stage IS DISTINCT FROM NEW.current_stage)
        EXECUTE FUNCTION generate_lead_tasks_on_stage_entry();
END $$;

-- 9. DADOS DE EXEMPLO (opcional - remover se não quiser)
-- Inserir algumas configurações de exemplo para teste
DO $$
DECLARE
    sample_pipeline_id UUID;
    sample_config_id UUID;
BEGIN
    -- Buscar uma pipeline existente para exemplo
    SELECT id INTO sample_pipeline_id FROM pipelines LIMIT 1;
    
    IF sample_pipeline_id IS NOT NULL THEN
        -- Inserir configuração de exemplo
        INSERT INTO cadence_config (pipeline_id, stage_name, stage_order, tenant_id, created_by)
        VALUES (sample_pipeline_id, 'Novo Lead', 1, gen_random_uuid(), 'system')
        RETURNING id INTO sample_config_id;
        
        -- Inserir tarefas de exemplo
        INSERT INTO cadence_tasks (cadence_config_id, day_offset, task_order, channel, action_type, task_title, task_description, tenant_id)
        VALUES 
        (sample_config_id, 0, 1, 'email', 'mensagem', 'Email de Boas-vindas', 'Enviar email de boas-vindas ao novo lead', gen_random_uuid()),
        (sample_config_id, 1, 1, 'whatsapp', 'mensagem', 'Follow-up WhatsApp', 'Entrar em contato via WhatsApp para apresentação', gen_random_uuid()),
        (sample_config_id, 3, 1, 'ligacao', 'ligacao', 'Ligação de Follow-up', 'Fazer ligação para agendar reunião', gen_random_uuid());
    END IF;
END $$;

-- 10. VERIFICAÇÃO FINAL
SELECT 
    'SISTEMA DE CADÊNCIA INSTALADO COM SUCESSO!' as status,
    NOW() as timestamp;

-- Mostrar tabelas criadas
SELECT 
    table_name,
    'CRIADA ✅' as status
FROM information_schema.tables 
WHERE table_name IN (
    'pipeline_win_loss_reasons',
    'cadence_config', 
    'cadence_tasks', 
    'cadence_executions', 
    'lead_tasks'
) 
ORDER BY table_name;

-- Mostrar exemplo de configuração criada
SELECT 
    cc.stage_name,
    COUNT(ct.id) as total_tasks,
    'CONFIGURAÇÃO DE EXEMPLO ✅' as status
FROM cadence_config cc
LEFT JOIN cadence_tasks ct ON cc.id = ct.cadence_config_id
GROUP BY cc.id, cc.stage_name
LIMIT 3; 