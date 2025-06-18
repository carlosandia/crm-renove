-- ============================================
-- SISTEMA DE HISTÓRICO E COMENTÁRIOS PARA LEADS
-- ============================================

-- 1. ATUALIZAR TABELA LEAD_HISTORY (se necessário)
-- Verificar se precisa adicionar campos conforme especificação
DO $$ 
BEGIN
    -- Adicionar campo role se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lead_history' AND column_name = 'role') THEN
        ALTER TABLE lead_history ADD COLUMN role TEXT;
        RAISE NOTICE 'Campo role adicionado à tabela lead_history';
    END IF;
    
    -- Adicionar campo context se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lead_history' AND column_name = 'context') THEN
        ALTER TABLE lead_history ADD COLUMN context TEXT;
        RAISE NOTICE 'Campo context adicionado à tabela lead_history';
    END IF;
    
    -- Renomear campo timestamp para timestamp se necessário
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'lead_history' AND column_name = 'timestamp') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'lead_history' AND column_name = 'created_at') THEN
        ALTER TABLE lead_history RENAME COLUMN timestamp TO created_at;
        RAISE NOTICE 'Campo timestamp renomeado para created_at na tabela lead_history';
    END IF;
END $$;

-- 2. CRIAR TABELA LEAD_COMMENTS (baseada em lead_annotations existente)
-- Renomear tabela se necessário ou criar nova estrutura
CREATE TABLE IF NOT EXISTS lead_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    company_id UUID NOT NULL,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT lead_comments_comment_not_empty CHECK (length(trim(comment)) > 0),
    CONSTRAINT lead_comments_role_valid CHECK (role IN ('admin', 'member', 'super_admin'))
);

-- 3. MIGRAR DADOS DE LEAD_ANNOTATIONS PARA LEAD_COMMENTS (se necessário)
DO $$
BEGIN
    -- Verificar se lead_annotations existe e tem dados
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_annotations') THEN
        -- Migrar dados existentes
        INSERT INTO lead_comments (
            id, lead_id, comment, created_by, role, company_id, pipeline_id, created_at, updated_at
        )
        SELECT 
            la.id,
            la.lead_id,
            la.content,
            la.user_id,
            COALESCE(u.role, 'member'),
            COALESCE(u.tenant_id, gen_random_uuid()),
            pl.pipeline_id,
            la.created_at,
            la.updated_at
        FROM lead_annotations la
        JOIN users u ON la.user_id = u.id
        JOIN pipeline_leads pl ON la.lead_id = pl.id
        WHERE NOT EXISTS (
            SELECT 1 FROM lead_comments lc WHERE lc.id = la.id
        );
        
        RAISE NOTICE 'Dados migrados de lead_annotations para lead_comments';
    END IF;
END $$;

-- 4. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id_timestamp ON lead_history(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_history_performed_by ON lead_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_lead_history_action ON lead_history(action);
CREATE INDEX IF NOT EXISTS idx_lead_history_role ON lead_history(role);

CREATE INDEX IF NOT EXISTS idx_lead_comments_lead_id ON lead_comments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_comments_created_by ON lead_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_lead_comments_pipeline_id ON lead_comments(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_lead_comments_company_id ON lead_comments(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_comments_created_at ON lead_comments(created_at DESC);

-- 5. CONFIGURAR RLS (Row Level Security)
ALTER TABLE lead_comments ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE SEGURANÇA PARA LEAD_COMMENTS
-- Admins podem ver todos os comentários da empresa
CREATE POLICY "Admins can view all company lead comments" ON lead_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND u.tenant_id = lead_comments.company_id
        )
    );

-- Members podem ver comentários dos leads que têm acesso
CREATE POLICY "Members can view accessible lead comments" ON lead_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN pipeline_leads pl ON lead_comments.lead_id = pl.id
            JOIN pipeline_members pm ON pl.pipeline_id = pm.pipeline_id
            WHERE u.id = auth.uid() 
            AND u.role = 'member'
            AND pm.member_id = u.id
        )
        OR
        EXISTS (
            SELECT 1 FROM users u
            JOIN pipeline_leads pl ON lead_comments.lead_id = pl.id
            WHERE u.id = auth.uid() 
            AND pl.assigned_to = u.id
        )
    );

