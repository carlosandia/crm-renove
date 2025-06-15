-- Criar tabelas para campos customizados
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

-- Inserir campos de exemplo
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