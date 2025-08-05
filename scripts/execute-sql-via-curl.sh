#!/bin/bash

echo "🔧 Executando correção RLS via SQL direto..."

SUPABASE_URL="https://marajvabdwkpgopytvhh.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI2InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY"

# SQL para executar
SQL_COMMAND="
-- 1. Remover políticas antigas
DROP POLICY IF EXISTS \"allow_all_cadence_configs\" ON cadence_configs;
DROP POLICY IF EXISTS \"cadence_configs_tenant_policy\" ON cadence_configs;
DROP POLICY IF EXISTS \"cadence_configs_users_policy\" ON cadence_configs;

-- 2. Criar nova política corrigida
CREATE POLICY \"cadence_configs_auth_uid\" ON cadence_configs
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM users u 
    JOIN pipelines p ON p.tenant_id = u.tenant_id
    WHERE u.id::text = auth.uid()::text
    AND u.is_active = true
    AND p.id = cadence_configs.pipeline_id
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM users u 
    JOIN pipelines p ON p.tenant_id = u.tenant_id
    WHERE u.id::text = auth.uid()::text
    AND u.is_active = true
    AND p.id = pipeline_id
  )
);
"

echo "📝 Executando SQL via API REST..."

# Tentar executar via função rpc se ela existir
curl -X POST "$SUPABASE_URL/rest/v1/rpc/execute_sql" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql_command\": \"$SQL_COMMAND\"}" \
  2>/dev/null || echo "Função execute_sql não disponível"

echo ""
echo "✅ Se houver erro acima, execute manualmente no Supabase Dashboard:"
echo "👉 https://supabase.com/dashboard/project/marajvabdwkpgopytvhh/sql"
echo ""
echo "SQL para colar:"
echo "$SQL_COMMAND"

echo ""
echo "🔍 Verificando se a política foi criada..."
curl -s -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/rpc/check_policies" \
  2>/dev/null || echo "Não foi possível verificar automaticamente"