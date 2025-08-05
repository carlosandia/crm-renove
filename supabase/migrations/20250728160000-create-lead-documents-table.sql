-- Migration: Criar tabela lead_documents para upload de arquivos
-- Data: 2025-01-28
-- Descrição: Sistema de documentos para leads com suporte a upload de arquivos

-- =====================================================================================
-- TABELA: lead_documents
-- Armazena metadados dos arquivos enviados para cada lead
-- =====================================================================================

CREATE TABLE IF NOT EXISTS lead_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL, -- Nome original do arquivo
    file_type TEXT NOT NULL, -- Tipo MIME (image/jpeg, application/pdf, etc.)
    file_extension TEXT NOT NULL, -- Extensão (.jpg, .pdf, etc.)
    file_size INTEGER NOT NULL, -- Tamanho em bytes
    storage_path TEXT NOT NULL, -- Caminho no Supabase Storage
    storage_bucket TEXT NOT NULL DEFAULT 'lead-documents',
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    tenant_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}', -- Metadados adicionais (dimensões de imagem, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================================================

-- Índice principal para busca por lead
CREATE INDEX IF NOT EXISTS idx_lead_documents_lead_id ON lead_documents(lead_id);

-- Índice para isolamento multi-tenant
CREATE INDEX IF NOT EXISTS idx_lead_documents_tenant_id ON lead_documents(tenant_id);

-- Índice composto para queries filtradas
CREATE INDEX IF NOT EXISTS idx_lead_documents_lead_tenant ON lead_documents(lead_id, tenant_id);

-- Índice para busca por tipo de arquivo
CREATE INDEX IF NOT EXISTS idx_lead_documents_file_type ON lead_documents(file_type);

-- Índice para ordenação temporal
CREATE INDEX IF NOT EXISTS idx_lead_documents_created_at ON lead_documents(created_at DESC);

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================================

-- Habilitar RLS na tabela
ALTER TABLE lead_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só podem ver documentos do seu tenant
CREATE POLICY "lead_documents_tenant_isolation" ON lead_documents
    FOR ALL USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    );

-- Policy: Super Admin pode ver todos os documentos
CREATE POLICY "lead_documents_super_admin_access" ON lead_documents
    FOR ALL USING (
        (auth.jwt() ->> 'role') = 'super_admin'
    );

-- Policy: Admin e Member podem gerenciar documentos do seu tenant
CREATE POLICY "lead_documents_admin_member_access" ON lead_documents
    FOR ALL USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
        AND (auth.jwt() ->> 'role') IN ('admin', 'member')
    );

-- =====================================================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_lead_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_lead_documents_updated_at
    BEFORE UPDATE ON lead_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_documents_updated_at();

-- =====================================================================================
-- CONSTRAINTS E VALIDAÇÕES
-- =====================================================================================

-- Validar extensões permitidas
ALTER TABLE lead_documents ADD CONSTRAINT check_file_extension 
    CHECK (file_extension IN ('.jpg', '.jpeg', '.png', '.pdf', '.csv', '.xlsx', '.xls'));

-- Validar tamanho máximo (10MB = 10485760 bytes)
ALTER TABLE lead_documents ADD CONSTRAINT check_file_size 
    CHECK (file_size > 0 AND file_size <= 10485760);

-- Validar que tenant_id não seja nulo
ALTER TABLE lead_documents ADD CONSTRAINT check_tenant_id_not_null 
    CHECK (tenant_id IS NOT NULL);

-- =====================================================================================
-- COMENTÁRIOS DA TABELA
-- =====================================================================================

COMMENT ON TABLE lead_documents IS 'Armazena metadados dos arquivos enviados para leads';
COMMENT ON COLUMN lead_documents.lead_id IS 'ID do lead ao qual o documento pertence';
COMMENT ON COLUMN lead_documents.file_name IS 'Nome do arquivo no storage (UUID + extensão)';
COMMENT ON COLUMN lead_documents.original_name IS 'Nome original do arquivo enviado pelo usuário';
COMMENT ON COLUMN lead_documents.storage_path IS 'Caminho completo no Supabase Storage';
COMMENT ON COLUMN lead_documents.metadata IS 'Metadados adicionais como dimensões, etc.';
COMMENT ON COLUMN lead_documents.tenant_id IS 'ID do tenant para isolamento multi-tenant';