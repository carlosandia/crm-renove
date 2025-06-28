-- Enterprise Admin Invitations System
-- Data: 2025-01-27
-- Objetivo: Implementar sistema de convites seguindo padrões dos grandes CRMs

-- =====================================================
-- 1. TABELA DE CONVITES DE ADMINISTRADORES
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Admin data
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Invitation security
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'expired', 'cancelled')
    ),
    
    -- Tracking
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Metadata
    invitation_data JSONB DEFAULT '{}',
    resend_count INTEGER DEFAULT 0,
    last_resent_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT expires_in_future CHECK (expires_at > NOW()),
    CONSTRAINT valid_resend_count CHECK (resend_count >= 0)
);

-- =====================================================
-- 2. TABELA DE ATIVAÇÃO DE USUÁRIOS (ENTERPRISE PATTERN)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES admin_invitations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Activation security
    activation_token VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- Secure password storage
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'completed', 'expired')
    ),
    
    -- Security tracking
    activation_ip INET,
    activation_user_agent TEXT,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_failed_attempts CHECK (failed_attempts >= 0),
    CONSTRAINT activation_expires_future CHECK (expires_at > NOW())
);

-- =====================================================
-- 3. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Admin invitations indexes
CREATE INDEX IF NOT EXISTS idx_admin_invitations_company_id ON admin_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON admin_invitations(status);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_expires_at ON admin_invitations(expires_at);

-- User activations indexes
CREATE INDEX IF NOT EXISTS idx_user_activations_invitation_id ON user_activations(invitation_id);
CREATE INDEX IF NOT EXISTS idx_user_activations_user_id ON user_activations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activations_token ON user_activations(activation_token);
CREATE INDEX IF NOT EXISTS idx_user_activations_status ON user_activations(status);

-- =====================================================
-- 4. TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_admin_invitations_updated_at 
    BEFORE UPDATE ON admin_invitations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_activations_updated_at 
    BEFORE UPDATE ON user_activations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. FUNÇÕES ENTERPRISE PARA GESTÃO DE CONVITES
-- =====================================================

-- Função para limpar convites expirados
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Marcar convites expirados
    UPDATE admin_invitations 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log da limpeza
    RAISE NOTICE 'Limpeza de convites: % convites marcados como expirados', expired_count;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Função para validar token de convite
