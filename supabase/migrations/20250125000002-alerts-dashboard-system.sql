-- =====================================================
-- MIGRAÇÃO: SISTEMA DE DASHBOARD DE ALERTAS
-- Data: 2025-01-25
-- Descrição: Implementa sistema de alertas inteligentes
--           para administradores monitorarem pipelines
-- =====================================================

-- 1. CRIAR TABELA DE CONFIGURAÇÕES DE ALERTAS
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    
    -- Configurações do alerta
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'temperature_critical',     -- Muitos leads gelados
        'stage_bottleneck',        -- Gargalo em etapa específica
        'conversion_drop',         -- Queda na conversão
        'inactive_members',        -- Vendedores inativos
        'overdue_tasks',          -- Tarefas em atraso
        'pipeline_stagnation',    -- Pipeline parada
        'lead_volume_drop',       -- Queda no volume de leads
        'follow_up_missed',       -- Follow-ups perdidos
        'temperature_trend',      -- Tendência de temperatura
        'custom_metric'           -- Métrica customizada
    )),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Condições para disparo
    trigger_conditions JSONB NOT NULL DEFAULT '{}',
    
    -- Configurações de notificação
    notification_channels JSONB DEFAULT '["dashboard"]', -- dashboard, email, webhook
    notification_frequency VARCHAR(20) DEFAULT 'immediate', -- immediate, hourly, daily
    
    -- Configurações visuais
    severity_level VARCHAR(20) DEFAULT 'medium' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    alert_color VARCHAR(20) DEFAULT '#f59e0b',
    alert_icon VARCHAR(50) DEFAULT '⚠️',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. CRIAR TABELA DE ALERTAS ATIVOS
-- =====================================================
CREATE TABLE IF NOT EXISTS active_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_config_id UUID NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    
    -- Status do alerta
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    
    -- Dados do alerta
    alert_title VARCHAR(500) NOT NULL,
    alert_message TEXT NOT NULL,
    alert_data JSONB DEFAULT '{}',
    
    -- Métricas relacionadas
    metric_value DECIMAL(10,2),
    metric_threshold DECIMAL(10,2),
    metric_unit VARCHAR(50),
    
    -- Ações sugeridas
    suggested_actions JSONB DEFAULT '[]',
    
    -- Timing
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Responsáveis
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_by UUID REFERENCES auth.users(id),
    dismissed_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR TABELA DE HISTÓRICO DE ALERTAS
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_id UUID NOT NULL REFERENCES active_alerts(id) ON DELETE CASCADE,
    
    -- Tipo de ação
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'triggered',
        'acknowledged', 
        'resolved',
        'dismissed',
        'escalated',
        'snoozed',
        'updated'
    )),
    
    -- Dados da ação
    action_message TEXT,
    action_data JSONB DEFAULT '{}',
    
    -- Responsável
    performed_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. FUNÇÃO PARA VERIFICAR ALERTAS DE TEMPERATURA
-- =====================================================
CREATE OR REPLACE FUNCTION check_temperature_alerts() RETURNS INTEGER AS $$
DECLARE
    config_record RECORD;
    pipeline_record RECORD;
    alert_count INTEGER := 0;
    frozen_count INTEGER;
    cold_count INTEGER;
    total_leads INTEGER;
    frozen_percentage DECIMAL;
    threshold_percentage DECIMAL;
    alert_id UUID;
