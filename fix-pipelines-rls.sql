-- ================================================================
-- CORREÇÃO: Políticas RLS para tabela pipelines
-- ================================================================
-- 
-- Este script corrige o problema de permissão onde admins não conseguem
-- arquivar/desarquivar pipelines devido a políticas RLS inadequadas.
--
-- PROBLEMA IDENTIFICADO:
-- - Update funciona com anon key mas falha com usuário autenticado
-- - Isso indica problema nas políticas RLS
--
-- SOLUÇÃO:
-- - Criar políticas RLS adequadas para operações CRUD em pipelines
-- - Permitir que admins gerenciem pipelines do seu tenant
-- - Permitir que super_admins tenham acesso total
-- ================================================================

-- Primeiro, verificar se RLS está habilitado na tabela pipelines
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- POLÍTICA 1: SELECT (Visualização)
-- ================================================================
-- Permite que usuários vejam pipelines do seu tenant
DROP POLICY IF EXISTS "Users can view pipelines of their tenant" ON public.pipelines;

CREATE POLICY "Users can view pipelines of their tenant"
ON public.pipelines
FOR SELECT
TO authenticated
USING (
  -- Super admins podem ver todas as pipelines
  (SELECT auth.jwt() ->> 'role') = 'super_admin'
  OR
  -- Admins e members podem ver pipelines do seu tenant
  tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
);

-- ================================================================
-- POLÍTICA 2: INSERT (Criação)
-- ================================================================
-- Permite que admins e super_admins criem pipelines
DROP POLICY IF EXISTS "Admins can create pipelines" ON public.pipelines;

CREATE POLICY "Admins can create pipelines"
ON public.pipelines
FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins podem criar em qualquer tenant
  (SELECT auth.jwt() ->> 'role') = 'super_admin'
  OR
  -- Admins podem criar pipelines no seu tenant
  (
    (SELECT auth.jwt() ->> 'role') = 'admin'
    AND tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
  )
);

-- ================================================================
-- POLÍTICA 3: UPDATE (Atualização/Arquivamento) - MAIS IMPORTANTE
-- ================================================================
-- Esta é a política que resolve o problema de arquivamento
DROP POLICY IF EXISTS "Admins can update pipelines in their tenant" ON public.pipelines;

CREATE POLICY "Admins can update pipelines in their tenant"
ON public.pipelines
FOR UPDATE
TO authenticated
USING (
  -- Super admins podem atualizar qualquer pipeline
  (SELECT auth.jwt() ->> 'role') = 'super_admin'
  OR
  -- Admins podem atualizar pipelines do seu tenant
  (
    (SELECT auth.jwt() ->> 'role') IN ('admin')
    AND tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
  )
)
WITH CHECK (
  -- Garantir que não se pode alterar o tenant_id
  tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
  OR
  (SELECT auth.jwt() ->> 'role') = 'super_admin'
);

-- ================================================================
-- POLÍTICA 4: DELETE (Exclusão) - OPCIONAL
-- ================================================================
-- Permite que super_admins deletem pipelines (só em caso extremo)
DROP POLICY IF EXISTS "Super admins can delete pipelines" ON public.pipelines;

CREATE POLICY "Super admins can delete pipelines"
ON public.pipelines
FOR DELETE
TO authenticated
USING (
  (SELECT auth.jwt() ->> 'role') = 'super_admin'
);

-- ================================================================
-- VERIFICAÇÃO: Listar políticas criadas
-- ================================================================
-- Para confirmar que as políticas foram criadas corretamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'pipelines' 
AND schemaname = 'public'
ORDER BY policyname;

-- ================================================================
-- TESTE RÁPIDO: Verificar se auth.jwt() está funcionando
-- ================================================================
-- Esta query deve retornar dados do usuário autenticado
-- Execute apenas se estiver logado no frontend
-- SELECT 
--   auth.jwt() ->> 'role' as user_role,
--   auth.jwt() ->> 'tenant_id' as user_tenant_id,
--   auth.uid() as user_id;

-- ================================================================
-- COMENTÁRIOS IMPORTANTES:
-- ================================================================
-- 1. As políticas usam auth.jwt() para acessar role e tenant_id
-- 2. Super admins têm acesso total (podem gerenciar multi-tenant)
-- 3. Admins só podem gerenciar pipelines do seu próprio tenant
-- 4. Members não têm permissão de modificar pipelines (só visualizar)
-- 5. A política UPDATE é a mais importante para resolver o arquivamento
-- ================================================================