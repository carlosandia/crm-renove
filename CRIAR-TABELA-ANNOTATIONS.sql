-- ============================================
-- TABELA PARA ANOTAÇÕES DOS LEADS
-- ============================================

-- Criar tabela de anotações dos leads
CREATE TABLE IF NOT EXISTS lead_annotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    content TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT lead_annotations_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Criar tabela de atividades dos leads (para histórico de emails, etc)
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- email, call, meeting, note, etc
    activity_title VARCHAR(255) NOT NULL,
    activity_description TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_annotations_lead_id ON lead_annotations(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_annotations_user_id ON lead_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_annotations_created_at ON lead_annotations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_user_id ON lead_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE lead_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para lead_annotations
CREATE POLICY "Users can view annotations from their tenant" ON lead_annotations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.tenant_id = (
                SELECT u.tenant_id FROM users u WHERE u.id = lead_annotations.user_id
            )
        )
    );

CREATE POLICY "Users can insert their own annotations" ON lead_annotations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own annotations" ON lead_annotations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own annotations" ON lead_annotations
    FOR DELETE USING (user_id = auth.uid());

-- Políticas de segurança para lead_activities
CREATE POLICY "Users can view activities from their tenant" ON lead_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.tenant_id = (
                SELECT u.tenant_id FROM users u WHERE u.id = lead_activities.user_id
            )
        )
    );

CREATE POLICY "Users can insert their own activities" ON lead_activities
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own activities" ON lead_activities
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own activities" ON lead_activities
    FOR DELETE USING (user_id = auth.uid());

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_annotations_updated_at
    BEFORE UPDATE ON lead_annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_annotations_updated_at();

CREATE OR REPLACE FUNCTION update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_activities_updated_at
    BEFORE UPDATE ON lead_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_activities_updated_at();

-- Comentários para documentação
COMMENT ON TABLE lead_annotations IS 'Anotações dos vendedores sobre os leads';
COMMENT ON COLUMN lead_annotations.lead_id IS 'ID do lead relacionado';
COMMENT ON COLUMN lead_annotations.content IS 'Conteúdo da anotação';
COMMENT ON COLUMN lead_annotations.user_id IS 'ID do usuário que criou a anotação';

COMMENT ON TABLE lead_activities IS 'Histórico de atividades dos leads (emails, ligações, etc)';
COMMENT ON COLUMN lead_activities.lead_id IS 'ID do lead relacionado';
COMMENT ON COLUMN lead_activities.activity_type IS 'Tipo da atividade (email, call, meeting, note, etc)';
COMMENT ON COLUMN lead_activities.activity_title IS 'Título da atividade';
COMMENT ON COLUMN lead_activities.activity_description IS 'Descrição detalhada da atividade';
COMMENT ON COLUMN lead_activities.user_id IS 'ID do usuário que criou a atividade';
COMMENT ON COLUMN lead_activities.completed IS 'Se a atividade foi concluída';
COMMENT ON COLUMN lead_activities.due_date IS 'Data de vencimento da atividade (opcional)';

-- Inserir alguns dados de exemplo (opcional)
-- INSERT INTO lead_annotations (lead_id, content, user_id) VALUES 
-- ('lead-uuid-exemplo', 'Cliente demonstrou muito interesse no produto premium', 'user-uuid-exemplo');

-- INSERT INTO lead_activities (lead_id, activity_type, activity_title, activity_description, user_id, completed) VALUES 
-- ('lead-uuid-exemplo', 'email', 'Email de primeiro contato', 'Enviado email apresentando a empresa e produtos', 'user-uuid-exemplo', true);

-- Verificar se as tabelas foram criadas
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('lead_annotations', 'lead_activities')
ORDER BY table_name, ordinal_position; 