-- ============================================
-- CRIAÇÃO COMPLETA DA TABELA COMPANIES
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. REMOVER TABELA EXISTENTE (SE HOUVER PROBLEMAS)
-- CUIDADO: Isso vai apagar todos os dados existentes!
-- DROP TABLE IF EXISTS companies CASCADE;

-- 2. CRIAR TABELA COMPANIES COMPLETA
CREATE TABLE IF NOT EXISTS companies (
  -- Campos básicos
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  
  -- Manter compatibilidade
  segment TEXT, -- Campo antigo, manter para compatibilidade
  
  -- Novos campos obrigatórios
  industry TEXT NOT NULL DEFAULT 'Não informado',
  city TEXT NOT NULL DEFAULT 'Não informado',
  state TEXT NOT NULL DEFAULT 'SP',
  
  -- Campos opcionais
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  country TEXT DEFAULT 'Brasil',
  
  -- Expectativas mensais obrigatórias
  expected_leads_monthly INTEGER NOT NULL DEFAULT 0 CHECK (expected_leads_monthly >= 0),
  expected_sales_monthly INTEGER NOT NULL DEFAULT 0 CHECK (expected_sales_monthly >= 0),
  expected_followers_monthly INTEGER NOT NULL DEFAULT 0 CHECK (expected_followers_monthly >= 0),
  
  -- Status e datas
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MIGRAR DADOS EXISTENTES (SE A TABELA JÁ EXISTIA)
-- Se você tinha uma tabela companies anterior, este comando vai atualizar os dados
UPDATE companies 
SET 
  industry = COALESCE(industry, segment, 'Não informado'),
  city = COALESCE(city, 'Não informado'),
  state = COALESCE(state, 'SP'),
  expected_leads_monthly = COALESCE(expected_leads_monthly, 50),
  expected_sales_monthly = COALESCE(expected_sales_monthly, 10),
  expected_followers_monthly = COALESCE(expected_followers_monthly, 100),
  is_active = COALESCE(is_active, TRUE),
  country = COALESCE(country, 'Brasil')
WHERE industry IS NULL 
   OR city IS NULL 
   OR state IS NULL;

-- 4. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_state ON companies(state);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);

-- 5. HABILITAR ROW LEVEL SECURITY
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 6. CRIAR POLÍTICAS DE SEGURANÇA (AJUSTAR CONFORME NECESSÁRIO)
-- Super admins podem ver/editar todas as empresas
CREATE POLICY "super_admin_all_companies" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Admins só podem ver a própria empresa
CREATE POLICY "admin_own_company" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.tenant_id = companies.id
    )
  );

-- 7. INSERIR EMPRESA DE TESTE
INSERT INTO companies (
  name, 
  industry, 
  city, 
  state, 
  expected_leads_monthly, 
  expected_sales_monthly, 
  expected_followers_monthly,
  website,
  phone,
  email,
  is_active
) VALUES (
  'Empresa Teste CRM',
  'Marketing Digital',
  'São Paulo',
  'SP',
  100,
  20,
  500,
  'https://empresateste.com.br',
  '(11) 99999-9999',
  'contato@empresateste.com.br',
  true
) ON CONFLICT (id) DO NOTHING;

-- 8. VERIFICAR ESTRUTURA FINAL
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'companies' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. VERIFICAR DADOS
SELECT 
  id, 
  name, 
  industry, 
  city, 
  state, 
  expected_leads_monthly, 
  expected_sales_monthly, 
  expected_followers_monthly,
  is_active,
  created_at
FROM companies 
ORDER BY created_at DESC 
LIMIT 5;

-- 10. CONFIRMAR SUCESSO
SELECT '✅ Tabela companies criada/atualizada com sucesso!' as status;
SELECT '📊 Total de empresas: ' || COUNT(*) as total FROM companies; 