-- Adicionar coluna auth_user_id para vincular com Supabase Auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Atualizar política RLS para ser mais específica
DROP POLICY IF EXISTS "users_policy" ON users;

-- Política para permitir que usuários vejam apenas seus próprios dados
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    USING (auth.uid() = auth_user_id OR auth.uid() IN (
        SELECT auth_user_id FROM users WHERE role = 'super_admin'
    ));

-- Política para permitir inserção (para registro)
CREATE POLICY "users_insert" ON users
    FOR INSERT
    WITH CHECK (true);

-- Política para permitir atualização dos próprios dados
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    USING (auth.uid() = auth_user_id OR auth.uid() IN (
        SELECT auth_user_id FROM users WHERE role = 'super_admin'
    ));