-- ============================================
-- 🔄 MIGRATION: Reverter 'perda' para 'perdido'
-- ============================================
-- 
-- Objetivo: Migrar todos os valores 'perda' para 'perdido'
-- Manter: ganho, win, loss (compatibilidade)
-- Data: 2025-08-12
-- Autor: Sistema CRM Renove

-- ============================================
-- ETAPA 1: BACKUP DOS DADOS ATUAIS
-- ============================================

-- Criar backup das tabelas antes da migração
CREATE TABLE IF NOT EXISTS migration_backup_pipeline_outcome_reasons AS 
SELECT * FROM pipeline_outcome_reasons WHERE reason_type = 'perda';

CREATE TABLE IF NOT EXISTS migration_backup_lead_outcome_history AS 
SELECT * FROM lead_outcome_history WHERE outcome_type = 'perda';

CREATE TABLE IF NOT EXISTS migration_backup_pipeline_win_loss_reasons AS 
SELECT * FROM pipeline_win_loss_reasons WHERE reason_type = 'perda';

-- ============================================
-- ETAPA 2: MIGRAR DADOS 'perda' → 'perdido'
-- ============================================

-- Atualizar pipeline_outcome_reasons
UPDATE pipeline_outcome_reasons 
SET reason_type = 'perdido' 
WHERE reason_type = 'perda';

-- Atualizar lead_outcome_history
UPDATE lead_outcome_history 
SET outcome_type = 'perdido' 
WHERE outcome_type = 'perda';

-- Atualizar pipeline_win_loss_reasons
UPDATE pipeline_win_loss_reasons 
SET reason_type = 'perdido' 
WHERE reason_type = 'perda';

-- ============================================
-- ETAPA 3: ATUALIZAR CONSTRAINTS (SE EXISTIREM)
-- ============================================

-- Verificar se existem constraints que precisam ser atualizadas
-- Nota: Como estamos usando VARCHAR, provavelmente não há ENUMs específicos

-- ============================================
-- ETAPA 4: VERIFICAR RESULTADOS
-- ============================================

-- Log da migração
DO $$
DECLARE
    v_outcome_count INTEGER;
    v_history_count INTEGER;
    v_winloss_count INTEGER;
BEGIN
    -- Contar registros migrados
    SELECT COUNT(*) INTO v_outcome_count FROM pipeline_outcome_reasons WHERE reason_type = 'perdido';
    SELECT COUNT(*) INTO v_history_count FROM lead_outcome_history WHERE outcome_type = 'perdido';
    SELECT COUNT(*) INTO v_winloss_count FROM pipeline_win_loss_reasons WHERE reason_type = 'perdido';
    
    -- Log dos resultados
    RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA:';
    RAISE NOTICE '- pipeline_outcome_reasons: % registros migrados para "perdido"', v_outcome_count;
    RAISE NOTICE '- lead_outcome_history: % registros migrados para "perdido"', v_history_count;
    RAISE NOTICE '- pipeline_win_loss_reasons: % registros migrados para "perdido"', v_winloss_count;
END $$;

-- ============================================
-- ETAPA 5: LIMPEZA DOS BACKUPS (OPCIONAL)
-- ============================================

-- Os backups serão mantidos por segurança
-- Para remover após confirmação, executar:
-- DROP TABLE IF EXISTS migration_backup_pipeline_outcome_reasons;
-- DROP TABLE IF EXISTS migration_backup_lead_outcome_history;
-- DROP TABLE IF EXISTS migration_backup_pipeline_win_loss_reasons;

-- ============================================
-- VALORES FINAIS SUPORTADOS
-- ============================================
-- Após esta migração, os valores suportados serão:
-- - 'ganho' (padrão português para vitórias)
-- - 'perdido' (padrão português para perdas)
-- - 'win' (compatibilidade com sistemas antigos)
-- - 'loss' (compatibilidade com sistemas antigos)