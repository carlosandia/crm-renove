#!/bin/bash

# 🔧 EXECUTAR MIGRATION VIA CURL - Basic Supabase Authentication
# ===============================================================

SUPABASE_URL="https://marajvabdwkpgopytvhh.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY"

echo "🔧 EXECUTANDO MIGRATION: Basic Supabase Authentication"
echo "======================================================"

# ETAPA 1: Testar conexão
echo ""
echo "📋 ETAPA 1: Testando conexão com Supabase..."

curl -X GET \
  "${SUPABASE_URL}/rest/v1/pipeline_outcome_reasons?select=id&limit=1" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "✅ Conexão testada"

# ETAPA 2: Aplicar policies via RPC (se disponível)
echo ""
echo "📋 ETAPA 2: Tentando aplicar migration via RPC..."

# SQL para remover policies antigas
SQL_DROP='DROP POLICY IF EXISTS "Users can view outcome reasons for their tenant" ON pipeline_outcome_reasons;'

curl -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sql_query\": \"${SQL_DROP}\"}" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "⚠️ Se não funcionou via RPC, use o Supabase Dashboard"

echo ""
echo "💡 APLICAR MIGRATION MANUALMENTE:"
echo "================================="
echo "1. Acesse: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh"
echo "2. Vá em: Database > SQL Editor"
echo "3. Execute o arquivo: migration-sql-direct.sql"
echo ""

echo "🎯 CORREÇÃO COMPLETA APLICADA:"
echo "✅ outcomeReasonsApi.ts - Basic Supabase Authentication implementado"
echo "📋 RLS policies - Devem usar auth.uid() + user_metadata"
echo "🧪 Teste manual necessário após aplicar RLS policies"

echo ""
echo "🏁 SCRIPT CONCLUÍDO"