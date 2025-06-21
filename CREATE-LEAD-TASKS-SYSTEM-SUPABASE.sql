-- =========================================================
-- SISTEMA DE TAREFAS AUTOMATICAS PARA LEADS
-- Script para execucao direta no Supabase SQL Editor
-- =========================================================

-- 1. Criar tabela lead_tasks
CREATE TABLE IF NOT EXISTS lead_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    pipeline_id UUID NOT NULL,
    etapa_id UUID NOT NULL, -- stage_id da etapa
    data_programada TIMESTAMP WITH TIME ZONE NOT NULL,
    canal VARCHAR(50) NOT NULL, -- email, whatsapp, ligacao, sms, tarefa, visita
    tipo VARCHAR(50) NOT NULL, -- mensagem, ligacao, tarefa, email_followup, agendamento, proposta
    descricao TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'cancelada')),
    
    -- Campos auxiliares para rastreamento
    cadence_task_id UUID, -- Referência à configuração original
    day_offset INTEGER, -- D+0, D+1, D+2...
    task_order INTEGER DEFAULT 1,
    template_content TEXT,
    assigned_to UUID, -- Vendedor responsável
    executed_at TIMESTAMP WITH TIME ZONE,
    execution_notes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    tenant_id UUID NOT NULL
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_pipeline_id ON lead_tasks(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_etapa_id ON lead_tasks(etapa_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_data_programada ON lead_tasks(data_programada);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON lead_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assigned_to ON lead_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_tenant_id ON lead_tasks(tenant_id);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE lead_tasks ENABLE ROW LEVEL SECURITY;

-- 4. Criar política simples de acesso por tenant
DROP POLICY IF EXISTS "lead_tasks_tenant_policy" ON lead_tasks;
CREATE POLICY "lead_tasks_tenant_policy" ON lead_tasks
    FOR ALL USING (
        tenant_id = COALESCE(
            current_setting('app.current_tenant_id', true)::uuid,
            (auth.jwt() ->> 'tenant_id')::uuid
        )
    );

-- 5. Função para gerar tarefas automáticas
CREATE OR REPLACE FUNCTION generate_lead_tasks_on_stage_entry(
    p_lead_id UUID,
    p_pipeline_id UUID,
    p_stage_id UUID,
    p_stage_name VARCHAR,
    p_assigned_to UUID DEFAULT NULL,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_cadence_config_id UUID;
    v_task_record RECORD;
    v_tasks_created INTEGER := 0;
    v_entry_date TIMESTAMP WITH TIME ZONE := NOW();
    v_assigned_user UUID;
    v_current_tenant UUID;
BEGIN
    -- Log da execução
    RAISE NOTICE 'Iniciando geração de tarefas para lead % na etapa %', p_lead_id, p_stage_name;
    
    -- Determinar tenant_id
    v_current_tenant := COALESCE(
        p_tenant_id,
        current_setting('app.current_tenant_id', true)::uuid,
        (auth.jwt() ->> 'tenant_id')::uuid
    );
    
    -- Determinar assigned_to
    v_assigned_user := p_assigned_to;
    IF v_assigned_user IS NULL THEN
        -- Tentar buscar assigned_to do lead atual
        SELECT assigned_to INTO v_assigned_user
        FROM pipeline_leads 
        WHERE id = p_lead_id;
        
        -- Se ainda for NULL, usar o usuário atual (se disponível)
        IF v_assigned_user IS NULL THEN
            SELECT (auth.jwt() ->> 'sub')::uuid INTO v_assigned_user;
        END IF;
    END IF;

    -- Buscar configuração de cadência para a etapa
    SELECT id INTO v_cadence_config_id
    FROM cadence_config
    WHERE pipeline_id = p_pipeline_id
      AND (stage_name = p_stage_name OR stage_order = (
          SELECT order_index 
          FROM pipeline_stages 
          WHERE id = p_stage_id
      ))
      AND is_active = true
      AND (v_current_tenant IS NULL OR tenant_id = v_current_tenant);

    -- Se não há configuração de cadência, retornar 0
    IF v_cadence_config_id IS NULL THEN
        RAISE NOTICE 'Nenhuma configuração de cadência encontrada para etapa %', p_stage_name;
        RETURN 0;
    END IF;

    RAISE NOTICE 'Encontrada configuração de cadência: %', v_cadence_config_id;

    -- Gerar tarefas para cada configuração de cadência
    FOR v_task_record IN
        SELECT *
        FROM cadence_tasks
        WHERE cadence_config_id = v_cadence_config_id
          AND is_active = true
        ORDER BY day_offset, task_order
    LOOP
        -- Inserir tarefa no sistema
        INSERT INTO lead_tasks (
            lead_id,
            pipeline_id,
            etapa_id,
            data_programada,
            canal,
            tipo,
            descricao,
            status,
            cadence_task_id,
            day_offset,
            task_order,
            template_content,
            assigned_to,
            tenant_id,
            created_by
        ) VALUES (
            p_lead_id,
            p_pipeline_id,
            p_stage_id,
            v_entry_date + INTERVAL '1 day' * v_task_record.day_offset,
            v_task_record.channel,
            v_task_record.action_type,
            COALESCE(v_task_record.task_description, v_task_record.task_title),
            'pendente',
            v_task_record.id,
            v_task_record.day_offset,
            v_task_record.task_order,
            v_task_record.template_content,
            v_assigned_user,
            v_current_tenant,
            'system_cadence'
        );

        v_tasks_created := v_tasks_created + 1;
        
        RAISE NOTICE 'Tarefa criada: D+% - % via %', 
            v_task_record.day_offset, 
            v_task_record.task_title, 
            v_task_record.channel;
    END LOOP;

    RAISE NOTICE 'Total de tarefas criadas: %', v_tasks_created;
    RETURN v_tasks_created;
END;
$$ LANGUAGE plpgsql;

-- 6. Função de trigger para detectar mudança de etapa
CREATE OR REPLACE FUNCTION trigger_generate_lead_tasks()
RETURNS TRIGGER AS $$
DECLARE
    v_stage_name VARCHAR(255);
    v_tenant_id UUID;
    v_tasks_count INTEGER;
BEGIN
    -- Só executar se stage_id mudou
    IF TG_OP = 'UPDATE' AND OLD.stage_id = NEW.stage_id THEN
        RETURN NEW;
    END IF;
    
    -- Buscar nome da etapa e tenant_id
    SELECT ps.name, p.tenant_id 
    INTO v_stage_name, v_tenant_id
    FROM pipeline_stages ps
    JOIN pipelines p ON p.id = ps.pipeline_id
    WHERE ps.id = NEW.stage_id;
    
    -- Se não encontrou a etapa, usar fallback
    IF v_stage_name IS NULL THEN
        SELECT tenant_id INTO v_tenant_id
        FROM pipelines 
        WHERE id = NEW.pipeline_id;
        
        v_stage_name := 'Etapa_' || NEW.stage_id;
    END IF;
    
    -- Gerar tarefas de cadência
    BEGIN
        SELECT generate_lead_tasks_on_stage_entry(
            NEW.id,
            NEW.pipeline_id,
            NEW.stage_id,
            v_stage_name,
            NEW.assigned_to,
            v_tenant_id
        ) INTO v_tasks_count;
        
        -- Log do resultado
        IF v_tasks_count > 0 THEN
            RAISE NOTICE 'Trigger: % tarefas geradas para lead % na etapa %', 
                v_tasks_count, NEW.id, v_stage_name;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Em caso de erro, apenas logar e continuar
        RAISE WARNING 'Erro ao gerar tarefas de cadência para lead %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar o trigger
DROP TRIGGER IF EXISTS trigger_lead_cadence_tasks ON pipeline_leads;
CREATE TRIGGER trigger_lead_cadence_tasks
    AFTER INSERT OR UPDATE OF stage_id
    ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_lead_tasks();

-- 8. Funções auxiliares para gerenciar tarefas
CREATE OR REPLACE FUNCTION complete_lead_task(
    p_task_id UUID,
    p_execution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE lead_tasks 
    SET 
        status = 'concluida',
        executed_at = NOW(),
        execution_notes = p_execution_notes,
        updated_at = NOW()
    WHERE id = p_task_id
      AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 9. Função para cancelar tarefa
CREATE OR REPLACE FUNCTION cancel_lead_task(
    p_task_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE lead_tasks 
    SET 
        status = 'cancelada',
        execution_notes = p_reason,
        updated_at = NOW()
    WHERE id = p_task_id
      AND status = 'pendente';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 10. Função para buscar tarefas pendentes de um vendedor
CREATE OR REPLACE FUNCTION get_pending_tasks_for_user(
    p_user_id UUID,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE(
    task_id UUID,
    lead_id UUID,
    pipeline_id UUID,
    etapa_id UUID,
    data_programada TIMESTAMP WITH TIME ZONE,
    canal VARCHAR,
    tipo VARCHAR,
    descricao TEXT,
    day_offset INTEGER,
    task_order INTEGER,
    template_content TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lt.id,
        lt.lead_id,
        lt.pipeline_id,
        lt.etapa_id,
        lt.data_programada,
        lt.canal,
        lt.tipo,
        lt.descricao,
        lt.day_offset,
        lt.task_order,
        lt.template_content
    FROM lead_tasks lt
    WHERE lt.assigned_to = p_user_id
      AND lt.status = 'pendente'
      AND (p_tenant_id IS NULL OR lt.tenant_id = p_tenant_id)
      AND lt.data_programada <= NOW() + INTERVAL '7 days' -- Próximos 7 dias
    ORDER BY lt.data_programada ASC, lt.day_offset ASC, lt.task_order ASC;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_lead_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at
DROP TRIGGER IF EXISTS trigger_lead_tasks_updated_at ON lead_tasks;
CREATE TRIGGER trigger_lead_tasks_updated_at
    BEFORE UPDATE ON lead_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_tasks_updated_at();

-- 12. Comentários e documentação
COMMENT ON TABLE lead_tasks IS 'Tarefas automáticas geradas para leads baseadas em configurações de cadência';
COMMENT ON COLUMN lead_tasks.lead_id IS 'ID do lead que gerou a tarefa';
COMMENT ON COLUMN lead_tasks.pipeline_id IS 'ID da pipeline onde o lead está';
COMMENT ON COLUMN lead_tasks.etapa_id IS 'ID da etapa que gerou a tarefa';
COMMENT ON COLUMN lead_tasks.data_programada IS 'Data/hora programada para execução da tarefa';
COMMENT ON COLUMN lead_tasks.canal IS 'Canal de comunicação (email, whatsapp, ligacao, etc.)';
COMMENT ON COLUMN lead_tasks.tipo IS 'Tipo de ação (mensagem, ligacao, tarefa, etc.)';
COMMENT ON COLUMN lead_tasks.descricao IS 'Descrição da tarefa a ser executada';
COMMENT ON COLUMN lead_tasks.status IS 'Status atual da tarefa (pendente, concluida, cancelada)';

COMMENT ON FUNCTION generate_lead_tasks_on_stage_entry IS 'Gera tarefas automáticas quando um lead entra numa etapa com cadência configurada';
COMMENT ON FUNCTION trigger_generate_lead_tasks IS 'Função de trigger que detecta mudanças de etapa e gera tarefas automaticamente';
COMMENT ON FUNCTION complete_lead_task IS 'Marca uma tarefa como concluída';
COMMENT ON FUNCTION cancel_lead_task IS 'Cancela uma tarefa pendente';
COMMENT ON FUNCTION get_pending_tasks_for_user IS 'Retorna tarefas pendentes de um vendedor';

-- 13. Verificação final
DO $$
BEGIN
    -- Verificar se tudo foi criado corretamente
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_tasks') THEN
        RAISE NOTICE '✅ Sistema de tarefas automáticas instalado com sucesso!';
        RAISE NOTICE 'ℹ️ As tarefas serão geradas automaticamente quando leads mudarem de etapa';
        RAISE NOTICE 'ℹ️ Configure cadências na interface para ativar a funcionalidade';
    ELSE
        RAISE WARNING '❌ Erro na instalação do sistema de tarefas';
    END IF;
END $$; 