-- ============================================
-- CAMPOS CUSTOMIZADOS PARA PIPELINES
-- ============================================

-- Tabela para definir campos customizados de cada pipeline
CREATE TABLE IF NOT EXISTS pipeline_custom_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'textarea', 'select', 'number', 'date')),
    field_options JSONB, -- Para campos select (opções)
    is_required BOOLEAN DEFAULT false,
    field_order INTEGER DEFAULT 0,
    placeholder TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(pipeline_id, field_name)
);

-- Tabela para armazenar dados dos leads/cards no Kanban
CREATE TABLE IF NOT EXISTS pipeline_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    lead_data JSONB NOT NULL DEFAULT '{}', -- Dados dos campos customizados
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id), -- Vendedor responsável
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Última vez que mudou de etapa
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_custom_fields_pipeline_id ON pipeline_custom_fields(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_custom_fields_order ON pipeline_custom_fields(pipeline_id, field_order);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_pipeline_id ON pipeline_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage_id ON pipeline_leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_assigned_to ON pipeline_leads(assigned_to);

-- RLS (Row Level Security)
ALTER TABLE pipeline_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pipeline_custom_fields
CREATE POLICY "Users can view custom fields of their tenant pipelines" ON pipeline_custom_fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pipelines p 
            WHERE p.id = pipeline_custom_fields.pipeline_id 
            AND p.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Admins can manage custom fields of their tenant pipelines" ON pipeline_custom_fields
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN pipelines p ON p.tenant_id = u.tenant_id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND p.id = pipeline_custom_fields.pipeline_id
        )
    );

-- Políticas RLS para pipeline_leads
CREATE POLICY "Users can view leads of their tenant pipelines" ON pipeline_leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pipelines p 
            WHERE p.id = pipeline_leads.pipeline_id 
            AND p.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Members can manage leads assigned to them or created by them" ON pipeline_leads
    FOR ALL USING (
        assigned_to = auth.uid() OR 
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users u 
            JOIN pipelines p ON p.tenant_id = u.tenant_id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND p.id = pipeline_leads.pipeline_id
        )
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pipeline_custom_fields_updated_at 
    BEFORE UPDATE ON pipeline_custom_fields 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_leads_updated_at 
    BEFORE UPDATE ON pipeline_leads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Dados de exemplo para campos customizados
INSERT INTO pipeline_custom_fields (pipeline_id, field_name, field_label, field_type, field_order, is_required, placeholder) 
SELECT 
    p.id,
    'nome',
    'Nome Completo',
    'text',
    1,
    true,
    'Digite o nome completo do cliente'
FROM pipelines p 
WHERE p.name = 'Vendas Imoveis'
ON CONFLICT (pipeline_id, field_name) DO NOTHING;

INSERT INTO pipeline_custom_fields (pipeline_id, field_name, field_label, field_type, field_order, is_required, placeholder) 
SELECT 
    p.id,
    'email',
    'E-mail',
    'email',
    2,
    true,
    'exemplo@email.com'
FROM pipelines p 
WHERE p.name = 'Vendas Imoveis'
ON CONFLICT (pipeline_id, field_name) DO NOTHING;

INSERT INTO pipeline_custom_fields (pipeline_id, field_name, field_label, field_type, field_order, is_required, placeholder) 
SELECT 
    p.id,
    'telefone',
    'Telefone',
    'phone',
    3,
    true,
    '(11) 99999-9999'
FROM pipelines p 
WHERE p.name = 'Vendas Imoveis'
ON CONFLICT (pipeline_id, field_name) DO NOTHING;

INSERT INTO pipeline_custom_fields (pipeline_id, field_name, field_label, field_type, field_order, field_options) 
SELECT 
    p.id,
    'interesse',
    'Tipo de Interesse',
    'select',
    4,
    '["Comprar", "Vender", "Alugar", "Investir"]'::jsonb
FROM pipelines p 
WHERE p.name = 'Vendas Imoveis'
ON CONFLICT (pipeline_id, field_name) DO NOTHING;

INSERT INTO pipeline_custom_fields (pipeline_id, field_name, field_label, field_type, field_order, placeholder) 
SELECT 
    p.id,
    'observacoes',
    'Observações',
    'textarea',
    5,
    false,
    'Informações adicionais sobre o cliente...'
FROM pipelines p 
WHERE p.name = 'Vendas Imoveis'
ON CONFLICT (pipeline_id, field_name) DO NOTHING; 