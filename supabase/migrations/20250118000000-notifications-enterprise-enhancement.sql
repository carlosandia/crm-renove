-- ============================================
-- FASE 5: SISTEMA DE NOTIFICAÇÕES ENTERPRISE
-- Migration: Enhanced Notifications System
-- Date: 2025-01-18
-- ============================================

-- Verificar se a tabela notifications já existe, se não, criar
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action_url TEXT,
    metadata JSONB DEFAULT '{}'
);

-- ============================================
-- STEP 1: EXTEND NOTIFICATIONS TABLE - ENTERPRISE FEATURES
-- ============================================

-- Adicionar colunas enterprise (verificar se já existem)
DO $$
BEGIN
    -- Target Role (super_admin, admin, member)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_role') THEN
        ALTER TABLE notifications ADD COLUMN target_role VARCHAR(20) CHECK (target_role IN ('super_admin', 'admin', 'member'));
    END IF;
    
    -- Target Users (JSONB array for specific targeting)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_users') THEN
        ALTER TABLE notifications ADD COLUMN target_users JSONB DEFAULT '[]';
    END IF;
    
    -- Notification Category
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'notification_category') THEN
        ALTER TABLE notifications ADD COLUMN notification_category VARCHAR(20) DEFAULT 'comunicados' 
            CHECK (notification_category IN ('novidades', 'atualizacoes', 'comunicados'));
    END IF;
    
    -- Priority
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
        ALTER TABLE notifications ADD COLUMN priority VARCHAR(10) DEFAULT 'medium' 
            CHECK (priority IN ('low', 'medium', 'high'));
    END IF;
    
    -- Rich Content (JSONB: image_url, action_button, action_url)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'rich_content') THEN
        ALTER TABLE notifications ADD COLUMN rich_content JSONB DEFAULT '{}';
    END IF;
    
    -- Scheduling
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'scheduled_for') THEN
        ALTER TABLE notifications ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Expiration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'expires_at') THEN
        ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Click Tracking (JSONB for analytics)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'click_tracking') THEN
        ALTER TABLE notifications ADD COLUMN click_tracking JSONB DEFAULT '{"clicks": 0, "last_clicked": null}';
    END IF;
    
    -- Creator (quem criou a notificação)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'created_by') THEN
        ALTER TABLE notifications ADD COLUMN created_by UUID;
    END IF;
    
    -- Tenant ID para isolamento multi-tenant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'tenant_id') THEN
        ALTER TABLE notifications ADD COLUMN tenant_id UUID;
    END IF;
    
    -- Status da notificação (draft, scheduled, sent, expired)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'status') THEN
        ALTER TABLE notifications ADD COLUMN status VARCHAR(20) DEFAULT 'sent' 
            CHECK (status IN ('draft', 'scheduled', 'sent', 'expired'));
    END IF;
END $$;

