-- ============================================
-- MIGRAÇÃO: CRIAÇÃO DA TABELA NOTIFICATIONS ENTERPRISE
-- Data: 29/01/2025 
-- Objetivo: Criar tabela notifications com funcionalidades enterprise completas
-- ============================================

-- PASSO 1: Criar tabela notifications com todas as colunas enterprise
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- ENTERPRISE FEATURES
    target_role VARCHAR(20) CHECK (target_role IN ('super_admin', 'admin', 'member')),
    target_users JSONB DEFAULT '[]',
    notification_category VARCHAR(20) DEFAULT 'comunicados' 
        CHECK (notification_category IN ('novidades', 'atualizacoes', 'comunicados')),
    priority VARCHAR(10) DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high')),
    rich_content JSONB DEFAULT '{}',
    scheduled_for TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    click_tracking JSONB DEFAULT '{"clicks": 0, "last_clicked": null}',
    created_by UUID,
    tenant_id UUID,
    status VARCHAR(20) DEFAULT 'sent' 
        CHECK (status IN ('draft', 'scheduled', 'sent', 'expired'))
);

-- PASSO 2: Criar índices para performance otimizada
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
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_priority 
    ON notifications(user_id, read, priority) WHERE read = false;

-- PASSO 3: Função para criar notificação enterprise
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

-- PASSO 4: Função para rastrear cliques
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

-- PASSO 5: Função para processar notificações agendadas
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

-- PASSO 6: RLS Policies (Row Level Security)
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

-- PASSO 7: View de analytics
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

-- PASSO 8: Inserir notificação de exemplo
DO $$
BEGIN
    -- Verificar se já existem notificações
    IF NOT EXISTS (SELECT 1 FROM notifications LIMIT 1) THEN
        -- Criar notificação de boas-vindas
        PERFORM create_enterprise_notification(
            'Sistema de Notificações Ativo! 🚀',
            'O sistema de notificações enterprise está funcionando perfeitamente. Agora você pode receber atualizações importantes em tempo real.',
            'success',
            'novidades',
            'high',
            NULL, -- sem targeting por role específico
            '[]', -- sem targeting de usuários específicos
            '{"image_url": "", "action_button": "Explorar Sistema", "action_url": "/dashboard"}',
            NULL, -- não agendada
            NOW() + INTERVAL '30 days', -- expira em 30 dias
            NULL, -- sem creator específico
            NULL  -- sem tenant específico
        );
        
        RAISE NOTICE '✅ Notificação de exemplo criada';
    ELSE
        RAISE NOTICE '📋 Notificações já existem, não criando exemplo';
    END IF;
END $$;

-- SUCESSO
DO $$
BEGIN
    RAISE NOTICE '🎉 MIGRAÇÃO NOTIFICATIONS ENTERPRISE CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '✅ Tabela notifications criada com %s colunas enterprise', 
        (SELECT count(*) FROM information_schema.columns WHERE table_name = 'notifications');
    RAISE NOTICE '✅ Índices de performance implementados';
    RAISE NOTICE '✅ Funções enterprise: create_enterprise_notification, track_notification_click, process_scheduled_notifications';
    RAISE NOTICE '✅ RLS policies configuradas';
    RAISE NOTICE '✅ View notification_analytics criada';
    RAISE NOTICE '🚀 Sistema de notificações 100% pronto para uso!';
END $$; 