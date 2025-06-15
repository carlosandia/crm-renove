-- Primeiro, vamos verificar se a tabela existe e removê-la se necessário
DROP TABLE IF EXISTS pipeline_leads CASCADE;

-- Criar a tabela pipeline_leads com a estrutura correta
CREATE TABLE pipeline_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    custom_data JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_pipeline_leads_pipeline_id ON pipeline_leads(pipeline_id);
CREATE INDEX idx_pipeline_leads_stage_id ON pipeline_leads(stage_id);
CREATE INDEX idx_pipeline_leads_created_by ON pipeline_leads(created_by);

-- Comentários
COMMENT ON TABLE pipeline_leads IS 'Leads/cards das pipelines de vendas';
COMMENT ON COLUMN pipeline_leads.custom_data IS 'Dados dos campos customizados em formato JSON';