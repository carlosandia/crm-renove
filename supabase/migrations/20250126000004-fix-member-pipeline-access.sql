-- =====================================================
-- MIGRAÇÃO: CORREÇÃO ACESSO MEMBER ÀS PIPELINES
-- Data: 2025-01-26
-- Objetivo: Garantir que members vejam pipelines da empresa
-- =====================================================

-- 1. VERIFICAR E CORRIGIR TENANT_ID DOS MEMBERS
-- =====================================================

-- Garantir que todos os members tenham tenant_id correto
UPDATE users 
SET tenant_id = 'dc2f1fc5-53b5-4f54-bb56-009f58481b97'
WHERE role = 'member' 
AND email IN ('felps@felps.com', 'teste4@teste4.com')
AND (tenant_id IS NULL OR tenant_id != 'dc2f1fc5-53b5-4f54-bb56-009f58481b97');

-- 2. GARANTIR QUE EXISTE PELO MENOS UMA PIPELINE PARA TESTE
-- =====================================================

-- Verificar se existe pipeline de teste
DO $$
DECLARE
    pipeline_count INTEGER;
    new_pipeline_id UUID;
BEGIN
    -- Contar pipelines existentes
    SELECT COUNT(*) INTO pipeline_count 
    FROM pipelines 
    WHERE tenant_id = 'dc2f1fc5-53b5-4f54-bb56-009f58481b97' 
    AND is_active = true;
    
    -- Se não existir, criar uma pipeline de teste
    IF pipeline_count = 0 THEN
        new_pipeline_id := gen_random_uuid();
        
        INSERT INTO pipelines (
            id, name, description, tenant_id, created_by, is_active, created_at, updated_at
        ) VALUES (
            new_pipeline_id,
            'Pipeline de Teste Empresa',
            'Pipeline criada automaticamente para testes de integração admin-member',
            'dc2f1fc5-53b5-4f54-bb56-009f58481b97',
            'teste3@teste3.com',
            true,
            NOW(),
            NOW()
        );
        
        -- Criar stages básicas para a pipeline
        INSERT INTO pipeline_stages (
            id, pipeline_id, name, order_index, temperature_score, max_days_allowed, color, is_system_stage, created_at, updated_at
        ) VALUES 
        (gen_random_uuid(), new_pipeline_id, 'Novos Leads', 0, 50, 30, '#3B82F6', true, NOW(), NOW()),
        (gen_random_uuid(), new_pipeline_id, 'Em Contato', 1, 75, 15, '#F59E0B', false, NOW(), NOW()),
        (gen_random_uuid(), new_pipeline_id, 'Ganho', 2, 100, 7, '#10B981', true, NOW(), NOW()),
        (gen_random_uuid(), new_pipeline_id, 'Perdido', 3, 0, 7, '#EF4444', true, NOW(), NOW());
        
        -- Criar campos customizados básicos
        INSERT INTO pipeline_custom_fields (
            id, pipeline_id, field_name, field_label, field_type, is_required, field_order, placeholder, show_in_card
        ) VALUES 
        (gen_random_uuid(), new_pipeline_id, 'nome', 'Nome do Lead', 'text', true, 1, 'Digite o nome', true),
        (gen_random_uuid(), new_pipeline_id, 'email', 'Email', 'email', true, 2, 'Digite o email', true),
        (gen_random_uuid(), new_pipeline_id, 'telefone', 'Telefone', 'text', false, 3, 'Digite o telefone', false);
        
        RAISE NOTICE 'Pipeline de teste criada com ID: %', new_pipeline_id;
    ELSE
        RAISE NOTICE 'Já existem % pipelines na empresa', pipeline_count;
    END IF;
END $$;

-- 3. LOG DE VERIFICAÇÃO
-- =====================================================

DO $$
DECLARE
    user_info RECORD;
    pipeline_info RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICAÇÃO DE ACESSO MEMBER-PIPELINE';
    RAISE NOTICE '========================================';
    
    -- Verificar users
    FOR user_info IN 
        SELECT email, role, tenant_id 
        FROM users 
        WHERE tenant_id = 'dc2f1fc5-53b5-4f54-bb56-009f58481b97'
        ORDER BY role, email
    LOOP
        RAISE NOTICE 'User: % | Role: % | Tenant: %', 
            user_info.email, user_info.role, user_info.tenant_id;
    END LOOP;
    
    -- Verificar pipelines
    FOR pipeline_info IN 
        SELECT name, created_by, tenant_id 
        FROM pipelines 
        WHERE tenant_id = 'dc2f1fc5-53b5-4f54-bb56-009f58481b97'
        ORDER BY created_at
    LOOP
        RAISE NOTICE 'Pipeline: % | Criada por: % | Tenant: %', 
            pipeline_info.name, pipeline_info.created_by, pipeline_info.tenant_id;
    END LOOP;
    
    RAISE NOTICE '========================================';
END $$; 