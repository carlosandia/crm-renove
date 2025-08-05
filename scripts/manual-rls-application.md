# 🔧 Aplicação Manual da Correção RLS

## ✅ Dados Confirmados
- **Pipeline "new13" ID**: `ee4e3ea3-bfb4-48b4-8de6-85216811e5b8`
- **Cadências existentes**: 1 configuração com 3 tarefas
- **Tenant ID**: `d7caffc1-c923-47c8-9301-ca9eeff1a243`
- **Conexão API**: Funcionando (78 usuários encontrados)

## 🎯 Problema Identificado
O sistema não consegue carregar as cadências devido às políticas RLS estarem configuradas para JWT customizado em vez de usar `auth.uid()` nativo do Supabase.

## 📋 Solução: Aplicar SQL Manual

### Acesse o SQL Editor:
https://supabase.com/dashboard/project/marajvabdwkpgopytvhh/sql

### Cole e execute este SQL:

```sql
-- ============================================
-- CORREÇÃO RLS PARA AUTH.UID() NATIVO
-- ============================================

-- 1. Remover políticas antigas que usam JWT customizado
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
SELECT 'RLS Policies for cadence_configs:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'cadence_configs';

-- 4. Verificar se RLS está habilitado
SELECT 'RLS Status:' as info;
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE tablename = 'cadence_configs';
```

## ✅ Resultado Esperado
Após executar o SQL, o sistema deve:
1. Usar autenticação Supabase nativa (`auth.uid()`)
2. Carregar cadências corretamente via AuthProvider simplificado
3. Exibir as atividades na aba "Atividades" da pipeline "new13"

## 🧪 Teste Final
1. **Login**: `seraquevai@seraquevai.com`
2. **Acesse**: Pipeline "new13" → Editar
3. **Clique**: Aba "Atividades"  
4. **Deve mostrar**: 1 configuração de cadência com 3 tarefas

## 🔧 Configuração Técnica Aplicada
- ✅ Supabase CLI v2.31.8 configurado
- ✅ Projeto linkado com `marajvabdwkpgopytvhh`
- ✅ AuthProvider usando `supabase.auth.signInWithPassword()`
- ✅ Sistema de fallback implementado no frontend
- ✅ Dados existem no banco (confirmado via API)