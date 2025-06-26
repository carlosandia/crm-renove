-- ============================================
-- MIGRAÇÃO: FUNÇÕES DE VALIDAÇÃO PARA FRONTEND
-- Criar funções RPC para validar estruturas
-- Data: 2025-01-28
-- ============================================

-- Função para verificar colunas existentes em uma tabela
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE(column_name text) AS $$
BEGIN
    RETURN QUERY
    SELECT c.column_name::text
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
    AND c.table_name = $1
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar dados antes de update na leads_master
CREATE OR REPLACE FUNCTION validate_lead_update(lead_data jsonb)
RETURNS jsonb AS $$
DECLARE
    validated_data jsonb := '{}';
    col_name text;
BEGIN
    -- Lista de colunas que podem ser atualizadas na leads_master
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leads_master'
        AND column_name NOT IN ('id', 'created_at') -- Excluir campos não editáveis
    LOOP
        -- Verificar se o campo existe no JSON de entrada
        IF lead_data ? col_name THEN
            validated_data := validated_data || jsonb_build_object(col_name, lead_data->col_name);
        END IF;
    END LOOP;
    
    -- Sempre incluir updated_at
    validated_data := validated_data || jsonb_build_object('updated_at', now());
    
    RETURN validated_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar lead de forma segura
CREATE OR REPLACE FUNCTION safe_update_lead(lead_id uuid, lead_data jsonb)
RETURNS jsonb AS $$
DECLARE
    validated_data jsonb;
    result_record leads_master%ROWTYPE;
    affected_rows integer;
BEGIN
    -- Validar dados de entrada
    validated_data := validate_lead_update(lead_data);
    
    -- Log para debug
    RAISE NOTICE 'Atualizando lead % com dados: %', lead_id, validated_data;
    
    -- Verificar se o lead existe
    IF NOT EXISTS (SELECT 1 FROM leads_master WHERE id = lead_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Lead não encontrado',
            'error_code', 'LEAD_NOT_FOUND'
        );
    END IF;
    
    -- Atualizar usando SQL dinâmico seguro
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
    WHERE id = lead_id;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Nenhuma linha foi atualizada',
            'error_code', 'NO_ROWS_AFFECTED'
        );
    END IF;
    
    -- Buscar o registro atualizado
    SELECT * INTO result_record FROM leads_master WHERE id = lead_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Lead atualizado com sucesso',
        'affected_rows', affected_rows,
        'updated_data', row_to_json(result_record)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICAÇÃO E TESTE DAS FUNÇÕES
-- ============================================

DO $$
DECLARE
    test_result jsonb;
    columns_count integer;
BEGIN
    -- Verificar se as funções foram criadas
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_table_columns') THEN
        RAISE NOTICE '✅ Função get_table_columns criada com sucesso';
    ELSE
        RAISE NOTICE '❌ Erro: Função get_table_columns não foi criada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_lead_update') THEN
        RAISE NOTICE '✅ Função validate_lead_update criada com sucesso';
    ELSE
        RAISE NOTICE '❌ Erro: Função validate_lead_update não foi criada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'safe_update_lead') THEN
        RAISE NOTICE '✅ Função safe_update_lead criada com sucesso';
    ELSE
        RAISE NOTICE '❌ Erro: Função safe_update_lead não foi criada';
    END IF;
    
    -- Teste básico das funções se a tabela leads_master existir
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads_master') THEN
        -- Testar get_table_columns
        SELECT COUNT(*) INTO columns_count
        FROM get_table_columns('leads_master');
        
        RAISE NOTICE '✅ Função get_table_columns testada: % colunas encontradas', columns_count;
        
        -- Testar validate_lead_update
        SELECT validate_lead_update('{"first_name": "Test", "invalid_field": "should_be_ignored"}') INTO test_result;
        
        IF test_result ? 'first_name' AND NOT test_result ? 'invalid_field' THEN
            RAISE NOTICE '✅ Função validate_lead_update testada: validação funcionando';
        ELSE
            RAISE NOTICE '⚠️ Função validate_lead_update: resultado inesperado';
        END IF;
        
    ELSE
        RAISE NOTICE '⚠️ Tabela leads_master não encontrada - pule os testes automáticos';
    END IF;
    
    RAISE NOTICE '🎉 Migração 20250128000002 executada com sucesso!';
    RAISE NOTICE '📋 Funções RPC criadas e prontas para uso no frontend';
END $$;

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON FUNCTION get_table_columns(text) IS 'Retorna lista de colunas de uma tabela específica';
COMMENT ON FUNCTION validate_lead_update(jsonb) IS 'Valida e filtra dados para atualização segura na tabela leads_master';
COMMENT ON FUNCTION safe_update_lead(uuid, jsonb) IS 'Atualiza lead de forma segura com validação automática de campos';

-- ============================================
-- INSTRUÇÕES DE USO
-- ============================================

/*
COMO USAR AS FUNÇÕES CRIADAS:

1. get_table_columns(table_name):
   SELECT * FROM get_table_columns('leads_master');

2. validate_lead_update(lead_data):
   SELECT validate_lead_update('{"first_name": "João", "invalid_field": "ignored"}');

3. safe_update_lead(lead_id, lead_data):
   SELECT safe_update_lead(
     'uuid-do-lead'::uuid, 
     '{"first_name": "João", "email": "joao@email.com"}'::jsonb
   );

EXEMPLO DE USO NO FRONTEND:
const { data, error } = await supabase.rpc('safe_update_lead', {
  lead_id: 'uuid-do-lead',
  lead_data: { first_name: 'João', email: 'joao@email.com' }
});
*/ 