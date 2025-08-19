-- ============================================
-- 🔧 MIGRATION: Corrigir RLS para Basic Supabase Authentication
-- ============================================
-- 
-- CORREÇÃO CRÍTICA: Substituir auth.jwt() por auth.uid() patterns
-- conforme especificado no CLAUDE.md para Basic Supabase Authentication
-- 
-- Data: 2025-08-13
-- Versão: 1.0.0
-- Problema: RLS policies incompatíveis com Basic Supabase Authentication
-- Solução: Implementar padrões auth.uid() + user_metadata lookup
-- ============================================

-- 📋 ETAPA 1: Remover políticas incompatíveis com JWT
-- ============================================

-- Remover políticas antigas que usam auth.jwt()
DROP POLICY IF EXISTS "Users can view outcome reasons for their tenant" ON pipeline_outcome_reasons;
DROP POLICY IF EXISTS "Admins can manage outcome reasons for their tenant" ON pipeline_outcome_reasons;
DROP POLICY IF EXISTS "Users can view outcome history for their tenant" ON lead_outcome_history;
DROP POLICY IF EXISTS "Users can create outcome history for their tenant" ON lead_outcome_history;

-- 📋 ETAPA 2: Criar políticas compatíveis com Basic Supabase Authentication
-- ============================================

