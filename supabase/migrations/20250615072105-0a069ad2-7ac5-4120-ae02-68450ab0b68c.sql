
-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "super_admin_companies_policy" ON companies;
DROP POLICY IF EXISTS "super_admin_integrations_policy" ON integrations;

-- Criar políticas temporárias para desenvolvimento que permitem todas as operações
-- ATENÇÃO: Estas políticas são permissivas para desenvolvimento
-- Em produção, você deve implementar autenticação adequada

-- Política para companies - permite todas as operações
CREATE POLICY "allow_all_companies_dev" ON companies
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Política para users - permite todas as operações  
CREATE POLICY "allow_all_users_dev" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Política para integrations - permite todas as operações
CREATE POLICY "allow_all_integrations_dev" ON integrations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Verificar se RLS está habilitado (deve estar)
-- Se não estiver, as linhas abaixo vão habilitar
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY; 
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
