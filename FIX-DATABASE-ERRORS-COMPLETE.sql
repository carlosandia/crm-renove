-- ========================================
-- SCRIPT PARA CORRIGIR TODOS OS ERROS DE BANCO
-- ========================================

-- 1. CRIAR TABELA pipeline_win_loss_reasons (se não existir)
CREATE TABLE IF NOT EXISTS pipeline_win_loss_reasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL,
    reason_type VARCHAR(10) NOT NULL CHECK (reason_type IN ('win', 'loss')),
    reason_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID NOT NULL
);

-- 2. CRIAR ÍNDICES para pipeline_win_loss_reasons
CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_pipeline_id ON pipeline_win_loss_reasons(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_tenant_id ON pipeline_win_loss_reasons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_win_loss_reasons_type ON pipeline_win_loss_reasons(reason_type);

-- 3. CRIAR FOREIGN KEY para pipeline_win_loss_reasons (se não existir)
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

-- 4. VERIFICAR E CORRIGIR RELACIONAMENTO pipelines -> pipeline_stages
-- Garantir que todas as foreign keys existam
DO $$
BEGIN
    -- Verificar se a FK existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_pipeline_stages_pipeline_id'
    ) THEN
        -- Adicionar FK se não existir
        ALTER TABLE pipeline_stages 
        ADD CONSTRAINT fk_pipeline_stages_pipeline_id 
        FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. CRIAR TABELAS DE CADÊNCIA (se não existirem)

-- Tabela de configuração de cadência
CREATE TABLE IF NOT EXISTS cadence_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL,
    created_by VARCHAR(255) NOT NULL,
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
    tenant_id UUID NOT NULL,
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
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CRIAR TABELA lead_tasks (se não existir)
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
    tenant_id UUID NOT NULL,
    vendedor_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. CRIAR ÍNDICES para tabelas de cadência
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

-- 8. CRIAR FOREIGN KEYS para tabelas de cadência
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

-- 9. CRIAR FUNÇÕES PARA GERAÇÃO AUTOMÁTICA DE TAREFAS

-- Função para gerar tarefas de cadência quando lead entra em etapa
CREATE OR REPLACE FUNCTION generate_lead_tasks_on_stage_entry()
RETURNS TRIGGER AS $$
DECLARE
    config_record RECORD;
    task_record RECORD;
    scheduled_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Verificar se é uma mudança de etapa (não inserção inicial)
    IF TG_OP = 'UPDATE' AND OLD.etapa_nome = NEW.etapa_nome THEN
        RETURN NEW;
    END IF;

    -- Buscar configuração de cadência para a etapa atual
    SELECT * INTO config_record
    FROM cadence_config 
    WHERE pipeline_id = NEW.pipeline_id 
      AND stage_name = NEW.etapa_nome
      AND is_active = true
      AND tenant_id = NEW.tenant_id
    LIMIT 1;

    -- Se não há configuração, retornar sem gerar tarefas
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Gerar tarefas para cada tarefa configurada na cadência
    FOR task_record IN 
        SELECT * FROM cadence_tasks 
        WHERE cadence_config_id = config_record.id 
          AND is_active = true
        ORDER BY day_offset, task_order
    LOOP
        -- Calcular data programada (agora + day_offset dias)
        scheduled_date := NOW() + (task_record.day_offset || ' days')::INTERVAL;

        -- Inserir tarefa de lead
        INSERT INTO lead_tasks (
            lead_id,
            pipeline_id,
            etapa_id,
            etapa_nome,
            data_programada,
            canal,
            tipo,
            titulo,
            descricao,
            template_conteudo,
            status,
            tenant_id,
            vendedor_id
        ) VALUES (
            NEW.id,
            NEW.pipeline_id,
            NEW.etapa_id,
            NEW.etapa_nome,
            scheduled_date,
            task_record.channel,
            task_record.action_type,
            task_record.task_title,
            task_record.task_description,
            task_record.template_content,
            'pendente',
            NEW.tenant_id,
            NEW.vendedor_responsavel
        );

        -- Registrar execução de cadência
        INSERT INTO cadence_executions (
            cadence_task_id,
            lead_id,
            pipeline_id,
            stage_name,
            scheduled_date,
            status,
            tenant_id
        ) VALUES (
            task_record.id,
            NEW.id,
            NEW.pipeline_id,
            NEW.etapa_nome,
            scheduled_date,
            'pending',
            NEW.tenant_id
        );
    END LOOP;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro sem interromper o processo principal
        RAISE WARNING 'Erro ao gerar tarefas de cadência para lead %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. CRIAR TRIGGER para geração automática de tarefas
DROP TRIGGER IF EXISTS trigger_lead_cadence_tasks ON leads;
CREATE TRIGGER trigger_lead_cadence_tasks
    AFTER INSERT OR UPDATE OF etapa_nome ON leads
    FOR EACH ROW
    EXECUTE FUNCTION generate_lead_tasks_on_stage_entry();

-- 11. FUNÇÕES AUXILIARES PARA GERENCIAMENTO DE TAREFAS

