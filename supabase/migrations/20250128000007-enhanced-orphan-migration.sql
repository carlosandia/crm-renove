-- ============================================
-- MIGRAÇÃO MELHORADA: VINCULAR LEADS ÓRFÃOS COM MÚLTIPLOS CRITÉRIOS
-- Data: 2025-01-28 - ETAPA 4
-- Descrição: Migração robusta para vincular pipeline_leads órfãos 
--           aos seus leads_master usando email, nome e outros critérios
-- ============================================

-- Função melhorada para migração de leads órfãos
CREATE OR REPLACE FUNCTION enhanced_migrate_orphan_leads()
RETURNS jsonb AS $$
DECLARE
    orphan_count_before integer;
    orphan_count_after integer;
    linked_by_email integer := 0;
    linked_by_name_email integer := 0;
    total_linked integer := 0;
    result_info jsonb;
BEGIN
    -- Contar leads órfãos antes da migração
    SELECT COUNT(*) INTO orphan_count_before
    FROM pipeline_leads 
    WHERE lead_master_id IS NULL;
    
    RAISE NOTICE '[enhanced_migrate_orphan_leads] ETAPA 4 INICIADA - Leads órfãos encontrados: %', orphan_count_before;
    
    -- MÉTODO 1: Vincular por email exato
    RAISE NOTICE '[enhanced_migrate_orphan_leads] Método 1: Vinculando por email...';
    
    WITH orphan_leads_email AS (
        SELECT 
            pl.id as pipeline_lead_id,
            pl.custom_data->>'email' as email,
            pl.custom_data
        FROM pipeline_leads pl
        WHERE pl.lead_master_id IS NULL 
          AND pl.custom_data->>'email' IS NOT NULL
          AND pl.custom_data->>'email' != ''
          AND TRIM(pl.custom_data->>'email') != ''
    ),
    matching_masters_email AS (
        SELECT 
            ol.pipeline_lead_id,
            ol.custom_data,
            lm.id as master_id,
            lm.first_name,
            lm.last_name,
            lm.email,
            ROW_NUMBER() OVER (PARTITION BY ol.pipeline_lead_id ORDER BY lm.created_at DESC) as rn
        FROM orphan_leads_email ol
        JOIN leads_master lm ON LOWER(TRIM(lm.email)) = LOWER(TRIM(ol.email))
    )
    UPDATE pipeline_leads 
    SET lead_master_id = mm.master_id,
        custom_data = jsonb_set(
            COALESCE(mm.custom_data, '{}'::jsonb),
            '{lead_master_id}',
            to_jsonb(mm.master_id::text)
        ),
        updated_at = NOW()
    FROM matching_masters_email mm
    WHERE pipeline_leads.id = mm.pipeline_lead_id 
      AND mm.rn = 1;
    
    GET DIAGNOSTICS linked_by_email = ROW_COUNT;
    RAISE NOTICE '[enhanced_migrate_orphan_leads] Leads vinculados por email: %', linked_by_email;
    
    -- MÉTODO 2: Vincular por nome + email (para casos onde o email pode ter variações)
    RAISE NOTICE '[enhanced_migrate_orphan_leads] Método 2: Vinculando por nome + email...';
    
    WITH orphan_leads_name_email AS (
        SELECT 
            pl.id as pipeline_lead_id,
            pl.custom_data->>'email' as email,
            pl.custom_data->>'nome_lead' as nome_lead,
            pl.custom_data
        FROM pipeline_leads pl
        WHERE pl.lead_master_id IS NULL 
          AND pl.custom_data->>'email' IS NOT NULL
          AND pl.custom_data->>'nome_lead' IS NOT NULL
          AND TRIM(pl.custom_data->>'email') != ''
          AND TRIM(pl.custom_data->>'nome_lead') != ''
    ),
    matching_masters_name_email AS (
        SELECT 
            ol.pipeline_lead_id,
            ol.custom_data,
            lm.id as master_id,
            lm.first_name,
            lm.last_name,
            lm.email,
            ROW_NUMBER() OVER (PARTITION BY ol.pipeline_lead_id ORDER BY lm.created_at DESC) as rn
        FROM orphan_leads_name_email ol
        JOIN leads_master lm ON (
            LOWER(TRIM(lm.email)) = LOWER(TRIM(ol.email))
            AND (
                LOWER(TRIM(CONCAT(lm.first_name, ' ', lm.last_name))) = LOWER(TRIM(ol.nome_lead))
                OR LOWER(TRIM(lm.first_name)) = LOWER(TRIM(ol.nome_lead))
                OR LOWER(TRIM(ol.nome_lead)) LIKE LOWER(TRIM(CONCAT(lm.first_name, '%')))
            )
        )
    )
    UPDATE pipeline_leads 
    SET lead_master_id = mm.master_id,
        custom_data = jsonb_set(
            jsonb_set(
                COALESCE(mm.custom_data, '{}'::jsonb),
                '{lead_master_id}',
                to_jsonb(mm.master_id::text)
            ),
            '{nome_lead}',
            to_jsonb(TRIM(CONCAT(mm.first_name, ' ', mm.last_name)))
        ),
        updated_at = NOW()
    FROM matching_masters_name_email mm
    WHERE pipeline_leads.id = mm.pipeline_lead_id 
      AND mm.rn = 1;
    
    GET DIAGNOSTICS linked_by_name_email = ROW_COUNT;
    RAISE NOTICE '[enhanced_migrate_orphan_leads] Leads vinculados por nome+email: %', linked_by_name_email;
    
    -- Calcular total de leads vinculados
    total_linked := linked_by_email + linked_by_name_email;
    
    -- Contar leads órfãos restantes
    SELECT COUNT(*) INTO orphan_count_after
    FROM pipeline_leads 
    WHERE lead_master_id IS NULL;
    
    RAISE NOTICE '[enhanced_migrate_orphan_leads] ETAPA 4 CONCLUÍDA:';
    RAISE NOTICE '  - Órfãos antes: %', orphan_count_before;
    RAISE NOTICE '  - Vinculados por email: %', linked_by_email;
    RAISE NOTICE '  - Vinculados por nome+email: %', linked_by_name_email;
    RAISE NOTICE '  - Total vinculados: %', total_linked;
    RAISE NOTICE '  - Órfãos restantes: %', orphan_count_after;
    RAISE NOTICE '  - Taxa de sucesso: %', 
        CASE 
            WHEN orphan_count_before > 0 
            THEN ROUND((total_linked::decimal / orphan_count_before::decimal) * 100, 2)
            ELSE 0 
        END;
    
    -- Retornar estatísticas detalhadas
    RETURN jsonb_build_object(
        'success', true,
        'orfaos_antes', orphan_count_before,
        'vinculados_por_email', linked_by_email,
        'vinculados_por_nome_email', linked_by_name_email,
        'total_vinculados', total_linked,
        'orfaos_restantes', orphan_count_after,
        'taxa_sucesso_pct', 
            CASE 
                WHEN orphan_count_before > 0 
                THEN ROUND((total_linked::decimal / orphan_count_before::decimal) * 100, 2)
                ELSE 0 
            END,
        'message', format('ETAPA 4 CONCLUÍDA: %s/%s leads vinculados (%.2f%% sucesso)', 
                         total_linked, 
                         orphan_count_before,
                         CASE 
                             WHEN orphan_count_before > 0 
                             THEN ROUND((total_linked::decimal / orphan_count_before::decimal) * 100, 2)
                             ELSE 0 
                         END)
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[enhanced_migrate_orphan_leads] ERRO: % - %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'message', 'ETAPA 4 FALHOU: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar a migração melhorada
SELECT enhanced_migrate_orphan_leads() as etapa4_result;

-- Verificar resultado final
SELECT 
    COUNT(*) as total_pipeline_leads,
    COUNT(lead_master_id) as com_lead_master_id,
    COUNT(*) - COUNT(lead_master_id) as orfaos_restantes,
    ROUND(
        (COUNT(lead_master_id)::decimal / COUNT(*)::decimal) * 100, 2
    ) as taxa_vinculacao_pct
FROM pipeline_leads;

-- Log de conclusão da ETAPA 4
SELECT 'ETAPA 4 CONCLUÍDA: Migração de leads órfãos executada com sucesso!' as status; 