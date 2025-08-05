-- Migration: Converter configurações de cadência existentes em task instances
-- Data: 2025-07-26 03:00:00
-- Objetivo: Garantir que leads existentes tenham task instances baseadas nas configurações de cadência

-- ================================
-- FUNÇÃO PARA CONVERTER CADENCE_CONFIGS EM TASK_INSTANCES
-- ================================

CREATE OR REPLACE FUNCTION convert_cadence_configs_to_task_instances()
RETURNS INTEGER AS $$
DECLARE
    config_record RECORD;
    lead_record RECORD;
    task_record RECORD;
    stage_name_value TEXT;
    tasks_created_count INTEGER := 0;
    scheduled_date TIMESTAMPTZ;
    task_data JSONB;
BEGIN
    RAISE NOTICE 'Iniciando conversão de cadence_configs para task_instances...';
    
    -- Iterar por todas as configurações de cadência ativas
    FOR config_record IN 
        SELECT 
            id,
            pipeline_id,
            stage_name,
            tasks,
            tenant_id,
            created_at
        FROM cadence_configs 
        WHERE is_active = true 
        AND tasks IS NOT NULL 
        AND jsonb_array_length(tasks) > 0
    LOOP
        RAISE NOTICE 'Processando config: % para pipeline: % stage: %', 
                     config_record.id, config_record.pipeline_id, config_record.stage_name;
        
        -- Buscar todos os leads neste pipeline/stage que não possuem task instances
        FOR lead_record IN
            SELECT DISTINCT
                pl.id as lead_id,
                pl.pipeline_id,
                pl.stage_id,
                pl.assigned_to,
                pl.tenant_id,
                pl.created_at as lead_created_at,
                ps.name as stage_name
            FROM pipeline_leads pl
            INNER JOIN pipeline_stages ps ON pl.stage_id = ps.id
            WHERE pl.pipeline_id = config_record.pipeline_id
            AND ps.name = config_record.stage_name
            AND pl.tenant_id = config_record.tenant_id
            AND NOT EXISTS (
                -- Verificar se já tem task instances para este lead/stage
                SELECT 1 FROM cadence_task_instances cti 
                WHERE cti.lead_id = pl.id 
                AND cti.stage_id = pl.stage_id
                AND cti.tenant_id = pl.tenant_id
            )
        LOOP
            RAISE NOTICE 'Criando tasks para lead: % no stage: %', 
                         lead_record.lead_id, lead_record.stage_name;
            
            -- Iterar pelas tasks na configuração JSONB
            FOR task_data IN 
                SELECT jsonb_array_elements(config_record.tasks)
            LOOP
                -- Verificar se a task está ativa
                IF (task_data->>'is_active')::boolean = true THEN
                    -- Calcular data programada baseada no day_offset
                    scheduled_date := lead_record.lead_created_at + 
                                    INTERVAL '1 day' * COALESCE((task_data->>'day_offset')::integer, 0);
                    
                    -- Inserir task instance
                    INSERT INTO cadence_task_instances (
                        tenant_id,
                        lead_id,
                        pipeline_id,
                        stage_id,
                        cadence_step_id,
                        day_offset,
                        task_order,
                        title,
                        description,
                        activity_type,
                        channel,
                        template_content,
                        status,
                        scheduled_at,
                        is_manual_activity,
                        auto_generated,
                        created_at,
                        updated_at
                    ) VALUES (
                        lead_record.tenant_id,
                        lead_record.lead_id,
                        lead_record.pipeline_id,
                        lead_record.stage_id,
                        NULL, -- Não temos cadence_step_id no novo modelo
                        COALESCE((task_data->>'day_offset')::integer, 0),
                        COALESCE((task_data->>'task_order')::integer, 1),
                        COALESCE(task_data->>'task_title', 'Atividade de cadência'),
                        COALESCE(task_data->>'task_description', task_data->>'task_title', ''),
                        COALESCE(task_data->>'action_type', 'mensagem'),
                        COALESCE(task_data->>'channel', 'email'),
                        task_data->>'template_content',
                        'pending',
                        scheduled_date,
                        false, -- is_manual_activity
                        true,  -- auto_generated
                        NOW(),
                        NOW()
                    );
                    
                    tasks_created_count := tasks_created_count + 1;
                    
                    RAISE NOTICE 'Task criada: % - %', 
                                task_data->>'task_title', 
                                task_data->>'channel';
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Conversão concluída. Total de tasks criadas: %', tasks_created_count;
    RETURN tasks_created_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro na conversão: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- EXECUTAR A CONVERSÃO
-- ================================

-- Executar a função de conversão
SELECT convert_cadence_configs_to_task_instances() as tasks_created;

-- ================================
-- LIMPEZA: REMOVER FUNÇÃO TEMPORÁRIA
-- ================================

-- Drop da função após o uso (manter código limpo)
DROP FUNCTION IF EXISTS convert_cadence_configs_to_task_instances();

-- ================================
-- LOGS E VERIFICAÇÃO
-- ================================

-- Verificar resultados da conversão
DO $$
DECLARE
    total_configs INTEGER;
    total_task_instances INTEGER;
    total_leads INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_configs FROM cadence_configs WHERE is_active = true;
    SELECT COUNT(*) INTO total_task_instances FROM cadence_task_instances;
    SELECT COUNT(*) INTO total_leads FROM pipeline_leads;
    
    RAISE NOTICE '=== RELATÓRIO DE CONVERSÃO ===';
    RAISE NOTICE 'Configurações de cadência ativas: %', total_configs;
    RAISE NOTICE 'Task instances total: %', total_task_instances;
    RAISE NOTICE 'Leads total: %', total_leads;
    RAISE NOTICE '================================';
END $$;