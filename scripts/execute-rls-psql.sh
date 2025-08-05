#!/bin/bash

echo "🔧 Executando correção RLS via psql..."

# Connection string
DB_URL="postgresql://postgres.marajvabdwkpgopytvhh:[YOUR_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# SQL para executar
SQL_COMMANDS="
-- 1. Remover políticas antigas
DROP POLICY IF EXISTS \"allow_all_cadence_configs\" ON cadence_configs;
DROP POLICY IF EXISTS \"cadence_configs_tenant_policy\" ON cadence_configs;
DROP POLICY IF EXISTS \"cadence_configs_users_policy\" ON cadence_configs;

-- 2. Criar nova política
CREATE POLICY \"cadence_configs_auth_uid\" ON cadence_configs
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
SELECT 'Políticas criadas:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'cadence_configs';
"

echo "📝 SQL a ser executado:"
echo "$SQL_COMMANDS"

echo ""
echo "⚠️  Para executar, você precisa:"
echo "1. Instalar psql: brew install postgresql"
echo "2. Obter a senha do banco no Supabase Dashboard"
echo "3. Substituir [YOUR_PASSWORD] na connection string"
echo "4. Executar: psql \"$DB_URL\" -c \"$SQL_COMMANDS\""