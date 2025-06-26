-- ============================================
-- MIGRAÇÃO: IMPLEMENTAÇÃO DE FONTE ÚNICA DE DADOS
-- Data: 2025-01-28
-- Objetivo: Migrar pipeline_leads para usar leads_master como fonte única
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

-- ============================================
-- ETAPA 1: GARANTIR ESTRUTURA NECESSÁRIA
-- ============================================

-- Adicionar coluna lead_master_id se não existir
DO $$
BEGIN
    IF NOT column_exists('pipeline_leads', 'lead_master_id') THEN
        ALTER TABLE pipeline_leads ADD COLUMN lead_master_id UUID;
        RAISE NOTICE 'Coluna lead_master_id adicionada à tabela pipeline_leads';
    END IF;
END $$;

-- ============================================
-- ETAPA 2: MIGRAR DADOS ÓRFÃOS PARA LEADS_MASTER
-- ============================================

-- Função para migrar pipeline_leads órfãos para leads_master
CREATE OR REPLACE FUNCTION migrate_orphan_pipeline_leads()
RETURNS void AS $$
DECLARE
    orphan_lead RECORD;
    new_lead_master_id UUID;
    total_migrated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando migração de pipeline_leads órfãos para leads_master...';
    
    -- Buscar pipeline_leads sem lead_master_id
    FOR orphan_lead IN 
        SELECT id, custom_data, created_by, created_at, updated_at
        FROM pipeline_leads 
        WHERE lead_master_id IS NULL 
        AND custom_data IS NOT NULL
    LOOP
        -- Criar novo lead_master baseado no custom_data
        INSERT INTO leads_master (
            id,
            first_name,
            last_name,
            email,
            phone,
            company,
            job_title,
            lead_source,
            lead_temperature,
            status,
            estimated_value,
            campaign_name,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_term,
            utm_content,
            city,
            state,
            country,
            notes,
            created_by,
            created_at,
            updated_at,
            tenant_id
        ) VALUES (
            gen_random_uuid(),
            -- Extrair first_name e last_name do nome_lead
            CASE 
                WHEN orphan_lead.custom_data->>'nome_lead' IS NOT NULL THEN
                    SPLIT_PART(orphan_lead.custom_data->>'nome_lead', ' ', 1)
                ELSE 'Lead'
            END,
            CASE 
                WHEN orphan_lead.custom_data->>'nome_lead' IS NOT NULL AND 
                     array_length(string_to_array(orphan_lead.custom_data->>'nome_lead', ' '), 1) > 1 THEN
                    SUBSTRING(orphan_lead.custom_data->>'nome_lead' FROM POSITION(' ' IN orphan_lead.custom_data->>'nome_lead') + 1)
                ELSE 'Migrado'
            END,
            COALESCE(orphan_lead.custom_data->>'email', 'migrado@sistema.com'),
            orphan_lead.custom_data->>'telefone',
            orphan_lead.custom_data->>'empresa',
            orphan_lead.custom_data->>'cargo',
            orphan_lead.custom_data->>'origem',
            COALESCE(orphan_lead.custom_data->>'temperatura', 'warm'),
            COALESCE(orphan_lead.custom_data->>'status', 'active'),
            CASE 
                WHEN orphan_lead.custom_data->>'valor' ~ '^[0-9]+\.?[0-9]*$' THEN
                    (orphan_lead.custom_data->>'valor')::DECIMAL
                ELSE 0
            END,
            orphan_lead.custom_data->>'campanha',
            orphan_lead.custom_data->>'utm_source',
            orphan_lead.custom_data->>'utm_medium',
            orphan_lead.custom_data->>'utm_campaign',
            orphan_lead.custom_data->>'utm_term',
            orphan_lead.custom_data->>'utm_content',
            orphan_lead.custom_data->>'cidade',
            orphan_lead.custom_data->>'estado',
            orphan_lead.custom_data->>'pais',
            orphan_lead.custom_data->>'observacoes',
            orphan_lead.created_by,
            orphan_lead.created_at,
            orphan_lead.updated_at,
            -- Buscar tenant_id do usuário criador
            (SELECT tenant_id FROM users WHERE id = orphan_lead.created_by LIMIT 1)
        ) RETURNING id INTO new_lead_master_id;
        
        -- Atualizar pipeline_leads com o novo lead_master_id
        UPDATE pipeline_leads 
        SET lead_master_id = new_lead_master_id
        WHERE id = orphan_lead.id;
        
        total_migrated := total_migrated + 1;
    END LOOP;
    
    RAISE NOTICE 'Migração concluída: % pipeline_leads órfãos migrados para leads_master', total_migrated;
END;
$$ LANGUAGE plpgsql;

-- Executar migração
SELECT migrate_orphan_pipeline_leads();

-- ============================================
-- ETAPA 3: VINCULAR PIPELINE_LEADS EXISTENTES
-- ============================================

