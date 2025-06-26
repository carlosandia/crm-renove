-- ETAPA 2: Sistema de Feedback Avançado
-- Criação da tabela lead_feedback se não existir

-- Verificar se a tabela já existe
DO $$
BEGIN
    -- Criar tabela lead_feedback se não existir
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lead_feedback') THEN
        CREATE TABLE lead_feedback (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            lead_id UUID NOT NULL,
            user_id UUID NOT NULL,
            feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
            comment TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            -- Índices para performance
            CONSTRAINT fk_lead_feedback_lead_id FOREIGN KEY (lead_id) REFERENCES pipeline_leads(id) ON DELETE CASCADE,
            CONSTRAINT fk_lead_feedback_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_lead_feedback_lead_id ON lead_feedback(lead_id);
        CREATE INDEX IF NOT EXISTS idx_lead_feedback_user_id ON lead_feedback(user_id);
        CREATE INDEX IF NOT EXISTS idx_lead_feedback_created_at ON lead_feedback(created_at);
        CREATE INDEX IF NOT EXISTS idx_lead_feedback_type ON lead_feedback(feedback_type);
        
        RAISE NOTICE 'Tabela lead_feedback criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela lead_feedback já existe';
    END IF;
    
    -- Adicionar trigger para updated_at se não existir
    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_lead_feedback_updated_at') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        CREATE TRIGGER update_lead_feedback_updated_at
            BEFORE UPDATE ON lead_feedback
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
            
        RAISE NOTICE 'Trigger para updated_at criado';
    END IF;
    
END $$;

-- RLS Policies para lead_feedback
ALTER TABLE lead_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Super admin pode ver todos os feedbacks
DROP POLICY IF EXISTS "super_admin_can_view_all_feedbacks" ON lead_feedback;
CREATE POLICY "super_admin_can_view_all_feedbacks" ON lead_feedback
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    )
);

-- Policy: Admin pode ver feedbacks da sua empresa
DROP POLICY IF EXISTS "admin_can_view_company_feedbacks" ON lead_feedback;
CREATE POLICY "admin_can_view_company_feedbacks" ON lead_feedback
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users u
        JOIN pipeline_leads pl ON pl.id = lead_feedback.lead_id
        JOIN pipelines p ON p.id = pl.pipeline_id
        WHERE u.id = auth.uid() 
        AND u.role = 'admin'
        AND p.tenant_id = u.tenant_id
    )
);

-- Policy: Member pode ver seus próprios feedbacks
DROP POLICY IF EXISTS "member_can_view_own_feedbacks" ON lead_feedback;
CREATE POLICY "member_can_view_own_feedbacks" ON lead_feedback
FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM users u
        JOIN pipeline_leads pl ON pl.id = lead_feedback.lead_id
        JOIN pipelines p ON p.id = pl.pipeline_id
        WHERE u.id = auth.uid() 
        AND u.role = 'member'
        AND p.tenant_id = u.tenant_id
    )
);

-- Policy: Member e Admin podem inserir feedbacks
DROP POLICY IF EXISTS "members_and_admins_can_insert_feedbacks" ON lead_feedback;
CREATE POLICY "members_and_admins_can_insert_feedbacks" ON lead_feedback
FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('member', 'admin')
    )
);

-- Policy: Usuario pode atualizar seus próprios feedbacks
DROP POLICY IF EXISTS "users_can_update_own_feedbacks" ON lead_feedback;
CREATE POLICY "users_can_update_own_feedbacks" ON lead_feedback
FOR UPDATE USING (user_id = auth.uid());

-- Policy: Usuario pode deletar seus próprios feedbacks
DROP POLICY IF EXISTS "users_can_delete_own_feedbacks" ON lead_feedback;
CREATE POLICY "users_can_delete_own_feedbacks" ON lead_feedback
FOR DELETE USING (user_id = auth.uid());

-- Função para registrar feedback no histórico
CREATE OR REPLACE FUNCTION register_feedback_history(
    p_lead_id UUID,
    p_feedback_type VARCHAR(20),
    p_comment TEXT,
    p_user_id UUID
) 
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_name TEXT;
    v_description TEXT;
BEGIN
    -- Buscar nome do usuário
    SELECT name INTO v_user_name 
    FROM users 
    WHERE id = p_user_id;
    
    -- Criar descrição do feedback
    v_description := 'Feedback ' || 
        CASE 
            WHEN p_feedback_type = 'positive' THEN 'Positivo'
            WHEN p_feedback_type = 'negative' THEN 'Negativo'
            ELSE p_feedback_type
        END || ': ' || SUBSTRING(p_comment, 1, 100) ||
        CASE 
            WHEN LENGTH(p_comment) > 100 THEN '...'
            ELSE ''
        END;
    
    -- Inserir no histórico
    INSERT INTO lead_history (
        lead_id,
        action,
        description,
        user_name,
        created_at,
        new_values
    ) VALUES (
        p_lead_id,
        'feedback_added',
        v_description,
        COALESCE(v_user_name, 'Usuário'),
        NOW(),
        jsonb_build_object(
            'feedback_type', p_feedback_type,
            'comment', p_comment,
            'user_id', p_user_id
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log do erro, mas não interromper o processo
    RAISE WARNING 'Erro ao registrar feedback no histórico: %', SQLERRM;
END;
$$;

-- Função para obter estatísticas de feedback
CREATE OR REPLACE FUNCTION get_feedback_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_feedbacks BIGINT,
    positive_feedbacks BIGINT,
    negative_feedbacks BIGINT,
    satisfaction_rate NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_feedbacks,
        COUNT(CASE WHEN lf.feedback_type = 'positive' THEN 1 END) as positive_feedbacks,
        COUNT(CASE WHEN lf.feedback_type = 'negative' THEN 1 END) as negative_feedbacks,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN lf.feedback_type = 'positive' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
        END as satisfaction_rate
    FROM lead_feedback lf
    JOIN pipeline_leads pl ON pl.id = lf.lead_id
    JOIN pipelines p ON p.id = pl.pipeline_id
    WHERE (p_tenant_id IS NULL OR p.tenant_id = p_tenant_id);
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE lead_feedback IS 'Tabela para armazenar feedbacks dos usuários sobre leads/oportunidades';
COMMENT ON COLUMN lead_feedback.feedback_type IS 'Tipo de feedback: positive ou negative';
COMMENT ON COLUMN lead_feedback.comment IS 'Comentário detalhado do feedback';
COMMENT ON FUNCTION register_feedback_history IS 'Registra feedback no histórico do lead';
COMMENT ON FUNCTION get_feedback_stats IS 'Retorna estatísticas de satisfação dos feedbacks';

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ ETAPA 2: Sistema de Feedback implementado com sucesso!';
    RAISE NOTICE '📊 Tabela: lead_feedback';
    RAISE NOTICE '🔒 RLS: Configurado para todos os roles';
    RAISE NOTICE '⚙️ Funções: register_feedback_history, get_feedback_stats';
    RAISE NOTICE '📈 Índices: Criados para performance otimizada';
END $$; 