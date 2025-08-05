-- =====================================================================================
-- MIGRATION: Sistema de Atividades Manuais - Extensão do Sistema de Cadências
-- Data: 2025-07-24 16:00:00
-- Descrição: Implementa sistema completo de atividades manuais para complementar
--           as cadências automáticas, criando timeline unificado de todas interações
-- =====================================================================================

-- ===================================
-- 1. CRIAR TABELA DE ATIVIDADES MANUAIS
-- ===================================

CREATE TABLE IF NOT EXISTS manual_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    pipeline_id UUID NOT NULL,
    
    -- Tipo e conteúdo da atividade
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'call',           -- Ligação telefônica
        'email',          -- E-mail enviado
        'meeting',        -- Reunião realizada
        'note',           -- Nota/observação
        'whatsapp',       -- Mensagem WhatsApp
        'proposal',       -- Proposta enviada
        'presentation',   -- Apresentação realizada
        'demo',           -- Demonstração do produto
        'followup',       -- Follow-up geral
        'visit'           -- Visita presencial
    )),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Resultado/outcome da atividade
    outcome VARCHAR(20) DEFAULT 'neutral' CHECK (outcome IN (
        'positive',       -- Resultado positivo (lead engajado)
        'neutral',        -- Resultado neutro (sem resposta clara)
        'negative'        -- Resultado negativo (lead desinteressado)  
    )),
    
    -- Dados temporais
    completed_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER, -- Duração da atividade em minutos
    
    -- Controle de usuário
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadados adicionais
    metadata JSONB DEFAULT '{}',
    
    -- Foreign key constraints (serão adicionadas condicionalmente)
    CONSTRAINT fk_manual_activities_tenant FOREIGN KEY (tenant_id) REFERENCES auth.users(id),
    CONSTRAINT fk_manual_activities_creator FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- ===================================
-- 2. ADICIONAR FOREIGN KEYS CONDICIONALMENTE
-- ===================================

-- Adicionar FK para pipeline_leads se a tabela existir
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipeline_leads') THEN
        ALTER TABLE manual_activities 
            ADD CONSTRAINT fk_manual_activities_lead 
            FOREIGN KEY (lead_id) 
            REFERENCES pipeline_leads(id) 
            ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Foreign key manual_activities -> pipeline_leads criada';
    ELSE
        RAISE NOTICE '⚠️  Tabela pipeline_leads não encontrada - FK será criada posteriormente';
    END IF;
END $$;

-- Adicionar FK para pipelines se a tabela existir
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipelines') THEN
        ALTER TABLE manual_activities 
            ADD CONSTRAINT fk_manual_activities_pipeline 
            FOREIGN KEY (pipeline_id) 
            REFERENCES pipelines(id) 
            ON DELETE CASCADE;
            
        RAISE NOTICE '✅ Foreign key manual_activities -> pipelines criada';
    ELSE
        RAISE NOTICE '⚠️  Tabela pipelines não encontrada - FK será criada posteriormente';
    END IF;
END $$;

-- ===================================
-- 3. CRIAR VIEW UNIFICADA DE ATIVIDADES
-- ===================================

CREATE OR REPLACE VIEW combined_activities_view AS
SELECT 
    -- Campos comuns
    'cadence' as source_type,
    lt.id as activity_id,
    lt.lead_id,
    lt.pipeline_id,
    lt.tenant_id,
    
    -- Informações da atividade
    lt.canal as activity_type,
    lt.descricao as title,
    lt.template_content as description,
    
    -- Status e timing
    CASE 
        WHEN lt.status = 'pendente' AND lt.data_programada < NOW() THEN 'overdue'
        WHEN lt.status = 'pendente' THEN 'pending' 
        WHEN lt.status = 'concluida' THEN 'completed'
        ELSE 'cancelled'
    END as status,
    
    CASE 
        WHEN lt.status = 'concluida' THEN 'positive'
        ELSE 'neutral'
    END as outcome,
    
    -- Datas
    lt.data_programada as scheduled_date,
    lt.executed_at as completed_date,
    lt.created_at,
    lt.updated_at,
    
    -- Usuário e metadados
    lt.assigned_to as user_id,
    lt.execution_notes as notes,
    lt.day_offset,
    NULL as duration_minutes,
    
    -- Campos específicos de cadência
    lt.task_order,
    lt.cadence_task_id
    
