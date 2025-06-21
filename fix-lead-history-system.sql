-- ============================================
-- CORREÇÃO DO SISTEMA DE HISTÓRICO DE LEADS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

DO $$
BEGIN
  -- 1. VERIFICAR E CRIAR TABELA LEAD_HISTORY
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_history') THEN
    CREATE TABLE lead_history (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      lead_id UUID NOT NULL,
      action VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      user_id UUID,
      user_name TEXT,
      old_values JSONB DEFAULT '{}',
      new_values JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Tabela lead_history criada';
  ELSE
    RAISE NOTICE 'Tabela lead_history já existe';
  END IF;

  -- 2. VERIFICAR E ADICIONAR COLUNAS SE NECESSÁRIO
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_history' AND column_name = 'user_name') THEN
    ALTER TABLE lead_history ADD COLUMN user_name TEXT;
    RAISE NOTICE 'Coluna user_name adicionada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_history' AND column_name = 'description') THEN
    ALTER TABLE lead_history ADD COLUMN description TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Coluna description adicionada';
  END IF;
END $$;

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_created_at ON lead_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_history_action ON lead_history(action);

-- 4. CONFIGURAR RLS (ROW LEVEL SECURITY)
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;

-- 5. CRIAR POLÍTICA DE ACESSO PERMISSIVA
DROP POLICY IF EXISTS "lead_history_access" ON lead_history;
CREATE POLICY "lead_history_access" ON lead_history FOR ALL USING (true) WITH CHECK (true);

-- 6. TESTAR A TABELA COM UMA INSERÇÃO DE TESTE
DO $$
DECLARE
  test_lead_id UUID;
  test_result_id UUID;
BEGIN
  -- Buscar um lead existente para teste (se houver)
  SELECT id INTO test_lead_id FROM pipeline_leads LIMIT 1;
  
  IF test_lead_id IS NOT NULL THEN
    -- Inserir entrada de teste
    INSERT INTO lead_history (
      lead_id,
      action,
      description,
      user_name,
      old_values,
      new_values
    ) VALUES (
      test_lead_id,
      'system_test',
      'Teste do sistema de histórico - pode ser removido',
      'Sistema',
      '{}',
      '{"test": true}'
    ) RETURNING id INTO test_result_id;
    
    RAISE NOTICE 'Teste de inserção bem-sucedido. ID: %', test_result_id;
    
    -- Remover o teste
    DELETE FROM lead_history WHERE id = test_result_id;
    RAISE NOTICE 'Entrada de teste removida';
  ELSE
    RAISE NOTICE 'Nenhum lead encontrado para teste - apenas estrutura criada';
  END IF;
  
  -- Mensagens finais
  RAISE NOTICE '✅ Sistema de histórico configurado com sucesso!';
  RAISE NOTICE 'Tabela: lead_history';
  RAISE NOTICE 'Políticas: configuradas';
  RAISE NOTICE 'Índices: criados';
END $$;

-- 7. VERIFICAR RESULTADO FINAL
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'lead_history' 
ORDER BY ordinal_position;

-- 8. CONFIRMAR POLÍTICAS
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'lead_history';

-- 9. TESTAR CONTAGEM
SELECT COUNT(*) as total_registros FROM lead_history; 