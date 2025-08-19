#!/usr/bin/env python3
"""
🔧 CONFIGURAR RPC + APLICAR MIGRATION: Via SQL Direto
====================================================
"""

import requests
import json
import sys
import time

# Configurações Supabase
SUPABASE_URL = "https://marajvabdwkpgopytvhh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY"

def execute_sql_raw(sql):
    """Tentar executar SQL via diferentes métodos"""
    
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # Método 1: Via RPC exec_sql genérico
    try:
        print(f"🧪 Tentando exec_sql genérico...")
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
            headers=headers, 
            json={"query": sql},
            timeout=30
        )
        if response.status_code == 200:
            print("✅ Sucesso via exec_sql")
            return response.json()
    except Exception as e:
        print(f"   ❌ Falhou: {e}")
    
    # Método 2: Via SQL direto (se suportado)
    try:
        print(f"🧪 Tentando SQL direto...")
        # Simular execução via endpoint SQL direto
        response = requests.post(
            f"{SUPABASE_URL}/sql",
            headers=headers,
            data=sql,
            timeout=30
        )
        if response.status_code == 200:
            print("✅ Sucesso via SQL direto")
            return {"success": True}
    except Exception as e:
        print(f"   ❌ Falhou: {e}")
    
    # Método 3: Verificar se já existe função
    try:
        print(f"🧪 Verificando funções existentes...")
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/",
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            content = response.text
            if "execute_migration_sql" in content:
                print("✅ Função execute_migration_sql já existe!")
                return {"success": True, "already_exists": True}
    except Exception as e:
        print(f"   ❌ Falhou: {e}")
    
    return None

def setup_rpc_function():
    """Configurar função RPC para execução de SQL"""
    
    print("🔧 CONFIGURANDO FUNÇÃO RPC...")
    
    setup_sql = '''
-- Criar função RPC segura para execução de SQL
CREATE OR REPLACE FUNCTION public.execute_migration_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  result_message text;
BEGIN
  -- Validações
  IF sql_query IS NULL OR trim(sql_query) = '' THEN
    RAISE EXCEPTION 'SQL query cannot be empty';
  END IF;
  
  -- Executar SQL
  BEGIN
    EXECUTE sql_query;
    result_message := 'SQL executed successfully';
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE EXCEPTION 'SQL failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;
  
  RETURN json_build_object(
    'success', true,
    'message', result_message,
    'executed_at', NOW()
  );
END;
$$;

-- Configurar permissões
REVOKE EXECUTE ON FUNCTION public.execute_migration_sql FROM public;
REVOKE EXECUTE ON FUNCTION public.execute_migration_sql FROM anon;
GRANT EXECUTE ON FUNCTION public.execute_migration_sql TO service_role;
'''
    
    result = execute_sql_raw(setup_sql)
    if result:
        print("✅ Função RPC configurada com sucesso!")
        return True
    else:
        print("❌ Falha ao configurar função RPC")
        return False

def call_rpc_function(function_name, params):
    """Chamar função RPC"""
    
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/{function_name}",
            headers=headers,
            json=params,
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ RPC Error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ RPC Exception: {e}")
        return None

def apply_migration_via_rpc():
    """Aplicar migration via RPC"""
    
    print("\n🚀 APLICANDO MIGRATION VIA RPC...")
    
    migration_statements = [
        # Remover políticas antigas
        'DROP POLICY IF EXISTS "Users can view outcome reasons for their tenant" ON pipeline_outcome_reasons;',
        'DROP POLICY IF EXISTS "Admins can manage outcome reasons for their tenant" ON pipeline_outcome_reasons;',
        'DROP POLICY IF EXISTS "Users can view outcome history for their tenant" ON lead_outcome_history;',
        'DROP POLICY IF EXISTS "Users can create outcome history for their tenant" ON lead_outcome_history;',
        
        # Criar políticas novas
        '''CREATE POLICY "basic_auth_view_outcome_reasons"
  ON pipeline_outcome_reasons
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = (
      SELECT user_metadata->>'tenant_id'
      FROM auth.users
      WHERE id = auth.uid()
    )
  );''',
        
        '''CREATE POLICY "basic_auth_manage_outcome_reasons"
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
  );''',
        
        '''CREATE POLICY "basic_auth_view_outcome_history"
  ON lead_outcome_history
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = (
      SELECT user_metadata->>'tenant_id'
      FROM auth.users
      WHERE id = auth.uid()
    )
  );''',
        
        '''CREATE POLICY "basic_auth_create_outcome_history"
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
  );'''
    ]
    
    success_count = 0
    
    for i, sql in enumerate(migration_statements, 1):
        print(f"\n{i}. Executando: {sql[:60]}...")
        
        result = call_rpc_function('execute_migration_sql', {'sql_query': sql})
        
        if result and result.get('success'):
            print(f"   ✅ Statement {i} executado")
            success_count += 1
        else:
            print(f"   ❌ Falha no statement {i}")
    
    return success_count == len(migration_statements)

def main():
    print("🔧 CONFIGURAR RPC + APLICAR MIGRATION")
    print("=" * 40)
    
    # Passo 1: Configurar função RPC
    if not setup_rpc_function():
        print("\n❌ Falha na configuração RPC")
        print("\n💡 MÉTODO MANUAL:")
        print("1. Acesse Supabase Dashboard")
        print("2. Execute setup_rpc_function.sql")
        print("3. Execute migration-sql-direct.sql")
        return
    
    # Aguardar propagação
    print("\n⏳ Aguardando propagação da função RPC...")
    time.sleep(3)
    
    # Passo 2: Aplicar migration
    success = apply_migration_via_rpc()
    
    if success:
        print("\n🎉 MIGRATION APLICADA COM SUCESSO!")
        print("\n📋 PRÓXIMO PASSO:")
        print("   - Teste na interface: adicionar motivo e refresh")
        print("   - Os motivos devem persistir após refresh")
    else:
        print("\n⚠️ Migration parcialmente aplicada")
        print("Verifique manualmente no Supabase Dashboard")

if __name__ == "__main__":
    main()