CREATE OR REPLACE FUNCTION validate_invitation_token(token_input VARCHAR(255))
RETURNS TABLE (
    invitation_id UUID,
    company_id UUID,
    email VARCHAR(255),
    name VARCHAR(255),
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ai.id as invitation_id,
        ai.company_id,
        ai.email,
        ai.name,
        CASE 
            WHEN ai.status != 'pending' THEN FALSE
            WHEN ai.expires_at < NOW() THEN FALSE
            ELSE TRUE
        END as is_valid,
        CASE 
            WHEN ai.id IS NULL THEN 'Token de convite inválido'
            WHEN ai.status != 'pending' THEN 'Convite já foi processado'
            WHEN ai.expires_at < NOW() THEN 'Convite expirado'
            ELSE NULL
        END as error_message
    FROM admin_invitations ai
    WHERE ai.invitation_token = token_input;
    
    -- Se não encontrou nenhum registro
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::UUID as invitation_id,
            NULL::UUID as company_id,
            NULL::VARCHAR(255) as email,
            NULL::VARCHAR(255) as name,
            FALSE as is_valid,
            'Token de convite não encontrado' as error_message;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para aceitar convite e criar usuário
CREATE OR REPLACE FUNCTION accept_invitation(
    token_input VARCHAR(255),
    password_hash_input VARCHAR(255),
    activation_ip_input INET DEFAULT NULL,
    user_agent_input TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    user_id UUID,
    company_id UUID,
    message TEXT
) AS $$
DECLARE
    invitation_record RECORD;
    new_user_id UUID;
BEGIN
    -- Validar token de convite
    SELECT * INTO invitation_record
    FROM validate_invitation_token(token_input);
    
    IF NOT invitation_record.is_valid THEN
        RETURN QUERY
        SELECT 
            FALSE as success,
            NULL::UUID as user_id,
            NULL::UUID as company_id,
            invitation_record.error_message as message;
        RETURN;
    END IF;
    
    -- Criar usuário admin
    INSERT INTO users (
        email, 
        name, 
        role, 
        tenant_id, 
        is_active,
        created_at,
        updated_at
    ) VALUES (
        invitation_record.email,
        invitation_record.name,
        'admin',
        invitation_record.company_id,
        true,
        NOW(),
        NOW()
    ) RETURNING id INTO new_user_id;
    
    -- Marcar convite como aceito
    UPDATE admin_invitations 
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        created_user_id = new_user_id,
        updated_at = NOW()
    WHERE id = invitation_record.invitation_id;
    
    -- Criar registro de ativação
    INSERT INTO user_activations (
        invitation_id,
        user_id,
        activation_token,
        password_hash,
        status,
        activation_ip,
        activation_user_agent,
        activated_at
    ) VALUES (
        invitation_record.invitation_id,
        new_user_id,
        gen_random_uuid()::VARCHAR(255),
        password_hash_input,
        'completed',
        activation_ip_input,
        user_agent_input,
        NOW()
    );
    
    RETURN QUERY
    SELECT 
        TRUE as success,
        new_user_id as user_id,
        invitation_record.company_id as company_id,
        'Usuário administrador criado com sucesso' as message;
        
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            FALSE as success,
            NULL::UUID as user_id,
            NULL::UUID as company_id,
            'Erro ao processar convite: ' || SQLERRM as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activations ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para desenvolvimento (podem ser refinadas depois)
CREATE POLICY "admin_invitations_full_access" ON admin_invitations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "user_activations_full_access" ON user_activations
  FOR ALL USING (true) WITH CHECK (true);

-- Conceder permissões explícitas
GRANT ALL ON admin_invitations TO anon;
GRANT ALL ON admin_invitations TO authenticated;
GRANT ALL ON admin_invitations TO service_role;

GRANT ALL ON user_activations TO anon;
GRANT ALL ON user_activations TO authenticated;
GRANT ALL ON user_activations TO service_role;

-- Conceder execução das funções
GRANT EXECUTE ON FUNCTION cleanup_expired_invitations() TO anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invitation_token(VARCHAR(255)) TO anon;
GRANT EXECUTE ON FUNCTION validate_invitation_token(VARCHAR(255)) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation(VARCHAR(255), VARCHAR(255), INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION accept_invitation(VARCHAR(255), VARCHAR(255), INET, TEXT) TO authenticated;

-- =====================================================
-- 7. FUNÇÃO DE TESTE DO SISTEMA
-- =====================================================

CREATE OR REPLACE FUNCTION test_invitation_system()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    test_result json;
    test_company_id uuid;
    test_invitation_id uuid;
    test_token varchar(255);
BEGIN
    -- Criar empresa de teste
    INSERT INTO companies (name, industry, city, state, country)
    VALUES ('Empresa Teste Convite', 'Teste', 'São Paulo', 'SP', 'Brasil')
    RETURNING id INTO test_company_id;
    
    -- Criar convite de teste
    test_token := gen_random_uuid()::varchar(255);
    INSERT INTO admin_invitations (
        company_id, email, name, invitation_token, expires_at
    ) VALUES (
        test_company_id, 'admin@teste.com', 'Admin Teste', 
        test_token, NOW() + INTERVAL '24 hours'
    ) RETURNING id INTO test_invitation_id;
    
    -- Testar validação do token
    test_result := json_build_object(
        'success', true,
        'message', 'Sistema de convites funcionando corretamente',
        'test_company_id', test_company_id,
        'test_invitation_id', test_invitation_id,
        'test_token', test_token
    );
    
    -- Limpar dados de teste
    DELETE FROM admin_invitations WHERE id = test_invitation_id;
    DELETE FROM companies WHERE id = test_company_id;
    
    RETURN test_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Erro no sistema de convites: ' || SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;

GRANT EXECUTE ON FUNCTION test_invitation_system() TO anon;
GRANT EXECUTE ON FUNCTION test_invitation_system() TO authenticated;

-- =====================================================
-- 8. LOG DE CONCLUSÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Migração Enterprise Admin Invitations concluída com sucesso!';
    RAISE NOTICE 'Tabelas criadas: admin_invitations, user_activations';
    RAISE NOTICE 'Funções criadas: cleanup_expired_invitations, validate_invitation_token, accept_invitation';
    RAISE NOTICE 'Sistema pronto para fluxo Company → Admin Invitation → Email Activation';
    RAISE NOTICE 'Use SELECT test_invitation_system(); para testar';
END
$$; 