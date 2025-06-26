-- ============================================
-- MIGRAÇÃO: VINCULAR LEADS ÓRFÃOS AOS LEADS_MASTER
-- Data: 2025-01-28
-- Descrição: Vincular pipeline_leads órfãos (sem lead_master_id) 
--           aos seus leads_master correspondentes via email
-- ============================================

-- Criar função para migrar leads órfãos
CREATE OR REPLACE FUNCTION migrate_orphan_leads()
RETURNS jsonb AS $$
DECLARE
    orphan_count integer;
    linked_count integer;
    result_info jsonb;
BEGIN
    -- Contar leads órfãos antes
    SELECT COUNT(*) INTO orphan_count
    FROM pipeline_leads 
    WHERE lead_master_id IS NULL;
    
    RAISE NOTICE '[migrate_orphan_leads] Leads órfãos encontrados: %', orphan_count;
    
    -- Vincular leads órfãos que têm email correspondente em leads_master
    WITH orphan_leads AS (
        SELECT 
            pl.id as pipeline_lead_id,
            pl.custom_data->>'email' as email
        FROM pipeline_leads pl
        WHERE pl.lead_master_id IS NULL 
          AND pl.custom_data->>'email' IS NOT NULL
          AND pl.custom_data->>'email' != ''
    ),
    matching_masters AS (
        SELECT 
            ol.pipeline_lead_id,
            lm.id as master_id,
            ROW_NUMBER() OVER (PARTITION BY ol.pipeline_lead_id ORDER BY lm.created_at DESC) as rn
        FROM orphan_leads ol
        JOIN leads_master lm ON lm.email = ol.email
    )
    UPDATE pipeline_leads 
    SET lead_master_id = mm.master_id,
        updated_at = NOW()
    FROM matching_masters mm
    WHERE pipeline_leads.id = mm.pipeline_lead_id 
      AND mm.rn = 1;
    
    GET DIAGNOSTICS linked_count = ROW_COUNT;
    
    RAISE NOTICE '[migrate_orphan_leads] Leads vinculados: %', linked_count;
    
    -- Contar leads órfãos restantes
    SELECT COUNT(*) INTO orphan_count
    FROM pipeline_leads 
    WHERE lead_master_id IS NULL;
    
    RAISE NOTICE '[migrate_orphan_leads] Leads órfãos restantes: %', orphan_count;
    
    -- Retornar estatísticas
    RETURN jsonb_build_object(
        'success', true,
        'leads_vinculados', linked_count,
        'orfaos_restantes', orphan_count,
        'message', format('Migração concluída: %s leads vinculados, %s órfãos restantes', linked_count, orphan_count)
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[migrate_orphan_leads] Erro: % - %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar a migração
SELECT migrate_orphan_leads() as migration_result;

-- Log de conclusão
SELECT 'Migração de leads órfãos concluída' as status; 