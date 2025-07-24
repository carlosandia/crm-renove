-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'cadence_configs';

-- Verificar políticas RLS existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'cadence_configs';

-- Verificar estrutura da tabela
\d cadence_configs;

-- Testar inserção com dados simulados
SELECT 
  current_setting('app.current_user_id', true) as current_user_id,
  current_setting('request.jwt.claims', true) as jwt_claims,
  current_setting('role') as current_role;
EOF < /dev/null