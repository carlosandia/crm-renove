-- Ensure Pipeline Stages for Admin Gestor Module
-- This migration ensures the "Nova Pipe" has proper stages configured

-- Insert stages for "Nova Pipe" if they don't exist
DO $$
DECLARE
    pipeline_uuid UUID;
    stage_count INTEGER;
BEGIN
    -- Find the "Nova Pipe" pipeline
    SELECT id INTO pipeline_uuid 
    FROM public.pipelines 
    WHERE name = 'Nova Pipe' 
    AND tenant_id = 'dc2f1fc5-53b5-4f54-bb56-009f58481b97'
    LIMIT 1;
    
    IF pipeline_uuid IS NOT NULL THEN
        -- Check if stages already exist
        SELECT COUNT(*) INTO stage_count 
        FROM public.pipeline_stages 
        WHERE pipeline_id = pipeline_uuid;
        
        -- Only create stages if none exist
        IF stage_count = 0 THEN
            RAISE NOTICE 'Creating stages for Nova Pipe pipeline: %', pipeline_uuid;
            
            -- Insert default stages
            INSERT INTO public.pipeline_stages (
                id, pipeline_id, name, order_index, temperature_score, 
                max_days_allowed, color, is_system_stage, created_at, updated_at
            ) VALUES 
            (
                gen_random_uuid(), pipeline_uuid, 'Novos Leads', 0, 1,
                30, '#3B82F6', false, NOW(), NOW()
            ),
            (
                gen_random_uuid(), pipeline_uuid, 'Qualificado', 1, 2,
                15, '#F59E0B', false, NOW(), NOW()
            ),
            (
                gen_random_uuid(), pipeline_uuid, 'Agendado', 2, 3,
                7, '#10B981', false, NOW(), NOW()
            ),
            (
                gen_random_uuid(), pipeline_uuid, 'Ganho', 3, 5,
                NULL, '#059669', true, NOW(), NOW()
            ),
            (
                gen_random_uuid(), pipeline_uuid, 'Perdido', 4, 0,
                NULL, '#DC2626', true, NOW(), NOW()
            );
            
            RAISE NOTICE 'Successfully created 5 stages for Nova Pipe';
        ELSE
            RAISE NOTICE 'Pipeline Nova Pipe already has % stages configured', stage_count;
        END IF;
    ELSE
        RAISE NOTICE 'Pipeline Nova Pipe not found in database';
    END IF;
END $$;

-- Ensure custom fields for Nova Pipe if they don't exist
DO $$
DECLARE
    pipeline_uuid UUID;
    field_count INTEGER;
BEGIN
    -- Find the "Nova Pipe" pipeline
    SELECT id INTO pipeline_uuid 
    FROM public.pipelines 
    WHERE name = 'Nova Pipe' 
    AND tenant_id = 'dc2f1fc5-53b5-4f54-bb56-009f58481b97'
    LIMIT 1;
    
    IF pipeline_uuid IS NOT NULL THEN
        -- Check if custom fields already exist
        SELECT COUNT(*) INTO field_count 
        FROM public.pipeline_custom_fields 
        WHERE pipeline_id = pipeline_uuid;
        
        -- Only create fields if none exist
        IF field_count = 0 THEN
            RAISE NOTICE 'Creating custom fields for Nova Pipe pipeline: %', pipeline_uuid;
            
            -- Insert default custom fields
            INSERT INTO public.pipeline_custom_fields (
                id, pipeline_id, field_name, field_label, field_type, 
                field_options, is_required, field_order, placeholder, created_at, updated_at
            ) VALUES 
            (
                gen_random_uuid(), pipeline_uuid, 'nome', 'Nome do Lead', 'text',
                NULL, true, 0, 'Digite o nome completo', NOW(), NOW()
            ),
            (
                gen_random_uuid(), pipeline_uuid, 'email', 'E-mail', 'email',
                NULL, true, 1, 'exemplo@email.com', NOW(), NOW()
            ),
            (
                gen_random_uuid(), pipeline_uuid, 'telefone', 'Telefone', 'phone',
                NULL, false, 2, '(11) 99999-9999', NOW(), NOW()
            ),
            (
                gen_random_uuid(), pipeline_uuid, 'empresa', 'Empresa', 'text',
                NULL, false, 3, 'Nome da empresa', NOW(), NOW()
            ),
            (
                gen_random_uuid(), pipeline_uuid, 'origem', 'Origem do Lead', 'select',
                '["Site", "Facebook", "Google Ads", "Indicação", "Outro"]', false, 4, NULL, NOW(), NOW()
            );
            
            RAISE NOTICE 'Successfully created 5 custom fields for Nova Pipe';
        ELSE
            RAISE NOTICE 'Pipeline Nova Pipe already has % custom fields configured', field_count;
        END IF;
    END IF;
END $$;

-- Ensure pipeline permissions
UPDATE public.pipelines 
SET updated_at = NOW()
WHERE name = 'Nova Pipe' 
AND tenant_id = 'dc2f1fc5-53b5-4f54-bb56-009f58481b97';

-- Grant permissions for admin role
GRANT ALL ON public.pipelines TO anon;
GRANT ALL ON public.pipeline_stages TO anon;
GRANT ALL ON public.pipeline_custom_fields TO anon;
GRANT ALL ON public.leads TO anon;
GRANT ALL ON public.pipeline_members TO anon; 