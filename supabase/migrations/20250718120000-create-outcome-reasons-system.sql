-- ============================================
-- 🔧 MIGRATION: Sistema de Motivos de Ganho/Perda
-- ============================================
-- 
-- Cria estrutura completa compatível com API existente
-- AIDEV-NOTE: Migration preserva dados existentes da pipeline_win_loss_reasons
-- 
-- Data: 2025-01-18
-- Versão: 1.0.0
-- ============================================

-- 📋 ETAPA 1: Criar tabela principal pipeline_outcome_reasons
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_outcome_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  reason_type varchar(10) NOT NULL CHECK (reason_type IN ('won', 'lost', 'loss', 'win')),
  reason_text varchar(200) NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_reason_per_pipeline_type UNIQUE (pipeline_id, tenant_id, reason_text, reason_type)
);

-- 📋 ETAPA 2: Criar tabela de histórico lead_outcome_history  
-- ============================================

CREATE TABLE IF NOT EXISTS lead_outcome_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  outcome_type varchar(10) NOT NULL CHECK (outcome_type IN ('won', 'lost', 'loss', 'win')),
  reason_id uuid REFERENCES pipeline_outcome_reasons(id) ON DELETE SET NULL,
  reason_text varchar(500) NOT NULL,
  notes text,
  applied_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_outcome_type CHECK (outcome_type IN ('won', 'lost', 'loss', 'win'))
);

-- 📋 ETAPA 3: Migrar dados existentes de pipeline_win_loss_reasons
-- ============================================

-- Primeiro, obter tenant_id para cada pipeline
INSERT INTO pipeline_outcome_reasons (
  pipeline_id,
  tenant_id, 
  reason_type,
  reason_text,
  display_order,
  is_active,
  created_at,
  updated_at
)
SELECT 
  old.pipeline_id,
  p.tenant_id,  -- Buscar tenant_id da tabela pipelines
  old.reason_type,
  old.reason_name as reason_text,
  ROW_NUMBER() OVER (PARTITION BY old.pipeline_id, old.reason_type ORDER BY old.created_at) - 1 as display_order,
  COALESCE(old.is_active, true) as is_active,
  old.created_at,
  old.updated_at
FROM pipeline_win_loss_reasons old
INNER JOIN pipelines p ON p.id = old.pipeline_id
WHERE NOT EXISTS (
  -- Evitar duplicatas se migration for rodada novamente
  SELECT 1 FROM pipeline_outcome_reasons new 
  WHERE new.pipeline_id = old.pipeline_id 
  AND new.reason_text = old.reason_name 
  AND new.reason_type = old.reason_type
);

-- 📋 ETAPA 4: Criar índices para performance
-- ============================================