BEGIN
    -- Para cada configuração de alerta de temperatura ativa
    FOR config_record IN 
        SELECT * FROM alert_configs 
        WHERE alert_type = 'temperature_critical' 
        AND is_active = true
    LOOP
        -- Obter thresholds da configuração
        threshold_percentage := COALESCE((config_record.trigger_conditions->>'frozen_percentage_threshold')::DECIMAL, 30.0);
        
        -- Para cada pipeline (ou todas se pipeline_id for NULL)
        FOR pipeline_record IN 
            SELECT p.* FROM pipelines p
            WHERE (config_record.pipeline_id IS NULL OR p.id = config_record.pipeline_id)
            AND p.tenant_id = config_record.tenant_id
        LOOP
            -- Contar leads por temperatura na etapa inicial
            SELECT 
                COUNT(*) FILTER (WHERE temperature_level = 'frozen') as frozen,
                COUNT(*) FILTER (WHERE temperature_level = 'cold') as cold,
                COUNT(*) as total
            INTO frozen_count, cold_count, total_leads
            FROM pipeline_leads pl
            JOIN pipeline_stages ps ON pl.stage_id = ps.id
            WHERE pl.pipeline_id = pipeline_record.id
            AND ps.name = 'Novos Leads'
            AND pl.initial_stage_entry_time IS NOT NULL;
            
            -- Calcular percentual de leads gelados
            IF total_leads > 0 THEN
                frozen_percentage := (frozen_count::DECIMAL / total_leads::DECIMAL) * 100;
                
                -- Verificar se deve disparar alerta
                IF frozen_percentage >= threshold_percentage THEN
                    -- Verificar se já existe alerta ativo
                    IF NOT EXISTS (
                        SELECT 1 FROM active_alerts 
                        WHERE alert_config_id = config_record.id 
                        AND pipeline_id = pipeline_record.id
                        AND status = 'active'
                    ) THEN
                        -- Criar novo alerta
                        INSERT INTO active_alerts (
                            alert_config_id,
                            tenant_id,
                            pipeline_id,
                            alert_title,
                            alert_message,
                            alert_data,
                            metric_value,
                            metric_threshold,
                            metric_unit,
                            suggested_actions
                        ) VALUES (
                            config_record.id,
                            config_record.tenant_id,
                            pipeline_record.id,
                            '🧊 Muitos Leads Gelados Detectados',
                            format('Pipeline "%s" tem %s%% dos leads na etapa inicial gelados (%s de %s leads)', 
                                pipeline_record.name, 
                                ROUND(frozen_percentage, 1),
                                frozen_count,
                                total_leads
                            ),
                            jsonb_build_object(
                                'pipeline_name', pipeline_record.name,
                                'frozen_count', frozen_count,
                                'cold_count', cold_count,
                                'total_leads', total_leads,
                                'frozen_percentage', frozen_percentage
                            ),
                            frozen_percentage,
                            threshold_percentage,
                            '%',
                            jsonb_build_array(
                                'Revisar configurações de temperatura da pipeline',
                                'Acelerar follow-up dos leads gelados',
                                'Verificar se vendedores estão ativos',
                                'Considerar reatribuir leads para outros vendedores'
                            )
                        ) RETURNING id INTO alert_id;
                        
                        -- Registrar no histórico
                        INSERT INTO alert_history (alert_id, action_type, action_message, action_data)
                        VALUES (
                            alert_id,
                            'triggered',
                            'Alerta disparado automaticamente pelo sistema',
                            jsonb_build_object(
                                'trigger_condition', 'frozen_percentage_threshold',
                                'threshold', threshold_percentage,
                                'actual_value', frozen_percentage
                            )
                        );
                        
                        alert_count := alert_count + 1;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNÇÃO PARA VERIFICAR ALERTAS DE GARGALO
-- =====================================================
CREATE OR REPLACE FUNCTION check_bottleneck_alerts() RETURNS INTEGER AS $$
DECLARE
    config_record RECORD;
    pipeline_record RECORD;
    stage_record RECORD;
    alert_count INTEGER := 0;
    stage_lead_count INTEGER;
    total_pipeline_leads INTEGER;
    stage_percentage DECIMAL;
    threshold_percentage DECIMAL;
    alert_id UUID;
