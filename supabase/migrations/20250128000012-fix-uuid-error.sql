-- ============================================
-- MIGRAÇÃO CORRIGIDA: CORRIGIR ERRO DE UUID INVÁLIDO
-- Data: 2025-01-28
-- Objetivo: Corrigir erro "invalid input syntax for type uuid: 0"
-- ============================================

-- Função corrigida com tipos de variáveis corretos
CREATE OR REPLACE FUNCTION fix_orphan_pipeline_leads_corrected()
RETURNS void AS $$
DECLARE
    orphan_lead RECORD;
    master_lead_id UUID;
    email_count INTEGER; -- ✅ CORREÇÃO: Variável INTEGER para COUNT
    total_linked INTEGER := 0;
    total_created INTEGER := 0;
    new_lead_master_id UUID;
BEGIN
    RAISE NOTICE 'Iniciando correção de pipeline_leads órfãos (versão corrigida)...';
    
    -- Buscar pipeline_leads sem lead_master_id
    FOR orphan_lead IN 
        SELECT id, custom_data, created_by, created_at, updated_at
        FROM pipeline_leads 
        WHERE lead_master_id IS NULL 
        AND custom_data IS NOT NULL
        ORDER BY created_at
        LIMIT 50 -- Processar em lotes para evitar timeout
    LOOP
        master_lead_id := NULL;
        email_count := 0;
        
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
            -- ✅ CORREÇÃO: Usar variável INTEGER para COUNT
            IF orphan_lead.custom_data->>'email' IS NOT NULL THEN
                SELECT COUNT(*) INTO email_count
                FROM leads_master 
                WHERE email = (orphan_lead.custom_data->>'email');
                
                -- Se email já existe, tentar vincular
                IF email_count > 0 THEN
                    SELECT id INTO master_lead_id
                    FROM leads_master 
                    WHERE email = (orphan_lead.custom_data->>'email')
                    LIMIT 1;
                    
                    IF master_lead_id IS NOT NULL THEN
                        UPDATE pipeline_leads 
                        SET lead_master_id = master_lead_id
                        WHERE id = orphan_lead.id;
                        
                        total_linked := total_linked + 1;
                        RAISE NOTICE 'Vinculado pipeline_lead % ao lead_master existente % (email duplicado)', 
                            orphan_lead.id, master_lead_id;
                        CONTINUE;
                    END IF;
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
                -- Se mesmo assim der erro de duplicata, tentar vincular
                RAISE NOTICE 'Erro de duplicata, tentando vincular pipeline_lead %', orphan_lead.id;
                
                -- Tentar encontrar o lead_master que causou a duplicata
                IF orphan_lead.custom_data->>'email' IS NOT NULL THEN
                    SELECT id INTO master_lead_id
                    FROM leads_master 
                    WHERE email = (orphan_lead.custom_data->>'email')
                    LIMIT 1;
                    
                    IF master_lead_id IS NOT NULL THEN
                        UPDATE pipeline_leads 
                        SET lead_master_id = master_lead_id
                        WHERE id = orphan_lead.id;
                        
                        total_linked := total_linked + 1;
                        RAISE NOTICE 'Vinculado após erro de duplicata: pipeline_lead % → lead_master %', 
                            orphan_lead.id, master_lead_id;
                    END IF;
                END IF;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Correção concluída: % vinculados, % criados', total_linked, total_created;
END;
$$ LANGUAGE plpgsql;

-- Executar correção
SELECT fix_orphan_pipeline_leads_corrected();

-- ============================================
-- VERIFICAR RESULTADOS
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
    
    RAISE NOTICE '=== ESTATÍSTICAS APÓS CORREÇÃO (VERSÃO CORRIGIDA) ===';
    RAISE NOTICE 'Total pipeline_leads: %', total_pipeline_leads;
    RAISE NOTICE 'Pipeline_leads com lead_master_id: %', pipeline_leads_with_master;
    RAISE NOTICE 'Pipeline_leads órfãos restantes: %', pipeline_leads_orphan;
    RAISE NOTICE 'Total leads_master: %', total_leads_master;
    RAISE NOTICE '=== CORREÇÃO DE ÓRFÃOS CONCLUÍDA (SEM ERROS) ===';
END $$;

-- ============================================
-- CRIAR ÍNDICES SE NÃO EXISTIREM
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_pipeline_leads_lead_master_id') THEN
        CREATE INDEX idx_pipeline_leads_lead_master_id ON pipeline_leads(lead_master_id);
        RAISE NOTICE 'Índice idx_pipeline_leads_lead_master_id criado';
    END IF;
END $$;

-- Limpar função auxiliar
DROP FUNCTION IF EXISTS fix_orphan_pipeline_leads_corrected(); 