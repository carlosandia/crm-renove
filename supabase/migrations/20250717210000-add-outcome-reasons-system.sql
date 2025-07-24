-- ============================================
-- 🎯 SISTEMA DE MOTIVOS DE GANHO/PERDA
-- ============================================
-- 
-- Migration para adicionar sistema de motivos de ganho/perda
-- AIDEV-NOTE: Seguindo padrão numerado incremental do projeto
-- Data: 2025-07-17 21:00:00

-- ============================================
-- TABELA DE CONFIGURAÇÃO DE MOTIVOS
-- ============================================

CREATE TABLE pipeline_outcome_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  reason_type TEXT NOT NULL CHECK (reason_type IN ('won', 'lost')),
  reason_text TEXT NOT NULL CHECK (length(trim(reason_text)) > 0 AND length(reason_text) <= 200),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0 CHECK (display_order >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- AIDEV-NOTE: FK com CASCADE para integridade referencial
  CONSTRAINT fk_pipeline_outcome_reasons_pipeline 
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
);

-- ============================================
-- TABELA DE HISTÓRICO DE APLICAÇÃO
-- ============================================

CREATE TABLE lead_outcome_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  pipeline_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('won', 'lost')),
  reason_id UUID,
  reason_text TEXT NOT NULL CHECK (length(trim(reason_text)) > 0),
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 500),
  applied_by UUID NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- AIDEV-NOTE: FK com referências apropriadas para integridade
  CONSTRAINT fk_lead_outcome_history_lead 
    FOREIGN KEY (lead_id) REFERENCES pipeline_leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_outcome_history_reason 
    FOREIGN KEY (reason_id) REFERENCES pipeline_outcome_reasons(id) ON DELETE SET NULL
);

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE pipeline_outcome_reasons IS 'Configuração de motivos de ganho/perda por pipeline';
COMMENT ON COLUMN pipeline_outcome_reasons.reason_type IS 'Tipo do motivo: won (ganho) ou lost (perda)';
COMMENT ON COLUMN pipeline_outcome_reasons.reason_text IS 'Texto do motivo configurado pelo admin';
COMMENT ON COLUMN pipeline_outcome_reasons.display_order IS 'Ordem de exibição dos motivos na interface';

COMMENT ON TABLE lead_outcome_history IS 'Histórico de aplicação de motivos aos leads';
COMMENT ON COLUMN lead_outcome_history.outcome_type IS 'Tipo do resultado: won (ganho) ou lost (perda)';
COMMENT ON COLUMN lead_outcome_history.reason_id IS 'Referência ao motivo configurado (pode ser NULL se motivo foi deletado)';
COMMENT ON COLUMN lead_outcome_history.reason_text IS 'Backup do texto do motivo para preservar histórico';
COMMENT ON COLUMN lead_outcome_history.notes IS 'Observações adicionais do usuário';
COMMENT ON COLUMN lead_outcome_history.applied_by IS 'UUID do usuário que aplicou o motivo';

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices compostos para queries frequentes
CREATE INDEX idx_outcome_reasons_pipeline_tenant_type 
  ON pipeline_outcome_reasons(pipeline_id, tenant_id, reason_type);

CREATE INDEX idx_outcome_reasons_active_order 
  ON pipeline_outcome_reasons(is_active, display_order) 
  WHERE is_active = true;

CREATE INDEX idx_outcome_history_lead_tenant 
  ON lead_outcome_history(lead_id, tenant_id);

CREATE INDEX idx_outcome_history_pipeline_tenant_type 
  ON lead_outcome_history(pipeline_id, tenant_id, outcome_type);

CREATE INDEX idx_outcome_history_applied_at 
  ON lead_outcome_history(applied_at DESC);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para pipeline_outcome_reasons
CREATE TRIGGER update_pipeline_outcome_reasons_updated_at 
  BEFORE UPDATE ON pipeline_outcome_reasons 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- AIDEV-NOTE: RLS obrigatório para isolamento multi-tenant
ALTER TABLE pipeline_outcome_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_outcome_history ENABLE ROW LEVEL SECURITY;

