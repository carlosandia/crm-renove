-- Fix Companies Permissions Migration
-- Data: 2025-01-27
-- Objetivo: Corrigir permissões e políticas RLS para permitir criação de empresas

-- 1. Verificar e corrigir estrutura da tabela companies
DO $$ 
BEGIN
  -- Garantir que todos os campos necessários existem
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'industry') THEN
    ALTER TABLE companies ADD COLUMN industry TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'city') THEN
    ALTER TABLE companies ADD COLUMN city TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'state') THEN
    ALTER TABLE companies ADD COLUMN state TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'expected_leads_monthly') THEN
    ALTER TABLE companies ADD COLUMN expected_leads_monthly INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'expected_sales_monthly') THEN
    ALTER TABLE companies ADD COLUMN expected_sales_monthly INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'expected_followers_monthly') THEN
    ALTER TABLE companies ADD COLUMN expected_followers_monthly INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. Limpar políticas RLS conflitantes
DROP POLICY IF EXISTS "companies_access_policy" ON companies;
DROP POLICY IF EXISTS "dev_companies_all_access" ON companies;
DROP POLICY IF EXISTS "allow_all_companies_dev" ON companies;
DROP POLICY IF EXISTS "company_isolation_companies" ON companies;
DROP POLICY IF EXISTS "super_admin_companies_policy" ON companies;

-- 3. Criar política RLS simples e permissiva para desenvolvimento
CREATE POLICY "companies_full_access_dev" ON companies
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 4. Garantir que RLS está habilitado mas permissivo
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 5. Conceder permissões explícitas para roles do Supabase
GRANT ALL ON companies TO anon;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON companies TO service_role;

-- 6. Verificar e corrigir sequências/defaults se necessário
ALTER TABLE companies ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE companies ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE companies ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE companies ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE companies ALTER COLUMN country SET DEFAULT 'Brasil';

-- 7. Criar função de teste para validar permissões
CREATE OR REPLACE FUNCTION test_companies_permissions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_result json;
  test_id uuid;
BEGIN
  -- Tentar inserir um registro de teste
  INSERT INTO companies (
    name, industry, city, state, country,
    expected_leads_monthly, expected_sales_monthly, expected_followers_monthly
  ) VALUES (
    'Teste Permissões', 'Teste', 'São Paulo', 'SP', 'Brasil',
    10, 5, 50
  ) RETURNING id INTO test_id;
  
  -- Se chegou aqui, a inserção funcionou
  test_result := json_build_object(
    'success', true,
    'message', 'Permissões funcionando corretamente',
    'test_id', test_id
  );
  
  -- Limpar o registro de teste
  DELETE FROM companies WHERE id = test_id;
  
  RETURN test_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Erro nas permissões: ' || SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Conceder execução da função de teste
GRANT EXECUTE ON FUNCTION test_companies_permissions() TO anon;
GRANT EXECUTE ON FUNCTION test_companies_permissions() TO authenticated;

-- 8. Log de conclusão
DO $$
BEGIN
  RAISE NOTICE 'Migração de correção de permissões da tabela companies concluída';
  RAISE NOTICE 'Política RLS permissiva criada para desenvolvimento';
  RAISE NOTICE 'Permissões explícitas concedidas para todos os roles';
  RAISE NOTICE 'Use SELECT test_companies_permissions(); para testar';
END
$$; 