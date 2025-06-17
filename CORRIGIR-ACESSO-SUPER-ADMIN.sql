-- ============================================
-- CORREÇÃO DE ACESSO PARA SUPER ADMIN
-- ============================================

-- Verificar se o usuário super_admin existe
SELECT 
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    tenant_id, 
    is_active 
FROM users 
WHERE email = 'superadmin@crm.com';

-- Ativar o usuário super_admin se estiver inativo
UPDATE users 
SET is_active = true 
WHERE email = 'superadmin@crm.com';

-- Verificar políticas RLS que podem estar bloqueando
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('users', 'companies', 'integrations', 'customers', 'pipelines', 'pipeline_stages', 'custom_forms');

-- Criar política específica para super_admin se necessário
DROP POLICY IF EXISTS "super_admin_full_access" ON users;
CREATE POLICY "super_admin_full_access" ON users
    FOR ALL 
    USING (
        -- Super admin pode ver tudo
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'super_admin'
        )
        OR
        -- Usuários podem ver seus próprios dados
        id = auth.uid()
    )
    WITH CHECK (
        -- Super admin pode modificar tudo
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'super_admin'
        )
        OR
        -- Usuários podem modificar seus próprios dados
        id = auth.uid()
    );

-- Verificar status final
SELECT 
    'Correção aplicada com sucesso!' as status,
    email,
    role,
    is_active
FROM users 
WHERE email = 'superadmin@crm.com'; 