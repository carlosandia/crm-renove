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