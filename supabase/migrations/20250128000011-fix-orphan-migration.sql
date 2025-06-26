-- ============================================
-- MIGRAÇÃO CORRIGIDA: VINCULAR ÓRFÃOS SEM DUPLICATAS
-- Data: 2025-01-28
-- Objetivo: Corrigir erro de chave duplicada na migração anterior
-- ============================================

-- ============================================
-- ETAPA 1: VINCULAR ÓRFÃOS COM LEADS_MASTER EXISTENTES
-- ============================================

-- Função corrigida para vincular pipeline_leads órfãos com leads_master existentes
CREATE OR REPLACE FUNCTION fix_orphan_pipeline_leads()
RETURNS void AS $$
DECLARE
    orphan_lead RECORD;
    master_lead_id UUID;
    total_linked INTEGER := 0;
    total_created INTEGER := 0;
    new_lead_master_id UUID;
BEGIN
    RAISE NOTICE 'Iniciando correção de pipeline_leads órfãos...';
    
    -- Buscar pipeline_leads sem lead_master_id
    FOR orphan_lead IN 
        SELECT id, custom_data, created_by, created_at, updated_at
        FROM pipeline_leads 
        WHERE lead_master_id IS NULL 
        AND custom_data IS NOT NULL
        ORDER BY created_at
    LOOP
        master_lead_id := NULL;
        
        -- PRIORIDADE 1: Tentar encontrar por email exato
        IF orphan_lead.custom_data->>'email' IS NOT NULL THEN
            SELECT id INTO master_lead_id
            FROM leads_master 
            WHERE email = (orphan_lead.custom_data->>'email')
            LIMIT 1;
            
            IF master_lead_id IS NOT NULL THEN
                -- Vincular ao lead_master existente
                UPDATE pipeline_leads 
                SET lead_master_id = master_lead_id
                WHERE id = orphan_lead.id;
                
                total_linked := total_linked + 1;
                RAISE NOTICE 'Vinculado pipeline_lead % ao lead_master existente % (email: %)', 
                    orphan_lead.id, master_lead_id, orphan_lead.custom_data->>'email';
                CONTINUE; -- Pular para o próximo
            END IF;
        END IF;
        
        -- PRIORIDADE 2: Tentar encontrar por nome + empresa se email não funcionou
        IF master_lead_id IS NULL 
           AND orphan_lead.custom_data->>'nome_lead' IS NOT NULL 
           AND orphan_lead.custom_data->>'empresa' IS NOT NULL THEN
            
            SELECT id INTO master_lead_id
            FROM leads_master 
            WHERE (first_name || ' ' || last_name) = (orphan_lead.custom_data->>'nome_lead')
            AND company = (orphan_lead.custom_data->>'empresa')
            LIMIT 1;
            
            IF master_lead_id IS NOT NULL THEN
                -- Vincular ao lead_master existente
                UPDATE pipeline_leads 
                SET lead_master_id = master_lead_id
                WHERE id = orphan_lead.id;
                
                total_linked := total_linked + 1;
                RAISE NOTICE 'Vinculado pipeline_lead % ao lead_master existente % (nome+empresa)', 
                    orphan_lead.id, master_lead_id;
                CONTINUE; -- Pular para o próximo
            END IF;
        END IF;
        
        -- PRIORIDADE 3: Se não encontrou match, criar novo lead_master
        -- Mas apenas se o email não existir (para evitar duplicata)
        IF master_lead_id IS NULL THEN
            -- Verificar se email já existe antes de criar
            IF orphan_lead.custom_data->>'email' IS NOT NULL THEN
                SELECT COUNT(*) INTO master_lead_id
                FROM leads_master 
                WHERE email = (orphan_lead.custom_data->>'email');
                
                -- Se email já existe, pular (não criar duplicata)
                IF master_lead_id > 0 THEN
                    RAISE NOTICE 'Email % já existe, pulando criação para pipeline_lead %', 
                        orphan_lead.custom_data->>'email', orphan_lead.id;
                    CONTINUE;
                END IF;
            END IF;
            
            -- Criar novo lead_master (email único garantido)
            BEGIN
                INSERT INTO leads_master (
                    id,
                    first_name,
                    last_name,
                    email,
                    phone,
                    company,
                    job_title,
                    lead_source,
                    lead_temperature,
                    status,
                    estimated_value,
                    campaign_name,
                    utm_source,
                    utm_medium,
                    utm_campaign,
                    utm_term,
                    utm_content,
                    city,
                    state,
                    country,
                    notes,
                    created_by,
                    created_at,
                    updated_at,
                    tenant_id
                ) VALUES (
                    gen_random_uuid(),
                    -- Extrair first_name e last_name do nome_lead
                    CASE 
                        WHEN orphan_lead.custom_data->>'nome_lead' IS NOT NULL THEN
                            SPLIT_PART(orphan_lead.custom_data->>'nome_lead', ' ', 1)
                        ELSE 'Lead'
                    END,
                    CASE 
                        WHEN orphan_lead.custom_data->>'nome_lead' IS NOT NULL AND 
                             array_length(string_to_array(orphan_lead.custom_data->>'nome_lead', ' '), 1) > 1 THEN
                            SUBSTRING(orphan_lead.custom_data->>'nome_lead' FROM POSITION(' ' IN orphan_lead.custom_data->>'nome_lead') + 1)
                        ELSE 'Migrado'
                    END,
                    -- Email único ou gerar um único
                    CASE 
                        WHEN orphan_lead.custom_data->>'email' IS NOT NULL THEN
                            orphan_lead.custom_data->>'email'
                        ELSE 
                            'migrado-' || orphan_lead.id || '@sistema.com'
                    END,
                    orphan_lead.custom_data->>'telefone',
                    orphan_lead.custom_data->>'empresa',
                    orphan_lead.custom_data->>'cargo',
                    orphan_lead.custom_data->>'origem',
                    COALESCE(orphan_lead.custom_data->>'temperatura', 'warm'),
                    COALESCE(orphan_lead.custom_data->>'status', 'active'),
                    CASE 
                        WHEN orphan_lead.custom_data->>'valor' ~ '^[0-9]+\.?[0-9]*$' THEN
                            (orphan_lead.custom_data->>'valor')::DECIMAL
                        ELSE 0
                    END,
                    orphan_lead.custom_data->>'campanha',
                    orphan_lead.custom_data->>'utm_source',
                    orphan_lead.custom_data->>'utm_medium',
                    orphan_lead.custom_data->>'utm_campaign',
                    orphan_lead.custom_data->>'utm_term',
                    orphan_lead.custom_data->>'utm_content',
                    orphan_lead.custom_data->>'cidade',
                    orphan_lead.custom_data->>'estado',
                    orphan_lead.custom_data->>'pais',
                    orphan_lead.custom_data->>'observacoes',
                    orphan_lead.created_by,
                    orphan_lead.created_at,
                    orphan_lead.updated_at,
                    -- Buscar tenant_id do usuário criador
                    COALESCE(
                        (SELECT tenant_id FROM users WHERE id = orphan_lead.created_by LIMIT 1),
                        '00000000-0000-0000-0000-000000000000'::UUID
                    )
                ) RETURNING id INTO new_lead_master_id;
                
                -- Atualizar pipeline_leads com o novo lead_master_id
                UPDATE pipeline_leads 
                SET lead_master_id = new_lead_master_id
                WHERE id = orphan_lead.id;
                
                total_created := total_created + 1;
                RAISE NOTICE 'Criado novo lead_master % para pipeline_lead %', 
                    new_lead_master_id, orphan_lead.id;
                    
            EXCEPTION WHEN unique_violation THEN
                -- Se mesmo assim der erro de duplicata, pular
                RAISE NOTICE 'Erro de duplicata ignorado para pipeline_lead %', orphan_lead.id;
                CONTINUE;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Correção concluída: % vinculados, % criados', total_linked, total_created;