-- ✅ POLÍTICA: Users can view outcome reasons for their tenant
-- Usa auth.uid() + lookup no user_metadata conforme CLAUDE.md
CREATE POLICY "basic_auth_view_outcome_reasons" 
  ON pipeline_outcome_reasons 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL 
    AND tenant_id = (
      SELECT user_metadata->>'tenant_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- ✅ POLÍTICA: Admins and members can manage outcome reasons for their tenant
-- Implementa Basic Supabase Authentication com validação de role
CREATE POLICY "basic_auth_manage_outcome_reasons" 
  ON pipeline_outcome_reasons 
  FOR ALL 
  USING (
    auth.uid() IS NOT NULL 
    AND tenant_id = (
      SELECT user_metadata->>'tenant_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    )
    AND (
      SELECT user_metadata->>'role' 
      FROM auth.users 
      WHERE id = auth.uid()
    ) IN ('admin', 'super_admin', 'member')
  );

-- ✅ POLÍTICA: Users can view outcome history for their tenant
CREATE POLICY "basic_auth_view_outcome_history" 
  ON lead_outcome_history 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL 
    AND tenant_id = (
      SELECT user_metadata->>'tenant_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- ✅ POLÍTICA: Users can create outcome history for their tenant
CREATE POLICY "basic_auth_create_outcome_history" 
  ON lead_outcome_history 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND tenant_id = (
      SELECT user_metadata->>'tenant_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    )
    AND (
      SELECT user_metadata->>'role' 
      FROM auth.users 
      WHERE id = auth.uid()
    ) IN ('admin', 'member', 'super_admin')
  );

-- 📋 ETAPA 3: Atualizar funções para usar Basic Supabase Authentication
-- ============================================

-- ✅ FUNÇÃO: get_pipeline_outcome_reasons atualizada para auth.uid()
CREATE OR REPLACE FUNCTION get_pipeline_outcome_reasons(
  p_pipeline_id uuid,
  p_reason_type text DEFAULT 'all',
  p_active_only boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  pipeline_id uuid,
  tenant_id text,
  reason_type varchar,
  reason_text varchar,
  display_order integer,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ✅ CORREÇÃO: Usar auth.uid() + user_metadata conforme Basic Supabase Authentication
  RETURN QUERY
  SELECT 
    r.id,
    r.pipeline_id,
    r.tenant_id,
    r.reason_type,
    r.reason_text,
    r.display_order,
    r.is_active,
    r.created_at,
    r.updated_at
  FROM pipeline_outcome_reasons r
  WHERE r.pipeline_id = p_pipeline_id
    AND auth.uid() IS NOT NULL
    AND r.tenant_id = (
      SELECT user_metadata->>'tenant_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    )
    AND (p_reason_type = 'all' OR r.reason_type = p_reason_type)
    AND (NOT p_active_only OR r.is_active = true)
  ORDER BY r.reason_type, r.display_order;
END;
$$;

-- ✅ FUNÇÃO: get_lead_outcome_history atualizada para auth.uid()
CREATE OR REPLACE FUNCTION get_lead_outcome_history(
  p_lead_id uuid
)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  pipeline_id uuid,
  tenant_id text,
  outcome_type varchar,
  reason_id uuid,
  reason_text varchar,
  notes text,
  applied_by uuid,
  applied_by_name text,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER  
AS $$
BEGIN
  -- ✅ CORREÇÃO: Usar auth.uid() + user_metadata conforme Basic Supabase Authentication
  RETURN QUERY
  SELECT 
    h.id,
    h.lead_id,
    h.pipeline_id,
    h.tenant_id,
    h.outcome_type,
    h.reason_id,
    h.reason_text,
    h.notes,
    h.applied_by,
    COALESCE(au.user_metadata->>'first_name' || ' ' || au.user_metadata->>'last_name', 'Usuário') as applied_by_name,
    h.created_at
  FROM lead_outcome_history h
  LEFT JOIN auth.users au ON au.id = h.applied_by
  WHERE h.lead_id = p_lead_id
    AND auth.uid() IS NOT NULL
    AND h.tenant_id = (
      SELECT user_metadata->>'tenant_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  ORDER BY h.created_at DESC;
END;
$$;

-- 📋 ETAPA 4: Adicionar índices otimizados para auth.uid() lookups
-- ============================================

-- Índice para otimizar lookup de tenant_id via auth.uid()
CREATE INDEX IF NOT EXISTS idx_auth_users_id_tenant_metadata 
  ON auth.users USING btree(id) 
  WHERE user_metadata->>'tenant_id' IS NOT NULL;

-- Índice para otimizar lookup de role via auth.uid()  
CREATE INDEX IF NOT EXISTS idx_auth_users_id_role_metadata 
  ON auth.users USING btree(id) 
  WHERE user_metadata->>'role' IS NOT NULL;

-- 📋 ETAPA 5: Comentários e documentação da correção
-- ============================================

COMMENT ON POLICY "basic_auth_view_outcome_reasons" ON pipeline_outcome_reasons IS 
'✅ BASIC SUPABASE AUTH: Permite visualizar motivos usando auth.uid() + tenant_id do user_metadata';

COMMENT ON POLICY "basic_auth_manage_outcome_reasons" ON pipeline_outcome_reasons IS 
'✅ BASIC SUPABASE AUTH: Permite gerenciar motivos para admins/members usando auth.uid() + validação de role';

COMMENT ON POLICY "basic_auth_view_outcome_history" ON lead_outcome_history IS 
'✅ BASIC SUPABASE AUTH: Permite visualizar histórico usando auth.uid() + tenant_id do user_metadata';

COMMENT ON POLICY "basic_auth_create_outcome_history" ON lead_outcome_history IS 
'✅ BASIC SUPABASE AUTH: Permite criar histórico usando auth.uid() + validação de role';

-- 📋 FINALIZAÇÃO
-- ============================================

-- Verificar se migration foi bem-sucedida
DO $$
BEGIN
  -- Verificar se as novas políticas foram criadas
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'pipeline_outcome_reasons' 
    AND policyname = 'basic_auth_view_outcome_reasons'
  ) THEN
    RAISE EXCEPTION 'ERRO: Policy basic_auth_view_outcome_reasons não foi criada!';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'pipeline_outcome_reasons' 
    AND policyname = 'basic_auth_manage_outcome_reasons'
  ) THEN
    RAISE EXCEPTION 'ERRO: Policy basic_auth_manage_outcome_reasons não foi criada!';
  END IF;
  
  RAISE NOTICE '✅ Migration 20250813120000 concluída: RLS policies atualizadas para Basic Supabase Authentication';
  RAISE NOTICE '🔐 Policies agora usam auth.uid() + user_metadata conforme CLAUDE.md';
  RAISE NOTICE '📋 Sistema de motivos compatível com autenticação básica Supabase';
END;
$$;