-- Função para vincular pipeline_leads com leads_master existentes
CREATE OR REPLACE FUNCTION link_existing_pipeline_leads()
RETURNS void AS $$
DECLARE
    pipeline_lead RECORD;
    master_lead_id UUID;
    total_linked INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando vinculação de pipeline_leads com leads_master existentes...';
    
    -- Buscar pipeline_leads ainda sem lead_master_id
    FOR pipeline_lead IN 
        SELECT id, custom_data
        FROM pipeline_leads 
        WHERE lead_master_id IS NULL 
        AND custom_data IS NOT NULL
    LOOP
        master_lead_id := NULL;
        
        -- Tentar encontrar por email
        IF pipeline_lead.custom_data->>'email' IS NOT NULL THEN
            SELECT id INTO master_lead_id
            FROM leads_master 
            WHERE email = (pipeline_lead.custom_data->>'email')
            LIMIT 1;
        END IF;
        
        -- Se não encontrou por email, tentar por nome + empresa
        IF master_lead_id IS NULL AND 
           pipeline_lead.custom_data->>'nome_lead' IS NOT NULL AND
           pipeline_lead.custom_data->>'empresa' IS NOT NULL THEN
            
            SELECT id INTO master_lead_id
            FROM leads_master 
            WHERE (first_name || ' ' || last_name) = (pipeline_lead.custom_data->>'nome_lead')
            AND company = (pipeline_lead.custom_data->>'empresa')
            LIMIT 1;
        END IF;
        
        -- Se encontrou match, atualizar
        IF master_lead_id IS NOT NULL THEN
            UPDATE pipeline_leads 
            SET lead_master_id = master_lead_id
            WHERE id = pipeline_lead.id;
            
            total_linked := total_linked + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Vinculação concluída: % pipeline_leads vinculados com leads_master existentes', total_linked;
END;
$$ LANGUAGE plpgsql;

-- Executar vinculação
SELECT link_existing_pipeline_leads();

-- ============================================
-- ETAPA 4: ADICIONAR CONSTRAINTS E ÍNDICES
-- ============================================

-- Adicionar foreign key constraint (apenas para novos registros)
DO $$
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_pipeline_leads_lead_master_id' 
        AND table_name = 'pipeline_leads'
    ) THEN
        -- Adicionar constraint apenas para registros futuros (permitir NULL para compatibilidade)
        ALTER TABLE pipeline_leads 
        ADD CONSTRAINT fk_pipeline_leads_lead_master_id 
        FOREIGN KEY (lead_master_id) REFERENCES leads_master(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key constraint adicionada: fk_pipeline_leads_lead_master_id';
    END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_lead_master_id 
ON pipeline_leads(lead_master_id);

-- ============================================
-- ETAPA 5: CRIAR TRIGGER DE SINCRONIZAÇÃO
-- ============================================

-- Trigger para manter sincronização automática
CREATE OR REPLACE FUNCTION sync_leads_master_to_pipeline_leads()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar todos os pipeline_leads que referenciam este lead_master
    -- Não fazemos nada aqui pois agora pipeline_leads busca dados diretamente de leads_master
    -- Este trigger serve apenas para logging se necessário
    
    RAISE NOTICE 'Lead master atualizado: %', NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_sync_leads_master ON leads_master;
CREATE TRIGGER trigger_sync_leads_master
    AFTER UPDATE ON leads_master
    FOR EACH ROW
    EXECUTE FUNCTION sync_leads_master_to_pipeline_leads();

-- ============================================
-- ETAPA 6: ESTATÍSTICAS FINAIS
-- ============================================

DO $$
DECLARE
    total_pipeline_leads INTEGER;
    pipeline_leads_with_master INTEGER;
    pipeline_leads_orphan INTEGER;
    total_leads_master INTEGER;
BEGIN
    -- Contar registros
    SELECT COUNT(*) INTO total_pipeline_leads FROM pipeline_leads;
    SELECT COUNT(*) INTO pipeline_leads_with_master FROM pipeline_leads WHERE lead_master_id IS NOT NULL;
    SELECT COUNT(*) INTO pipeline_leads_orphan FROM pipeline_leads WHERE lead_master_id IS NULL;
    SELECT COUNT(*) INTO total_leads_master FROM leads_master;
    
    RAISE NOTICE '=== ESTATÍSTICAS DA MIGRAÇÃO ===';
    RAISE NOTICE 'Total pipeline_leads: %', total_pipeline_leads;
    RAISE NOTICE 'Pipeline_leads com lead_master_id: %', pipeline_leads_with_master;
    RAISE NOTICE 'Pipeline_leads órfãos restantes: %', pipeline_leads_orphan;
    RAISE NOTICE 'Total leads_master: %', total_leads_master;
    RAISE NOTICE '=== MIGRAÇÃO DE FONTE ÚNICA CONCLUÍDA ===';
END $$;

-- Limpar funções auxiliares
DROP FUNCTION IF EXISTS column_exists(text, text);
DROP FUNCTION IF EXISTS migrate_orphan_pipeline_leads();
DROP FUNCTION IF EXISTS link_existing_pipeline_leads(); 