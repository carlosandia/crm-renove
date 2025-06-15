-- Criar tabelas de pipeline
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tenant_id UUID NOT NULL,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipeline_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID,
  member_id UUID,
  assigned_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  temperature_score INTEGER,
  max_days_allowed INTEGER,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID,
  stage_id UUID,
  day_offset INTEGER NOT NULL,
  note TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- Políticas simples
CREATE POLICY "pipelines_policy" ON pipelines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pipeline_members_policy" ON pipeline_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pipeline_stages_policy" ON pipeline_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "follow_ups_policy" ON follow_ups FOR ALL USING (true) WITH CHECK (true);