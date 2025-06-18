-- ============================================
-- ATUALIZAÇÃO DA TABELA COMPANIES
-- Adicionar campos obrigatórios conforme especificação
-- ============================================

-- 1. VERIFICAR ESTRUTURA ATUAL
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ADICIONAR NOVOS CAMPOS (SE NÃO EXISTIREM)

-- Campo: Nicho de atuação (industry)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS industry TEXT;

-- Campo: Cidade (obrigatório)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS city TEXT;

-- Campo: Estado (obrigatório)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS state TEXT;

-- Campo: Website
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS website TEXT;

-- Campo: Telefone
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Campo: Email
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Campo: Endereço completo
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Campo: País (com padrão Brasil)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil';

-- Campo: Status ativo
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- CAMPOS DE EXPECTATIVA MENSAL
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS expected_leads_monthly INTEGER;

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS expected_sales_monthly INTEGER;

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS expected_followers_monthly INTEGER;

-- 3. ATUALIZAR DADOS EXISTENTES (VALORES PADRÃO TEMPORÁRIOS)
UPDATE companies 
SET 
  industry = COALESCE(industry, 'Não informado'),
  city = COALESCE(city, 'Não informado'),
  state = COALESCE(state, 'SP'),
  expected_leads_monthly = COALESCE(expected_leads_monthly, 50),
  expected_sales_monthly = COALESCE(expected_sales_monthly, 10),
  expected_followers_monthly = COALESCE(expected_followers_monthly, 100),
  is_active = COALESCE(is_active, TRUE)
WHERE industry IS NULL 
   OR city IS NULL 
   OR state IS NULL 
   OR expected_leads_monthly IS NULL 
   OR expected_sales_monthly IS NULL 
   OR expected_followers_monthly IS NULL
   OR is_active IS NULL;

-- 4. APLICAR CONSTRAINTS NOT NULL (APÓS POPULAR COM DADOS)
ALTER TABLE companies 
ALTER COLUMN industry SET NOT NULL;

ALTER TABLE companies 
ALTER COLUMN city SET NOT NULL;

ALTER TABLE companies 
ALTER COLUMN state SET NOT NULL;

ALTER TABLE companies 
ALTER COLUMN expected_leads_monthly SET NOT NULL;

ALTER TABLE companies 
ALTER COLUMN expected_sales_monthly SET NOT NULL;

ALTER TABLE companies 
ALTER COLUMN expected_followers_monthly SET NOT NULL;

-- 5. ADICIONAR CONSTRAINTS DE VALIDAÇÃO
ALTER TABLE companies 
ADD CONSTRAINT companies_expected_leads_check 
CHECK (expected_leads_monthly >= 0);

ALTER TABLE companies 
ADD CONSTRAINT companies_expected_sales_check 
CHECK (expected_sales_monthly >= 0);

ALTER TABLE companies 
ADD CONSTRAINT companies_expected_followers_check 
CHECK (expected_followers_monthly >= 0);

-- 6. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_state ON companies(state);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

-- 7. VERIFICAR ESTRUTURA FINAL
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. TESTE - INSERIR EMPRESA DE EXEMPLO
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
  email
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
  'contato@empresateste.com.br'
) ON CONFLICT DO NOTHING;

-- 9. VERIFICAR DADOS
SELECT id, name, industry, city, state, expected_leads_monthly, expected_sales_monthly, expected_followers_monthly, created_at
FROM companies 
ORDER BY created_at DESC 
LIMIT 5;

SELECT '✅ Tabela companies atualizada com sucesso!' as status; 