FROM lead_tasks lt
WHERE lt.id IS NOT NULL

UNION ALL

SELECT 
    -- Campos comuns  
    'manual' as source_type,
    ma.id as activity_id,
    ma.lead_id,
    ma.pipeline_id,
    ma.tenant_id,
    
    -- Informações da atividade
    ma.activity_type,
    ma.title,
    ma.description,
    
    -- Status e timing (atividades manuais são sempre completed)
    'completed' as status,
    ma.outcome,
    
    -- Datas
    ma.completed_at as scheduled_date,
    ma.completed_at as completed_date, 
    ma.created_at,
    ma.updated_at,
    
    -- Usuário e metadados
    ma.created_by as user_id,
    NULL as notes,
    NULL as day_offset,
    ma.duration_minutes,
    
    -- Campos específicos de manual (NULL para compatibilidade)
    NULL as task_order,
    NULL as cadence_task_id
    
FROM manual_activities ma
WHERE ma.id IS NOT NULL

ORDER BY 
    COALESCE(scheduled_date, completed_date) DESC,
    created_at DESC;

-- ===================================
-- 4. FUNÇÃO PARA BUSCAR ATIVIDADES COMBINADAS
-- ===================================

CREATE OR REPLACE FUNCTION get_combined_activities(
    p_lead_id UUID,
    p_tenant_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_source_filter TEXT DEFAULT 'all', -- 'all', 'cadence', 'manual'  
    p_status_filter TEXT DEFAULT 'all'  -- 'all', 'pending', 'completed', 'overdue'
) RETURNS TABLE (
    source_type TEXT,
    activity_id UUID,
    lead_id UUID,
    pipeline_id UUID,
    activity_type VARCHAR(50),
    title TEXT,
    description TEXT,
    status TEXT,
    outcome VARCHAR(20),
    scheduled_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    user_id UUID,
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cav.source_type,
        cav.activity_id,
        cav.lead_id,
        cav.pipeline_id,
        cav.activity_type,
        cav.title,
        cav.description,
        cav.status,
        cav.outcome,
        cav.scheduled_date,
        cav.completed_date,
        cav.user_id,
        cav.duration_minutes,
        cav.notes,
        cav.created_at
    FROM combined_activities_view cav
    WHERE cav.lead_id = p_lead_id
      AND cav.tenant_id = p_tenant_id
      AND (p_source_filter = 'all' OR cav.source_type = p_source_filter)
      AND (p_status_filter = 'all' OR cav.status = p_status_filter)
    ORDER BY 
        COALESCE(cav.scheduled_date, cav.completed_date) DESC,
        cav.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 5. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ===================================

-- Habilitar RLS na tabela
ALTER TABLE manual_activities ENABLE ROW LEVEL SECURITY;

-- Política para Super Admin (acesso total)
CREATE POLICY "Super Admin full access manual_activities" ON manual_activities
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- Política para Admin (acesso por tenant)
CREATE POLICY "Admin tenant access manual_activities" ON manual_activities
    FOR ALL 
    USING (
        tenant_id IN (
            SELECT ur.tenant_id::UUID FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- Política para Member (acesso limitado - apenas suas atividades ou do mesmo tenant)
CREATE POLICY "Member limited access manual_activities" ON manual_activities
    FOR ALL 
    USING (
        created_by = auth.uid() OR
        tenant_id IN (
            SELECT ur.tenant_id::UUID FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'member'
        )
    );

-- ===================================
-- 6. ÍNDICES PARA PERFORMANCE
-- ===================================

-- Índices principais para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_manual_activities_lead_tenant 
    ON manual_activities(lead_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_manual_activities_pipeline_tenant 
    ON manual_activities(pipeline_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_manual_activities_completed_date 
    ON manual_activities(completed_date DESC) 
    WHERE completed_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_manual_activities_type_outcome 
    ON manual_activities(activity_type, outcome);

CREATE INDEX IF NOT EXISTS idx_manual_activities_creator_date 
    ON manual_activities(created_by, created_at DESC);

-- Índice para metadados JSONB (se necessário para busca)
CREATE INDEX IF NOT EXISTS idx_manual_activities_metadata_gin 
    ON manual_activities USING gin(metadata);

-- ===================================
-- 7. TRIGGERS PARA AUDITORIA
-- ===================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_manual_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manual_activities_updated_at_trigger
    BEFORE UPDATE ON manual_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_activities_updated_at();

-- ===================================
-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ===================================

COMMENT ON TABLE manual_activities IS 'Atividades manuais registradas pelos usuários (complementa lead_tasks automáticas)';
COMMENT ON COLUMN manual_activities.activity_type IS 'Tipo da atividade manual realizada';
COMMENT ON COLUMN manual_activities.title IS 'Título/resumo da atividade';
COMMENT ON COLUMN manual_activities.description IS 'Descrição detalhada da atividade';
COMMENT ON COLUMN manual_activities.outcome IS 'Resultado da atividade (positive/neutral/negative)';
COMMENT ON COLUMN manual_activities.completed_at IS 'Data/hora quando a atividade foi realizada';
COMMENT ON COLUMN manual_activities.duration_minutes IS 'Duração da atividade em minutos';
COMMENT ON COLUMN manual_activities.metadata IS 'Metadados adicionais em formato JSON';

COMMENT ON VIEW combined_activities_view IS 'View unificada que combina atividades automáticas (lead_tasks) e manuais (manual_activities)';

COMMENT ON FUNCTION get_combined_activities IS 'Função para buscar atividades combinadas com filtros e paginação';

-- ===================================
-- 9. DADOS DE EXEMPLO (OPCIONAL - DESENVOLVIMENTO)
-- ===================================

-- Inserir algumas atividades manuais de exemplo para testes (apenas em desenvolvimento)
DO $$ 
BEGIN
    -- Verificar se estamos em ambiente de desenvolvimento
    IF current_setting('app.environment', true) = 'development' THEN
        -- Inserir dados de exemplo apenas se existirem leads
        IF EXISTS (SELECT 1 FROM pipeline_leads LIMIT 1) THEN
            INSERT INTO manual_activities (
                tenant_id, lead_id, pipeline_id, activity_type, title, description, 
                outcome, completed_at, created_by, duration_minutes
            )
            SELECT 
                pl.tenant_id,
                pl.id as lead_id, 
                pl.pipeline_id,
                'call' as activity_type,
                'Ligação de qualificação inicial' as title,
                'Conversa para entender necessidades do cliente' as description,
                'positive' as outcome,
                NOW() - INTERVAL '2 hours' as completed_at,
                pl.created_by,
                15 as duration_minutes
            FROM pipeline_leads pl 
            LIMIT 1;
            
            RAISE NOTICE '✅ Dados de exemplo inseridos para desenvolvimento';
        END IF;
    END IF;
END $$;

-- ===================================
-- 10. VALIDAÇÕES FINAIS
-- ===================================

-- Verificar se a migração foi aplicada corretamente
DO $$ 
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    function_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Verificar tabela
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_name = 'manual_activities';
    
    -- Verificar view
    SELECT COUNT(*) INTO view_count 
    FROM information_schema.views 
    WHERE table_name = 'combined_activities_view';
    
    -- Verificar função
    SELECT COUNT(*) INTO function_count 
    FROM information_schema.routines 
    WHERE routine_name = 'get_combined_activities';
    
    -- Verificar políticas RLS
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'manual_activities';
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Tabela manual_activities: % criada', CASE WHEN table_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'View combined_activities_view: % criada', CASE WHEN view_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'Função get_combined_activities: % criada', CASE WHEN function_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'Políticas RLS: % políticas ativas', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Próximos passos:';
    RAISE NOTICE '  1. Implementar APIs backend';
    RAISE NOTICE '  2. Criar componentes frontend';
    RAISE NOTICE '  3. Integrar com React Query';
    RAISE NOTICE '==========================================';
END $$;