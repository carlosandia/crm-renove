-- ============================================
-- CRIAÇÃO DA TABELA SALES_GOALS (METAS)
-- ============================================

-- Verificar se a tabela já existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'sales_goals';

-- Criar tabela sales_goals se não existir
CREATE TABLE IF NOT EXISTS sales_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('vendas', 'receita', 'leads', 'conversao')),
  goal_value NUMERIC NOT NULL CHECK (goal_value > 0),
  current_value NUMERIC DEFAULT 0 CHECK (current_value >= 0),
  period TEXT NOT NULL CHECK (period IN ('mensal', 'trimestral', 'semestral', 'anual')),
  target_date DATE NOT NULL,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada', 'concluida', 'cancelada')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE sales_goals ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "sales_goals_policy" ON sales_goals;
DROP POLICY IF EXISTS "allow_all_sales_goals_dev" ON sales_goals;

-- Criar política que permite acesso baseado no tenant_id
CREATE POLICY "sales_goals_tenant_policy" ON sales_goals
    FOR ALL
    USING (
        -- Permitir acesso se:
        -- 1. O usuário é super_admin (acesso total)
        -- 2. O usuário é admin do mesmo tenant
        -- 3. O usuário é o próprio dono da meta
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND (
                role = 'super_admin' 
                OR (role = 'admin' AND tenant_id = sales_goals.tenant_id)
                OR (id = sales_goals.user_id)
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND (
                role = 'super_admin' 
                OR (role = 'admin' AND tenant_id = sales_goals.tenant_id)
            )
        )
    );

-- Criar função para trigger de updated_at
CREATE OR REPLACE FUNCTION update_sales_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para updated_at
DROP TRIGGER IF EXISTS update_sales_goals_updated_at ON sales_goals;
CREATE TRIGGER update_sales_goals_updated_at 
    BEFORE UPDATE ON sales_goals 
    FOR EACH ROW EXECUTE FUNCTION update_sales_goals_updated_at();

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sales_goals_user_id ON sales_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_goals_tenant_id ON sales_goals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_goals_status ON sales_goals(status);
CREATE INDEX IF NOT EXISTS idx_sales_goals_target_date ON sales_goals(target_date);

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales_goals' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Inserir meta de exemplo (opcional)
INSERT INTO sales_goals (user_id, tenant_id, goal_type, goal_value, period, target_date, created_by) 
SELECT 
    (SELECT id FROM users WHERE role = 'member' LIMIT 1),
    'test-tenant',
    'vendas',
    100,
    'mensal',
    (CURRENT_DATE + INTERVAL '30 days')::date,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'member' LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM sales_goals LIMIT 1);

-- Verificar dados inseridos
SELECT id, goal_type, goal_value, current_value, period, target_date, status, created_at 
FROM sales_goals 
ORDER BY created_at DESC; 