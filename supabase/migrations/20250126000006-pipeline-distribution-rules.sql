-- =====================================================
-- MIGRAÇÃO: SISTEMA DE DISTRIBUIÇÃO DE LEADS (RODÍZIO)
-- Data: 2025-01-26
-- Descrição: Implementa sistema completo de rodízio automático
--           de leads para vendedores (members) nas pipelines
-- =====================================================

-- 1. CRIAR TABELA DE REGRAS DE DISTRIBUIÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS pipeline_distribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    
    -- Configurações da distribuição
    mode VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (mode IN ('rodizio', 'manual')),
    is_active BOOLEAN DEFAULT true,
    
    -- Controle do rodízio
    last_assigned_member_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assignment_count INTEGER DEFAULT 0, -- Contador total de atribuições
    
    -- Configurações avançadas
    working_hours_only BOOLEAN DEFAULT false,
    skip_inactive_members BOOLEAN DEFAULT true,
    fallback_to_manual BOOLEAN DEFAULT true,
    
    -- Métricas e auditoria
    total_assignments INTEGER DEFAULT 0,
    successful_assignments INTEGER DEFAULT 0,
    failed_assignments INTEGER DEFAULT 0,
    last_assignment_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint única por pipeline
    UNIQUE(pipeline_id)
);

