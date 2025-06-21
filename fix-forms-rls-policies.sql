-- SCRIPT PARA CORRIGIR POLÍTICAS RLS DOS FORMULÁRIOS
-- Execute este script no painel SQL do Supabase

-- 1. Remover políticas restritivas existentes
DROP POLICY IF EXISTS "Users can view forms from their tenant" ON public.custom_forms;
DROP POLICY IF EXISTS "Admins can create forms" ON public.custom_forms;
DROP POLICY IF EXISTS "Admins can update their tenant forms" ON public.custom_forms;
DROP POLICY IF EXISTS "Admins can delete their tenant forms" ON public.custom_forms;
DROP POLICY IF EXISTS "Users can view fields from their tenant forms" ON public.form_fields;
DROP POLICY IF EXISTS "Admins can manage fields" ON public.form_fields;
DROP POLICY IF EXISTS "Users can view submissions from their tenant forms" ON public.form_submissions;

-- 2. Criar políticas mais permissivas para custom_forms

-- Política para SELECT (visualizar formulários)
CREATE POLICY "Allow authenticated users to view forms" ON public.custom_forms
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Política para INSERT (criar formulários)
CREATE POLICY "Allow authenticated users to create forms" ON public.custom_forms
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- Política para UPDATE (atualizar formulários)
CREATE POLICY "Allow users to update their forms" ON public.custom_forms
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- Política para DELETE (excluir formulários)
CREATE POLICY "Allow users to delete their forms" ON public.custom_forms
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- 3. Criar políticas permissivas para form_fields

-- Política para gerenciar campos dos formulários
CREATE POLICY "Allow authenticated users to manage form fields" ON public.form_fields
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf 
      WHERE cf.created_by = auth.uid()
    )
  );

-- 4. Criar políticas para form_submissions

-- Política para visualizar submissões
CREATE POLICY "Allow users to view their form submissions" ON public.form_submissions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf 
      WHERE cf.created_by = auth.uid()
    )
  );

-- Política para permitir inserções públicas (formulários públicos)
CREATE POLICY "Allow public form submissions" ON public.form_submissions
  FOR INSERT WITH CHECK (true);

-- 5. Verificar se as políticas foram criadas corretamente
SELECT 
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename IN ('custom_forms', 'form_fields', 'form_submissions')
ORDER BY tablename, policyname;
