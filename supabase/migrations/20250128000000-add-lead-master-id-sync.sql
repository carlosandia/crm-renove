-- ============================================
-- MIGRAÇÃO: SINCRONIZAÇÃO LEADS MASTER ↔ PIPELINE LEADS
-- ETAPA 1: Versão corrigida e defensiva
-- ============================================

-- Função auxiliar para verificar se uma coluna existe
CREATE OR REPLACE FUNCTION column_exists(target_table text, target_column text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' 
        AND c.table_name = target_table 
        AND c.column_name = target_column
    );
END;
$$ LANGUAGE plpgsql;

-- Função auxiliar para verificar se uma tabela existe
CREATE OR REPLACE FUNCTION table_exists(target_table text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        AND t.table_name = target_table
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. VERIFICAR E CRIAR ESTRUTURAS NECESSÁRIAS
-- ============================================

-- Verificar se a tabela leads_master existe
DO $$
BEGIN
    IF NOT table_exists('leads_master') THEN
        RAISE NOTICE 'Tabela leads_master não existe. Criando...';
        CREATE TABLE leads_master (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            company VARCHAR(255),
            job_title VARCHAR(255),
            lead_source VARCHAR(255),
            city VARCHAR(255),
            state VARCHAR(255),
            country VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            tenant_id UUID,
            created_by UUID,
            assigned_to UUID
        );
        
        CREATE INDEX idx_leads_master_email ON leads_master(email);
        CREATE INDEX idx_leads_master_tenant ON leads_master(tenant_id);
    END IF;
END $$;

-- Verificar se a tabela pipeline_leads existe
DO $$
BEGIN
    IF NOT table_exists('pipeline_leads') THEN
        RAISE NOTICE 'Tabela pipeline_leads não existe. Criando...';
        CREATE TABLE pipeline_leads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            pipeline_id UUID,
            stage_id UUID,
            custom_data JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            status VARCHAR(50) DEFAULT 'active',
            assigned_to UUID,
            created_by UUID
        );
        
        CREATE INDEX idx_pipeline_leads_pipeline ON pipeline_leads(pipeline_id);
        CREATE INDEX idx_pipeline_leads_stage ON pipeline_leads(stage_id);
    END IF;
END $$;

-- ============================================
-- 2. ADICIONAR COLUNA lead_master_id SE NÃO EXISTIR
-- ============================================

DO $$
BEGIN
    IF NOT column_exists('pipeline_leads', 'lead_master_id') THEN
        RAISE NOTICE 'Adicionando coluna lead_master_id na tabela pipeline_leads...';
        ALTER TABLE pipeline_leads 
        ADD COLUMN lead_master_id UUID REFERENCES leads_master(id) ON DELETE SET NULL;
        
        -- Criar índice para performance
        CREATE INDEX idx_pipeline_leads_master_id ON pipeline_leads(lead_master_id);
        
        RAISE NOTICE 'Coluna lead_master_id adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna lead_master_id já existe na tabela pipeline_leads';
    END IF;
END $$;

-- ============================================
-- 3. FUNÇÃO DE SINCRONIZAÇÃO INTELIGENTE
-- ============================================

