#!/bin/bash

# Script para aplicar correção RLS via Supabase REST API
# Usando endpoint de SQL query direto

SUPABASE_URL="https://marajvabdwkpgopytvhh.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY"

echo "🔧 APLICANDO CORREÇÃO RLS PARA DELETE PIPELINE_LEADS"
echo "===================================================="

# Verificar se curl está disponível
if ! command -v curl &> /dev/null; then
    echo "❌ curl não encontrado. Instale curl para continuar."
    exit 1
fi

echo "📋 1. Verificando policies atuais..."

# Primeiro, vamos verificar as policies existentes
curl -s \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  "$SUPABASE_URL/rest/v1/rpc/execute_sql" \
  -d '{
    "sql": "SELECT schemaname, tablename, policyname, qual FROM pg_policies WHERE tablename = '\''pipeline_leads'\'' AND cmd = '\''DELETE'\'';"
  }' | jq '.' 2>/dev/null || echo "Policies não puderam ser listadas via API REST"

echo ""
echo "📋 2. Tentando aplicar correção via backend local..."

# Como a API REST direta não funciona, vamos aplicar via nosso backend
# que já tem conexão com Supabase

curl -s \
  -H "Content-Type: application/json" \
  -X POST \
  "http://127.0.0.1:3001/admin/execute-sql" \
  -d '{
    "sql": "DROP POLICY IF EXISTS \"dev_permissive_pipeline_leads_delete\" ON pipeline_leads; CREATE POLICY \"secure_pipeline_leads_delete\" ON pipeline_leads FOR DELETE USING (tenant_id = (SELECT user_metadata->>'\''tenant_id'\'' FROM auth.users WHERE id = auth.uid()) AND auth.uid() IS NOT NULL); ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;"
  }' 2>/dev/null || echo "❌ Backend local não tem endpoint de admin SQL"

echo ""
echo "📋 3. Método alternativo: Migration manual"
echo "Por favor, execute manualmente no Supabase Dashboard > SQL Editor:"
echo ""
echo "-- 1. REMOVER POLICY PERMISSIVA ATUAL"
echo "DROP POLICY IF EXISTS \"dev_permissive_pipeline_leads_delete\" ON pipeline_leads;"
echo ""
echo "-- 2. CRIAR POLICY SEGURA COM TENANT ISOLATION"
echo "CREATE POLICY \"secure_pipeline_leads_delete\" ON pipeline_leads"
echo "    FOR DELETE USING ("
echo "        tenant_id = ("
echo "            SELECT user_metadata->>'tenant_id'"
echo "            FROM auth.users"
echo "            WHERE id = auth.uid()"
echo "        )"
echo "        AND auth.uid() IS NOT NULL"
echo "    );"
echo ""
echo "-- 3. VERIFICAR SE RLS ESTÁ HABILITADO"
echo "ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;"
echo ""
echo "✅ Após executar, o problema de DELETE silencioso deve estar resolvido."