BEGIN
    -- Para cada configuração de alerta de gargalo ativa
    FOR config_record IN 
        SELECT * FROM alert_configs 
        WHERE alert_type = 'stage_bottleneck' 
        AND is_active = true
    LOOP
        -- Obter threshold da configuração
        threshold_percentage := COALESCE((config_record.trigger_conditions->>'stage_percentage_threshold')::DECIMAL, 50.0);
        
        -- Para cada pipeline
        FOR pipeline_record IN 
            SELECT p.* FROM pipelines p
            WHERE (config_record.pipeline_id IS NULL OR p.id = config_record.pipeline_id)
            AND p.tenant_id = config_record.tenant_id
        LOOP
            -- Contar total de leads na pipeline
            SELECT COUNT(*) INTO total_pipeline_leads
            FROM pipeline_leads 
            WHERE pipeline_id = pipeline_record.id
            AND status = 'active';
            
            -- Para cada etapa da pipeline (exceto finais)
            FOR stage_record IN 
                SELECT * FROM pipeline_stages 
                WHERE pipeline_id = pipeline_record.id
                AND name NOT IN ('Ganho', 'Perdido')
                ORDER BY order_index
            LOOP
                -- Contar leads na etapa
                SELECT COUNT(*) INTO stage_lead_count
                FROM pipeline_leads 
                WHERE pipeline_id = pipeline_record.id
                AND stage_id = stage_record.id
                AND status = 'active';
                
                -- Calcular percentual
                IF total_pipeline_leads > 0 THEN
                    stage_percentage := (stage_lead_count::DECIMAL / total_pipeline_leads::DECIMAL) * 100;
                    
                    -- Verificar se deve disparar alerta
                    IF stage_percentage >= threshold_percentage AND stage_lead_count >= 5 THEN
                        -- Verificar se já existe alerta ativo
                        IF NOT EXISTS (
                            SELECT 1 FROM active_alerts 
                            WHERE alert_config_id = config_record.id 
                            AND pipeline_id = pipeline_record.id
                            AND alert_data->>'stage_id' = stage_record.id::text
                            AND status = 'active'
                        ) THEN
                            -- Criar novo alerta
                            INSERT INTO active_alerts (
                                alert_config_id,
                                tenant_id,
                                pipeline_id,
                                alert_title,
                                alert_message,
                                alert_data,
                                metric_value,
                                metric_threshold,
                                metric_unit,
                                suggested_actions
                            ) VALUES (
                                config_record.id,
                                config_record.tenant_id,
                                pipeline_record.id,
                                '🚧 Gargalo Detectado na Pipeline',
                                format('Etapa "%s" da pipeline "%s" concentra %s%% dos leads (%s de %s)', 
                                    stage_record.name,
                                    pipeline_record.name, 
                                    ROUND(stage_percentage, 1),
                                    stage_lead_count,
                                    total_pipeline_leads
                                ),
                                jsonb_build_object(
                                    'pipeline_name', pipeline_record.name,
                                    'stage_id', stage_record.id,
                                    'stage_name', stage_record.name,
                                    'stage_lead_count', stage_lead_count,
                                    'total_pipeline_leads', total_pipeline_leads,
                                    'stage_percentage', stage_percentage
                                ),
                                stage_percentage,
                                threshold_percentage,
                                '%',
                                jsonb_build_array(
                                    'Revisar processo da etapa ' || stage_record.name,
                                    'Verificar se vendedores precisam de treinamento',
                                    'Considerar dividir a etapa em sub-etapas',
                                    'Acelerar follow-up dos leads nesta etapa'
                                )
                            ) RETURNING id INTO alert_id;
                            
                            -- Registrar no histórico
                            INSERT INTO alert_history (alert_id, action_type, action_message, action_data)
                            VALUES (
                                alert_id,
                                'triggered',
                                'Alerta de gargalo disparado automaticamente',
                                jsonb_build_object(
                                    'stage_name', stage_record.name,
                                    'threshold', threshold_percentage,
                                    'actual_value', stage_percentage
                                )
                            );
                            
                            alert_count := alert_count + 1;
                        END IF;
                    END IF;
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- 6. FUNÇÃO PARA VERIFICAR ALERTAS DE VENDEDORES INATIVOS
-- =====================================================
CREATE OR REPLACE FUNCTION check_inactive_members_alerts() RETURNS INTEGER AS $$
DECLARE
    config_record RECORD;
    pipeline_record RECORD;
    member_record RECORD;
    alert_count INTEGER := 0;
    days_threshold INTEGER;
    last_activity TIMESTAMP WITH TIME ZONE;
    inactive_members TEXT[];
    alert_id UUID;
