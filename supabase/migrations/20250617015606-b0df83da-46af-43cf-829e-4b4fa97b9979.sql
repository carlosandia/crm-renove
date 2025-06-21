-- Tabela para armazenar formulários criados pelos admins
CREATE TABLE public.custom_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  created_by UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  styling JSONB DEFAULT '{}',
  redirect_url TEXT,
  pipeline_id UUID,
  assigned_to UUID,
  qualification_rules JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- Tabela para os campos do formulário
CREATE TABLE public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  field_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_description TEXT,
  placeholder TEXT,
  is_required BOOLEAN DEFAULT false,
  field_options JSONB DEFAULT '{}',
  validation_rules JSONB DEFAULT '{}',
  styling JSONB DEFAULT '{}',
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar submissões dos formulários
CREATE TABLE public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  lead_id UUID,
  submission_data JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_qualified BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_custom_forms_tenant_id ON public.custom_forms(tenant_id);
CREATE INDEX idx_custom_forms_slug ON public.custom_forms(slug);
CREATE INDEX idx_form_fields_form_id ON public.form_fields(form_id);
CREATE INDEX idx_form_fields_order ON public.form_fields(form_id, order_index);
CREATE INDEX idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX idx_form_submissions_submitted_at ON public.form_submissions(submitted_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_custom_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_forms_updated_at
    BEFORE UPDATE ON public.custom_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_forms_updated_at();

-- RLS Policies
ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Políticas CORRIGIDAS para custom_forms - mais permissivas
DROP POLICY IF EXISTS "Users can view forms from their tenant" ON public.custom_forms;
DROP POLICY IF EXISTS "Admins can create forms" ON public.custom_forms;
DROP POLICY IF EXISTS "Admins can update their tenant forms" ON public.custom_forms;
DROP POLICY IF EXISTS "Admins can delete their tenant forms" ON public.custom_forms;

-- Política permissiva para SELECT
CREATE POLICY "Allow authenticated users to view forms" ON public.custom_forms
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Política permissiva para INSERT
CREATE POLICY "Allow authenticated users to create forms" ON public.custom_forms
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- Política permissiva para UPDATE
CREATE POLICY "Allow users to update their forms" ON public.custom_forms
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- Política permissiva para DELETE
CREATE POLICY "Allow users to delete their forms" ON public.custom_forms
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- Políticas CORRIGIDAS para form_fields - mais permissivas
DROP POLICY IF EXISTS "Users can view fields from their tenant forms" ON public.form_fields;
DROP POLICY IF EXISTS "Admins can manage fields" ON public.form_fields;

-- Política permissiva para form_fields
CREATE POLICY "Allow authenticated users to manage form fields" ON public.form_fields
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf 
      WHERE cf.created_by = auth.uid()
    )
  );

-- Políticas CORRIGIDAS para form_submissions - mais permissivas
DROP POLICY IF EXISTS "Users can view submissions from their tenant forms" ON public.form_submissions;
DROP POLICY IF EXISTS "Allow public form submissions" ON public.form_submissions;

-- Política para visualizar submissões
CREATE POLICY "Allow users to view their form submissions" ON public.form_submissions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf 
      WHERE cf.created_by = auth.uid()
    )
  );

-- Policy para permitir inserções públicas (formulários públicos)
CREATE POLICY "Allow public form submissions" ON public.form_submissions
  FOR INSERT WITH CHECK (true);
