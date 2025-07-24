-- =========================================================================
-- Migração: Atualização de Nomenclatura das Etapas para Português
-- Data: 2025-07-14
-- Descrição: Atualiza as nomenclaturas das etapas do sistema de:
--           - "Closed Won" → "Ganho" 
--           - "Closed Lost" → "Perdido"
-- =========================================================================

-- ✅ ETAPA 1: Atualizar etapas existentes na tabela pipeline_stages
UPDATE pipeline_stages 
SET name = 'Ganho'
WHERE name = 'Closed Won' AND is_system_stage = true;

UPDATE pipeline_stages 
SET name = 'Perdido'  
WHERE name = 'Closed Lost' AND is_system_stage = true;

-- ✅ ETAPA 2: Atualizar qualquer referência na tabela pipeline_leads 
-- (caso algum lead esteja em etapas com nome antigo)
UPDATE pipeline_leads 
SET stage_name = 'Ganho'
WHERE stage_name = 'Closed Won';

UPDATE pipeline_leads 
SET stage_name = 'Perdido'
WHERE stage_name = 'Closed Lost';

-- ✅ ETAPA 3: Atualizar referências na tabela lead_history
-- (histórico de mudanças de etapas)
UPDATE lead_history 
SET new_value = 'Ganho'
WHERE field_name = 'stage' AND new_value = 'Closed Won';

UPDATE lead_history 
SET old_value = 'Ganho'
WHERE field_name = 'stage' AND old_value = 'Closed Won';

UPDATE lead_history 
SET new_value = 'Perdido'
WHERE field_name = 'stage' AND new_value = 'Closed Lost';

UPDATE lead_history 
SET old_value = 'Perdido'
WHERE field_name = 'stage' AND old_value = 'Closed Lost';

-- ✅ ETAPA 4: Atualizar tabela cadence_configs se existir referência às etapas
UPDATE cadence_configs 
SET stage_name = 'Ganho'
WHERE stage_name = 'Closed Won';

UPDATE cadence_configs 
SET stage_name = 'Perdido'
WHERE stage_name = 'Closed Lost';

-- ✅ ETAPA 5: Verificação de integridade - criar constraint para garantir nomenclatura correta
-- Adicionar constraint para garantir que as etapas do sistema usem nomenclatura em português
DO $$
BEGIN
    -- Verificar se constraint já existe antes de criar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'system_stages_pt_br_nomenclature'
    ) THEN
        ALTER TABLE pipeline_stages 
        ADD CONSTRAINT system_stages_pt_br_nomenclature 
        CHECK (
            NOT is_system_stage OR 
            name IN ('Lead', 'Ganho', 'Perdido')
        );
    END IF;
END $$;

-- ✅ ETAPA 6: Comentários informativos
COMMENT ON CONSTRAINT system_stages_pt_br_nomenclature ON pipeline_stages IS 
'Garante que etapas do sistema usem nomenclatura em português: Lead, Ganho, Perdido';

-- ✅ ETAPA 7: Log da migração
INSERT INTO public.migration_log (migration_name, executed_at, description) 
VALUES (
    '20250714000000-update-stage-nomenclature-pt-br',
    NOW(),
    'Atualização das nomenclaturas das etapas do sistema para português: Closed Won → Ganho, Closed Lost → Perdido'
) ON CONFLICT DO NOTHING;