BEGIN
    -- Para cada configuração de alerta de membros inativos
    FOR config_record IN 
        SELECT * FROM alert_configs 
        WHERE alert_type = 'inactive_members' 
        AND is_active = true
    LOOP
        -- Obter threshold de dias
        days_threshold := COALESCE((config_record.trigger_conditions->>'days_threshold')::INTEGER, 3);
        
        -- Para cada pipeline
        FOR pipeline_record IN 
            SELECT p.* FROM pipelines p
            WHERE (config_record.pipeline_id IS NULL OR p.id = config_record.pipeline_id)
            AND p.tenant_id = config_record.tenant_id
        LOOP
            inactive_members := ARRAY[]::TEXT[];
            
            -- Para cada membro da pipeline
            FOR member_record IN 
                SELECT pm.*, u.first_name, u.last_name, u.email
                FROM pipeline_members pm
                JOIN auth.users u ON pm.user_id = u.id
                WHERE pm.pipeline_id = pipeline_record.id
            LOOP
                -- Verificar última atividade do membro
                SELECT MAX(GREATEST(pl.created_at, pl.updated_at)) INTO last_activity
                FROM pipeline_leads pl
                WHERE pl.pipeline_id = pipeline_record.id
                AND (pl.assigned_to = member_record.user_id OR pl.created_by = member_record.user_id);
                
                -- Se não tem atividade ou está há muito tempo inativo
                IF last_activity IS NULL OR last_activity < NOW() - INTERVAL '1 day' * days_threshold THEN
                    inactive_members := array_append(inactive_members, 
                        COALESCE(member_record.first_name || ' ' || member_record.last_name, member_record.email)
                    );
                END IF;
            END LOOP;
            
            -- Se há membros inativos, criar alerta
            IF array_length(inactive_members, 1) > 0 THEN
                -- Verificar se já existe alerta ativo
                IF NOT EXISTS (
                    SELECT 1 FROM active_alerts 
                    WHERE alert_config_id = config_record.id 
                    AND pipeline_id = pipeline_record.id
                    AND status = 'active'
                ) THEN
                    -- Criar novo alerta
                    INSERT INTO active_alerts (
                        alert_config_id,
                        tenant_id,
                        pipeline_id,
                        alert_title,
                        alert_message,
                        alert_data,
                        metric_value,
                        metric_threshold,
                        metric_unit,
                        suggested_actions
                    ) VALUES (
                        config_record.id,
                        config_record.tenant_id,
                        pipeline_record.id,
                        '😴 Vendedores Inativos Detectados',
                        format('Pipeline "%s" tem %s vendedor(es) inativo(s) há mais de %s dias: %s', 
                            pipeline_record.name,
                            array_length(inactive_members, 1),
                            days_threshold,
                            array_to_string(inactive_members, ', ')
                        ),
                        jsonb_build_object(
                            'pipeline_name', pipeline_record.name,
                            'inactive_members', inactive_members,
                            'days_threshold', days_threshold,
                            'inactive_count', array_length(inactive_members, 1)
                        ),
                        array_length(inactive_members, 1),
                        1,
                        'vendedores',
                        jsonb_build_array(
                            'Entrar em contato com vendedores inativos',
                            'Verificar se precisam de suporte ou treinamento',
                            'Considerar reatribuir leads pendentes',
                            'Revisar metas e incentivos da equipe'
                        )
                    ) RETURNING id INTO alert_id;
                    
                    -- Registrar no histórico
                    INSERT INTO alert_history (alert_id, action_type, action_message, action_data)
                    VALUES (
                        alert_id,
                        'triggered',
                        'Alerta de vendedores inativos disparado',
                        jsonb_build_object(
                            'days_threshold', days_threshold,
                            'inactive_count', array_length(inactive_members, 1)
                        )
                    );
                    
                    alert_count := alert_count + 1;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- 7. FUNÇÃO PRINCIPAL PARA PROCESSAR TODOS OS ALERTAS
-- =====================================================
CREATE OR REPLACE FUNCTION process_all_alerts() RETURNS JSONB AS $$
DECLARE
    temp_alerts INTEGER;
    bottleneck_alerts INTEGER;
    inactive_alerts INTEGER;
    total_alerts INTEGER;