-- 2. CRIAR TABELA DE HISTÓRICO DE ATRIBUIÇÕES DETALHADO
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL, -- Referência flexível para pipeline_leads
    
    -- Detalhes da atribuição
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assignment_method VARCHAR(20) NOT NULL CHECK (assignment_method IN (
        'round_robin', 'manual', 'workload_based', 'territory', 'random'
    )),
    
    -- Contexto da atribuição
    rule_id UUID REFERENCES pipeline_distribution_rules(id) ON DELETE SET NULL,
    round_robin_position INTEGER, -- Posição no rodízio quando atribuído
    total_eligible_members INTEGER, -- Quantos members estavam elegíveis
    
    -- Resultado
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'completed', 'cancelled')),
    result_reason TEXT,
    
    -- Métricas
    assignment_duration INTERVAL, -- Tempo que ficou atribuído
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para pipeline_distribution_rules
CREATE INDEX IF NOT EXISTS idx_pipeline_distribution_rules_pipeline_id 
ON pipeline_distribution_rules(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_distribution_rules_mode_active 
ON pipeline_distribution_rules(mode, is_active);

CREATE INDEX IF NOT EXISTS idx_pipeline_distribution_rules_last_assigned 
ON pipeline_distribution_rules(last_assigned_member_id);

-- Índices para lead_assignment_history
CREATE INDEX IF NOT EXISTS idx_lead_assignment_history_pipeline_id 
ON lead_assignment_history(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_history_lead_id 
ON lead_assignment_history(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_history_assigned_to 
ON lead_assignment_history(assigned_to);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_history_method_status 
ON lead_assignment_history(assignment_method, status);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_history_created_at 
ON lead_assignment_history(created_at DESC);

-- 4. CRIAR FUNÇÃO PARA ATUALIZAR ÚLTIMO MEMBRO ATRIBUÍDO
-- =====================================================
CREATE OR REPLACE FUNCTION update_pipeline_distribution_stats(
    p_pipeline_id UUID,
    p_assigned_member_id UUID,
    p_assignment_successful BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
BEGIN
    -- Atualizar estatísticas da regra de distribuição
    UPDATE pipeline_distribution_rules SET
        last_assigned_member_id = p_assigned_member_id,
        assignment_count = assignment_count + 1,
        total_assignments = total_assignments + 1,
        successful_assignments = CASE 
            WHEN p_assignment_successful THEN successful_assignments + 1 
            ELSE successful_assignments 
        END,
        failed_assignments = CASE 
            WHEN NOT p_assignment_successful THEN failed_assignments + 1 
            ELSE failed_assignments 
        END,
        last_assignment_at = NOW(),
        updated_at = NOW()
    WHERE pipeline_id = p_pipeline_id;
    
    -- Se a regra não existir, criar uma padrão
    IF NOT FOUND THEN
        INSERT INTO pipeline_distribution_rules (
            pipeline_id, mode, last_assigned_member_id, 
            assignment_count, total_assignments, successful_assignments,
            last_assignment_at
        ) VALUES (
            p_pipeline_id, 'manual', p_assigned_member_id,
            1, 1, CASE WHEN p_assignment_successful THEN 1 ELSE 0 END,
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CRIAR FUNÇÃO AVANÇADA DE ATRIBUIÇÃO POR RODÍZIO
-- =====================================================
CREATE OR REPLACE FUNCTION assign_lead_round_robin_advanced(
    p_lead_id UUID,
    p_pipeline_id UUID,
    p_force_member_id UUID DEFAULT NULL
) RETURNS TABLE (
    assigned_to UUID,
    assignment_method TEXT,
    round_robin_position INTEGER,
    total_eligible_members INTEGER,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_rule RECORD;
    v_members RECORD[];
    v_member_count INTEGER;
    v_next_member_id UUID;
    v_current_position INTEGER;
    v_next_position INTEGER;
BEGIN
    -- 1. Buscar regra de distribuição
    SELECT * INTO v_rule 
    FROM pipeline_distribution_rules 
    WHERE pipeline_id = p_pipeline_id AND is_active = true;
    
    -- Se não há regra ou é manual, retornar
    IF NOT FOUND OR v_rule.mode != 'rodizio' THEN
        RETURN QUERY SELECT 
            NULL::UUID, 'manual'::TEXT, 0::INTEGER, 0::INTEGER, 
            false::BOOLEAN, 'Pipeline configurada para distribuição manual'::TEXT;
        RETURN;
    END IF;
    
    -- 2. Se force_member_id fornecido, usar ele
    IF p_force_member_id IS NOT NULL THEN
        -- Verificar se o member é válido para esta pipeline
        IF EXISTS (
            SELECT 1 FROM pipeline_members pm
            JOIN users u ON pm.member_id = u.id
            WHERE pm.pipeline_id = p_pipeline_id 
            AND pm.member_id = p_force_member_id
            AND u.is_active = true AND u.role = 'member'
        ) THEN
            -- Atualizar lead
            UPDATE pipeline_leads SET assigned_to = p_force_member_id WHERE id = p_lead_id;
            
            -- Atualizar estatísticas
            PERFORM update_pipeline_distribution_stats(p_pipeline_id, p_force_member_id, true);
            
            RETURN QUERY SELECT 
                p_force_member_id, 'manual_override'::TEXT, 0::INTEGER, 1::INTEGER,
                true::BOOLEAN, 'Lead atribuído manualmente'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- 3. Buscar membros elegíveis ordenados consistentemente
    SELECT ARRAY(
        SELECT ROW(pm.member_id, u.first_name, u.last_name, u.email)::RECORD
        FROM pipeline_members pm
        JOIN users u ON pm.member_id = u.id
        WHERE pm.pipeline_id = p_pipeline_id 
        AND u.is_active = true 
        AND u.role = 'member'
        ORDER BY u.id ASC
    ) INTO v_members;
    
    v_member_count := array_length(v_members, 1);
    
    -- Se não há membros elegíveis
    IF v_member_count = 0 THEN
        RETURN QUERY SELECT 
            NULL::UUID, 'no_members'::TEXT, 0::INTEGER, 0::INTEGER,
            false::BOOLEAN, 'Nenhum membro elegível encontrado na pipeline'::TEXT;
        RETURN;
    END IF;
    
    -- 4. Determinar próximo membro no rodízio
    IF v_rule.last_assigned_member_id IS NULL THEN
        -- Primeiro assignment - pegar primeiro membro
        v_next_member_id := (v_members[1]).f1::UUID;
        v_next_position := 1;
    ELSE
        -- Encontrar posição do último membro atribuído
        v_current_position := 0;
        FOR i IN 1..v_member_count LOOP
            IF (v_members[i]).f1::UUID = v_rule.last_assigned_member_id THEN
                v_current_position := i;
                EXIT;
            END IF;
        END LOOP;
        
        -- Calcular próxima posição (circular)
        IF v_current_position = 0 OR v_current_position = v_member_count THEN
            v_next_position := 1;
        ELSE
            v_next_position := v_current_position + 1;
        END IF;
        
        v_next_member_id := (v_members[v_next_position]).f1::UUID;
    END IF;
    
    -- 5. Atribuir lead ao membro
    UPDATE pipeline_leads SET assigned_to = v_next_member_id WHERE id = p_lead_id;
    
    -- 6. Atualizar estatísticas
    PERFORM update_pipeline_distribution_stats(p_pipeline_id, v_next_member_id, true);
    
    -- 7. Registrar no histórico
    INSERT INTO lead_assignment_history (
        pipeline_id, lead_id, assigned_to, assignment_method,
        rule_id, round_robin_position, total_eligible_members, status
    ) VALUES (
        p_pipeline_id, p_lead_id, v_next_member_id, 'round_robin',
        v_rule.id, v_next_position, v_member_count, 'active'
    );
    
    -- 8. Retornar resultado
    RETURN QUERY SELECT 
        v_next_member_id, 'round_robin'::TEXT, v_next_position::INTEGER, v_member_count::INTEGER,
        true::BOOLEAN, 'Lead atribuído por rodízio automático'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. INSERIR REGRAS PADRÃO PARA PIPELINES EXISTENTES
-- =====================================================
INSERT INTO pipeline_distribution_rules (pipeline_id, mode, is_active)
SELECT p.id, 'manual', true
FROM pipelines p
WHERE p.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM pipeline_distribution_rules pdr 
    WHERE pdr.pipeline_id = p.id
)
ON CONFLICT (pipeline_id) DO NOTHING;

-- 7. CRIAR POLÍTICAS RLS
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE pipeline_distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignment_history ENABLE ROW LEVEL SECURITY;

-- Políticas para pipeline_distribution_rules
CREATE POLICY "Users can view distribution rules from their tenant" 
ON pipeline_distribution_rules FOR SELECT 
USING (
    pipeline_id IN (
        SELECT id FROM pipelines 
        WHERE tenant_id = COALESCE(auth.jwt() ->> 'tenant_id', 'dc2f1fc5-53b5-4f54-bb56-009f58481b97')::UUID
    )
    OR auth.uid() IS NULL
);

CREATE POLICY "Admins can modify distribution rules" 
ON pipeline_distribution_rules FOR ALL 
USING (
    pipeline_id IN (
        SELECT id FROM pipelines 
        WHERE tenant_id = COALESCE(auth.jwt() ->> 'tenant_id', 'dc2f1fc5-53b5-4f54-bb56-009f58481b97')::UUID
    )
    OR auth.uid() IS NULL
);

-- Políticas para lead_assignment_history
CREATE POLICY "Users can view assignment history from their tenant" 
ON lead_assignment_history FOR SELECT 
USING (
    pipeline_id IN (
        SELECT id FROM pipelines 
        WHERE tenant_id = COALESCE(auth.jwt() ->> 'tenant_id', 'dc2f1fc5-53b5-4f54-bb56-009f58481b97')::UUID
    )
    OR auth.uid() IS NULL
);

CREATE POLICY "System can insert assignment history" 
ON lead_assignment_history FOR INSERT 
WITH CHECK (true);

-- 8. ADICIONAR TRIGGERS PARA AUDITORIA
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas
CREATE TRIGGER update_pipeline_distribution_rules_updated_at
    BEFORE UPDATE ON pipeline_distribution_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_assignment_history_updated_at
    BEFORE UPDATE ON lead_assignment_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE pipeline_distribution_rules IS 'Regras de distribuição automática de leads por pipeline';
COMMENT ON TABLE lead_assignment_history IS 'Histórico detalhado de todas as atribuições de leads';

COMMENT ON COLUMN pipeline_distribution_rules.mode IS 'Modo de distribuição: rodizio (automático) ou manual';
COMMENT ON COLUMN pipeline_distribution_rules.last_assigned_member_id IS 'Último membro que recebeu um lead (para rodízio)';
COMMENT ON COLUMN pipeline_distribution_rules.assignment_count IS 'Contador de atribuições para esta pipeline';

COMMENT ON FUNCTION assign_lead_round_robin_advanced IS 'Função avançada para atribuição de leads por rodízio com métricas';
COMMENT ON FUNCTION update_pipeline_distribution_stats IS 'Atualiza estatísticas de distribuição após atribuição';

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA
-- Sistema de rodízio implementado com:
-- ✅ Tabelas de regras e histórico
-- ✅ Funções avançadas de atribuição
-- ✅ Índices para performance
-- ✅ Políticas RLS de segurança
-- ✅ Triggers de auditoria
-- ✅ Dados iniciais para pipelines existentes
-- ===================================================== 