END;
$$ LANGUAGE plpgsql;

-- Executar correção
SELECT fix_orphan_pipeline_leads();

-- ============================================
-- ETAPA 2: VERIFICAR RESULTADOS
-- ============================================

DO $$
DECLARE
    total_pipeline_leads INTEGER;
    pipeline_leads_with_master INTEGER;
    pipeline_leads_orphan INTEGER;
    total_leads_master INTEGER;
BEGIN
    -- Contar registros
    SELECT COUNT(*) INTO total_pipeline_leads FROM pipeline_leads;
    SELECT COUNT(*) INTO pipeline_leads_with_master FROM pipeline_leads WHERE lead_master_id IS NOT NULL;
    SELECT COUNT(*) INTO pipeline_leads_orphan FROM pipeline_leads WHERE lead_master_id IS NULL;
    SELECT COUNT(*) INTO total_leads_master FROM leads_master;
    
    RAISE NOTICE '=== ESTATÍSTICAS APÓS CORREÇÃO ===';
    RAISE NOTICE 'Total pipeline_leads: %', total_pipeline_leads;
    RAISE NOTICE 'Pipeline_leads com lead_master_id: %', pipeline_leads_with_master;
    RAISE NOTICE 'Pipeline_leads órfãos restantes: %', pipeline_leads_orphan;
    RAISE NOTICE 'Total leads_master: %', total_leads_master;
    RAISE NOTICE '=== CORREÇÃO DE ÓRFÃOS CONCLUÍDA ===';
END $$;

-- ============================================
-- ETAPA 3: CRIAR ÍNDICES SE NÃO EXISTIREM
-- ============================================

-- Criar índice para performance se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pipeline_leads_lead_master_id') THEN
        CREATE INDEX idx_pipeline_leads_lead_master_id ON pipeline_leads(lead_master_id);
        RAISE NOTICE 'Índice idx_pipeline_leads_lead_master_id criado';
    END IF;
END $$;

-- Limpar função auxiliar
DROP FUNCTION IF EXISTS fix_orphan_pipeline_leads(); 