-- ============================================
-- MIGRAÇÃO: Adicionar coluna admin_invitation_data
-- Data: 2025-01-27
-- Descrição: Adiciona coluna JSONB para armazenar dados de convite de admins
-- ============================================

-- Adicionar coluna admin_invitation_data na tabela companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS admin_invitation_data JSONB DEFAULT NULL;

-- Comentário para documentação
COMMENT ON COLUMN companies.admin_invitation_data IS 'Dados de convite do administrador da empresa (token, status, timestamps)';

-- Índice para melhorar performance de busca por token
CREATE INDEX IF NOT EXISTS idx_companies_admin_invitation_token 
ON companies USING gin ((admin_invitation_data->'invitation_token'));

-- Índice para melhorar performance de busca por status
CREATE INDEX IF NOT EXISTS idx_companies_admin_invitation_status 
ON companies USING gin ((admin_invitation_data->'invitation_status'));

-- Verificar se a coluna foi criada com sucesso
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'admin_invitation_data'
    ) THEN
        RAISE NOTICE '✅ Coluna admin_invitation_data criada com sucesso na tabela companies';
    ELSE
        RAISE EXCEPTION '❌ Falha ao criar coluna admin_invitation_data';
    END IF;
END $$; 