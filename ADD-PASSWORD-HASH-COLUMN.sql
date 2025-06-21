-- ============================================
-- ADICIONAR COLUNA PASSWORD_HASH NA TABELA USERS
-- Execute este comando no Supabase SQL Editor
-- ============================================

-- 1. VERIFICAR ESTRUTURA ATUAL DA TABELA USERS
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ADICIONAR COLUNA PASSWORD_HASH SE NÃO EXISTIR
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. DEFINIR SENHAS PADRÃO PARA USUÁRIOS EXISTENTES SEM SENHA
UPDATE users 
SET password_hash = '123456' 
WHERE password_hash IS NULL;

-- 4. VERIFICAR ESTRUTURA FINAL
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. VERIFICAR USUÁRIOS COM SENHAS
SELECT id, email, role, 
       CASE 
         WHEN password_hash IS NOT NULL THEN 'Com senha' 
         ELSE 'Sem senha' 
       END as status_senha
FROM users 
ORDER BY created_at DESC;

-- 6. COMENTÁRIO PARA DOCUMENTAÇÃO
COMMENT ON COLUMN users.password_hash IS 'Hash da senha do usuário (em produção usar bcrypt)';

-- 7. CONFIRMAR SUCESSO
SELECT '✅ Coluna password_hash adicionada com sucesso na tabela users!' as status;

-- Script para adicionar coluna password_hash na tabela users
-- Este script adiciona a coluna apenas se ela não existir

-- Verificar se a coluna password_hash já existe
DO $$
BEGIN
    -- Tentar adicionar a coluna password_hash
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'password_hash'
    ) THEN
        -- Adicionar a coluna password_hash
        ALTER TABLE users ADD COLUMN password_hash TEXT;
        
        -- Definir senha padrão para usuários admin existentes que não têm senha
        UPDATE users 
        SET password_hash = '123456' 
        WHERE role = 'admin' AND password_hash IS NULL;
        
        -- Definir senha padrão para super_admin se não tiver
        UPDATE users 
        SET password_hash = 'admin123' 
        WHERE role = 'super_admin' AND password_hash IS NULL;
        
        RAISE NOTICE 'Coluna password_hash adicionada com sucesso à tabela users';
        RAISE NOTICE 'Senhas padrão definidas para usuários existentes';
        RAISE NOTICE 'Admins: senha padrão = 123456';
        RAISE NOTICE 'Super Admin: senha padrão = admin123';
    ELSE
        RAISE NOTICE 'Coluna password_hash já existe na tabela users';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    id,
    first_name,
    last_name,
    email,
    role,
    CASE 
        WHEN password_hash IS NOT NULL THEN 'Senha definida'
        ELSE 'Sem senha'
    END as status_senha
FROM users 
WHERE role IN ('admin', 'super_admin')
ORDER BY role, first_name; 