CREATE OR REPLACE FUNCTION sync_pipeline_leads_from_master()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar todos os pipeline_leads que referenciam este lead_master
    UPDATE pipeline_leads 
    SET 
        custom_data = jsonb_build_object(
            -- Campos básicos de identidade
            'nome_lead', COALESCE(
                CASE 
                    WHEN NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL 
                    THEN NEW.first_name || ' ' || NEW.last_name
                    WHEN NEW.first_name IS NOT NULL 
                    THEN NEW.first_name
                    WHEN NEW.last_name IS NOT NULL 
                    THEN NEW.last_name
                    ELSE NULL
                END, 
                (custom_data->>'nome_lead')
            ),
            'email', COALESCE(NEW.email, (custom_data->>'email')),
            'telefone', COALESCE(NEW.phone, (custom_data->>'telefone')),
            'empresa', COALESCE(NEW.company, (custom_data->>'empresa')),
            'cargo', COALESCE(NEW.job_title, (custom_data->>'cargo')),
            'origem', COALESCE(NEW.lead_source, (custom_data->>'origem')),
            'cidade', COALESCE(NEW.city, (custom_data->>'cidade')),
            'estado', COALESCE(NEW.state, (custom_data->>'estado')),
            'pais', COALESCE(NEW.country, (custom_data->>'pais')),
            'observacoes', COALESCE(NEW.notes, (custom_data->>'observacoes')),
            
            -- Preservar campos UTM existentes
            'utm_source', COALESCE((custom_data->>'utm_source'), ''),
            'utm_medium', COALESCE((custom_data->>'utm_medium'), ''),
            'utm_campaign', COALESCE((custom_data->>'utm_campaign'), ''),
            'utm_term', COALESCE((custom_data->>'utm_term'), ''),
            'utm_content', COALESCE((custom_data->>'utm_content'), ''),
            
            -- Preservar outros campos personalizados existentes
            'nome_oportunidade', COALESCE((custom_data->>'nome_oportunidade'), ''),
            'valor', COALESCE((custom_data->>'valor'), ''),
            'temperatura', COALESCE((custom_data->>'temperatura'), ''),
            
            -- Garantir lead_master_id no custom_data
            'lead_master_id', NEW.id::text
        ) ||
        -- Preservar todos os outros campos existentes que não foram explicitamente mapeados
        COALESCE(
            (SELECT jsonb_object_agg(key, value) 
             FROM jsonb_each(custom_data) 
             WHERE key NOT IN (
                'nome_lead', 'email', 'telefone', 'empresa', 'cargo', 'origem', 
                'cidade', 'estado', 'pais', 'observacoes', 'utm_source', 'utm_medium', 
                'utm_campaign', 'utm_term', 'utm_content', 'nome_oportunidade', 
                'valor', 'temperatura', 'lead_master_id'
             )
            ), 
            '{}'::jsonb
        ),
        updated_at = NOW()
    WHERE lead_master_id = NEW.id;
    
    -- Log para debug
    RAISE NOTICE 'Sincronizado lead_master % para % pipeline_leads', NEW.id, (SELECT COUNT(*) FROM pipeline_leads WHERE lead_master_id = NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA
-- ============================================

-- Remover trigger existente se existir
DROP TRIGGER IF EXISTS trigger_sync_pipeline_leads_from_master ON leads_master;

-- Criar novo trigger
CREATE TRIGGER trigger_sync_pipeline_leads_from_master
    AFTER UPDATE ON leads_master
    FOR EACH ROW
    EXECUTE FUNCTION sync_pipeline_leads_from_master();

-- ============================================
-- 5. FUNÇÃO PARA POPULAR lead_master_id EXISTENTES
-- ============================================

CREATE OR REPLACE FUNCTION populate_existing_lead_master_ids()
RETURNS TABLE(
    processed_count INTEGER,
    matched_count INTEGER,
    unmatched_count INTEGER
) AS $$
DECLARE
    pipeline_lead RECORD;
    master_lead_id UUID;
    total_processed INTEGER := 0;
    total_matched INTEGER := 0;
    total_unmatched INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando população de lead_master_id existentes...';
    
    -- Iterar sobre pipeline_leads que não têm lead_master_id
    FOR pipeline_lead IN 
        SELECT id, custom_data
        FROM pipeline_leads 
        WHERE lead_master_id IS NULL 
        AND custom_data IS NOT NULL
    LOOP
        total_processed := total_processed + 1;
        master_lead_id := NULL;
        
        -- Tentativas de matching por diferentes campos
        -- 1. Por email
        IF pipeline_lead.custom_data->>'email' IS NOT NULL THEN
            SELECT id INTO master_lead_id
            FROM leads_master 
            WHERE email = (pipeline_lead.custom_data->>'email')
            LIMIT 1;
        END IF;
        
        -- 2. Por telefone se email não funcionou
        IF master_lead_id IS NULL AND pipeline_lead.custom_data->>'telefone' IS NOT NULL THEN
            SELECT id INTO master_lead_id
            FROM leads_master 
            WHERE phone = (pipeline_lead.custom_data->>'telefone')
            LIMIT 1;
        END IF;
        
        -- 3. Por nome + empresa se os anteriores não funcionaram
        IF master_lead_id IS NULL 
           AND pipeline_lead.custom_data->>'nome_lead' IS NOT NULL 
           AND pipeline_lead.custom_data->>'empresa' IS NOT NULL THEN
            
            SELECT id INTO master_lead_id
            FROM leads_master 
            WHERE (first_name || ' ' || last_name) = (pipeline_lead.custom_data->>'nome_lead')
            AND company = (pipeline_lead.custom_data->>'empresa')
            LIMIT 1;
        END IF;
        
        -- Se encontrou match, atualizar
        IF master_lead_id IS NOT NULL THEN
            UPDATE pipeline_leads 
            SET lead_master_id = master_lead_id,
                custom_data = custom_data || jsonb_build_object('lead_master_id', master_lead_id::text)
            WHERE id = pipeline_lead.id;
            
            total_matched := total_matched + 1;
            
            IF total_matched % 10 = 0 THEN
                RAISE NOTICE 'Processados: %, Vinculados: %', total_processed, total_matched;
            END IF;
        ELSE
            total_unmatched := total_unmatched + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'População concluída! Total: %, Vinculados: %, Não vinculados: %', 
                 total_processed, total_matched, total_unmatched;
    
    RETURN QUERY SELECT total_processed, total_matched, total_unmatched;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. POLÍTICAS RLS DEFENSIVAS
-- ============================================

-- Habilitar RLS nas tabelas se não estiver habilitado
DO $$
BEGIN
    -- Para pipeline_leads
    IF table_exists('pipeline_leads') THEN
        ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;
        
        -- Remover política existente se existir
        DROP POLICY IF EXISTS "pipeline_leads_access_policy" ON pipeline_leads;
        
        -- Criar política permissiva para desenvolvimento
        CREATE POLICY "pipeline_leads_access_policy" ON pipeline_leads
            FOR ALL
            USING (true) -- Política permissiva para desenvolvimento
            WITH CHECK (true);
    END IF;
    
    -- Para leads_master
    IF table_exists('leads_master') THEN
        ALTER TABLE leads_master ENABLE ROW LEVEL SECURITY;
        
        -- Remover política existente se existir
        DROP POLICY IF EXISTS "leads_master_access_policy" ON leads_master;
        
        -- Criar política permissiva para desenvolvimento
        CREATE POLICY "leads_master_access_policy" ON leads_master
            FOR ALL
            USING (true) -- Política permissiva para desenvolvimento
            WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- 7. LIMPEZA DE FUNÇÕES AUXILIARES
-- ============================================

-- Manter as funções auxiliares para uso futuro
COMMENT ON FUNCTION column_exists(text, text) IS 'Função auxiliar para verificar se uma coluna existe. Parâmetros: target_table, target_column';
COMMENT ON FUNCTION table_exists(text) IS 'Função auxiliar para verificar se uma tabela existe. Parâmetro: target_table';

-- ============================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN pipeline_leads.lead_master_id IS 'Referência ao lead na tabela leads_master para sincronização automática';
COMMENT ON FUNCTION sync_pipeline_leads_from_master() IS 'Função de trigger para sincronizar automaticamente dados de leads_master para pipeline_leads preservando campos existentes';
COMMENT ON FUNCTION populate_existing_lead_master_ids() IS 'Função para popular lead_master_id em registros existentes usando múltiplos critérios de matching';

-- ============================================
-- 9. VERIFICAÇÃO FINAL
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
    RAISE NOTICE 'Tabela leads_master existe: %', table_exists('leads_master');
    RAISE NOTICE 'Tabela pipeline_leads existe: %', table_exists('pipeline_leads');
    RAISE NOTICE 'Coluna lead_master_id existe: %', column_exists('pipeline_leads', 'lead_master_id');
    RAISE NOTICE 'Trigger criado: trigger_sync_pipeline_leads_from_master';
    RAISE NOTICE 'Funções criadas: sync_pipeline_leads_from_master, populate_existing_lead_master_ids';
    RAISE NOTICE '=== MIGRAÇÃO CONCLUÍDA COM SUCESSO ===';
END $$;

-- ============================================
-- 10. INSTRUÇÕES PÓS-MIGRAÇÃO (OPCIONAL)
-- ============================================

-- Para executar a população de dados existentes, execute:
-- SELECT * FROM populate_existing_lead_master_ids();

-- Para verificar o status da sincronização, execute:
-- SELECT 
--     COUNT(*) as total_pipeline_leads,
--     COUNT(lead_master_id) as with_master_id,
--     COUNT(*) - COUNT(lead_master_id) as without_master_id
-- FROM pipeline_leads; 