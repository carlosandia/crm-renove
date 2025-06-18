-- ============================================
-- ATUALIZAÇÃO DA TABELA USERS
-- Adicionar campo password_hash para senhas
-- ============================================

-- 1. VERIFICAR ESTRUTURA ATUAL
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ADICIONAR CAMPO PASSWORD_HASH (SE NÃO EXISTIR)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. VERIFICAR ESTRUTURA FINAL
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. COMENTÁRIO PARA DOCUMENTAÇÃO
COMMENT ON COLUMN users.password_hash IS 'Hash da senha do usuário (em produção usar bcrypt)';

SELECT '✅ Tabela users atualizada com campo password_hash!' as status; 