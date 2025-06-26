# 🚀 **CONFIGURAÇÃO WEBHOOK N8N - CRM ENTERPRISE**

## 📋 **VISÃO GERAL**

O sistema de webhooks foi atualizado para permitir configuração específica de **pipeline** e **usuário responsável** diretamente do N8N, mantendo toda a lógica de fallback existente.

---

## 🆕 **NOVOS CAMPOS DISPONÍVEIS**

### **Pipeline Específica**
```json
{
  "pipeline_id": "uuid-da-pipeline"  // ⭐ NOVO: Pipeline específica (opcional)
}
```

### **Usuário Responsável**
```json
{
  "assigned_to": "uuid-do-usuario",  // ⭐ NOVO: Usuário responsável (opcional)
  "created_by": "uuid-do-criador"   // ⭐ NOVO: Criador do lead (opcional)
}
```

---

## 📝 **ESTRUTURA COMPLETA DO WEBHOOK**

### **Endpoint do Webhook**
```
POST https://sua-api.com/api/integrations/webhook/empresa-slug
```

### **Headers Obrigatórios**
```http
Content-Type: application/json
x-api-key: sua-chave-publica-da-api
```

### **Body Completo (JSON)**
```json
{
  // ✅ CAMPOS OBRIGATÓRIOS (mantidos)
  "first_name": "João",
  "email": "joao@email.com",
  
  // ✅ CAMPOS OPCIONAIS EXISTENTES (mantidos)
  "last_name": "Silva",
  "phone": "(11) 99999-9999",
  "company": "Empresa ABC",
  "job_title": "Gerente",
  "lead_temperature": "quente",
  "source": "N8N Automation",
  "campaign_id": "camp123",
  "adset_id": "adset456",
  "ad_id": "ad789",
  "conversion_value": 1500,
  "additional_data": {
    "utm_source": "google",
    "utm_campaign": "promocao"
  },
  
  // 🆕 NOVOS CAMPOS PARA CONFIGURAÇÃO ESPECÍFICA
  "pipeline_id": "550e8400-e29b-41d4-a716-446655440000",
  "assigned_to": "660e8400-e29b-41d4-a716-446655440001",
  "created_by": "770e8400-e29b-41d4-a716-446655440002"
}
```

---

## 🎯 **COMO OBTER OS IDs NECESSÁRIOS**

### **1. Pipeline ID**
```sql
-- Consultar pipelines disponíveis na empresa
SELECT id, name FROM pipelines WHERE tenant_id = 'sua-empresa-id';
```

### **2. User ID (assigned_to / created_by)**
```sql
-- Consultar usuários da empresa (admin ou member)
SELECT id, email, role FROM users 
WHERE tenant_id = 'sua-empresa-id' 
AND role IN ('admin', 'member');
```

---

## 🔄 **LÓGICA DE FALLBACK (MANTIDA 100%)**

### **Pipeline Fallback**
1️⃣ **Se `pipeline_id` fornecido:** Valida se existe e pertence à empresa
2️⃣ **Se inválido/não fornecido:** Busca pipeline padrão (`is_default: true`)
3️⃣ **Se não tem padrão:** Usa primeira pipeline disponível da empresa

### **Usuário Fallback**
1️⃣ **Se `assigned_to` fornecido:** Valida se existe, pertence à empresa e tem role válido
2️⃣ **Se inválido/não fornecido:** Lead fica sem responsável definido (pode ser atribuído depois)

### **Etapa "Novos Leads"**
✅ **SEMPRE** busca etapa "Novos leads", "Novo", "Inicial" ou primeira etapa do pipeline
✅ **GARANTE** que lead sempre vai para a primeira etapa configurada

---

## 📊 **RESPOSTA DO WEBHOOK**

