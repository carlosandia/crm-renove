-- Criar tabela de leads da pipeline
CREATE TABLE IF NOT EXISTS pipeline_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    custom_data JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_pipeline_id ON pipeline_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_stage_id ON pipeline_leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_leads_created_by ON pipeline_leads(created_by);

-- RLS (Row Level Security)
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso aos leads da pipeline
CREATE POLICY "Users can access leads from their pipelines" ON pipeline_leads
    FOR ALL USING (
        pipeline_id IN (
            SELECT p.id FROM pipelines p
            JOIN pipeline_members pm ON p.id = pm.pipeline_id
            WHERE pm.member_id = auth.uid()
            OR p.created_by = auth.uid()
        )
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_pipeline_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pipeline_leads_updated_at
    BEFORE UPDATE ON pipeline_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_pipeline_leads_updated_at();

-- Comentários
COMMENT ON TABLE pipeline_leads IS 'Leads/cards das pipelines de vendas';
COMMENT ON COLUMN pipeline_leads.custom_data IS 'Dados dos campos customizados em formato JSON';