-- Função para marcar tarefa como concluída
CREATE OR REPLACE FUNCTION complete_lead_task(task_id UUID, notes TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE lead_tasks 
    SET 
        status = 'concluida',
        data_conclusao = NOW(),
        observacoes = COALESCE(notes, observacoes),
        updated_at = NOW()
    WHERE id = task_id;
    
    -- Atualizar execução de cadência correspondente
    UPDATE cadence_executions 
    SET 
        status = 'completed',
        executed_date = NOW(),
        execution_notes = COALESCE(notes, execution_notes),
        updated_at = NOW()
    WHERE lead_id = (SELECT lead_id FROM lead_tasks WHERE id = task_id)
      AND scheduled_date = (SELECT data_programada FROM lead_tasks WHERE id = task_id);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para cancelar tarefa
CREATE OR REPLACE FUNCTION cancel_lead_task(task_id UUID, notes TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE lead_tasks 
    SET 
        status = 'cancelada',
        observacoes = COALESCE(notes, observacoes),
        updated_at = NOW()
    WHERE id = task_id;
    
    -- Atualizar execução de cadência correspondente
    UPDATE cadence_executions 
    SET 
        status = 'cancelled',
        execution_notes = COALESCE(notes, execution_notes),
        updated_at = NOW()
    WHERE lead_id = (SELECT lead_id FROM lead_tasks WHERE id = task_id)
      AND scheduled_date = (SELECT data_programada FROM lead_tasks WHERE id = task_id);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar tarefas pendentes de um usuário
CREATE OR REPLACE FUNCTION get_pending_tasks_for_user(user_tenant_id UUID, user_id UUID DEFAULT NULL)
RETURNS TABLE (
    task_id UUID,
    lead_name VARCHAR,
    lead_email VARCHAR,
    lead_phone VARCHAR,
    pipeline_name VARCHAR,
    etapa_nome VARCHAR,
    data_programada TIMESTAMP WITH TIME ZONE,
    canal VARCHAR,
    tipo VARCHAR,
    titulo VARCHAR,
    descricao TEXT,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lt.id as task_id,
        l.nome as lead_name,
        l.email as lead_email,
        l.telefone as lead_phone,
        p.name as pipeline_name,
        lt.etapa_nome,
        lt.data_programada,
        lt.canal,
        lt.tipo,
        lt.titulo,
        lt.descricao,
        CASE 
            WHEN lt.data_programada < NOW() THEN 
                EXTRACT(DAY FROM NOW() - lt.data_programada)::INTEGER
            ELSE 0 
        END as days_overdue
    FROM lead_tasks lt
    JOIN leads l ON lt.lead_id = l.id
    JOIN pipelines p ON lt.pipeline_id = p.id
    WHERE lt.tenant_id = user_tenant_id
      AND lt.status = 'pendente'
      AND (user_id IS NULL OR lt.vendedor_id = user_id)
    ORDER BY lt.data_programada ASC;
END;
$$ LANGUAGE plpgsql;

-- 12. HABILITAR RLS (Row Level Security) para as novas tabelas
ALTER TABLE pipeline_win_loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tasks ENABLE ROW LEVEL SECURITY;

-- 13. CRIAR POLÍTICAS RLS

-- Políticas para pipeline_win_loss_reasons
CREATE POLICY "pipeline_win_loss_reasons_tenant_isolation" ON pipeline_win_loss_reasons
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

-- Políticas para cadence_config
CREATE POLICY "cadence_config_tenant_isolation" ON cadence_config
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

-- Políticas para cadence_tasks
CREATE POLICY "cadence_tasks_tenant_isolation" ON cadence_tasks
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

-- Políticas para cadence_executions
CREATE POLICY "cadence_executions_tenant_isolation" ON cadence_executions
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

-- Políticas para lead_tasks
CREATE POLICY "lead_tasks_tenant_isolation" ON lead_tasks
    FOR ALL USING (tenant_id::text = current_setting('app.current_tenant', true));

-- 14. INSERIR DADOS DE EXEMPLO (opcional)
-- Inserir algumas razões de vitória/derrota padrão
INSERT INTO pipeline_win_loss_reasons (pipeline_id, reason_type, reason_text, tenant_id)
SELECT 
    p.id,
    'win',
    'Cliente fechou negócio',
    p.tenant_id
FROM pipelines p
WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_win_loss_reasons 
    WHERE pipeline_id = p.id AND reason_type = 'win'
)
LIMIT 10;

INSERT INTO pipeline_win_loss_reasons (pipeline_id, reason_type, reason_text, tenant_id)
SELECT 
    p.id,
    'loss',
    'Cliente não tinha orçamento',
    p.tenant_id
FROM pipelines p
WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_win_loss_reasons 
    WHERE pipeline_id = p.id AND reason_type = 'loss'
)
LIMIT 10;

-- 15. ATUALIZAR TIMESTAMPS (função auxiliar)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_cadence_config_updated_at BEFORE UPDATE ON cadence_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cadence_tasks_updated_at BEFORE UPDATE ON cadence_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cadence_executions_updated_at BEFORE UPDATE ON cadence_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lead_tasks_updated_at BEFORE UPDATE ON lead_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipeline_win_loss_reasons_updated_at BEFORE UPDATE ON pipeline_win_loss_reasons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SCRIPT CONCLUÍDO COM SUCESSO!
-- ========================================

-- VERIFICAÇÃO FINAL
SELECT 'Script executado com sucesso! Tabelas criadas:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
    'pipeline_win_loss_reasons',
    'cadence_config', 
    'cadence_tasks', 
    'cadence_executions', 
    'lead_tasks'
) 
ORDER BY table_name;