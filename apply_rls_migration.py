#!/usr/bin/env python3
"""
Script para aplicar correção RLS no Supabase
"""
import os
import requests
import json

# Configurações Supabase
SUPABASE_URL = "https://marajvabdwkpgopytvhh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY"

def apply_rls_migration():
    """Aplicar migration RLS para corrigir DELETE policy"""
    
    # SQL da migration
    migration_sql = """
    -- 1. REMOVER POLICY PERMISSIVA ATUAL
    DROP POLICY IF EXISTS "dev_permissive_pipeline_leads_delete" ON pipeline_leads;
    
    -- 2. CRIAR POLICY SEGURA COM TENANT ISOLATION
    CREATE POLICY "secure_pipeline_leads_delete" ON pipeline_leads
        FOR DELETE USING (
            tenant_id = (
                SELECT user_metadata->>'tenant_id' 
                FROM auth.users 
                WHERE id = auth.uid()
            )
            AND auth.uid() IS NOT NULL
        );
    
    -- 3. VERIFICAR SE RLS ESTÁ HABILITADO
    ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;
    """
    
    # Headers para request
    headers = {
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY
    }
    
    # Executar SQL via API REST do Supabase
    url = f"{SUPABASE_URL}/rest/v1/rpc/execute_sql"
    payload = {
        'sql': migration_sql
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            print("✅ Migration RLS aplicada com sucesso!")
            print("✅ Policy 'secure_pipeline_leads_delete' criada")
            print("✅ Tenant isolation implementado para DELETE operations")
            return True
        else:
            print(f"❌ Erro ao aplicar migration: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na execução: {e}")
        return False

def verify_rls_policies():
    """Verificar se as policies estão corretas"""
    
    headers = {
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY
    }
    
    # Query para verificar policies DELETE
    url = f"{SUPABASE_URL}/rest/v1/rpc/verify_policies"
    payload = {
        'sql': """
        SELECT schemaname, tablename, policyname, qual
        FROM pg_policies 
        WHERE tablename = 'pipeline_leads' AND cmd = 'DELETE';
        """
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            policies = response.json()
            print("\n📋 Policies DELETE ativas em pipeline_leads:")
            for policy in policies:
                print(f"   - {policy['policyname']}: {policy['qual']}")
            return True
        else:
            print(f"⚠️ Não foi possível verificar policies: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"⚠️ Erro na verificação: {e}")
        return False

if __name__ == "__main__":
    print("🔧 APLICANDO CORREÇÃO RLS PARA DELETE PIPELINE_LEADS")
    print("=" * 50)
    
    # Aplicar migration
    success = apply_rls_migration()
    
    if success:
        print("\n🔍 Verificando policies aplicadas...")
        verify_rls_policies()
        
        print("\n✅ CORREÇÃO APLICADA COM SUCESSO!")
        print("📋 Próximo passo: Testar DELETE operations na interface")
    else:
        print("\n❌ FALHA NA APLICAÇÃO DA CORREÇÃO")
        print("📋 Verifique os logs e tente novamente")