-- ============================================
-- CORREÇÃO SIMPLES DA TABELA COMPANIES
-- Execute linha por linha no Supabase SQL Editor
-- ============================================

-- PASSO 1: Verificar estrutura atual
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position;

-- PASSO 2: Adicionar colunas essenciais (uma por vez)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS expected_leads_monthly INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS expected_sales_monthly INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS expected_followers_monthly INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- PASSO 3: Atualizar registros existentes com valores padrão
UPDATE companies SET 
  industry = 'Marketing Digital',
  city = 'São Paulo',
  state = 'SP',
  expected_leads_monthly = 100,
  expected_sales_monthly = 20,
  expected_followers_monthly = 500,
  is_active = TRUE
WHERE industry IS NULL;

-- PASSO 4: Verificar se funcionou
SELECT id, name, industry, city, state, expected_leads_monthly, is_active 
FROM companies 
LIMIT 3;

-- PASSO 5: Confirmar sucesso
SELECT '✅ Tabela corrigida com sucesso!' as status; 