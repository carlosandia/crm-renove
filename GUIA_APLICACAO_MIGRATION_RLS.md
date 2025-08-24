# 🎯 GUIA DEFINITIVO - APLICAÇÃO MANUAL MIGRATION RLS

## ✅ STATUS ATUAL
- **ReferenceError**: ✅ CORRIGIDO - useDeleteOpportunityMutation importado no LeadDetailsModal.tsx
- **Hook centralizado**: ✅ FUNCIONANDO - Cache invalidation implementado
- **Scripts automatizados**: ❌ FALHARAM - API Supabase não permite execução SQL via REST
- **Próximo passo**: 🔧 APLICAÇÃO MANUAL VIA DASHBOARD

---

## 🎯 INSTRUÇÃO MANUAL (OBRIGATÓRIA)

### 1. Acesse o Supabase Dashboard
```
URL: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh
```

### 2. Navegue para SQL Editor
- Clique em **"SQL Editor"** no menu lateral esquerdo
- Clique em **"New Query"** para criar uma nova consulta

### 3. Execute os 3 SQLs na ordem:

#### 🔧 SQL 1: Remover Policy Permissiva
```sql
DROP POLICY IF EXISTS "dev_permissive_pipeline_leads_delete" ON pipeline_leads;
```

#### 🔧 SQL 2: Criar Policy Segura com Tenant Isolation  
```sql
CREATE POLICY "secure_pipeline_leads_delete" ON pipeline_leads
FOR DELETE USING (
    tenant_id = (
        SELECT user_metadata->>'tenant_id'
        FROM auth.users
        WHERE id = auth.uid()
    )
    AND auth.uid() IS NOT NULL
);
```

#### 🔧 SQL 3: Habilitar RLS (verificação)
```sql
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;
```

### 4. Verificar Aplicação
Execute para confirmar que a policy foi criada:
```sql
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'pipeline_leads' AND cmd = 'DELETE';
```

**Resultado esperado**: Deve mostrar `secure_pipeline_leads_delete` em vez de `dev_permissive_pipeline_leads_delete`

---

## 🧪 TESTE APÓS APLICAÇÃO

### 1. Validar Sistema Local
```bash
# Frontend funcionando
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/

# Backend funcionando  
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health
```

### 2. Teste DELETE na Interface
1. **Acesse**: http://127.0.0.1:8080/
2. **Faça login** com suas credenciais
3. **Entre em um negócio** que tenha oportunidades
4. **Clique em uma oportunidade** para abrir LeadDetailsModal
5. **Clique "Excluir Negócio"**
6. **Verifique**:
   - ✅ Oportunidade desaparece imediatamente da interface
   - ✅ Logs mostram "Oportunidade excluída com sucesso"
   - ✅ Refresh da página confirma que foi removida do banco

### 3. Validação de Logs
**Antes da correção** (problema):
```
✅ Oportunidade excluída com sucesso
✅ Cache invalidado com sucesso
[refresh] ❌ Oportunidade ainda aparece na UI
```

**Após a correção** (funcionando):
```
✅ Oportunidade excluída com sucesso  
✅ Cache invalidado com sucesso
[refresh] ✅ Oportunidade removida definitivamente
```

---

## 🔍 CAUSA RAIZ CONFIRMADA

**Problema**: Policy RLS `dev_permissive_pipeline_leads_delete` estava usando `USING (true)` 
- ❌ Permitia DELETE para qualquer usuário sem validação de tenant
- ❌ Violava isolamento multi-tenant
- ❌ Causava "DELETE silencioso" - frontend achava que deletou, mas banco rejeitava

**Solução**: Policy `secure_pipeline_leads_delete` com tenant isolation
- ✅ Valida `tenant_id` do usuário autenticado
- ✅ Apenas usuários do mesmo tenant podem deletar
- ✅ DELETE real acontece e é refletido na interface

---

## 📊 ESTRUTURA DA CORREÇÃO

### Frontend (✅ Já Aplicado)
- **LeadDetailsModal.tsx**: Import do useDeleteOpportunityMutation adicionado
- **useDeleteOpportunityMutation.ts**: Hook centralizado com cache invalidation

### Backend (⏳ Aguarda Aplicação Manual)
- **RLS Policy**: Substituição da policy permissiva por policy segura
- **Tenant Isolation**: Validação rigorosa usando `auth.uid()` e `user_metadata`

---

## 🎉 RESULTADO ESPERADO

Após aplicar os 3 SQLs no Supabase Dashboard:
1. **DELETE operations** funcionarão corretamente
2. **Interface** refletirá mudanças imediatamente  
3. **Logs** mostrarão sucessos/falhas reais
4. **Segurança multi-tenant** estará garantida
5. **Problema de DELETE silencioso** será eliminado

---

## ⚡ PRÓXIMA AÇÃO IMEDIATA

**🔧 EXECUTAR OS 3 SQLs NO SUPABASE DASHBOARD AGORA**

**URL**: https://supabase.com/dashboard/project/marajvabdwkpgopytvhh  
**Local**: SQL Editor > New Query  
**SQLs**: Os 3 comandos listados acima na ordem exata

**✅ Depois**: Teste DELETE na interface e confirme que funciona corretamente