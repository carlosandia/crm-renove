-- ============================================
-- VERIFICAÇÃO E CRIAÇÃO SIMPLES DA TABELA LEAD_HISTORY
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Verificar se a tabela existe
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'lead_history' AND table_schema = 'public';

-- Se não aparecer nenhum resultado acima, execute os comandos abaixo:

-- Criar tabela lead_history
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

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_created_at ON lead_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_history_action ON lead_history(action);

-- Configurar RLS
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;

-- Criar política permissiva
DROP POLICY IF EXISTS "lead_history_access" ON lead_history;
CREATE POLICY "lead_history_access" ON lead_history FOR ALL USING (true) WITH CHECK (true);

-- Inserir um teste simples
INSERT INTO lead_history (
  lead_id,
  action,
  description,
  user_name,
  old_values,
  new_values
) VALUES (
  gen_random_uuid(),
  'system_test',
  'Teste de criação da tabela',
  'Sistema',
  '{}',
  '{"status": "created"}'
);

-- Verificar se funcionou
SELECT COUNT(*) as total_entries FROM lead_history;

-- Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'lead_history' 
ORDER BY ordinal_position;

-- Limpar teste
DELETE FROM lead_history WHERE action = 'system_test'; 