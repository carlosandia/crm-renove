-- ============================================
-- MIGRAÇÃO: CORREÇÃO COMPLETA DO TRIGGER DE SINCRONIZAÇÃO
-- Garantir que TODOS os campos sejam sincronizados corretamente
-- Data: 2025-01-28
-- ============================================

-- Função corrigida para sincronização completa
CREATE OR REPLACE FUNCTION sync_pipeline_leads_from_master()
RETURNS TRIGGER AS $$
DECLARE
    updated_count INTEGER;
    nome_completo TEXT;
BEGIN
    -- Calcular nome completo de forma robusta
    nome_completo := CASE 
        WHEN NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL AND NEW.last_name != ''
        THEN NEW.first_name || ' ' || NEW.last_name
        WHEN NEW.first_name IS NOT NULL 
        THEN NEW.first_name
        WHEN NEW.last_name IS NOT NULL 
        THEN NEW.last_name
        ELSE 'Lead'
    END;

    -- Log de início para debug
    RAISE NOTICE 'Iniciando sincronização para lead_master: %', NEW.id;
    RAISE NOTICE 'Nome calculado: %', nome_completo;
    RAISE NOTICE 'Email: %', NEW.email;

    -- Atualizar todos os pipeline_leads que referenciam este lead_master
    UPDATE pipeline_leads 
    SET 
        custom_data = jsonb_build_object(
            -- ✅ CAMPOS PRINCIPAIS - TODOS OS FORMATOS POSSÍVEIS
            'nome', nome_completo,                    -- Para DraggableLeadCard
            'nome_lead', nome_completo,               -- Para compatibilidade
            'lead_name', nome_completo,               -- Para compatibilidade
            
            -- ✅ CAMPOS DE CONTATO
            'email', COALESCE(NEW.email, (custom_data->>'email')),
            'telefone', COALESCE(NEW.phone, (custom_data->>'telefone')),
            'lead_email', COALESCE(NEW.email, (custom_data->>'lead_email')),
            
            -- ✅ CAMPOS PROFISSIONAIS
            'empresa', COALESCE(NEW.company, (custom_data->>'empresa')),
            'cargo', COALESCE(NEW.job_title, (custom_data->>'cargo')),
            
            -- ✅ CAMPOS DE LOCALIZAÇÃO
            'cidade', COALESCE(NEW.city, (custom_data->>'cidade')),
            'estado', COALESCE(NEW.state, (custom_data->>'estado')),
            'pais', COALESCE(NEW.country, (custom_data->>'pais')),
            
            -- ✅ CAMPOS DE METADATA
            'origem', COALESCE(NEW.lead_source, (custom_data->>'origem')),
            'observacoes', COALESCE(NEW.notes, (custom_data->>'observacoes')),
            'temperatura', COALESCE(NEW.lead_temperature, (custom_data->>'temperatura')),
            'status', COALESCE(NEW.status, (custom_data->>'status')),
            
            -- ✅ CAMPOS UTM (preservar existentes se NEW for null)
            'utm_source', COALESCE(NEW.utm_source, (custom_data->>'utm_source')),
            'utm_medium', COALESCE(NEW.utm_medium, (custom_data->>'utm_medium')),
            'utm_campaign', COALESCE(NEW.utm_campaign, (custom_data->>'utm_campaign')),
            'utm_term', COALESCE(NEW.utm_term, (custom_data->>'utm_term')),
            'utm_content', COALESCE(NEW.utm_content, (custom_data->>'utm_content')),
            
            -- ✅ CAMPOS DE VALOR
            'valor_estimado', COALESCE(NEW.estimated_value::text, (custom_data->>'valor_estimado')),
            
            -- ✅ CAMPOS DE IDENTIFICAÇÃO
            'lead_master_id', NEW.id::text,
            
            -- ✅ CAMPOS DE TRACKING
            'lead_score', COALESCE(NEW.lead_score::text, (custom_data->>'lead_score')),
            'probability', COALESCE(NEW.probability::text, (custom_data->>'probability')),
            'campaign_name', COALESCE(NEW.campaign_name, (custom_data->>'campaign_name')),
            'referrer', COALESCE(NEW.referrer, (custom_data->>'referrer')),
            'landing_page', COALESCE(NEW.landing_page, (custom_data->>'landing_page')),
            'user_agent', COALESCE(NEW.user_agent, (custom_data->>'user_agent'))
        ) ||
        -- ✅ PRESERVAR CAMPOS ESPECÍFICOS DO PIPELINE (não sobrescrever)
        COALESCE(
            (SELECT jsonb_object_agg(key, value) 
             FROM jsonb_each(custom_data) 
             WHERE key IN (
                'nome_oportunidade', 'valor', 'valor_numerico', 'source', 
                'existing_lead_id', 'profissão', 'qtd._alunos', 'lead_id',
                'position', 'job_title_extra', 'custom_field_1', 'custom_field_2'
             )
            ), 
            '{}'::jsonb
        ),
        updated_at = NOW()
    WHERE lead_master_id = NEW.id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log de resultado detalhado
    RAISE NOTICE 'Sincronizados % pipeline_leads', updated_count;
    RAISE NOTICE 'Nome atualizado para: %', nome_completo;
    RAISE NOTICE 'Email sincronizado: %', NEW.email;
    
    -- Se nenhum registro foi atualizado, avisar
    IF updated_count = 0 THEN
        RAISE NOTICE 'Nenhum pipeline_lead encontrado com lead_master_id: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RECRIAR TRIGGER PARA GARANTIR QUE ESTÁ ATIVO
