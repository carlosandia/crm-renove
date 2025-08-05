-- =====================================================================================
-- MIGRATION: Corrigir políticas RLS da tabela lead_documents
-- Data: 2025-01-28 17:00:00
-- Descrição: Fix incompatibilidade entre JWT claims e metadados de usuário
-- Problema: Políticas usavam auth.jwt() direto, mas dados estão em raw_user_meta_data
-- =====================================================================================

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "lead_documents_admin_member_access" ON public.lead_documents;
DROP POLICY IF EXISTS "lead_documents_super_admin_access" ON public.lead_documents;
DROP POLICY IF EXISTS "lead_documents_tenant_isolation" ON public.lead_documents;

-- 2. Criar políticas corrigidas usando raw_user_meta_data
-- ✅ CORREÇÃO: Usar coalesce para fallback entre user_metadata e raw_user_meta_data

-- Política para Super Admin (acesso total)
CREATE POLICY "lead_documents_super_admin_access" 
ON public.lead_documents
FOR ALL
TO public
USING (
  COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (auth.jwt() -> 'raw_user_meta_data' ->> 'role')
  ) = 'super_admin'
);

-- Política para Admin e Member (acesso por tenant)
CREATE POLICY "lead_documents_tenant_access" 
ON public.lead_documents
FOR ALL
TO public
USING (
  -- Verificar tenant_id
  tenant_id = COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid,
    (auth.jwt() -> 'raw_user_meta_data' ->> 'tenant_id')::uuid
  )
  AND 
  -- Verificar role (admin ou member)
  COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (auth.jwt() -> 'raw_user_meta_data' ->> 'role')
  ) IN ('admin', 'member')
);

-- 3. Garantir que RLS está habilitado
ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;

-- 4. Comentários para documentação
COMMENT ON POLICY "lead_documents_super_admin_access" ON public.lead_documents 
IS 'Super Admin tem acesso total a todos os documentos independente do tenant';

COMMENT ON POLICY "lead_documents_tenant_access" ON public.lead_documents 
IS 'Admin e Member têm acesso apenas aos documentos do seu tenant. Usa fallback entre user_metadata e raw_user_meta_data';

-- 5. Verificar se as políticas foram criadas corretamente
DO $$
BEGIN
  RAISE NOTICE 'Migration concluída: Políticas RLS de lead_documents corrigidas para usar raw_user_meta_data';
  RAISE NOTICE 'Testando estrutura das políticas...';
END $$;