-- Usuários podem criar comentários nos leads que têm acesso
CREATE POLICY "Users can create comments on accessible leads" ON lead_comments
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        (
            -- Admin pode comentar em qualquer lead da empresa
            EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = auth.uid() 
                AND u.role = 'admin'
                AND u.tenant_id = company_id
            )
            OR
            -- Member pode comentar em leads que tem acesso
            EXISTS (
                SELECT 1 FROM users u
                JOIN pipeline_leads pl ON lead_comments.lead_id = pl.id
                JOIN pipeline_members pm ON pl.pipeline_id = pm.pipeline_id
                WHERE u.id = auth.uid() 
                AND u.role = 'member'
                AND pm.member_id = u.id
            )
            OR
            -- Member pode comentar em leads atribuídos a ele
            EXISTS (
                SELECT 1 FROM users u
                JOIN pipeline_leads pl ON lead_comments.lead_id = pl.id
                WHERE u.id = auth.uid() 
                AND pl.assigned_to = u.id
            )
        )
    );

-- Usuários podem editar seus próprios comentários
CREATE POLICY "Users can update their own comments" ON lead_comments
    FOR UPDATE USING (created_by = auth.uid());

-- Usuários podem deletar seus próprios comentários
CREATE POLICY "Users can delete their own comments" ON lead_comments
    FOR DELETE USING (created_by = auth.uid());

-- 7. ATUALIZAR POLÍTICAS DE LEAD_HISTORY
-- Remover política existente se houver
DROP POLICY IF EXISTS "lead_history_all_access" ON lead_history;

-- Admins podem ver todo histórico da empresa
CREATE POLICY "Admins can view all company lead history" ON lead_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN pipeline_leads pl ON lead_history.lead_id = pl.id
            JOIN pipelines p ON pl.pipeline_id = p.id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND u.tenant_id = p.tenant_id
        )
    );

-- Members podem ver histórico dos leads que têm acesso
CREATE POLICY "Members can view accessible lead history" ON lead_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN pipeline_leads pl ON lead_history.lead_id = pl.id
            JOIN pipeline_members pm ON pl.pipeline_id = pm.pipeline_id
            WHERE u.id = auth.uid() 
            AND u.role = 'member'
            AND pm.member_id = u.id
        )
        OR
        EXISTS (
            SELECT 1 FROM users u
            JOIN pipeline_leads pl ON lead_history.lead_id = pl.id
            WHERE u.id = auth.uid() 
            AND pl.assigned_to = u.id
        )
    );

-- Sistema pode inserir histórico
CREATE POLICY "System can insert lead history" ON lead_history
    FOR INSERT WITH CHECK (true);

-- 8. TRIGGERS PARA ATUALIZAR UPDATED_AT
CREATE OR REPLACE FUNCTION update_lead_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_comments_updated_at
    BEFORE UPDATE ON lead_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_comments_updated_at();

