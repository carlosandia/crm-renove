-- ============================================
-- CRIAÇÃO COMPLETA DO SISTEMA DE HISTÓRICO
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. CRIAR TABELA DE HISTÓRICO
CREATE TABLE IF NOT EXISTS lead_history (
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

-- 2. CRIAR TABELA DE COMENTÁRIOS
CREATE TABLE IF NOT EXISTS lead_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  user_id UUID,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR TABELA DE FEEDBACKS
CREATE TABLE IF NOT EXISTS lead_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  user_id UUID,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_created_at ON lead_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_history_action ON lead_history(action);

CREATE INDEX IF NOT EXISTS idx_lead_comments_lead_id ON lead_comments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_comments_created_at ON lead_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_comments_user_id ON lead_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_lead_feedbacks_lead_id ON lead_feedbacks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_feedbacks_created_at ON lead_feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_feedbacks_user_id ON lead_feedbacks(user_id);

-- 5. CONFIGURAR RLS (Row Level Security)
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_feedbacks ENABLE ROW LEVEL SECURITY;

-- 6. CRIAR POLÍTICAS PERMISSIVAS (para funcionar durante desenvolvimento)
DROP POLICY IF EXISTS "lead_history_access" ON lead_history;
CREATE POLICY "lead_history_access" ON lead_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lead_comments_access" ON lead_comments;
CREATE POLICY "lead_comments_access" ON lead_comments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lead_feedbacks_access" ON lead_feedbacks;
CREATE POLICY "lead_feedbacks_access" ON lead_feedbacks FOR ALL USING (true) WITH CHECK (true);

-- 7. FUNÇÃO AUXILIAR PARA REGISTRAR HISTÓRICO
CREATE OR REPLACE FUNCTION register_history_entry(
  p_lead_id UUID,
  p_action TEXT,
  p_description TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  history_id UUID;
BEGIN
  INSERT INTO lead_history (
    lead_id,
    action,
    description,
    user_id,
    user_name,
    created_at
  ) VALUES (
    p_lead_id,
    p_action,
    p_description,
    p_user_id,
    COALESCE(p_user_name, 'Sistema'),
    NOW()
  ) RETURNING id INTO history_id;
  
  RETURN history_id;
END;
$$ LANGUAGE plpgsql;

-- 8. TESTE DO SISTEMA
DO $$
DECLARE
  test_lead_id UUID := gen_random_uuid();
  test_user_id UUID := gen_random_uuid();
  history_id UUID;
  comment_id UUID;
  feedback_id UUID;
BEGIN
  RAISE NOTICE '🧪 Iniciando testes do sistema de histórico...';
  
  -- Inserir teste no histórico
  INSERT INTO lead_history (
    lead_id, action, description, user_id, user_name, old_values, new_values
  ) VALUES (
    test_lead_id, 'test_action', 'Teste do sistema', test_user_id, 'Usuario Teste', '{}', '{"status": "ok"}'
  ) RETURNING id INTO history_id;
  
  -- Inserir teste nos comentários
  INSERT INTO lead_comments (
    lead_id, user_id, message
  ) VALUES (
    test_lead_id, test_user_id, 'Comentario de teste'
  ) RETURNING id INTO comment_id;
  
  -- Inserir teste nos feedbacks
  INSERT INTO lead_feedbacks (
    lead_id, user_id, message
  ) VALUES (
    test_lead_id, test_user_id, 'Feedback de teste'
  ) RETURNING id INTO feedback_id;
  
  -- Testar função auxiliar
  SELECT register_history_entry(
    test_lead_id, 
    'function_test', 
    'Teste da função auxiliar',
    test_user_id,
    'Função Teste'
  ) INTO history_id;
  
  -- Verificar se funcionou
  IF history_id IS NOT NULL AND comment_id IS NOT NULL AND feedback_id IS NOT NULL THEN
    RAISE NOTICE '✅ Todas as tabelas criadas e funcionando!';
    RAISE NOTICE 'Comment ID: %', comment_id;
    RAISE NOTICE 'Feedback ID: %', feedback_id;
    RAISE NOTICE 'History ID (função): %', history_id;
  ELSE
    RAISE NOTICE '❌ Erro na criação das tabelas';
  END IF;
  
  -- Limpar testes
  DELETE FROM lead_history WHERE lead_id = test_lead_id;
  DELETE FROM lead_comments WHERE lead_id = test_lead_id;
  DELETE FROM lead_feedbacks WHERE lead_id = test_lead_id;
  
  RAISE NOTICE '🗑️ Dados de teste removidos';
  RAISE NOTICE '🎉 Sistema de histórico configurado com sucesso!';
END $$;

-- 9. VERIFICAR ESTRUTURA FINAL
SELECT 'VERIFICAÇÃO DE TABELAS' as status;

SELECT 'lead_history' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lead_history' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'lead_comments' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lead_comments' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'lead_feedbacks' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'lead_feedbacks' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 10. VERIFICAR POLÍTICAS
SELECT 'POLÍTICAS RLS' as status;
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('lead_history', 'lead_comments', 'lead_feedbacks')
ORDER BY tablename, policyname;

-- 11. CONTAGEM FINAL
SELECT 'CONTAGEM DE REGISTROS' as status;
SELECT 
  (SELECT COUNT(*) FROM lead_history) as total_history,
  (SELECT COUNT(*) FROM lead_comments) as total_comments,
  (SELECT COUNT(*) FROM lead_feedbacks) as total_feedbacks;

-- 12. VERIFICAR SE AS TABELAS EXISTEM
SELECT 'VERIFICAÇÃO DE EXISTÊNCIA' as status;
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name IN ('lead_history', 'lead_comments', 'lead_feedbacks') 
  AND table_schema = 'public'
ORDER BY table_name; 