-- EXECUTE ESTE SQL NO SUPABASE PARA GARANTIR QUE TODAS AS TABELAS EXISTAM

-- 1. Criar tabela pipeline_stages se não existir
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL,
    temperature_score INTEGER DEFAULT 50,
    max_days_allowed INTEGER DEFAULT 7,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela pipeline_custom_fields se não existir
CREATE TABLE IF NOT EXISTS pipeline_custom_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'textarea', 'select', 'number', 'date')),
    field_options TEXT[],
    is_required BOOLEAN DEFAULT false,
    field_order INTEGER DEFAULT 1,
    placeholder VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(pipeline_id, order_index);
CREATE INDEX IF NOT EXISTS idx_pipeline_custom_fields_pipeline_id ON pipeline_custom_fields(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_custom_fields_order ON pipeline_custom_fields(pipeline_id, field_order);

-- 4. Habilitar RLS nas tabelas
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_custom_fields ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas simples para RLS
CREATE POLICY "allow_all_pipeline_stages" ON pipeline_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pipeline_custom_fields" ON pipeline_custom_fields FOR ALL USING (true) WITH CHECK (true);

-- 6. Verificar se as tabelas foram criadas
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('pipeline_stages', 'pipeline_custom_fields')
ORDER BY table_name, ordinal_position; 