### **Sucesso (201)**
```json
{
  "success": true,
  "data": {
    "lead_id": "880e8400-e29b-41d4-a716-446655440003",
    "email": "joao@email.com",
    "stage_id": "stage-novos-leads-id",
    "pipeline_id": "pipeline-utilizada-id",
    "temperature": "warm",
    "assigned_to": "usuario-responsavel-id-ou-null",
    "created_by": "criador-id-ou-null",
    "status": "created"
  },
  "configuration": {
    "pipeline_source": "n8n_specific",      // ou "company_default"
    "assigned_to_source": "n8n_specific",   // ou "unassigned"
    "created_by_source": "n8n_specific"     // ou "unassigned"
  },
  "message": "Lead criado com sucesso na etapa inicial"
}
```

### **Erro (400/404/500)**
```json
{
  "success": false,
  "error": "Descrição do erro"
}
```

---

## 🔧 **CONFIGURAÇÃO NO N8N**

### **1. HTTP Request Node**
```yaml
Method: POST
URL: https://sua-api.com/api/integrations/webhook/empresa-slug
Headers:
  Content-Type: application/json
  x-api-key: sua-chave-api
```

### **2. Body Configuration**
```javascript
// Exemplo de configuração dinâmica no N8N
{
  "first_name": "{{ $json.nome }}",
  "email": "{{ $json.email }}",
  "phone": "{{ $json.telefone }}",
  "company": "{{ $json.empresa }}",
  
  // Configuração específica de pipeline baseada em condições
  "pipeline_id": "{{ $json.tipo_lead === 'premium' ? 'pipeline-premium-id' : null }}",
  
  // Atribuição baseada em regras de negócio
  "assigned_to": "{{ $json.regiao === 'SP' ? 'vendedor-sp-id' : 'vendedor-geral-id' }}",
  
  // Dados adicionais
  "additional_data": {
    "source_workflow": "{{ $workflow.name }}",
    "processed_at": "{{ $now }}"
  }
}
```

---

## ✅ **COMPATIBILIDADE**

- ✅ **100% Compatível** com webhooks existentes
- ✅ **Novos campos são opcionais** - não quebra nada
- ✅ **Fallback automático** para configurações não fornecidas
- ✅ **Validação de segurança** - só aceita usuários/pipelines da mesma empresa
- ✅ **Logs detalhados** para debug e monitoramento

---

## 🚨 **VALIDAÇÕES DE SEGURANÇA**

### **Pipeline Validation**
- ✅ Pipeline deve existir no banco
- ✅ Pipeline deve pertencer à mesma empresa (`tenant_id`)
- ❌ Não permite acesso a pipelines de outras empresas

### **User Validation**
- ✅ Usuário deve existir no banco
- ✅ Usuário deve pertencer à mesma empresa (`tenant_id`)
- ✅ Usuário deve ter role `admin` ou `member`
- ❌ Não permite usuários `super_admin` ou roles inválidos

---

## 📈 **CASOS DE USO**

### **1. Distribuição por Região**
```json
{
  "assigned_to": "{{ regiao === 'SP' ? 'vendedor-sp' : 'vendedor-rj' }}"
}
```

### **2. Pipeline por Produto**
```json
{
  "pipeline_id": "{{ produto === 'premium' ? 'pipeline-premium' : 'pipeline-basico' }}"
}
```

### **3. Atribuição por Turno**
```json
{
  "assigned_to": "{{ hora < 18 ? 'vendedor-manha' : 'vendedor-noite' }}"
}
```

---

## 🔍 **LOGS E MONITORAMENTO**

O sistema gera logs detalhados para cada webhook processado:

```bash
✅ Lead criado via webhook: {
  leadId: "new-lead-id",
  email: "lead@email.com",
  company: "empresa-id",
  stage: "Novos leads",
  temperature: "warm",
  pipeline_configured: "específica",      // ou "fallback"
  assigned_to_configured: "específico",   // ou "não definido"
  created_by_configured: "específico"     // ou "não definido"
}
```

Esses logs permitem monitorar qual configuração foi aplicada e troubleshooting de problemas. 