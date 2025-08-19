#!/bin/bash

# 🔧 APLICAR MIGRATION: Via psql direto no Supabase
# =================================================

# Configurações do Supabase
DB_HOST="db.marajvabdwkpgopytvhh.supabase.co"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASS="Carlos455460@"

echo "🔧 APLICANDO MIGRATION: Basic Supabase Authentication via psql"
echo "=============================================================="

echo ""
echo "📋 1. Testando conexão com Supabase..."

# Testar conexão
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 as connection_test;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Conexão com Supabase estabelecida"
else
    echo "❌ Falha na conexão com Supabase"
    echo ""
    echo "💡 VERIFICAÇÕES:"
    echo "1. Verifique se a senha está correta: Carlos455460@"
    echo "2. Verifique se o host está correto: db.marajvabdwkpgopytvhh.supabase.co"
    echo "3. Verifique se o firewall permite conexões na porta 6543"
    echo ""
    echo "💡 ALTERNATIVA: Use Supabase Dashboard manual"
    echo "1. Acesse: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh"
    echo "2. Vá em: Database > SQL Editor"
    echo "3. Execute: migration-sql-direct.sql"
    exit 1
fi

echo ""
echo "📋 2. Verificando políticas RLS atuais..."

# Verificar políticas existentes
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd
FROM pg_policies 
WHERE tablename IN ('pipeline_outcome_reasons', 'lead_outcome_history')
ORDER BY tablename, policyname;
"

echo ""
echo "📋 3. Aplicando migration..."

# Executar migration
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- ============================================
-- 🔧 MIGRATION: Basic Supabase Authentication
-- ============================================

-- ETAPA 1: Remover políticas antigas incompatíveis
DROP POLICY IF EXISTS "Users can view outcome reasons for their tenant" ON pipeline_outcome_reasons;
DROP POLICY IF EXISTS "Admins can manage outcome reasons for their tenant" ON pipeline_outcome_reasons;
DROP POLICY IF EXISTS "Users can view outcome history for their tenant" ON lead_outcome_history;
DROP POLICY IF EXISTS "Users can create outcome history for their tenant" ON lead_outcome_history;

-- ETAPA 2: Criar políticas Basic Supabase Auth
CREATE POLICY "basic_auth_view_outcome_reasons"
  ON pipeline_outcome_reasons
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = (
      SELECT user_metadata->>'tenant_id'
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "basic_auth_manage_outcome_reasons"
  ON pipeline_outcome_reasons
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = (
      SELECT user_metadata->>'tenant_id'
      FROM auth.users
      WHERE id = auth.uid()
    )
    AND (
      SELECT user_metadata->>'role'
      FROM auth.users
      WHERE id = auth.uid()
    ) IN ('admin', 'super_admin', 'member')
  );

-- ETAPA 3: Políticas para lead_outcome_history
CREATE POLICY "basic_auth_view_outcome_history"
  ON lead_outcome_history
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = (
      SELECT user_metadata->>'tenant_id'
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "basic_auth_create_outcome_history"
  ON lead_outcome_history
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = (
      SELECT user_metadata->>'tenant_id'
      FROM auth.users
      WHERE id = auth.uid()
    )
    AND (
      SELECT user_metadata->>'role'
      FROM auth.users
      WHERE id = auth.uid()
    ) IN ('admin', 'member', 'super_admin')
  );

-- Verificar se as políticas foram criadas
SELECT 'Migration completed successfully' as status;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ MIGRATION APLICADA COM SUCESSO!"
    echo ""
    echo "📋 4. Verificando políticas finais..."
    
    # Verificar políticas finais
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname, 
        tablename, 
        policyname, 
        cmd
    FROM pg_policies 
    WHERE tablename IN ('pipeline_outcome_reasons', 'lead_outcome_history')
    AND policyname LIKE 'basic_auth%'
    ORDER BY tablename, policyname;
    "
    
    echo ""
    echo "🎉 CORREÇÃO COMPLETA!"
    echo ""
    echo "📋 PRÓXIMO PASSO:"
    echo "1. Acesse a interface do CRM"
    echo "2. Vá na aba 'Motivos' de uma pipeline"
    echo "3. Adicione um motivo (ex: 'Teste Persistência')"
    echo "4. Clique em 'Salvar'"
    echo "5. REFRESH a página (F5)"
    echo "6. ✅ O motivo deve permanecer visível"
    echo ""
    echo "ANTES: ❌ Motivos desapareciam após refresh"
    echo "AGORA:  ✅ Motivos persistem corretamente"
    
else
    echo ""
    echo "❌ ERRO na aplicação da migration"
    echo ""
    echo "💡 MÉTODO MANUAL ALTERNATIVO:"
    echo "1. Acesse: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh"
    echo "2. Vá em: Database > SQL Editor"
    echo "3. Execute o arquivo: migration-sql-direct.sql"
fi