
-- Criar tabela principal de leads consolidada
CREATE TABLE IF NOT EXISTS public.leads_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Dados básicos
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(255),
  job_title VARCHAR(255),
  
  -- Dados de origem
  lead_source VARCHAR(100), -- 'website', 'social_media', 'referral', 'cold_call', etc
  campaign_name VARCHAR(255),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- Dados comerciais
  estimated_value DECIMAL(15,2) DEFAULT 0,
  lead_score INTEGER DEFAULT 0, -- 0-100
  lead_temperature VARCHAR(20) DEFAULT 'cold', -- 'cold', 'warm', 'hot', 'very_hot'
  probability DECIMAL(5,2) DEFAULT 0, -- 0-100%
  
  -- Relacionamento
  assigned_to UUID, -- referência ao vendedor
  created_by UUID NOT NULL,
  last_contact_date TIMESTAMP WITH TIME ZONE,
  next_action_date TIMESTAMP WITH TIME ZONE,
  
  -- Status geral
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'converted', 'lost', 'archived'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para histórico de oportunidades vinculadas ao lead
CREATE TABLE IF NOT EXISTS public.lead_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads_master(id) ON DELETE CASCADE,
  pipeline_id UUID,
  stage_id UUID,
  
  opportunity_name VARCHAR(255) NOT NULL,
  opportunity_value DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'won', 'lost', 'paused'
  probability DECIMAL(5,2) DEFAULT 0,
  expected_close_date DATE,
  
  -- Motivo se perdida
  lost_reason VARCHAR(255),
  lost_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela para atividades do lead
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads_master(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  activity_type VARCHAR(50) NOT NULL, -- 'call', 'email', 'meeting', 'note', 'task'
  activity_title VARCHAR(255) NOT NULL,
  activity_description TEXT,
  
  -- Para tarefas
  due_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT FALSE,
  
  -- Para comunicações
  communication_direction VARCHAR(20), -- 'inbound', 'outbound'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para notas do lead
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads_master(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  note_title VARCHAR(255),
  note_content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_master_tenant_id ON public.leads_master(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_master_email ON public.leads_master(email);
CREATE INDEX IF NOT EXISTS idx_leads_master_assigned_to ON public.leads_master(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_master_status ON public.leads_master(status);
CREATE INDEX IF NOT EXISTS idx_leads_master_lead_score ON public.leads_master(lead_score DESC);

CREATE INDEX IF NOT EXISTS idx_lead_opportunities_lead_id ON public.lead_opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_leads_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leads_master_updated_at
    BEFORE UPDATE ON public.leads_master
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_master_updated_at();

-- RLS Policies
ALTER TABLE public.leads_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Policy para leads_master
CREATE POLICY "Users can view leads from their tenant" ON public.leads_master
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert leads for their tenant" ON public.leads_master
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update leads from their tenant" ON public.leads_master
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete leads from their tenant" ON public.leads_master
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Policies similares para outras tabelas
CREATE POLICY "Users can view lead opportunities from their tenant" ON public.lead_opportunities
    FOR SELECT USING (
        lead_id IN (
            SELECT id FROM public.leads_master 
            WHERE tenant_id IN (
                SELECT tenant_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage lead opportunities from their tenant" ON public.lead_opportunities
    FOR ALL USING (
        lead_id IN (
            SELECT id FROM public.leads_master 
            WHERE tenant_id IN (
                SELECT tenant_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can view lead activities from their tenant" ON public.lead_activities
    FOR SELECT USING (
        lead_id IN (
            SELECT id FROM public.leads_master 
            WHERE tenant_id IN (
                SELECT tenant_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage lead activities from their tenant" ON public.lead_activities
    FOR ALL USING (
        lead_id IN (
            SELECT id FROM public.leads_master 
            WHERE tenant_id IN (
                SELECT tenant_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can view lead notes from their tenant" ON public.lead_notes
    FOR SELECT USING (
        lead_id IN (
            SELECT id FROM public.leads_master 
            WHERE tenant_id IN (
                SELECT tenant_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage lead notes from their tenant" ON public.lead_notes
    FOR ALL USING (
        lead_id IN (
            SELECT id FROM public.leads_master 
            WHERE tenant_id IN (
                SELECT tenant_id FROM public.users WHERE id = auth.uid()
            )
        )
    );
