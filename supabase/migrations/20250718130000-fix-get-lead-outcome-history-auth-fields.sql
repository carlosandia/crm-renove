-- ============================================
-- 🔧 CORREÇÃO: Função get_lead_outcome_history
-- ============================================
-- 
-- Corrige erro 42703 "column u.first_name does not exist"
-- A tabela auth.users do Supabase não possui first_name/last_name
-- diretamente, mas sim nos metadados raw_user_meta_data
-- 
-- Data: 2025-01-18
-- Versão: 1.0.1
-- ============================================

-- Recriar a função get_lead_outcome_history com campos corretos
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
    COALESCE(
      -- Tentar extrair nome dos metadados do usuário
      CASE 
        WHEN u.raw_user_meta_data->>'first_name' IS NOT NULL 
             AND u.raw_user_meta_data->>'last_name' IS NOT NULL 
        THEN 
          (u.raw_user_meta_data->>'first_name') || ' ' || (u.raw_user_meta_data->>'last_name')
        WHEN u.raw_user_meta_data->>'full_name' IS NOT NULL 
        THEN 
          u.raw_user_meta_data->>'full_name'
        WHEN u.raw_user_meta_data->>'name' IS NOT NULL 
        THEN 
          u.raw_user_meta_data->>'name'
        WHEN u.email IS NOT NULL 
        THEN 
          split_part(u.email::text, '@', 1)  -- Usar parte antes do @ do email
        ELSE 
          'Usuário'
      END,
      'Usuário'
    ) as applied_by_name,
    h.created_at
  FROM lead_outcome_history h
  LEFT JOIN auth.users u ON u.id = h.applied_by
  WHERE h.lead_id = p_lead_id
    AND h.tenant_id = auth.jwt() ->> 'tenant_id'
  ORDER BY h.created_at DESC;
END;
$$;

-- Comentário da correção
COMMENT ON FUNCTION get_lead_outcome_history(uuid) IS 'Busca histórico de outcome de um lead - CORRIGIDO: usa raw_user_meta_data da auth.users';

-- Verificação final
DO $$
BEGIN
  RAISE NOTICE 'Função get_lead_outcome_history corrigida para usar metadados do Supabase Auth';
  RAISE NOTICE 'Agora usa raw_user_meta_data->first_name/last_name/full_name/name ou email como fallback';
END;
$$;