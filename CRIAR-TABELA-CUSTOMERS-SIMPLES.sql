-- ============================================
-- VERSÃO SIMPLES - CRIAÇÃO DA TABELA CUSTOMERS
-- ============================================

-- Criar tabela customers
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

-- Criar política simples (permite tudo para desenvolvimento)
CREATE POLICY "customers_allow_all" ON customers
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_customers_updated_at();

-- Inserir dados de teste básicos
INSERT INTO customers (name, email, phone, company, tenant_id) VALUES
('João Silva', 'joao@empresaabc.com', '(11) 99999-9999', 'Empresa ABC Ltda', '00000000-0000-0000-0000-000000000001');

INSERT INTO customers (name, email, phone, company, tenant_id) VALUES
('Maria Santos', 'maria@techcorp.com', '(11) 88888-8888', 'TechCorp Solutions', '00000000-0000-0000-0000-000000000001'); 