BEGIN
    -- Processar diferentes tipos de alertas
    temp_alerts := check_temperature_alerts();
    bottleneck_alerts := check_bottleneck_alerts();
    inactive_alerts := check_inactive_members_alerts();
    
    total_alerts := temp_alerts + bottleneck_alerts + inactive_alerts;
    
    RETURN jsonb_build_object(
        'total_alerts_created', total_alerts,
        'temperature_alerts', temp_alerts,
        'bottleneck_alerts', bottleneck_alerts,
        'inactive_member_alerts', inactive_alerts,
        'processed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 8. FUNÇÃO PARA OBTER ALERTAS ATIVOS
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_alerts(
    p_tenant_id UUID,
    p_pipeline_id UUID DEFAULT NULL,
    p_severity_filter VARCHAR DEFAULT NULL
) RETURNS TABLE (
    alert_id UUID,
    alert_type VARCHAR,
    severity_level VARCHAR,
    alert_title VARCHAR,
    alert_message TEXT,
    pipeline_name VARCHAR,
    metric_value DECIMAL,
    metric_threshold DECIMAL,
    metric_unit VARCHAR,
    triggered_at TIMESTAMP WITH TIME ZONE,
    alert_color VARCHAR,
    alert_icon VARCHAR,
    suggested_actions JSONB,
    alert_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aa.id as alert_id,
        ac.alert_type,
        ac.severity_level,
        aa.alert_title,
        aa.alert_message,
        COALESCE(p.name, 'Todas as Pipelines') as pipeline_name,
        aa.metric_value,
        aa.metric_threshold,
        aa.metric_unit,
        aa.triggered_at,
        ac.alert_color,
        ac.alert_icon,
        aa.suggested_actions,
        aa.alert_data
    FROM active_alerts aa
    JOIN alert_configs ac ON aa.alert_config_id = ac.id
    LEFT JOIN pipelines p ON aa.pipeline_id = p.id
    WHERE aa.tenant_id = p_tenant_id
    AND aa.status = 'active'
    AND (p_pipeline_id IS NULL OR aa.pipeline_id = p_pipeline_id)
    AND (p_severity_filter IS NULL OR ac.severity_level = p_severity_filter)
    ORDER BY 
        CASE ac.severity_level 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END,
        aa.triggered_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. INSERIR CONFIGURAÇÕES PADRÃO DE ALERTAS
-- =====================================================
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    -- Para cada tenant existente
    FOR tenant_record IN SELECT * FROM tenants LOOP
        -- Alerta de temperatura crítica
        INSERT INTO alert_configs (
            tenant_id, alert_type, name, description, is_active,
            trigger_conditions, severity_level, alert_color, alert_icon
        ) VALUES (
            tenant_record.id, 'temperature_critical', 
            'Leads Gelados Críticos', 
            'Alerta quando muitos leads estão gelados na etapa inicial',
            true,
            '{"frozen_percentage_threshold": 30}',
            'high', '#ef4444', '🧊'
        ) ON CONFLICT DO NOTHING;
        
        -- Alerta de gargalo
        INSERT INTO alert_configs (
            tenant_id, alert_type, name, description, is_active,
            trigger_conditions, severity_level, alert_color, alert_icon
        ) VALUES (
            tenant_record.id, 'stage_bottleneck',
            'Gargalo na Pipeline',
            'Alerta quando uma etapa concentra muitos leads',
            true,
            '{"stage_percentage_threshold": 50}',
            'medium', '#f59e0b', '🚧'
        ) ON CONFLICT DO NOTHING;
        
        -- Alerta de vendedores inativos
        INSERT INTO alert_configs (
            tenant_id, alert_type, name, description, is_active,
            trigger_conditions, severity_level, alert_color, alert_icon
        ) VALUES (
            tenant_record.id, 'inactive_members',
            'Vendedores Inativos',
            'Alerta quando vendedores não têm atividade recente',
            true,
            '{"days_threshold": 3}',
            'medium', '#8b5cf6', '😴'
        ) ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- 10. POLÍTICAS RLS
-- =====================================================
ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Políticas para Super Admin (acesso total)
CREATE POLICY "Super Admin full access alert_configs" ON alert_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- Políticas para Admin (apenas sua empresa)
CREATE POLICY "Admin access alert_configs" ON alert_configs
    FOR ALL USING (
        tenant_id IN (
            SELECT ur.tenant_id FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

CREATE POLICY "Admin access active_alerts" ON active_alerts
    FOR ALL USING (
        tenant_id IN (
            SELECT ur.tenant_id FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- 11. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_alert_configs_tenant_type ON alert_configs(tenant_id, alert_type, is_active);
CREATE INDEX IF NOT EXISTS idx_active_alerts_tenant_status ON active_alerts(tenant_id, status, triggered_at);
CREATE INDEX IF NOT EXISTS idx_active_alerts_pipeline ON active_alerts(pipeline_id, status);

-- 12. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE alert_configs IS 'Configurações de alertas inteligentes por tenant';
COMMENT ON TABLE active_alerts IS 'Alertas ativos que requerem atenção dos administradores';
COMMENT ON TABLE alert_history IS 'Histórico de ações realizadas nos alertas';

-- =====================================================
-- FIM DA MIGRAÇÃO: SISTEMA DE DASHBOARD DE ALERTAS
-- ===================================================== 