# 🚀 Instruções para Correção RLS Manual

## ❌ Por que o MCP Supabase não funciona:

1. **MCP Server não conecta**: O `@supabase/mcp-server-supabase` tem problemas de inicialização
2. **API REST limitada**: Supabase não permite execução de SQL DDL via REST API diretamente
3. **Configuração MCP**: Claude Code não está carregando corretamente o servidor MCP

## ✅ Solução Manual - Execute no Supabase Dashboard:

### Passo 1: Acesse o SQL Editor
👉 https://supabase.com/dashboard/project/marajvabdwkpgopytvhh/sql

### Passo 2: Execute PRIMEIRO (Criar funções auxiliares)
```sql
-- Função para executar SQL dinamicamente via API REST
CREATE OR REPLACE FUNCTION execute_sql(sql_command TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_command;
  RETURN 'SQL executado com sucesso';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Erro: ' || SQLERRM;
END;
$$;

-- Função para verificar políticas
CREATE OR REPLACE FUNCTION check_policies(table_name TEXT DEFAULT 'cadence_configs')
RETURNS TABLE(schema_name TEXT, table_name_out TEXT, policy_name TEXT, permissive TEXT, roles TEXT[], cmd TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.schemaname::TEXT,
    p.tablename::TEXT,
    p.policyname::TEXT,
    p.permissive::TEXT,
    p.roles,
    p.cmd::TEXT
  FROM pg_policies p
  WHERE p.tablename = table_name;
END;
$$;
```

### Passo 3: Execute a Correção RLS
```sql
-- 1. Verificar estado atual das políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'cadence_configs';

-- 2. Remover todas as políticas antigas de cadence_configs
DROP POLICY IF EXISTS "allow_all_cadence_configs" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_tenant_policy" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_users_policy" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_auth_uid" ON cadence_configs;

-- 3. Criar política corrigida com auth.uid() nativo
CREATE POLICY "cadence_configs_auth_uid" ON cadence_configs
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
    AND p.id = cadence_configs.pipeline_id
  )
);

-- 4. Verificar se a política foi criada corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'cadence_configs'
AND policyname = 'cadence_configs_auth_uid';

-- 5. Testar acesso às cadence_configs com usuário específico
SELECT 
  cc.*,
  p.name as pipeline_name,
  u.email as user_email
FROM cadence_configs cc
JOIN pipelines p ON p.id = cc.pipeline_id  
JOIN users u ON u.tenant_id = p.tenant_id
WHERE p.name = 'new13'
AND u.email = 'seraquevai@seraquevai.com';
```

### Passo 4: Verificar Resultado
Deve retornar:
- 1 política ativa: `cadence_configs_auth_uid`
- Dados das cadências para pipeline "new13"

## 🔧 Alternativa via API (após criar as funções)
Após executar o Passo 2, você pode tentar:
```bash
curl -X POST "https://marajvabdwkpgopytvhh.supabase.co/rest/v1/rpc/execute_sql" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.mkQBVPvhM3OJndsyinoONRUHSDJMh1nFBbPPNH_6cYY" \
  -H "Content-Type: application/json" \
  -d '{"sql_command": "CREATE POLICY ..."}'
```