-- ============================================
-- STEP 2: CREATE PERFORMANCE INDEXES
-- ============================================

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(notification_category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_priority ON notifications(user_id, read, priority) WHERE read = false;

-- ============================================
-- STEP 3: ENHANCED DATABASE FUNCTIONS
-- ============================================

-- Função para criar notificação enterprise
CREATE OR REPLACE FUNCTION create_enterprise_notification(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_category TEXT DEFAULT 'comunicados',
    p_priority TEXT DEFAULT 'medium',
    p_target_role TEXT DEFAULT NULL,
    p_target_users JSONB DEFAULT '[]',
    p_rich_content JSONB DEFAULT '{}',
    p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_tenant_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    target_user_id UUID;
    user_role TEXT;
BEGIN
    -- Gerar ID da notificação
    notification_id := gen_random_uuid();
    
    -- Se targeting por role, buscar usuários da role
    IF p_target_role IS NOT NULL THEN
        FOR target_user_id, user_role IN 
            SELECT id, role FROM users 
            WHERE role = p_target_role 
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
            AND is_active = true
        LOOP
            INSERT INTO notifications (
                id, user_id, title, message, type, notification_category, 
                priority, target_role, target_users, rich_content, 
                scheduled_for, expires_at, created_by, tenant_id, status
            ) VALUES (
                gen_random_uuid(), target_user_id, p_title, p_message, p_type, p_category,
                p_priority, p_target_role, p_target_users, p_rich_content,
                p_scheduled_for, p_expires_at, p_created_by, p_tenant_id,
                CASE WHEN p_scheduled_for IS NOT NULL THEN 'scheduled' ELSE 'sent' END
            );
        END LOOP;
    -- Se targeting específico por usuários
    ELSIF jsonb_array_length(p_target_users) > 0 THEN
        FOR target_user_id IN 
            SELECT (value::text)::uuid FROM jsonb_array_elements_text(p_target_users)
        LOOP
            INSERT INTO notifications (
                id, user_id, title, message, type, notification_category, 
                priority, target_role, target_users, rich_content, 
                scheduled_for, expires_at, created_by, tenant_id, status
            ) VALUES (
                gen_random_uuid(), target_user_id, p_title, p_message, p_type, p_category,
                p_priority, p_target_role, p_target_users, p_rich_content,
                p_scheduled_for, p_expires_at, p_created_by, p_tenant_id,
                CASE WHEN p_scheduled_for IS NOT NULL THEN 'scheduled' ELSE 'sent' END
            );
        END LOOP;
    END IF;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para rastrear cliques
CREATE OR REPLACE FUNCTION track_notification_click(
    p_notification_id UUID,
    p_action_type TEXT DEFAULT 'click'
) RETURNS BOOLEAN AS $$
DECLARE
    current_tracking JSONB;
    new_tracking JSONB;
BEGIN
    -- Buscar tracking atual
    SELECT click_tracking INTO current_tracking 
    FROM notifications 
    WHERE id = p_notification_id;
    
    -- Atualizar tracking
    new_tracking := jsonb_build_object(
        'clicks', COALESCE((current_tracking->>'clicks')::int, 0) + 1,
        'last_clicked', NOW(),
        'action_type', p_action_type
    );
    
    -- Salvar tracking atualizado
    UPDATE notifications 
    SET click_tracking = new_tracking
    WHERE id = p_notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar notificações agendadas
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
BEGIN
    -- Atualizar notificações agendadas que chegaram na hora
    UPDATE notifications 
    SET status = 'sent'
    WHERE status = 'scheduled' 
    AND scheduled_for <= NOW();
    
    GET DIAGNOSTICS processed_count = ROW_COUNT;
    
    -- Marcar notificações expiradas
    UPDATE notifications 
    SET status = 'expired'
    WHERE status IN ('sent', 'scheduled')
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: RLS POLICIES (Row Level Security)
-- ============================================

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy para usuários verem suas próprias notificações
CREATE POLICY "users_see_own_notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- Policy para super_admin criar notificações
CREATE POLICY "super_admin_create_notifications" ON notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        ) OR auth.uid() IS NULL
    );

-- Policy para usuários marcarem suas notificações como lidas
CREATE POLICY "users_update_own_notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid() OR auth.uid() IS NULL);

-- ============================================
-- STEP 5: CREATE NOTIFICATION ANALYTICS VIEW
-- ============================================

CREATE OR REPLACE VIEW notification_analytics AS
SELECT 
    notification_category,
    priority,
    target_role,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE read = true) as total_read,
    COUNT(*) FILTER (WHERE (click_tracking->>'clicks')::int > 0) as total_clicked,
    ROUND(
        (COUNT(*) FILTER (WHERE read = true)::decimal / COUNT(*)) * 100, 2
    ) as read_rate_percent,
    ROUND(
        (COUNT(*) FILTER (WHERE (click_tracking->>'clicks')::int > 0)::decimal / COUNT(*)) * 100, 2
    ) as click_rate_percent,
    DATE_TRUNC('day', created_at) as date_sent
FROM notifications 
WHERE status = 'sent'
GROUP BY notification_category, priority, target_role, DATE_TRUNC('day', created_at)
ORDER BY date_sent DESC;

-- ============================================
-- STEP 6: SAMPLE DATA FOR TESTING
-- ============================================

-- Inserir notificação de exemplo (apenas se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE title = 'Sistema de Notificações Enterprise Ativo!') THEN
        PERFORM create_enterprise_notification(
            'Sistema de Notificações Enterprise Ativo!',
            'O novo sistema de notificações com targeting inteligente e rich content está funcionando. Teste todas as funcionalidades!',
            'success',
            'novidades',
            'high',
            NULL, -- sem targeting por role
            '[]', -- sem targeting específico
            '{"image_url": "", "action_button": "Explorar Funcionalidades", "action_url": "/notifications"}',
            NULL, -- não agendada
            NOW() + INTERVAL '30 days', -- expira em 30 dias
            NULL, -- sem creator específico
            NULL  -- sem tenant específico
        );
    END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🚀 FASE 5: Sistema de Notificações Enterprise implementado com sucesso!';
    RAISE NOTICE '✅ Tabela notifications expandida com funcionalidades enterprise';
    RAISE NOTICE '✅ Índices de performance criados';
    RAISE NOTICE '✅ Funções enterprise implementadas: create_enterprise_notification, track_notification_click, process_scheduled_notifications';
    RAISE NOTICE '✅ RLS policies configuradas';
    RAISE NOTICE '✅ View de analytics criada';
    RAISE NOTICE '✅ Dados de exemplo inseridos';
    RAISE NOTICE '🎯 Próximo passo: Implementar APIs e componentes frontend';
END $$; 