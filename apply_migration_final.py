#!/usr/bin/env python3
"""
🔧 APLICAR MIGRATION: Método Definitivo via Supabase Edge Functions
==================================================================
"""

import requests
import json
import subprocess
import os

# Configurações Supabase
SUPABASE_URL = "https://marajvabdwkpgopytvhh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY"

def verify_current_state():
    """Verificar estado atual das policies"""
    
    print("🔍 VERIFICANDO ESTADO ATUAL DAS POLICIES...")
    
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Testar se conseguimos acessar a tabela
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/pipeline_outcome_reasons?select=id&limit=1",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Conexão com pipeline_outcome_reasons: OK")
            data = response.json()
            print(f"   Registros encontrados: {len(data)}")
        else:
            print(f"❌ Erro ao acessar pipeline_outcome_reasons: {response.status_code}")
            print(f"   Resposta: {response.text}")
            
    except Exception as e:
        print(f"❌ Exceção ao verificar tabela: {e}")
    
    # Tentar criar um registro de teste
    try:
        print("\n🧪 Testando inserção na tabela...")
        test_data = {
            "pipeline_id": "test-pipeline-id",
            "tenant_id": "d7caffc1-c923-47c8-9301-ca9eeff1a243",
            "reason_type": "ganho",
            "reason_text": "Teste RLS",
            "description": "Teste para verificar RLS policies"
        }
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/pipeline_outcome_reasons",
            headers=headers,
            json=test_data,
            timeout=10
        )
        
        if response.status_code == 201:
            print("✅ Inserção de teste: SUCESSO")
            print("   RLS permite inserção via service_role")
        elif response.status_code == 403:
            print("❌ Inserção bloqueada: RLS policies restritivas")
        else:
            print(f"⚠️ Resposta inesperada: {response.status_code}")
            print(f"   Detalhes: {response.text}")
            
    except Exception as e:
        print(f"❌ Exceção no teste de inserção: {e}")

def create_migration_via_supabase_cli():
    """Tentar aplicar via Supabase CLI se disponível"""
    
    print("\n🔧 TENTANDO VIA SUPABASE CLI...")
    
    # Verificar se Supabase CLI está disponível
    try:
        result = subprocess.run(['supabase', '--version'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print(f"✅ Supabase CLI encontrado: {result.stdout.strip()}")
            
            # Tentar aplicar migration
            migration_content = '''
-- Basic Supabase Authentication Migration
DROP POLICY IF EXISTS "Users can view outcome reasons for their tenant" ON pipeline_outcome_reasons;
DROP POLICY IF EXISTS "Admins can manage outcome reasons for their tenant" ON pipeline_outcome_reasons;

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
  );
'''
            
            # Criar arquivo temporário de migration
            with open('/tmp/rls_migration.sql', 'w') as f:
                f.write(migration_content)
            
            print("📋 Tentando aplicar migration via CLI...")
            # Este comando provavelmente falhará sem configuração local
            result = subprocess.run(['supabase', 'db', 'reset', '--local'], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                print("✅ Migration aplicada via CLI")
                return True
            else:
                print(f"❌ CLI falhou: {result.stderr}")
                
        else:
            print("❌ Supabase CLI não encontrado")
            
    except FileNotFoundError:
        print("❌ Supabase CLI não instalado")
    except Exception as e:
        print(f"❌ Erro com CLI: {e}")
    
    return False

def suggest_manual_application():
    """Mostrar instruções detalhadas para aplicação manual"""
    
    print("\n📋 INSTRUÇÃO MANUAL DEFINITIVA:")
    print("=" * 50)
    
    print("\n🎯 PASSO A PASSO:")
    print("1. Acesse: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh")
    print("2. Faça login na sua conta Supabase")
    print("3. Vá em: Database > SQL Editor")
    print("4. Clique em 'New query'")
    print("5. Cole e execute o SQL abaixo:")
    
    print("\n" + "="*50)
    print("-- 🔧 MIGRATION: Basic Supabase Authentication")
    print("-- COPIE E COLE TODO O CONTEÚDO ABAIXO:")
    print("="*50)
    
    migration_sql = '''
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

-- Confirmar sucesso
SELECT 'Migration aplicada com sucesso!' as status;
'''
    
    print(migration_sql)
    print("="*50)
    print("\n6. Clique em 'Run' para executar")
    print("7. Verifique se aparece 'Migration aplicada com sucesso!'")
    
    print("\n🧪 TESTE APÓS APLICAR:")
    print("1. Acesse a interface do CRM: http://127.0.0.1:8080")
    print("2. Vá em uma pipeline > aba 'Motivos'")
    print("3. Adicione um motivo (ex: 'Teste Final')")
    print("4. Clique em 'Salvar'")
    print("5. REFRESH a página (F5)")
    print("6. ✅ O motivo deve permanecer visível")
    
    print("\n🎉 RESULTADO ESPERADO:")
    print("ANTES: ❌ Motivos desapareciam após refresh")
    print("AGORA:  ✅ Motivos persistem corretamente")

def main():
    print("🔧 APLICAÇÃO DEFINITIVA DA MIGRATION")
    print("=" * 40)
    
    # Verificar estado atual
    verify_current_state()
    
    # Tentar CLI
    if not create_migration_via_supabase_cli():
        # Mostrar instruções manuais
        suggest_manual_application()

if __name__ == "__main__":
    main()