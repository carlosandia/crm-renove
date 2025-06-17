-- Script para debugar dados da pipeline
-- Execute este script no Supabase SQL Editor

-- 1. Verificar estrutura das tabelas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('pipelines', 'pipeline_members', 'users', 'pipeline_stages')
ORDER BY table_name, ordinal_position;

-- 2. Verificar se existem pipelines
SELECT 
    'pipelines' as tabela,
    COUNT(*) as total_registros
FROM pipelines
UNION ALL
SELECT 
    'pipeline_members' as tabela,
    COUNT(*) as total_registros
FROM pipeline_members
UNION ALL
SELECT 
    'users' as tabela,
    COUNT(*) as total_registros
FROM users
UNION ALL
SELECT 
    'pipeline_stages' as tabela,
    COUNT(*) as total_registros
FROM pipeline_stages;

-- 3. Verificar pipelines com seus membros
SELECT 
    p.id as pipeline_id,
    p.name as pipeline_name,
    p.tenant_id,
    pm.id as member_link_id,
    pm.member_id,
    u.first_name,
    u.last_name,
    u.email,
    u.role
FROM pipelines p
LEFT JOIN pipeline_members pm ON p.id = pm.pipeline_id
LEFT JOIN users u ON pm.member_id = u.id
ORDER BY p.name, u.first_name;

-- 4. Verificar se há problemas de FK
SELECT 
    pm.id,
    pm.pipeline_id,
    pm.member_id,
    p.name as pipeline_exists,
    u.email as user_exists
FROM pipeline_members pm
LEFT JOIN pipelines p ON pm.pipeline_id = p.id
LEFT JOIN users u ON pm.member_id = u.id
WHERE p.id IS NULL OR u.id IS NULL;

-- 5. Criar dados de teste se necessário
DO $$
DECLARE
    test_tenant_id UUID;
    admin_user_id UUID;
    member_user_id UUID;
    pipeline_id UUID;
    stage_id UUID;
BEGIN
    -- Buscar ou criar tenant de teste
    SELECT id INTO test_tenant_id FROM tenants LIMIT 1;
    IF test_tenant_id IS NULL THEN
        INSERT INTO tenants (name, slug) VALUES ('Teste Tenant', 'teste') RETURNING id INTO test_tenant_id;
    END IF;

    -- Buscar ou criar admin de teste
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    IF admin_user_id IS NULL THEN
        INSERT INTO users (first_name, last_name, email, role, tenant_id) 
        VALUES ('Admin', 'Teste', 'admin@teste.com', 'admin', test_tenant_id) 
        RETURNING id INTO admin_user_id;
    END IF;

    -- Buscar ou criar member de teste
    SELECT id INTO member_user_id FROM users WHERE role = 'member' LIMIT 1;
    IF member_user_id IS NULL THEN
        INSERT INTO users (first_name, last_name, email, role, tenant_id) 
        VALUES ('Vendedor', 'Teste', 'vendedor@teste.com', 'member', test_tenant_id) 
        RETURNING id INTO member_user_id;
    END IF;

    -- Criar pipeline de teste
    SELECT id INTO pipeline_id FROM pipelines WHERE name = 'Pipeline Teste' LIMIT 1;
    IF pipeline_id IS NULL THEN
        INSERT INTO pipelines (name, description, tenant_id, created_by) 
        VALUES ('Pipeline Teste', 'Pipeline para testes', test_tenant_id, admin_user_id) 
        RETURNING id INTO pipeline_id;
    END IF;

    -- Adicionar membro à pipeline
    INSERT INTO pipeline_members (pipeline_id, member_id) 
    VALUES (pipeline_id, member_user_id)
    ON CONFLICT (pipeline_id, member_id) DO NOTHING;

    -- Criar estágios de teste
    INSERT INTO pipeline_stages (pipeline_id, name, order_index, temperature_score, max_days_allowed, color)
    VALUES 
        (pipeline_id, 'Prospecção', 1, 10, 7, '#3B82F6'),
        (pipeline_id, 'Qualificação', 2, 30, 5, '#F59E0B'),
        (pipeline_id, 'Proposta', 3, 60, 3, '#EF4444'),
        (pipeline_id, 'Ganho', 4, 100, 1, '#10B981')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Dados de teste criados com sucesso!';
END $$;

-- 6. Verificar resultado final
SELECT 
    'Verificação Final' as status,
    p.name as pipeline,
    COUNT(pm.id) as total_membros,
    COUNT(ps.id) as total_estagios
FROM pipelines p
LEFT JOIN pipeline_members pm ON p.id = pm.pipeline_id
LEFT JOIN pipeline_stages ps ON p.id = ps.pipeline_id
GROUP BY p.id, p.name
ORDER BY p.name; 