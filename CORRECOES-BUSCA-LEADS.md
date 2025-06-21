# Correções na Busca de Leads Existentes - LeadModal

## 🐛 Problema Identificado

O usuário relatou que a busca de leads existentes não estava funcionando no modal de criação de oportunidade. O sistema não estava carregando os leads reais cadastrados no menu Leads.

## 🔧 Correções Implementadas

### **1. Função `loadExistingLeads` Melhorada**

#### **Problemas Corrigidos:**
- ✅ **Filtro de status muito restritivo**: Removido filtro `.eq('status', 'active')`
- ✅ **Limite muito baixo**: Aumentado de 50 para 100 leads
- ✅ **Logs insuficientes**: Adicionados logs detalhados para debug
- ✅ **Tratamento de erros**: Melhorado com fallback para debug

#### **Melhorias Implementadas:**
```typescript
const loadExistingLeads = async () => {
  // Logs detalhados para debug
  console.log('🔍 Carregando leads existentes...', {
    userId: user.id,
    tenantId: user.tenant_id,
    userRole: user.role,
    userEmail: user.email
  });

  // Query melhorada - sem filtro de status restritivo
  let query = supabase
    .from('leads_master')
    .select('id, first_name, last_name, email, phone, company, job_title, lead_temperature, status, created_at')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })
    .limit(100); // Aumentado limite

  // Filtro flexível de status
  const activeLeads = data.filter(lead => 
    !lead.status || lead.status === 'active' || lead.status === 'novo' || lead.status === 'ativo'
  );
}
```

### **2. Triggers de Carregamento Melhorados**

#### **Carregamento Automático:**
- ✅ **useEffect melhorado**: Remove condição `existingLeads.length === 0`
- ✅ **Carregamento sempre**: Leads carregados toda vez que modo é ativado
- ✅ **Limpeza de estado**: Reset completo quando modal fecha

```typescript
// Carregar leads quando modal abre e modo for 'existing'
useEffect(() => {
  if (isOpen && leadSelectionMode === 'existing') {
    console.log('🔄 Modo "Lead Existente" ativado, carregando leads...');
    loadExistingLeads();
  }
}, [isOpen, leadSelectionMode]);

// Limpar dados quando modal fecha
useEffect(() => {
  if (!isOpen) {
    setExistingLeads([]);
    setFilteredExistingLeads([]);
    setSelectedExistingLead(null);
    setLeadSearchTerm('');
    setLeadSelectionMode('new');
  }
}, [isOpen]);
```

### **3. Botão "Lead Existente" Melhorado**

#### **Carregamento Forçado:**
- ✅ **setTimeout**: Garante que estado seja atualizado antes do carregamento
- ✅ **Log de debug**: Confirma quando botão é clicado
- ✅ **Carregamento sempre**: Remove verificação de cache

```typescript
onClick={() => {
  console.log('🔄 Clicou em "Lead Existente"');
  setLeadSelectionMode('existing');
  // Sempre carregar leads quando clicar no botão
  setTimeout(() => {
    loadExistingLeads();
  }, 100);
}}
```

### **4. Interface de Feedback Melhorada**

#### **Mensagens Informativas:**
- ✅ **Diferenciação por role**: Mensagens específicas para member vs admin
- ✅ **Botão de recarregar**: Permite tentar novamente em caso de erro
- ✅ **Feedback de busca**: Mostra termo pesquisado quando não há resultados

```typescript
{leadSearchTerm ? (
  <div>
    <p>Nenhum lead encontrado com o termo "{leadSearchTerm}"</p>
    <p className="text-xs mt-1">Tente buscar por nome, email, telefone ou empresa</p>
  </div>
) : (
  <div>
    <p>Nenhum lead disponível</p>
    <p className="text-xs mt-1">
      {user?.role === 'member' 
        ? 'Você ainda não tem leads atribuídos a você'
        : 'Nenhum lead cadastrado na empresa'
      }
    </p>
    <button
      type="button"
      onClick={() => loadExistingLeads()}
      className="mt-2 text-xs text-green-600 hover:text-green-700 underline"
    >
      Recarregar
    </button>
  </div>
)}
```

### **5. Debug e Logs Implementados**

#### **Logs Informativos:**
- ✅ **Informações do usuário**: ID, tenant, role, email
- ✅ **Resultados da query**: Quantidade de leads encontrados
- ✅ **Dados de exemplo**: Primeiros 3 leads para verificação
- ✅ **Filtros aplicados**: Quantidade após filtro de status
- ✅ **Busca de debug**: Query sem filtros em caso de erro

```typescript
console.log('✅ Leads encontrados na consulta:', data?.length || 0);

if (data && data.length > 0) {
  console.log('📋 Primeiros 3 leads encontrados:', data.slice(0, 3));
  
  // Filtrar apenas leads ativos se necessário
  const activeLeads = data.filter(lead => 
    !lead.status || lead.status === 'active' || lead.status === 'novo' || lead.status === 'ativo'
  );
  
  console.log('✅ Leads ativos filtrados:', activeLeads.length);
}
```

## 🎯 Resultados Esperados

Após as correções implementadas:

1. **Carregamento Automático**: Leads carregados ao clicar em "Lead Existente"
2. **Busca Funcional**: Campo de busca filtra leads em tempo real
3. **Logs Detalhados**: Console mostra informações de debug
4. **Feedback Visual**: Mensagens claras sobre estado da busca
5. **Recarregamento**: Botão para tentar novamente em caso de problema

## 🔍 Como Testar

1. **Abrir modal** de criação de oportunidade
2. **Clicar em "Lead Existente"** na seção "Sobre o lead"
3. **Verificar console** para logs de debug
4. **Observar lista** de leads carregados
5. **Testar busca** digitando no campo de pesquisa
6. **Selecionar lead** e verificar preenchimento automático

## 📝 Arquivos Modificados

- `src/components/Pipeline/LeadModal.tsx` - Correções na busca e carregamento
- `test-leads-search.js` - Script de teste para verificar dados na base
- `CORRECOES-BUSCA-LEADS.md` - Esta documentação

## ✅ Status

Todas as correções foram implementadas e o sistema deve agora carregar corretamente os leads existentes da base de dados, respeitando as permissões do usuário (member vê apenas seus leads, admin/super_admin veem todos os leads da empresa). 