-- ============================================

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_sync_pipeline_leads_from_master ON leads_master;

-- Criar trigger novo
CREATE TRIGGER trigger_sync_pipeline_leads_from_master
    AFTER UPDATE ON leads_master
    FOR EACH ROW
    EXECUTE FUNCTION sync_pipeline_leads_from_master();

-- ============================================
-- SINCRONIZAÇÃO MANUAL DOS DADOS EXISTENTES
-- ============================================

-- Executar sincronização manual para todos os leads existentes
DO $$
DECLARE
    lead_record leads_master%ROWTYPE;
    total_leads INTEGER;
    processed_leads INTEGER := 0;
BEGIN
    -- Contar total de leads
    SELECT COUNT(*) INTO total_leads FROM leads_master WHERE id IN (
        SELECT DISTINCT lead_master_id FROM pipeline_leads WHERE lead_master_id IS NOT NULL
    );
    
    RAISE NOTICE 'Iniciando sincronização manual de % leads existentes', total_leads;
    
    -- Processar cada lead que tem pipeline_leads associados
    FOR lead_record IN 
        SELECT * FROM leads_master 
        WHERE id IN (
            SELECT DISTINCT lead_master_id 
            FROM pipeline_leads 
            WHERE lead_master_id IS NOT NULL
        )
    LOOP
        processed_leads := processed_leads + 1;
        
        -- Simular UPDATE para disparar o trigger
        UPDATE leads_master 
        SET updated_at = NOW() 
        WHERE id = lead_record.id;
        
        -- Log de progresso a cada 5 leads
        IF processed_leads % 5 = 0 OR processed_leads = total_leads THEN
            RAISE NOTICE 'Processados % leads', processed_leads;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Sincronização manual concluída: % leads processados', processed_leads;
END $$;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

DO $$
DECLARE
    sync_count INTEGER;
    total_pipeline_leads INTEGER;
    success_rate DECIMAL;
BEGIN
    -- Verificar quantos pipeline_leads têm lead_master_id
    SELECT COUNT(*) INTO total_pipeline_leads 
    FROM pipeline_leads 
    WHERE lead_master_id IS NOT NULL;
    
    -- Verificar quantos têm nome sincronizado
    SELECT COUNT(*) INTO sync_count 
    FROM pipeline_leads 
    WHERE lead_master_id IS NOT NULL 
    AND (custom_data->>'nome') IS NOT NULL 
    AND (custom_data->>'nome') != '';
    
    -- Calcular taxa de sucesso
    success_rate := ROUND((sync_count::decimal / NULLIF(total_pipeline_leads, 0)) * 100, 2);
    
    RAISE NOTICE 'Resultado da sincronização:';
    RAISE NOTICE 'Total pipeline_leads: %', total_pipeline_leads;
    RAISE NOTICE 'Pipeline_leads sincronizados: %', sync_count;
    RAISE NOTICE 'Taxa de sucesso: %', success_rate;
    
    IF sync_count = total_pipeline_leads THEN
        RAISE NOTICE 'Sincronização bem-sucedida!';
    ELSE
        RAISE NOTICE 'Sincronização parcial';
    END IF;
END $$;

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON FUNCTION sync_pipeline_leads_from_master() IS 'Sincroniza automaticamente dados de leads_master para pipeline_leads';
COMMENT ON TRIGGER trigger_sync_pipeline_leads_from_master ON leads_master IS 'Trigger que executa sincronização após UPDATE em leads_master'; 