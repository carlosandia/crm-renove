-- =====================================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS DE CAMPOS CUSTOMIZADOS
-- Execute este script no painel do Supabase (SQL Editor)
-- =====================================================

-- 1. Criar tabela pipeline_custom_fields
CREATE TABLE IF NOT EXISTS pipeline_custom_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'textarea', 'select', 'number', 'date')),
    field_options JSONB,
    is_required BOOLEAN DEFAULT false,
    field_order INTEGER DEFAULT 0,
    placeholder TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pipeline_id, field_name)
);

-- 2. Criar tabela pipeline_leads
CREATE TABLE IF NOT EXISTS pipeline_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL,
    stage_id UUID NOT NULL,
    lead_data JSONB NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL,
    assigned_to UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_custom_fields_pipeline_id ON pipeline_custom_fields(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_custom_fields_order ON pipeline_custom_fields(pipeline_id, field_order);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_pipeline_id ON pipeline_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage_id ON pipeline_leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_created_by ON pipeline_leads(created_by);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_assigned_to ON pipeline_leads(assigned_to);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE pipeline_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS para pipeline_custom_fields
CREATE POLICY "Users can view custom fields of their tenant pipelines" ON pipeline_custom_fields
    FOR SELECT USING (
        pipeline_id IN (
            SELECT p.id FROM pipelines p 
            WHERE p.tenant_id = auth.jwt() ->> 'tenant_id'
        )
    );

CREATE POLICY "Admins can manage custom fields" ON pipeline_custom_fields
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' AND
        pipeline_id IN (
            SELECT p.id FROM pipelines p 
            WHERE p.tenant_id = auth.jwt() ->> 'tenant_id'
        )
    );

-- 6. Criar políticas RLS para pipeline_leads
CREATE POLICY "Users can view leads of their tenant pipelines" ON pipeline_leads
    FOR SELECT USING (
        pipeline_id IN (
            SELECT p.id FROM pipelines p 
            WHERE p.tenant_id = auth.jwt() ->> 'tenant_id'
        )
    );

CREATE POLICY "Users can create leads in their tenant pipelines" ON pipeline_leads
    FOR INSERT WITH CHECK (
        pipeline_id IN (
            SELECT p.id FROM pipelines p 
            WHERE p.tenant_id = auth.jwt() ->> 'tenant_id'
        ) AND
        created_by = auth.uid()
    );

CREATE POLICY "Users can update their own leads or assigned leads" ON pipeline_leads
    FOR UPDATE USING (
        pipeline_id IN (
            SELECT p.id FROM pipelines p 
            WHERE p.tenant_id = auth.jwt() ->> 'tenant_id'
        ) AND
        (created_by = auth.uid() OR assigned_to = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'manager'))
    );

CREATE POLICY "Admins can delete leads" ON pipeline_leads
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin' AND
        pipeline_id IN (
            SELECT p.id FROM pipelines p 
            WHERE p.tenant_id = auth.jwt() ->> 'tenant_id'
        )
    );

-- 7. Inserir campos de exemplo (opcional)
-- Descomente as linhas abaixo se quiser inserir campos de exemplo

/*
-- Buscar um pipeline existente para inserir campos de exemplo
DO $$
DECLARE
    sample_pipeline_id UUID;
BEGIN
    -- Pegar o primeiro pipeline disponível
    SELECT id INTO sample_pipeline_id FROM pipelines LIMIT 1;
    
    IF sample_pipeline_id IS NOT NULL THEN
        -- Inserir campos de exemplo
        INSERT INTO pipeline_custom_fields (pipeline_id, field_name, field_label, field_type, field_order, is_required, placeholder) VALUES
        (sample_pipeline_id, 'nome', 'Nome Completo', 'text', 1, true, 'Digite o nome completo do cliente'),
        (sample_pipeline_id, 'email', 'E-mail', 'email', 2, true, 'exemplo@email.com'),
        (sample_pipeline_id, 'telefone', 'Telefone', 'phone', 3, false, '(11) 99999-9999'),
        (sample_pipeline_id, 'empresa', 'Empresa', 'text', 4, false, 'Nome da empresa'),
        (sample_pipeline_id, 'observacoes', 'Observações', 'textarea', 5, false, 'Observações sobre o cliente'),
        (sample_pipeline_id, 'origem', 'Origem do Lead', 'select', 6, false, NULL),
        (sample_pipeline_id, 'valor_estimado', 'Valor Estimado', 'number', 7, false, '0.00'),
        (sample_pipeline_id, 'data_contato', 'Data do Primeiro Contato', 'date', 8, false, NULL);
        
        -- Configurar opções para o campo select
        UPDATE pipeline_custom_fields 
        SET field_options = '["Website", "Indicação", "Redes Sociais", "Telefone", "E-mail", "Evento", "Outros"]'::jsonb
        WHERE pipeline_id = sample_pipeline_id AND field_name = 'origem';
        
        RAISE NOTICE 'Campos de exemplo inseridos para o pipeline %', sample_pipeline_id;
    ELSE
        RAISE NOTICE 'Nenhum pipeline encontrado para inserir campos de exemplo';
    END IF;
END $$;
*/

-- 8. Verificar se as tabelas foram criadas
SELECT 
    'pipeline_custom_fields' as tabela,
    COUNT(*) as total_registros
FROM pipeline_custom_fields
UNION ALL
SELECT 
    'pipeline_leads' as tabela,
    COUNT(*) as total_registros
FROM pipeline_leads;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- INSTRUÇÕES:
-- 1. Copie todo este script
-- 2. Vá para o painel do Supabase
-- 3. Acesse "SQL Editor"
-- 4. Cole o script e execute
-- 5. Verifique se não há erros
-- 6. As tabelas estarão prontas para uso! 