-- Índices para pipeline_outcome_reasons
CREATE INDEX IF NOT EXISTS idx_pipeline_outcome_reasons_pipeline_tenant 
  ON pipeline_outcome_reasons(pipeline_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_outcome_reasons_type_order 
  ON pipeline_outcome_reasons(reason_type, display_order);

CREATE INDEX IF NOT EXISTS idx_pipeline_outcome_reasons_tenant_active 
  ON pipeline_outcome_reasons(tenant_id, is_active);

-- Índices para lead_outcome_history  
CREATE INDEX IF NOT EXISTS idx_lead_outcome_history_lead_tenant 
  ON lead_outcome_history(lead_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_lead_outcome_history_pipeline_tenant 
  ON lead_outcome_history(pipeline_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_lead_outcome_history_created_at 
  ON lead_outcome_history(created_at DESC);

-- 📋 ETAPA 5: Row Level Security (RLS)
-- ============================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE pipeline_outcome_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_outcome_history ENABLE ROW LEVEL SECURITY;

-- Políticas para pipeline_outcome_reasons
CREATE POLICY "Users can view outcome reasons for their tenant" 
  ON pipeline_outcome_reasons 
  FOR SELECT 
  USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Admins can manage outcome reasons for their tenant" 
  ON pipeline_outcome_reasons 
  FOR ALL 
  USING (
    tenant_id = auth.jwt() ->> 'tenant_id' 
    AND auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- Políticas para lead_outcome_history
CREATE POLICY "Users can view outcome history for their tenant" 
  ON lead_outcome_history 
  FOR SELECT 
  USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Users can create outcome history for their tenant" 
  ON lead_outcome_history 
  FOR INSERT 
  WITH CHECK (
    tenant_id = auth.jwt() ->> 'tenant_id'
    AND auth.jwt() ->> 'role' IN ('admin', 'member', 'super_admin')
  );

-- 📋 ETAPA 6: Triggers para updated_at
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para pipeline_outcome_reasons
CREATE TRIGGER update_pipeline_outcome_reasons_updated_at
  BEFORE UPDATE ON pipeline_outcome_reasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 📋 ETAPA 7: Funções auxiliares para API
-- ============================================

-- Função para buscar motivos de um pipeline
CREATE OR REPLACE FUNCTION get_pipeline_outcome_reasons(
  p_pipeline_id uuid,
  p_reason_type text DEFAULT 'all',
  p_active_only boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  pipeline_id uuid,
  tenant_id text,
  reason_type varchar,
  reason_text varchar,
  display_order integer,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.pipeline_id,
    r.tenant_id,
    r.reason_type,
    r.reason_text,
    r.display_order,
    r.is_active,
    r.created_at,
    r.updated_at
  FROM pipeline_outcome_reasons r
  WHERE r.pipeline_id = p_pipeline_id
    AND r.tenant_id = auth.jwt() ->> 'tenant_id'
    AND (p_reason_type = 'all' OR r.reason_type = p_reason_type)
    AND (NOT p_active_only OR r.is_active = true)
  ORDER BY r.reason_type, r.display_order;
END;
$$;

-- Função para buscar histórico de um lead
CREATE OR REPLACE FUNCTION get_lead_outcome_history(
  p_lead_id uuid
)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  pipeline_id uuid,
  tenant_id text,
  outcome_type varchar,
  reason_id uuid,
  reason_text varchar,
  notes text,
  applied_by uuid,
  applied_by_name text,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER  
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.lead_id,
    h.pipeline_id,
    h.tenant_id,
    h.outcome_type,
    h.reason_id,
    h.reason_text,
    h.notes,
    h.applied_by,
    COALESCE(u.first_name || ' ' || u.last_name, 'Usuário') as applied_by_name,
    h.created_at
  FROM lead_outcome_history h
  LEFT JOIN auth.users u ON u.id = h.applied_by
  WHERE h.lead_id = p_lead_id
    AND h.tenant_id = auth.jwt() ->> 'tenant_id'
  ORDER BY h.created_at DESC;
END;
$$;

-- 📋 ETAPA 8: Comentários e documentação
-- ============================================

COMMENT ON TABLE pipeline_outcome_reasons IS 'Motivos configuráveis de ganho/perda por pipeline com suporte multi-tenant';
COMMENT ON TABLE lead_outcome_history IS 'Histórico de aplicação de motivos aos leads com audit trail completo';

COMMENT ON COLUMN pipeline_outcome_reasons.reason_type IS 'Tipo do motivo: won (ganho) ou lost (perda)';
COMMENT ON COLUMN pipeline_outcome_reasons.display_order IS 'Ordem de exibição dos motivos na interface';
COMMENT ON COLUMN lead_outcome_history.reason_id IS 'Referência ao motivo configurado (nullable para motivos personalizados)';
COMMENT ON COLUMN lead_outcome_history.reason_text IS 'Texto do motivo (obrigatório mesmo com reason_id para histórico)';

-- 📋 FINALIZAÇÃO
-- ============================================

-- Verificar se migration foi bem-sucedida
DO $$
DECLARE
  migrated_count INTEGER;
  original_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO original_count FROM pipeline_win_loss_reasons;
  SELECT COUNT(*) INTO migrated_count FROM pipeline_outcome_reasons;
  
  RAISE NOTICE 'Migration concluída: % registros originais, % registros migrados', original_count, migrated_count;
  
  IF migrated_count = 0 AND original_count > 0 THEN
    RAISE WARNING 'Nenhum registro foi migrado! Verificar se tabela pipelines existe e tem tenant_id.';
  END IF;
END;
$$;