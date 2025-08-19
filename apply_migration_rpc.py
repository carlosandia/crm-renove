#!/usr/bin/env python3
"""
🔧 APLICAR MIGRATION: Via RPC Function (Supabase Official)
=========================================================
"""

import requests
import json
import sys

# Configurações Supabase
SUPABASE_URL = "https://marajvabdwkpgopytvhh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY"

def call_rpc_function(function_name, params):
    """Call Supabase RPC function following official documentation"""
    
    # Headers para service role
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # RPC endpoint conforme documentação oficial
    rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/{function_name}"
    
    try:
        print(f"🔗 Chamando RPC: {function_name}")
        response = requests.post(rpc_url, headers=headers, json=params, timeout=30)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Resultado: {result}")
            return result
        elif response.status_code == 404:
            print(f"   ❌ Função RPC não encontrada. Execute setup_rpc_function.sql primeiro!")
            return None
        else:
            print(f"   ⚠️  Erro: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Exceção: {e}")
        return None

def check_rls_policies():
    """Verificar políticas RLS existentes"""
    print("\n📋 VERIFICANDO POLÍTICAS RLS ATUAIS:")
    
    # Verificar pipeline_outcome_reasons
    result = call_rpc_function('check_rls_policies', {'table_name': 'pipeline_outcome_reasons'})
    if result:
        print(f"   📊 pipeline_outcome_reasons: {result.get('policy_count', 0)} políticas")
    
    # Verificar lead_outcome_history  
    result = call_rpc_function('check_rls_policies', {'table_name': 'lead_outcome_history'})
    if result:
        print(f"   📊 lead_outcome_history: {result.get('policy_count', 0)} políticas")

def apply_migration():
    """Aplicar migration via RPC"""
    
    # SQL statements para a migration
    migration_statements = [
        # ETAPA 1: Remover políticas antigas
        'DROP POLICY IF EXISTS "Users can view outcome reasons for their tenant" ON pipeline_outcome_reasons;',
        'DROP POLICY IF EXISTS "Admins can manage outcome reasons for their tenant" ON pipeline_outcome_reasons;',
        'DROP POLICY IF EXISTS "Users can view outcome history for their tenant" ON lead_outcome_history;',
        'DROP POLICY IF EXISTS "Users can create outcome history for their tenant" ON lead_outcome_history;',
        
        # ETAPA 2: Criar políticas Basic Supabase Auth
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
        
        # ETAPA 3: Políticas para lead_outcome_history
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
    
    print("\n🚀 EXECUTANDO MIGRATION VIA RPC:")
    
    success_count = 0
    for i, sql_statement in enumerate(migration_statements, 1):
        print(f"\n{i}. {sql_statement[:60]}...")
        
        # Chamar função RPC
        result = call_rpc_function('execute_migration_sql', {'sql_query': sql_statement})
        
        if result and result.get('success'):
            print(f"   ✅ Statement {i} executado com sucesso")
            success_count += 1
        else:
            print(f"   ❌ Falha no statement {i}")
    
    print(f"\n📊 RESULTADO: {success_count}/{len(migration_statements)} statements executados")
    
    return success_count == len(migration_statements)

def main():
    print("🔧 APLICANDO MIGRATION: Basic Supabase Authentication via RPC")
    print("=" * 65)
    
    # Verificar estado atual
    check_rls_policies()
    
    # Aplicar migration
    success = apply_migration()
    
    if success:
        print("\n🎉 MIGRATION APLICADA COM SUCESSO!")
        print("\n📋 PRÓXIMOS PASSOS:")
        print("1. Verificar políticas atualizadas")
        print("2. Testar persistência dos motivos na interface")
        
        # Verificar estado final
        check_rls_policies()
        
    else:
        print("\n⚠️  MIGRATION PARCIALMENTE APLICADA")
        print("\n💡 FALLBACK - APLICAÇÃO MANUAL:")
        print("1. Acesse: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh")
        print("2. Vá em: Database > SQL Editor")
        print("3. Execute primeiro: setup_rpc_function.sql")
        print("4. Execute depois: migration-sql-direct.sql")

if __name__ == "__main__":
    main()