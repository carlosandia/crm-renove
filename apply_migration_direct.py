#!/usr/bin/env python3
"""
🔧 APLICAR MIGRATION: Basic Supabase Authentication
===================================================
"""

import requests
import json
import sys

# Configurações Supabase
SUPABASE_URL = "https://marajvabdwkpgopytvhh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY"

def execute_sql(sql):
    """Execute SQL via Supabase PostgREST"""
    
    # Headers para service role
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # Try different endpoints
    endpoints = [
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        f"{SUPABASE_URL}/functions/v1/exec_sql", 
        f"{SUPABASE_URL}/rest/v1/exec_sql"
    ]
    
    payload = {"query": sql}
    
    for endpoint in endpoints:
        try:
            print(f"🧪 Tentando endpoint: {endpoint}")
            response = requests.post(endpoint, headers=headers, json=payload, timeout=30)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ SQL executado com sucesso!")
                return response.json()
            elif response.status_code == 404:
                print("   ❌ Endpoint não encontrado")
                continue
            else:
                print(f"   ⚠️  Resposta: {response.text[:200]}")
                
        except Exception as e:
            print(f"   ❌ Erro: {e}")
            continue
            
    return None

def main():
    print("🔧 APLICANDO MIGRATION: Basic Supabase Authentication")
    print("=" * 55)
    
    # SQL da migration
    migration_sql = """
-- ============================================
-- 🔧 MIGRATION: Basic Supabase Authentication  
-- ============================================

-- ETAPA 1: Remover políticas antigas incompatíveis
DROP POLICY IF EXISTS "Users can view outcome reasons for their tenant" ON pipeline_outcome_reasons;
DROP POLICY IF EXISTS "Admins can manage outcome reasons for their tenant" ON pipeline_outcome_reasons;
DROP POLICY IF EXISTS "Users can view outcome history for their tenant" ON lead_outcome_history;
DROP POLICY IF EXISTS "Users can create outcome history for their tenant" ON lead_outcome_history;

-- ETAPA 2: Criar políticas Basic Supabase Auth
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

-- ETAPA 3: Políticas para lead_outcome_history
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
"""
    
    # Executar cada statement separadamente para evitar erros de parsing
    statements = [
        'DROP POLICY IF EXISTS "Users can view outcome reasons for their tenant" ON pipeline_outcome_reasons;',
        'DROP POLICY IF EXISTS "Admins can manage outcome reasons for their tenant" ON pipeline_outcome_reasons;',
        'DROP POLICY IF EXISTS "Users can view outcome history for their tenant" ON lead_outcome_history;',
        'DROP POLICY IF EXISTS "Users can create outcome history for their tenant" ON lead_outcome_history;'
    ]
    
    print("\n📋 EXECUTANDO MIGRATION:")
    
    for i, sql in enumerate(statements, 1):
        print(f"\n{i}. {sql[:50]}...")
        result = execute_sql(sql)
        if result is None:
            print(f"   ⚠️  Falha ao executar statement {i}")
        else:
            print(f"   ✅ Statement {i} executado")
    
    print("\n💡 INSTRUÇÕES PARA APLICAR MANUALMENTE:")
    print("=" * 50)
    print("1. Acesse: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh")
    print("2. Vá em: Database > SQL Editor")
    print("3. Execute o arquivo: migration-sql-direct.sql")
    print("\n🎯 PRÓXIMO PASSO: Testar persistência dos motivos!")

if __name__ == "__main__":
    main()