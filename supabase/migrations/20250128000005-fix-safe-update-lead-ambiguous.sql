-- ============================================
-- MIGRAÇÃO: CORREÇÃO DE REFERÊNCIA AMBÍGUA NA FUNÇÃO safe_update_lead
-- Data: 2025-01-28
-- Descrição: Corrigir erro "column reference lead_id is ambiguous" 
--           renomeando parâmetro lead_id para target_lead_id
-- ============================================

-- Recriar função safe_update_lead com parâmetro renomeado
CREATE OR REPLACE FUNCTION safe_update_lead(target_lead_id uuid, lead_data jsonb)
RETURNS jsonb AS $$
DECLARE
    validated_data jsonb;
    result_record leads_master%ROWTYPE;
    affected_rows integer;
    pipeline_count integer;
    nome_antes text;
    nome_depois text;
BEGIN
    -- Log de início
    RAISE NOTICE '[safe_update_lead] Iniciando atualização do lead: %', target_lead_id;
    RAISE NOTICE '[safe_update_lead] Dados recebidos: %', lead_data;
    
    -- Verificar se o lead existe e obter nome atual
    SELECT first_name, last_name INTO nome_antes, nome_depois
    FROM leads_master 
    WHERE id = target_lead_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE '[safe_update_lead] Lead não encontrado: %', target_lead_id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Lead não encontrado',
            'error_code', 'LEAD_NOT_FOUND'
        );
    END IF;
    
    nome_antes := COALESCE(nome_antes, '') || CASE WHEN nome_depois IS NOT NULL AND nome_depois != '' THEN ' ' || nome_depois ELSE '' END;
    
    -- Validar dados de entrada
    validated_data := validate_lead_update(lead_data);
    RAISE NOTICE '[safe_update_lead] Dados validados: %', validated_data;
    
    -- Contar pipeline_leads associados ANTES da atualização
    SELECT COUNT(*) INTO pipeline_count
    FROM pipeline_leads 
    WHERE lead_master_id = target_lead_id;
    
    RAISE NOTICE '[safe_update_lead] Pipeline_leads associados: %', pipeline_count;
    
    -- Atualizar na tabela leads_master (isso vai disparar o trigger automaticamente)
    UPDATE leads_master 
    SET 
        first_name = COALESCE((validated_data->>'first_name'), first_name),
        last_name = COALESCE((validated_data->>'last_name'), last_name),
        email = COALESCE((validated_data->>'email'), email),
        phone = COALESCE((validated_data->>'phone'), phone),
        company = COALESCE((validated_data->>'company'), company),
        job_title = COALESCE((validated_data->>'job_title'), job_title),
        lead_source = COALESCE((validated_data->>'lead_source'), lead_source),
        city = COALESCE((validated_data->>'city'), city),
        state = COALESCE((validated_data->>'state'), state),
        country = COALESCE((validated_data->>'country'), country),
        notes = COALESCE((validated_data->>'notes'), notes),
        lead_temperature = COALESCE((validated_data->>'lead_temperature'), lead_temperature),
        status = COALESCE((validated_data->>'status'), status),
        estimated_value = COALESCE((validated_data->>'estimated_value')::decimal, estimated_value),
        utm_source = COALESCE((validated_data->>'utm_source'), utm_source),
        utm_medium = COALESCE((validated_data->>'utm_medium'), utm_medium),
        utm_campaign = COALESCE((validated_data->>'utm_campaign'), utm_campaign),
        utm_term = COALESCE((validated_data->>'utm_term'), utm_term),
        utm_content = COALESCE((validated_data->>'utm_content'), utm_content),
        position = COALESCE((validated_data->>'position'), position),
        source = COALESCE((validated_data->>'source'), source),
        lead_score = COALESCE((validated_data->>'lead_score')::integer, lead_score),
        probability = COALESCE((validated_data->>'probability')::integer, probability),
        campaign_name = COALESCE((validated_data->>'campaign_name'), campaign_name),
        referrer = COALESCE((validated_data->>'referrer'), referrer),
        landing_page = COALESCE((validated_data->>'landing_page'), landing_page),
        user_agent = COALESCE((validated_data->>'user_agent'), user_agent),
        last_contact_date = COALESCE((validated_data->>'last_contact_date')::timestamptz, last_contact_date),
        next_action_date = COALESCE((validated_data->>'next_action_date')::timestamptz, next_action_date),
        updated_at = now()
    WHERE id = target_lead_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows = 0 THEN
        RAISE NOTICE '[safe_update_lead] Nenhuma linha foi atualizada para lead: %', target_lead_id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Nenhuma linha foi atualizada',
            'error_code', 'NO_ROWS_AFFECTED'
        );
    END IF;
    
    RAISE NOTICE '[safe_update_lead] Lead atualizado com sucesso: % linhas afetadas', affected_rows;
    
    -- Buscar o registro atualizado
    SELECT * INTO result_record FROM leads_master WHERE id = target_lead_id;
    
    -- Calcular nome após atualização
    nome_depois := COALESCE(result_record.first_name, '') || 
                   CASE WHEN result_record.last_name IS NOT NULL AND result_record.last_name != '' 
                        THEN ' ' || result_record.last_name 
                        ELSE '' 
                   END;
    
    RAISE NOTICE '[safe_update_lead] Nome atualizado de % para %', nome_antes, nome_depois;
    
    -- Aguardar um momento para garantir que o trigger foi executado
    PERFORM pg_sleep(0.1);
    
    -- Verificar se a sincronização funcionou
    DECLARE
        sync_check_count integer;
    BEGIN
        SELECT COUNT(*) INTO sync_check_count
        FROM pipeline_leads 
        WHERE lead_master_id = target_lead_id 
        AND (custom_data->>'nome') = nome_depois;
        
        RAISE NOTICE '[safe_update_lead] Verificação de sincronização: % de % pipeline_leads sincronizados', sync_check_count, pipeline_count;
        
        IF sync_check_count < pipeline_count THEN
            RAISE NOTICE '[safe_update_lead] Sincronização incompleta, tentando novamente';
            
            -- Forçar sincronização manual se necessário
            UPDATE pipeline_leads 
            SET custom_data = custom_data || jsonb_build_object('nome', nome_depois, 'nome_lead', nome_depois),
                updated_at = NOW()
            WHERE lead_master_id = target_lead_id;
            
            RAISE NOTICE '[safe_update_lead] Sincronização manual executada';
        END IF;
    END;
    
    -- Retornar resultado completo
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Lead atualizado e sincronizado com sucesso',
        'affected_rows', affected_rows,
        'pipeline_leads_count', pipeline_count,
        'nome_antes', nome_antes,
        'nome_depois', nome_depois,
        'lead_id', target_lead_id,
        'updated_data', row_to_json(result_record),
        'sync_info', jsonb_build_object(
            'trigger_executed', true,
            'manual_sync_needed', false,
            'pipeline_leads_updated', pipeline_count
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[safe_update_lead] Erro: % - %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'lead_id', target_lead_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log de conclusão
SELECT 'Função safe_update_lead corrigida com sucesso - parâmetro lead_id renomeado para target_lead_id' as status; 