-- =====================================================================================
-- MIGRATION: Sistema de Anotações
-- Data: 2025-08-02 15:00:00
-- Autor: Claude (Arquiteto Sênior)
-- Descrição: Cria tabela annotations com RLS e índices otimizados
-- =====================================================================================

-- Criar tabela annotations
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    pipeline_lead_id UUID REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    lead_master_id UUID REFERENCES leads_master(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- HTML do editor rico
    content_plain TEXT NOT NULL, -- Versão texto para busca full-text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- AIDEV-NOTE: Constraint para garantir que pelo menos um lead ID seja fornecido
    CONSTRAINT annotations_lead_id_check CHECK (
        pipeline_lead_id IS NOT NULL OR lead_master_id IS NOT NULL
    ),
    
    -- AIDEV-NOTE: Constraint para validar tamanhos de conteúdo
    CONSTRAINT annotations_content_length_check CHECK (
        LENGTH(content) > 0 AND LENGTH(content) <= 10000 AND
        LENGTH(content_plain) > 0 AND LENGTH(content_plain) <= 5000
    )
);

-- Comentários na tabela
COMMENT ON TABLE annotations IS 'Sistema de anotações para leads e oportunidades';
COMMENT ON COLUMN annotations.content IS 'Conteúdo HTML do editor rico (máx 10k chars)';
COMMENT ON COLUMN annotations.content_plain IS 'Versão texto para busca (máx 5k chars)';
COMMENT ON COLUMN annotations.pipeline_lead_id IS 'Referência para oportunidade específica';
COMMENT ON COLUMN annotations.lead_master_id IS 'Referência para lead master (pessoa/empresa)';

-- Criar índices para performance otimizada
CREATE INDEX idx_annotations_tenant_id ON annotations(tenant_id);
CREATE INDEX idx_annotations_pipeline_lead_id ON annotations(pipeline_lead_id) WHERE pipeline_lead_id IS NOT NULL;
CREATE INDEX idx_annotations_lead_master_id ON annotations(lead_master_id) WHERE lead_master_id IS NOT NULL;
CREATE INDEX idx_annotations_owner_id ON annotations(owner_id);
CREATE INDEX idx_annotations_created_at ON annotations(created_at DESC); -- Para ordenação cronológica
CREATE INDEX idx_annotations_updated_at ON annotations(updated_at DESC);

-- AIDEV-NOTE: Índice composto para queries principais (tenant + lead + data)
CREATE INDEX idx_annotations_tenant_pipeline_created ON annotations(tenant_id, pipeline_lead_id, created_at DESC) 
WHERE pipeline_lead_id IS NOT NULL;

CREATE INDEX idx_annotations_tenant_master_created ON annotations(tenant_id, lead_master_id, created_at DESC) 
WHERE lead_master_id IS NOT NULL;

-- AIDEV-NOTE: Índice para busca full-text no conteúdo texto
CREATE INDEX idx_annotations_content_search ON annotations USING gin(to_tsvector('portuguese', content_plain));

-- Habilitar RLS (Row Level Security)
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- AIDEV-NOTE: Política RLS principal - isolamento por tenant_id
CREATE POLICY "annotations_tenant_isolation" ON annotations
    FOR ALL
    USING (
        tenant_id = (current_setting('app.tenant_id', true))::uuid
    );

-- AIDEV-NOTE: Política RLS adicional - members só veem suas próprias anotações
CREATE POLICY "annotations_member_access" ON annotations
    FOR ALL
    USING (
        -- Super admins e admins veem tudo do tenant
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = (current_setting('app.user_id', true))::uuid
            AND users.tenant_id = annotations.tenant_id
            AND users.role IN ('super_admin', 'admin')
        )
        OR
        -- Members só veem suas próprias anotações
        (
            owner_id = (current_setting('app.user_id', true))::uuid
            AND EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = (current_setting('app.user_id', true))::uuid
                AND users.tenant_id = annotations.tenant_id
                AND users.role = 'member'
            )
        )
    );

-- Função para atualizar timestamp updated_at automaticamente
CREATE OR REPLACE FUNCTION update_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_annotations_updated_at
    BEFORE UPDATE ON annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_annotations_updated_at();

-- AIDEV-NOTE: Função para sincronizar content_plain automaticamente
-- Extrai texto puro do HTML quando content é atualizado
CREATE OR REPLACE FUNCTION sync_annotation_content_plain()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove tags HTML básicas e converte para texto puro
    NEW.content_plain = regexp_replace(
        regexp_replace(
            regexp_replace(NEW.content, '<[^>]*>', '', 'g'), -- Remove tags HTML
            '&[a-zA-Z0-9#]+;', '', 'g' -- Remove entidades HTML
        ),
        '\s+', ' ', 'g' -- Normaliza espaços
    );
    
    -- Limita tamanho e remove espaços extras
    NEW.content_plain = trim(substring(NEW.content_plain for 5000));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronizar content_plain
CREATE TRIGGER trigger_sync_annotation_content_plain
    BEFORE INSERT OR UPDATE OF content ON annotations
    FOR EACH ROW
    EXECUTE FUNCTION sync_annotation_content_plain();

-- AIDEV-NOTE: Grants de permissão para service_role
GRANT ALL ON annotations TO service_role;
GRANT ALL ON annotations TO authenticated;

-- AIDEV-NOTE: Inserir dados de exemplo para desenvolvimento (apenas se não existirem)
DO $$
DECLARE
    test_tenant_id UUID := 'd7caffc1-c923-47c8-9301-ca9eeff1a243';
    test_user_id UUID := 'bbaf8441-23c9-44dc-9a4c-a4da787f829c';
    test_lead_id UUID;
BEGIN
    -- Buscar um lead existente para exemplo
    SELECT id INTO test_lead_id 
    FROM leads_master 
    WHERE tenant_id = test_tenant_id 
    LIMIT 1;
    
    -- Inserir anotações de exemplo apenas se o lead existir
    IF test_lead_id IS NOT NULL THEN
        INSERT INTO annotations (tenant_id, lead_master_id, owner_id, content, content_plain)
        VALUES 
        (
            test_tenant_id,
            test_lead_id,
            test_user_id,
            '<p><strong>Primeira reunião:</strong> Cliente demonstrou muito interesse no produto. Próximos passos: enviar proposta comercial.</p>',
            'Primeira reunião: Cliente demonstrou muito interesse no produto. Próximos passos: enviar proposta comercial.'
        ),
        (
            test_tenant_id,
            test_lead_id,
            test_user_id,
            '<p>Proposta enviada por email. Cliente solicitou <em>ajustes no prazo de entrega</em>.</p><ul><li>Prazo original: 30 dias</li><li>Prazo solicitado: 15 dias</li></ul>',
            'Proposta enviada por email. Cliente solicitou ajustes no prazo de entrega. Prazo original: 30 dias. Prazo solicitado: 15 dias.'
        );
    END IF;
END $$;

-- AIDEV-NOTE: Verificação final - listar tabelas criadas
\echo 'Tabela annotations criada com sucesso!'
\echo 'Índices criados para performance otimizada'
\echo 'Políticas RLS aplicadas para isolamento multi-tenant'
\echo 'Triggers configurados para auto-update de timestamps'