-- Políticas para pipeline_outcome_reasons
CREATE POLICY "tenant_isolation_outcome_reasons" 
  ON pipeline_outcome_reasons
  FOR ALL 
  TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);

-- Políticas para lead_outcome_history  
CREATE POLICY "tenant_isolation_outcome_history" 
  ON lead_outcome_history
  FOR ALL 
  TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para buscar motivos de um pipeline
CREATE OR REPLACE FUNCTION get_pipeline_outcome_reasons(
  p_pipeline_id UUID,
  p_reason_type TEXT DEFAULT 'all',
  p_active_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  pipeline_id UUID,
  tenant_id UUID,
  reason_type TEXT,
  reason_text TEXT,
  is_active BOOLEAN,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    por.id,
    por.pipeline_id,
    por.tenant_id,
    por.reason_type,
    por.reason_text,
    por.is_active,
    por.display_order,
    por.created_at,
    por.updated_at
  FROM pipeline_outcome_reasons por
  WHERE por.pipeline_id = p_pipeline_id
    AND por.tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    AND (p_reason_type = 'all' OR por.reason_type = p_reason_type)
    AND (NOT p_active_only OR por.is_active = true)
  ORDER BY por.display_order ASC, por.created_at ASC;
END;
$$;

-- Função para buscar histórico de um lead
CREATE OR REPLACE FUNCTION get_lead_outcome_history(p_lead_id UUID)
RETURNS TABLE (
  id UUID,
  lead_id UUID,
  pipeline_id UUID,
  tenant_id UUID,
  outcome_type TEXT,
  reason_id UUID,
  reason_text TEXT,
  notes TEXT,
  applied_by UUID,
  applied_at TIMESTAMP WITH TIME ZONE,
  applied_by_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    loh.id,
    loh.lead_id,
    loh.pipeline_id,
    loh.tenant_id,
    loh.outcome_type,
    loh.reason_id,
    loh.reason_text,
    loh.notes,
    loh.applied_by,
    loh.applied_at,
    COALESCE(u.first_name || ' ' || u.last_name, 'Usuário desconhecido') as applied_by_name
  FROM lead_outcome_history loh
  LEFT JOIN auth.users u ON u.id = loh.applied_by
  WHERE loh.lead_id = p_lead_id
    AND loh.tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
  ORDER BY loh.applied_at DESC;
END;
$$;

-- ============================================
-- GRANTS DE PERMISSÃO
-- ============================================

-- Permitir execução das funções para usuários autenticados
GRANT EXECUTE ON FUNCTION get_pipeline_outcome_reasons TO authenticated;
GRANT EXECUTE ON FUNCTION get_lead_outcome_history TO authenticated;

-- ============================================
-- INSERÇÃO DE DADOS PADRÃO (OPCIONAL)
-- ============================================

-- AIDEV-NOTE: Dados padrão podem ser inseridos via API quando pipeline é criado
-- Esta seção está comentada mas pode ser usada para seeds de desenvolvimento

/*
-- Exemplo de inserção de motivos padrão para desenvolvimento
INSERT INTO pipeline_outcome_reasons (pipeline_id, tenant_id, reason_type, reason_text, display_order)
VALUES 
  -- Motivos de ganho
  ('pipeline-id-exemplo', 'tenant-id-exemplo', 'won', 'Preço competitivo', 0),
  ('pipeline-id-exemplo', 'tenant-id-exemplo', 'won', 'Melhor proposta técnica', 1),
  ('pipeline-id-exemplo', 'tenant-id-exemplo', 'won', 'Relacionamento/confiança', 2),
  
  -- Motivos de perda  
  ('pipeline-id-exemplo', 'tenant-id-exemplo', 'lost', 'Preço muito alto', 0),
  ('pipeline-id-exemplo', 'tenant-id-exemplo', 'lost', 'Concorrente escolhido', 1),
  ('pipeline-id-exemplo', 'tenant-id-exemplo', 'lost', 'Não era o momento', 2);
*/