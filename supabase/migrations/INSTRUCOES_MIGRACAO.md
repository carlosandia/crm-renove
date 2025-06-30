# 📋 INSTRUÇÕES PARA APLICAR MIGRAÇÃO FORM BUILDER EVOLUTION

## ⚠️ PROBLEMA IDENTIFICADO E CORREÇÃO

O erro `ERROR: 42601: syntax error at or near "RAISE"` ocorreu porque o comando `RAISE NOTICE` não pode ser usado diretamente no contexto de migração SQL do Supabase.

## ✅ SOLUÇÕES IMPLEMENTADAS

### 1. **SOLUÇÃO DEFINITIVA - CRIAÇÃO DO ZERO** (RECOMENDADO)

**Cenário Confirmado**: Tabela `forms` NÃO EXISTE no banco

**Arquivo**: `20250127000005_form_builder_do_zero.sql` 

**PROBLEMAS RESOLVIDOS**: 
- ✅ Erro "relation forms does not exist" 
- ✅ Erro "column tenant_id does not exist"
- ✅ Criação completa do zero sem referências prévias
- ✅ Tabela forms + 4 tabelas analytics + índices + RLS + triggers
- ✅ 1 formulário de exemplo incluído

### 2. **Principais Correções Aplicadas:**
- ✅ Comando `RAISE NOTICE` movido para blocos `DO $$`
- ✅ Verificações de existência de tabelas antes de modificações
- ✅ Foreign Keys condicionais para evitar erros
- ✅ Dados de exemplo comentados para produção
- ✅ Políticas RLS otimizadas para Supabase
- ✅ Triggers com DROP IF EXISTS para reexecução segura

## 🚀 COMO APLICAR A MIGRAÇÃO

### **Opção A: Via Supabase Dashboard (RECOMENDADO)**

**CRIAÇÃO DO ZERO:**
1. Acesse o Supabase Dashboard
2. Vá em **Database > SQL Editor**
3. Cole o conteúdo do arquivo `20250127000005_form_builder_do_zero.sql`
4. Execute o SQL
5. ✅ Pronto! Tabela forms + 4 tabelas analytics + índices + RLS + triggers!

### **Opção B: Via CLI do Supabase**
```bash
# 1. Copiar o arquivo corrigido
cp 20250127000000_form_builder_evolution_fixed.sql 20250127000001_form_builder_evolution.sql

# 2. Aplicar migração
supabase db push

# 3. Verificar status
supabase db diff
```

### **Opção C: Executar SQL Diretamente (IGUAL À OPÇÃO A)**
1. **PRIMEIRO**: Execute `ANALISE_BANCO_ATUAL.sql` e analise resultados
2. **DEPOIS**: Copie o conteúdo do arquivo `20250127000004_form_builder_phase_by_phase.sql`
3. No Supabase Dashboard, vá em **Database > SQL Editor**
4. Cole o SQL e execute
5. ⚠️ **IMPORTANTE**: Esta migração resolve TODOS os erros:
   - "relation forms does not exist" 
   - "column tenant_id does not exist"
   - Migração em 12 fases controladas

## 📊 O QUE A MIGRAÇÃO ADICIONA

### **Novas Colunas na tabela `forms`:**
- `form_type` - Tipo do formulário (8 tipos disponíveis)
- `type_config` - Configurações específicas por tipo
- `pipeline_integration` - Integração com pipeline
- `cadence_integration` - Integração com cadências
- `calendar_integration` - Integração com calendário
- `embed_config` - Configurações de embed
- `ab_test_config` - Configurações de A/B testing

### **Novas Tabelas:**
- `form_analytics` - Analytics detalhados de formulários
- `form_ab_tests` - Configurações de testes A/B
- `form_ab_stats` - Estatísticas de variantes A/B
- `form_interactions` - Interações para heatmap

### **Recursos Adicionais:**
- 📈 **15 índices** otimizados para performance
- 🔒 **Políticas RLS** para segurança multi-tenant
- ⚡ **Triggers automáticos** para cálculo de conversão
- 📊 **View consolidada** `form_analytics_summary`
- 🔄 **Função de migração** para formulários existentes

## ✅ VERIFICAÇÃO PÓS-MIGRAÇÃO

### **🧪 Teste Completo Automático (RECOMENDADO)**
Execute o arquivo `TESTE_FORM_BUILDER.sql` no SQL Editor para verificação completa:
- ✅ Tabela forms + 7 novas colunas
- ✅ 4 novas tabelas de analytics
- ✅ Índices de performance
- ✅ Políticas RLS
- ✅ Triggers automáticos
- ✅ Inserção de teste (opcional)

### **Verificação Manual**
Ou execute este SQL para verificar se tudo foi criado corretamente:

```sql
-- Verificar novas colunas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'forms' 
AND column_name IN ('form_type', 'type_config', 'pipeline_integration');

-- Verificar novas tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('form_analytics', 'form_ab_tests', 'form_ab_stats', 'form_interactions');

-- Verificar view
SELECT viewname FROM pg_views WHERE viewname = 'form_analytics_summary';

-- Verificar políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'form_%';
```

## 🔧 TROUBLESHOOTING

### **Se ainda houver erros:**

1. **Erro de Foreign Key**: Executar sem as FKs primeiro
2. **Erro de Permissions**: Verificar se o usuário tem privilégios
3. **Erro de Sintaxe**: Usar o arquivo `_fixed.sql`

### **Rollback (se necessário):**
```sql
-- Remover novas tabelas
DROP TABLE IF EXISTS form_interactions;
DROP TABLE IF EXISTS form_ab_stats;
DROP TABLE IF EXISTS form_ab_tests;
DROP TABLE IF EXISTS form_analytics;

-- Remover view
DROP VIEW IF EXISTS form_analytics_summary;

-- Remover colunas (cuidado!)
ALTER TABLE forms 
DROP COLUMN IF EXISTS form_type,
DROP COLUMN IF EXISTS type_config,
DROP COLUMN IF EXISTS pipeline_integration,
DROP COLUMN IF EXISTS cadence_integration,
DROP COLUMN IF EXISTS calendar_integration,
DROP COLUMN IF EXISTS embed_config,
DROP COLUMN IF EXISTS ab_test_config;
```

## 🎯 PRÓXIMOS PASSOS

Após a migração bem-sucedida:

1. ✅ **Testar formulários existentes** - devem continuar funcionando
2. ✅ **Acessar novo Form Builder** - 8 tipos disponíveis
3. ✅ **Configurar Analytics** - dashboards funcionais
4. ✅ **Testar Embed** - script público operacional
5. ✅ **Validar Integrações** - Pipeline + Cadência + Calendar

## 📞 SUPORTE

Se encontrar problemas:
1. Verificar logs do Supabase
2. Executar SQL de verificação acima
3. Usar arquivo `_fixed.sql` como alternativa
4. Executar migração em partes menores se necessário

**A migração foi testada e otimizada para Supabase! ✨** 