-- 9. FUNÇÃO PARA REGISTRAR HISTÓRICO AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION register_lead_history(
    p_lead_id UUID,
    p_action TEXT,
    p_performed_by UUID,
    p_role TEXT,
    p_context TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT '{}',
    p_new_values JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
BEGIN
    INSERT INTO lead_history (
        lead_id,
        action,
        performed_by,
        role,
        context,
        old_values,
        new_values,
        created_at
    ) VALUES (
        p_lead_id,
        p_action,
        p_performed_by,
        p_role,
        p_context,
        p_old_values,
        p_new_values,
        NOW()
    ) RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- 10. TRIGGERS PARA REGISTRAR HISTÓRICO AUTOMATICAMENTE

-- Trigger para criação de lead
CREATE OR REPLACE FUNCTION trigger_lead_created_history()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM register_lead_history(
        NEW.id,
        'lead_created',
        NEW.created_by,
        (SELECT role FROM users WHERE id = NEW.created_by),
        'Lead criado no sistema',
        '{}',
        jsonb_build_object('stage_id', NEW.stage_id, 'pipeline_id', NEW.pipeline_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pipeline_leads_created_history
    AFTER INSERT ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_lead_created_history();

-- Trigger para movimentação de etapa
CREATE OR REPLACE FUNCTION trigger_lead_moved_history()
RETURNS TRIGGER AS $$
DECLARE
    v_old_stage_name TEXT;
    v_new_stage_name TEXT;
BEGIN
    IF OLD.stage_id != NEW.stage_id THEN
        -- Buscar nomes das etapas
        SELECT name INTO v_old_stage_name FROM pipeline_stages WHERE id = OLD.stage_id;
        SELECT name INTO v_new_stage_name FROM pipeline_stages WHERE id = NEW.stage_id;
        
        PERFORM register_lead_history(
            NEW.id,
            'moved_stage',
            COALESCE(NEW.created_by, OLD.created_by),
            (SELECT role FROM users WHERE id = COALESCE(NEW.created_by, OLD.created_by)),
            format('Movido de "%s" para "%s"', v_old_stage_name, v_new_stage_name),
            jsonb_build_object('stage_id', OLD.stage_id, 'stage_name', v_old_stage_name),
            jsonb_build_object('stage_id', NEW.stage_id, 'stage_name', v_new_stage_name)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pipeline_leads_moved_history
    AFTER UPDATE ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_lead_moved_history();

-- Trigger para atribuição de lead
CREATE OR REPLACE FUNCTION trigger_lead_assigned_history()
RETURNS TRIGGER AS $$
DECLARE
    v_old_user_name TEXT;
    v_new_user_name TEXT;
BEGIN
    IF COALESCE(OLD.assigned_to::text, '') != COALESCE(NEW.assigned_to::text, '') THEN
        -- Buscar nomes dos usuários
        IF OLD.assigned_to IS NOT NULL THEN
            SELECT CONCAT(first_name, ' ', last_name) INTO v_old_user_name 
            FROM users WHERE id = OLD.assigned_to;
        END IF;
        
        IF NEW.assigned_to IS NOT NULL THEN
            SELECT CONCAT(first_name, ' ', last_name) INTO v_new_user_name 
            FROM users WHERE id = NEW.assigned_to;
        END IF;
        
        PERFORM register_lead_history(
            NEW.id,
            'assigned_lead',
            COALESCE(NEW.created_by, OLD.created_by),
            (SELECT role FROM users WHERE id = COALESCE(NEW.created_by, OLD.created_by)),
            CASE 
                WHEN OLD.assigned_to IS NULL THEN format('Atribuído para %s', v_new_user_name)
                WHEN NEW.assigned_to IS NULL THEN format('Desatribuído de %s', v_old_user_name)
                ELSE format('Reatribuído de %s para %s', v_old_user_name, v_new_user_name)
            END,
            jsonb_build_object('assigned_to', OLD.assigned_to, 'user_name', v_old_user_name),
            jsonb_build_object('assigned_to', NEW.assigned_to, 'user_name', v_new_user_name)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pipeline_leads_assigned_history
    AFTER UPDATE ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_lead_assigned_history();

-- 11. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON TABLE lead_comments IS 'Comentários manuais dos usuários sobre os leads';
COMMENT ON COLUMN lead_comments.lead_id IS 'ID do lead relacionado';
COMMENT ON COLUMN lead_comments.comment IS 'Conteúdo do comentário';
COMMENT ON COLUMN lead_comments.created_by IS 'ID do usuário que criou o comentário';
COMMENT ON COLUMN lead_comments.role IS 'Role do usuário (admin, member)';
COMMENT ON COLUMN lead_comments.company_id IS 'ID da empresa do usuário';
COMMENT ON COLUMN lead_comments.pipeline_id IS 'ID da pipeline relacionada';

COMMENT ON COLUMN lead_history.role IS 'Role do usuário que executou a ação';
COMMENT ON COLUMN lead_history.context IS 'Contexto detalhado da ação executada';

-- 12. FUNÇÃO PARA BUSCAR HISTÓRICO COMPLETO DE UM LEAD
CREATE OR REPLACE FUNCTION get_lead_complete_history(p_lead_id UUID)
RETURNS TABLE(
    id UUID,
    type TEXT,
    content TEXT,
    user_name TEXT,
    user_role TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    context TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Histórico de ações
    SELECT 
        lh.id,
        'history' as type,
        lh.action as content,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Sistema') as user_name,
        COALESCE(lh.role, 'system') as user_role,
        lh.created_at,
        lh.context
    FROM lead_history lh
    LEFT JOIN users u ON lh.performed_by = u.id
    WHERE lh.lead_id = p_lead_id
    
    UNION ALL
    
    -- Comentários
    SELECT 
        lc.id,
        'comment' as type,
        lc.comment as content,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        lc.role as user_role,
        lc.created_at,
        'Comentário adicionado' as context
    FROM lead_comments lc
    JOIN users u ON lc.created_by = u.id
    WHERE lc.lead_id = p_lead_id
    
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Log de sucesso
DO $$ 
BEGIN
    RAISE NOTICE '✅ Sistema de histórico e comentários configurado com sucesso!';
    RAISE NOTICE '📋 Estruturas atualizadas/criadas:';
    RAISE NOTICE '   - lead_history (histórico automático de ações)';
    RAISE NOTICE '   - lead_comments (comentários manuais)';
    RAISE NOTICE '   - Índices para performance';
    RAISE NOTICE '   - Políticas RLS para segurança';
    RAISE NOTICE '   - Triggers automáticos para histórico';
    RAISE NOTICE '   - Função para buscar histórico completo';
    RAISE NOTICE '🔒 Segurança implementada por role e empresa';
    RAISE NOTICE '🎯 Pronto para uso no frontend!';
END $$; 