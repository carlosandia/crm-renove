-- ================================================================
-- CORREÇÃO COMPLETA: RLS para tabela pipelines
-- ================================================================
-- Este script aplicará as políticas RLS corretas baseadas na documentação
-- oficial do Supabase para resolver o problema de arquivamento.
-- ================================================================

-- 1. Habilitar RLS na tabela pipelines
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas existentes se houver
DROP POLICY IF EXISTS "pipelines_select_policy" ON public.pipelines;
DROP POLICY IF EXISTS "pipelines_insert_policy" ON public.pipelines;
DROP POLICY IF EXISTS "pipelines_update_policy" ON public.pipelines;
DROP POLICY IF EXISTS "pipelines_delete_policy" ON public.pipelines;

-- 3. Política SELECT - Usuários podem ver pipelines do seu tenant
CREATE POLICY "pipelines_select_policy"
ON public.pipelines
FOR SELECT
TO authenticated
USING (
  -- Super admins podem ver todas as pipelines
  (SELECT auth.jwt() ->> 'role') = 'super_admin'
  OR
  -- Outros usuários só veem pipelines do seu tenant
  tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
);

-- 4. Política INSERT - Admins podem criar pipelines
CREATE POLICY "pipelines_insert_policy"
ON public.pipelines
FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins podem criar em qualquer tenant
  (SELECT auth.jwt() ->> 'role') = 'super_admin'
  OR
  -- Admins podem criar no seu tenant
  (
    (SELECT auth.jwt() ->> 'role') = 'admin'
    AND tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
  )
);

-- 5. Política UPDATE - Admins podem atualizar pipelines (RESOLVE ARQUIVAMENTO)
CREATE POLICY "pipelines_update_policy"
ON public.pipelines
FOR UPDATE
TO authenticated
USING (
  -- Super admins podem atualizar qualquer pipeline
  (SELECT auth.jwt() ->> 'role') = 'super_admin'
  OR
  -- Admins podem atualizar pipelines do seu tenant
  (
    (SELECT auth.jwt() ->> 'role') = 'admin'
    AND tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
  )
)
WITH CHECK (
  -- Garantir que não se altera tenant_id
  tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
  OR
  (SELECT auth.jwt() ->> 'role') = 'super_admin'
);

-- 6. Política DELETE - Apenas super admins (opcional)
CREATE POLICY "pipelines_delete_policy"
ON public.pipelines
FOR DELETE
TO authenticated
USING (
  (SELECT auth.jwt() ->> 'role') = 'super_admin'
);

-- 7. Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'pipelines' 
AND schemaname = 'public'
ORDER BY policyname;