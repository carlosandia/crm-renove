-- ============================================
-- CONFIGURAÇÃO COMPLETA DO BANCO DE DADOS CRM
-- ============================================

-- Remover tabelas existentes se houver problemas
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- TABELA USERS (ÚNICA TABELA DE USUÁRIOS)
-- ============================================
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
    tenant_id VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA CUSTOMERS
-- ============================================
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    tenant_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_email ON customers(email);

-- ============================================
-- HABILITAR RLS (ROW LEVEL SECURITY)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS SIMPLES
-- ============================================

-- Política para users: permitir tudo por enquanto (simplificado)
CREATE POLICY "users_policy" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Política para customers: permitir tudo por enquanto (simplificado)
CREATE POLICY "customers_policy" ON customers
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- DADOS DE EXEMPLO
-- ============================================

-- Inserir usuários de exemplo
INSERT INTO users (email, name, role, tenant_id) VALUES
('admin@crm.com', 'Admin User', 'admin', 'tenant-1'),
('manager@crm.com', 'Manager User', 'manager', 'tenant-1'),
('user@crm.com', 'Regular User', 'user', 'tenant-1'),
('admin2@crm.com', 'Admin Tenant 2', 'admin', 'tenant-2');

-- Inserir clientes de exemplo
INSERT INTO customers (name, email, phone, company, tenant_id) VALUES
('João Silva', 'joao@empresa.com', '(11) 99999-9999', 'Empresa ABC', 'tenant-1'),
('Maria Santos', 'maria@startup.com', '(11) 88888-8888', 'Startup XYZ', 'tenant-1'),
('Pedro Costa', 'pedro@tech.com', '(11) 77777-7777', 'Tech Solutions', 'tenant-2'),
('Ana Oliveira', 'ana@digital.com', '(11) 66666-6666', 'Digital Corp', 'tenant-1');

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT 'Configuração concluída!' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_customers FROM customers; 