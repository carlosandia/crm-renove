-- Adicionar coluna last_login na tabela users se não existir
-- Script para ser executado no Supabase SQL Editor

-- Verificar se a coluna last_login existe, se não existir, adicionar
DO $$
BEGIN
    -- Tentar adicionar a coluna last_login
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_login'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;
        RAISE NOTICE 'Coluna last_login adicionada com sucesso à tabela users';
    ELSE
        RAISE NOTICE 'Coluna last_login já existe na tabela users';
    END IF;
END $$;

-- Opcional: Definir último login como agora para usuários ativos existentes (apenas se a coluna foi criada)
UPDATE users 
SET last_login = NOW() 
WHERE is_active = true 
  AND last_login IS NULL;

-- Verificar se a atualização foi bem-sucedida
SELECT 
    email,
    first_name,
    last_name,
    role,
    is_active,
    last_login,
    created_at
FROM users 
WHERE is_active = true
ORDER BY created_at DESC; 