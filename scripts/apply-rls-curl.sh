#!/bin/bash

echo "🔧 Aplicando correção RLS via API REST..."

SUPABASE_URL="https://marajvabdwkpgopytvhh.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY"

echo "📝 Step 1: Testando conexão..."
curl -s -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" "$SUPABASE_URL/rest/v1/users?select=count" | head -50

echo ""
echo "📝 Step 2: Verificando políticas atuais..."
curl -s -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" "$SUPABASE_URL/rest/v1/pg_policies?tablename=eq.cadence_configs&select=*" | head -200

echo ""
echo "✅ Informações obtidas. Execute o SQL manual no Supabase Dashboard:"
echo ""
echo "> https://supabase.com/dashboard/project/marajvabdwkpgopytvhh/sql"
echo ""
cat << 'EOF'
-- Cole este SQL no SQL Editor:

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "allow_all_cadence_configs" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_tenant_policy" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_users_policy" ON cadence_configs;

-- 2. Criar nova política
CREATE POLICY "cadence_configs_auth_uid" ON cadence_configs
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM users u 
    JOIN pipelines p ON p.tenant_id = u.tenant_id
    WHERE u.id = auth.uid() 
    AND u.is_active = true
    AND p.id = cadence_configs.pipeline_id
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM users u 
    JOIN pipelines p ON p.tenant_id = u.tenant_id
    WHERE u.id = auth.uid() 
    AND u.is_active = true
    AND p.id = pipeline_id
  )
);

-- 3. Verificar resultado
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'cadence_configs';
EOF