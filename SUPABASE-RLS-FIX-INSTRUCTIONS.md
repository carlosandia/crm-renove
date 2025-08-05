# 🔧 Instruções para Aplicar Correção RLS

## ⚠️ IMPORTANTE
Execute estes comandos SQL diretamente no **SQL Editor do Supabase Dashboard** para corrigir as políticas RLS e permitir que as atividades sejam carregadas corretamente.

## 🔗 Acessar SQL Editor
1. Vá para: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh
2. Navegue até **SQL Editor** no menu lateral
3. Cole e execute o SQL abaixo

## 📝 SQL para Executar

```sql
-- ============================================
-- CORREÇÃO RLS PARA SUPABASE AUTH NATIVO
-- ============================================

-- 1. Remover políticas antigas/permissivas
DROP POLICY IF EXISTS "allow_all_cadence_configs" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_tenant_policy" ON cadence_configs;
DROP POLICY IF EXISTS "cadence_configs_users_policy" ON cadence_configs;

-- 2. Criar política usando auth.uid() nativo do Supabase
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

-- 3. Verificar política criada
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'cadence_configs';

-- 4. Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE tablename = 'cadence_configs';
```

## ✅ Resultado Esperado
Após executar, você deve ver:
- Política `cadence_configs_auth_uid` criada
- RLS habilitado (`rowsecurity = true`)
- Sistema funcionando com autenticação Supabase nativa

## 🧪 Teste Final
1. Faça login com `seraquevai@seraquevai.com`
2. Acesse a pipeline "new13" para editar
3. Clique na aba **Atividades**
4. Verifique se as 4 configurações de cadência aparecem (12 atividades total)

## 🔄 Configuração Local Concluída
- ✅ Supabase CLI atualizado para v2.31.8
- ✅ Projeto linkado com `marajvabdwkpgopytvhh`
- ✅ Arquivo `.env` configurado
- ✅ AuthProvider usando Supabase Auth nativo
- ✅ Sistema de fallback implementado no frontend