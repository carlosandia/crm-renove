-- ============================================
-- CRIAÇÃO DA TABELA CUSTOMERS
-- ============================================

-- Verificar se a tabela já existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'customers';

-- Criar tabela customers se não existir
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  company TEXT,
  tenant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "customers_policy" ON customers;
DROP POLICY IF EXISTS "allow_all_customers_dev" ON customers;

-- Criar política que permite acesso baseado no tenant_id
CREATE POLICY "customers_tenant_policy" ON customers
    FOR ALL
    USING (
        -- Permitir acesso se:
        -- 1. O usuário é super_admin (acesso total)
        -- 2. O usuário é admin do mesmo tenant
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND (
                role = 'super_admin' 
                OR (role = 'admin' AND tenant_id = customers.tenant_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND (
                role = 'super_admin' 
                OR (role = 'admin' AND tenant_id = customers.tenant_id)
            )
        )
    );

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_customers_updated_at();

-- Verificar se a tabela foi criada corretamente (usando SQL padrão)
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Inserir alguns dados de teste (opcional)
-- Primeiro, vamos verificar se existe pelo menos uma empresa
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM companies LIMIT 1) THEN
        INSERT INTO customers (name, email, phone, company, tenant_id) 
        SELECT 
            'João Silva', 
            'joao@empresaabc.com', 
            '(11) 99999-9999', 
            'Empresa ABC Ltda', 
            (SELECT id FROM companies LIMIT 1)
        WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'joao@empresaabc.com');
        
        INSERT INTO customers (name, email, phone, company, tenant_id) 
        SELECT 
            'Maria Santos', 
            'maria@techcorp.com', 
            '(11) 88888-8888', 
            'TechCorp Solutions', 
            (SELECT id FROM companies LIMIT 1)
        WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'maria@techcorp.com');
    END IF;
END $$;

-- Verificar dados inseridos
SELECT id, name, email, company, created_at FROM customers ORDER BY created_at DESC; 