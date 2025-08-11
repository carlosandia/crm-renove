-- ============================================
-- 🕒 MIGRAÇÃO: HORÁRIOS ESPECÍFICOS PARA DISTRIBUIÇÃO
-- ============================================
-- Adiciona campos para configuração de horários específicos
-- na distribuição automática de leads

-- Adicionar campos de horário específico
ALTER TABLE pipeline_distribution_rules 
ADD COLUMN IF NOT EXISTS working_hours_start TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS working_hours_end TIME DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5]; -- Segunda a Sexta (1=Domingo, 2=Segunda...)

-- Atualizar comentários da tabela
COMMENT ON COLUMN pipeline_distribution_rules.working_hours_start IS 'Horário de início para distribuição (formato HH:MM:SS)';
COMMENT ON COLUMN pipeline_distribution_rules.working_hours_end IS 'Horário de fim para distribuição (formato HH:MM:SS)';
COMMENT ON COLUMN pipeline_distribution_rules.working_days IS 'Dias da semana ativos (1=Domingo, 2=Segunda, 3=Terça, 4=Quarta, 5=Quinta, 6=Sexta, 7=Sábado)';

-- Atualizar comentário da coluna working_hours_only para refletir nova funcionalidade
COMMENT ON COLUMN pipeline_distribution_rules.working_hours_only IS 'Se true, usa working_hours_start/end/days para validar horário';

-- Índices para performance em consultas de horário
CREATE INDEX IF NOT EXISTS idx_pipeline_distribution_working_hours 
ON pipeline_distribution_rules(tenant_id, working_hours_only) 
WHERE working_hours_only = true;

-- ============================================
-- 🔧 FUNÇÃO: VALIDAR SE ESTÁ EM HORÁRIO DE TRABALHO
-- ============================================
CREATE OR REPLACE FUNCTION is_within_working_hours(
    p_working_hours_only BOOLEAN,
    p_working_hours_start TIME,
    p_working_hours_end TIME,
    p_working_days INTEGER[],
    p_check_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS BOOLEAN 
LANGUAGE plpgsql
AS $$
DECLARE
    current_time_of_day TIME;
    current_day_of_week INTEGER;
BEGIN
    -- Se não está configurado para horário específico, sempre retorna true
    IF NOT p_working_hours_only THEN
        RETURN TRUE;
    END IF;
    
    -- Extrair hora e dia da semana do timestamp fornecido
    current_time_of_day := p_check_time::TIME;
    current_day_of_week := EXTRACT(DOW FROM p_check_time)::INTEGER + 1; -- Converter para 1-7 (Domingo=1)
    
    -- Verificar se o dia da semana está nos dias de trabalho
    IF NOT (current_day_of_week = ANY(p_working_days)) THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se a hora está dentro do horário de trabalho
    IF p_working_hours_start <= p_working_hours_end THEN
        -- Caso normal: 09:00 - 18:00
        RETURN current_time_of_day >= p_working_hours_start 
            AND current_time_of_day <= p_working_hours_end;
    ELSE
        -- Caso overnight: 22:00 - 06:00 (atravessa meia-noite)
        RETURN current_time_of_day >= p_working_hours_start 
            OR current_time_of_day <= p_working_hours_end;
    END IF;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION is_within_working_hours IS 'Verifica se timestamp está dentro do horário de trabalho configurado';

-- ============================================
-- 🧪 DADOS DE EXEMPLO (apenas para desenvolvimento)
-- ============================================
-- Atualizar registros existentes com horários padrão se necessário
-- (Esta atualização é segura pois usa DEFAULT values já definidos)

-- ============================================
-- 🔒 SEGURANÇA: RLS Policies mantidas
-- ============================================
-- As políticas RLS existentes continuam válidas
-- pois os novos campos pertencem à mesma tabela pipeline_distribution_rules