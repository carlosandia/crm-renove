-- =====================================================================================
-- MIGRATION: Sistema de Valores Flexíveis para CRM
-- Autor: Claude (Arquiteto Sênior)
-- Data: 2025-08-03
-- Descrição: Adiciona suporte para valores únicos, recorrentes e híbridos
-- =====================================================================================

BEGIN;

-- 1. Adicionar novos campos na tabela pipeline_leads
ALTER TABLE pipeline_leads 
ADD COLUMN IF NOT EXISTS valor_unico DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS valor_unico_moeda VARCHAR(3) DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS valor_recorrente DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS valor_recorrente_moeda VARCHAR(3) DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS recorrencia_periodo INTEGER,
ADD COLUMN IF NOT EXISTS recorrencia_unidade VARCHAR(10) DEFAULT 'mes',
ADD COLUMN IF NOT EXISTS valor_total_calculado DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS tipo_venda VARCHAR(20) DEFAULT 'unico',
ADD COLUMN IF NOT EXISTS valor_observacoes TEXT;

-- 2. Migrar dados existentes do campo 'valor' para 'valor_unico'
UPDATE pipeline_leads 
SET 
  valor_unico = CASE 
    WHEN valor IS NOT NULL AND valor != '' THEN 
      CAST(REPLACE(REPLACE(REPLACE(valor, 'R$', ''), '.', ''), ',', '.') AS DECIMAL(15,2))
    ELSE NULL 
  END,
  tipo_venda = 'unico'
WHERE valor IS NOT NULL AND valor != '';

-- 3. Criar função para cálculo automático de valores
CREATE OR REPLACE FUNCTION calculate_deal_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular valor total baseado nos campos específicos
  NEW.valor_total_calculado := 
    COALESCE(NEW.valor_unico, 0) + 
    (COALESCE(NEW.valor_recorrente, 0) * COALESCE(NEW.recorrencia_periodo, 0));
  
  -- Determinar tipo de venda automaticamente
  IF NEW.valor_unico > 0 AND (NEW.valor_recorrente > 0 AND NEW.recorrencia_periodo > 0) THEN
    NEW.tipo_venda := 'hibrido';
  ELSIF NEW.valor_recorrente > 0 AND NEW.recorrencia_periodo > 0 THEN
    NEW.tipo_venda := 'recorrente';  
  ELSIF NEW.valor_unico > 0 THEN
    NEW.tipo_venda := 'unico';
  ELSE
    NEW.tipo_venda := 'unico'; -- Default para novos registros
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar trigger para execução automática
DROP TRIGGER IF EXISTS deal_value_calculation ON pipeline_leads;
CREATE TRIGGER deal_value_calculation
  BEFORE INSERT OR UPDATE ON pipeline_leads
  FOR EACH ROW 
  EXECUTE FUNCTION calculate_deal_total();

-- 5. Atualizar registros existentes com o cálculo inicial
UPDATE pipeline_leads SET updated_at = updated_at;

-- 6. Adicionar comentários para documentação
COMMENT ON COLUMN pipeline_leads.valor_unico IS 'Valor de venda única (ex: R$ 40.000)';
COMMENT ON COLUMN pipeline_leads.valor_recorrente IS 'Valor mensal/anual recorrente (ex: R$ 1.500/mês)';
COMMENT ON COLUMN pipeline_leads.recorrencia_periodo IS 'Período da recorrência em unidades (ex: 6 meses)';
COMMENT ON COLUMN pipeline_leads.recorrencia_unidade IS 'Unidade do período: mes, ano';
COMMENT ON COLUMN pipeline_leads.valor_total_calculado IS 'Valor total calculado automaticamente';
COMMENT ON COLUMN pipeline_leads.tipo_venda IS 'Tipo: unico, recorrente, hibrido';
COMMENT ON COLUMN pipeline_leads.valor_observacoes IS 'Observações sobre valores e condições';

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_tipo_venda ON pipeline_leads(tipo_venda);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_valor_total ON pipeline_leads(valor_total_calculado);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_valor_unico ON pipeline_leads(valor_unico);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_valor_recorrente ON pipeline_leads(valor_recorrente);

-- 8. Criar função utilitária para formatação de valores
CREATE OR REPLACE FUNCTION format_deal_value(
  valor_unico DECIMAL(15,2),
  valor_recorrente DECIMAL(15,2),
  recorrencia_periodo INTEGER,
  recorrencia_unidade VARCHAR(10)
)
RETURNS TEXT AS $$
DECLARE
  resultado TEXT := '';
BEGIN
  -- Valor único
  IF valor_unico > 0 THEN
    resultado := 'R$ ' || TO_CHAR(valor_unico, 'FM999G999G999D00');
  END IF;
  
  -- Valor recorrente
  IF valor_recorrente > 0 AND recorrencia_periodo > 0 THEN
    IF resultado != '' THEN
      resultado := resultado || ' + ';
    END IF;
    
    resultado := resultado || 'R$ ' || TO_CHAR(valor_recorrente, 'FM999G999G999D00') || 
                 '/' || recorrencia_unidade || ' por ' || recorrencia_periodo || ' ' || 
                 CASE WHEN recorrencia_unidade = 'mes' THEN 'meses' ELSE 'anos' END;
  END IF;
  
  -- Fallback
  IF resultado = '' THEN
    resultado := 'Valor não definido';
  END IF;
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 9. Atualizar políticas RLS se necessário (manter as existentes)
-- As políticas RLS existentes para pipeline_leads devem continuar funcionando
-- pois os novos campos são apenas adições à tabela

COMMIT;

-- =====================================================================================
-- VERIFICAÇÃO: Execute estas queries para verificar se a migration foi aplicada
-- =====================================================================================
-- SELECT COUNT(*) FROM pipeline_leads WHERE tipo_venda IS NOT NULL;
-- SELECT tipo_venda, COUNT(*) FROM pipeline_leads GROUP BY tipo_venda;
-- SELECT * FROM pipeline_leads WHERE valor_total_calculado > 0 LIMIT 5;