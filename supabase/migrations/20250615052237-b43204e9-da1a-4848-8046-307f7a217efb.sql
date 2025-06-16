
-- Ajustar a tabela users para corresponder exatamente à especificação
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'member')),
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir os 3 usuários de demonstração conforme especificado (usando UUIDs válidos)
INSERT INTO users (email, first_name, last_name, role, tenant_id, is_active) VALUES
('superadmin@crm.com', 'Super', 'Admin', 'super_admin', '550e8400-e29b-41d4-a716-446655440000', true),
('admin@crm.com', 'Admin', 'User', 'admin', '550e8400-e29b-41d4-a716-446655440000', true),
('member@crm.com', 'Member', 'User', 'member', '550e8400-e29b-41d4-a716-446655440000', true);

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política simples para permitir acesso (pode ser refinada posteriormente)
CREATE POLICY "users_policy" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);
