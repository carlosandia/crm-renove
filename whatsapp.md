# WhatsApp Inbox → Kanban - Implementação por Fases

## 📋 Visão Geral do Projeto

**Objetivo**: Capturar mensagens do WhatsApp via Evolution API e criar "pré-leads" em uma coluna virtual "Novas Entradas" no Kanban. Ao arrastar para a etapa "Lead", promover para lead oficial.

**Metodologia**: Implementação incremental em 5 fases com validação obrigatória entre cada etapa.

---

## 🎯 FASE 1: Database & Helpers Foundation

### **Escopo da Fase 1**
Criar estrutura de dados e helpers básicos para processar webhooks WhatsApp.

### **Arquivos a Criar/Modificar**
- `supabase/migrations/YYYYMMDD_wa_inbox_system.sql`
- `backend/src/schemas/webhook.ts`
- `backend/src/services/wa-helpers.ts`

### **Implementação Detalhada**

#### 1.1 Migração SQL Completa
```sql
-- Arquivo: supabase/migrations/YYYYMMDD_wa_inbox_system.sql

-- Tabela de instâncias WhatsApp
CREATE TABLE wa_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  instance_id text NOT NULL UNIQUE,
  instance_name text NOT NULL,
  api_key text NOT NULL,
  phone_number text NOT NULL,
  default_pipeline_id uuid REFERENCES pipelines(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  webhook_events text[] DEFAULT ARRAY['message']::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT fk_wa_instances_tenant FOREIGN KEY (tenant_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela de cards inbox
CREATE TABLE cards_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  pipeline_id uuid NOT NULL REFERENCES pipelines(id),
  wa_instance_id uuid NOT NULL REFERENCES wa_instances(id) ON DELETE CASCADE,
  wa_chat_id text NOT NULL,
  name text NOT NULL,
  phone_e164 text NOT NULL,
  message_preview text,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'document', 'video')),
  is_first_contact boolean DEFAULT true,
  last_message_at timestamptz NOT NULL,
  raw_last_payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT fk_cards_inbox_tenant FOREIGN KEY (tenant_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT uq_cards_inbox_tenant_chat UNIQUE (tenant_id, wa_chat_id)
);

-- Índices para performance
CREATE UNIQUE INDEX idx_wa_instances_instance_id ON wa_instances(instance_id);
CREATE INDEX idx_wa_instances_tenant_id ON wa_instances(tenant_id);
CREATE INDEX idx_wa_instances_status ON wa_instances(status);

CREATE INDEX idx_cards_inbox_tenant_pipeline ON cards_inbox(tenant_id, pipeline_id);
CREATE INDEX idx_cards_inbox_last_message_at ON cards_inbox(last_message_at DESC);
CREATE INDEX idx_cards_inbox_wa_chat_id ON cards_inbox(wa_chat_id);

-- Habilitar RLS
ALTER TABLE wa_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards_inbox ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "wa_instances_tenant_isolation" ON wa_instances
  FOR ALL USING (
    tenant_id = (SELECT user_metadata->>'tenant_id')::uuid 
    FROM auth.users WHERE id = auth.uid()
  );

CREATE POLICY "cards_inbox_tenant_isolation" ON cards_inbox
  FOR ALL USING (
    tenant_id = (SELECT user_metadata->>'tenant_id')::uuid 
    FROM auth.users WHERE id = auth.uid()
  );

-- Seed para desenvolvimento (substituir por dados reais)
INSERT INTO wa_instances (tenant_id, instance_id, instance_name, api_key, phone_number, status)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@teste.com' LIMIT 1),
  'E19E8A220A78-4762-9FCE-E6798D73CDF3',
  'carlosandia',
  'DEV_API_KEY_PLACEHOLDER_SECURE',
  '5513988506995',
  'active'
)
ON CONFLICT (instance_id) DO NOTHING;
```

#### 1.2 Schemas Zod
```typescript
// backend/src/schemas/webhook.ts
import { z } from 'zod';

export const EvolutionWebhookSchema = z.object({
  instance: z.object({
    instanceId: z.string(),
    instanceName: z.string().optional()
  }),
  data: z.object({
    key: z.object({
      remoteJid: z.string(),
      fromMe: z.boolean().optional(),
      id: z.string().optional()
    }),
    pushName: z.string().optional(),
    messageTimestamp: z.union([z.number(), z.string()]),
    message: z.object({
      conversation: z.string().optional(),
      extendedTextMessage: z.object({
        text: z.string().optional()
      }).optional(),
      imageMessage: z.object({
        caption: z.string().optional()
      }).optional()
    }).optional()
  })
});

export const InboxCardSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  pipeline_id: z.string().uuid(),
  wa_instance_id: z.string().uuid(),
  wa_chat_id: z.string(),
  name: z.string(),
  phone_e164: z.string(),
  message_preview: z.string().nullable(),
  message_type: z.enum(['text', 'image', 'audio', 'document', 'video']),
  is_first_contact: z.boolean(),
  last_message_at: z.string(),
  raw_last_payload: z.record(z.any()),
  created_at: z.string(),
  updated_at: z.string()
});

export type EvolutionWebhook = z.infer<typeof EvolutionWebhookSchema>;
export type InboxCard = z.infer<typeof InboxCardSchema>;
```

#### 1.3 Helpers WhatsApp
```typescript
// backend/src/services/wa-helpers.ts
import { supabase } from '../config/supabase';
import { EvolutionWebhook } from '../schemas/webhook';

export const normalizePhoneE164 = (remoteJid: string): string => {
  return remoteJid.replace('@s.whatsapp.net', '');
};

export const isGroupJid = (remoteJid: string): boolean => {
  return remoteJid.includes('@g.us');
};

export const extractMessageText = (payload: EvolutionWebhook): string => {
  const message = payload.data.message;
  
  if (!message) return '';
  
  if (message.conversation) {
    return message.conversation;
  }
  
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text;
  }
  
  if (message.imageMessage?.caption) {
    return message.imageMessage.caption;
  }
  
  return '';
};

export const getMessageType = (payload: EvolutionWebhook): string => {
  const message = payload.data.message;
  
  if (!message) return 'text';
  
  if (message.imageMessage) return 'image';
  if (message.conversation || message.extendedTextMessage) return 'text';
  
  return 'text';
};

export const findTenantByInstance = async (instanceId: string) => {
  const { data, error } = await supabase
    .from('wa_instances')
    .select('id, tenant_id, default_pipeline_id, api_key')
    .eq('instance_id', instanceId)
    .eq('status', 'active')
    .single();
    
  if (error || !data) {
    throw new Error(`Instância não encontrada: ${instanceId}`);
  }
  
  return data;
};

export const shouldProcessMessage = (lastMessageAt: Date, currentTime: Date): boolean => {
  const DEDUPE_WINDOW_MINUTES = 5;
  const diffMinutes = (currentTime.getTime() - lastMessageAt.getTime()) / (1000 * 60);
  return diffMinutes >= DEDUPE_WINDOW_MINUTES;
};
```

### **Checklist Fase 1**
- [ ] Migração SQL executada sem erros
- [ ] Tabelas `wa_instances` e `cards_inbox` criadas
- [ ] RLS habilitado e policies funcionando
- [ ] Índices criados corretamente
- [ ] Schema Zod validando payload Evolution
- [ ] Helpers básicos implementados e testados
- [ ] Seed de desenvolvimento inserido
- [ ] Console.log testando helpers com dados mock

---

## 🔗 FASE 2: Webhook System

### **Escopo da Fase 2**
Implementar webhook para receber mensagens da Evolution API com validação e segurança.

### **Arquivos a Criar/Modificar**
- `backend/src/routes/webhooks.ts`
- `backend/src/middleware/webhook-validation.ts`
- `backend/src/index.ts` (adicionar rota)

### **Implementação Detalhada**

#### 2.1 Middleware de Validação
```typescript
// backend/src/middleware/webhook-validation.ts
import express from 'express';
import { findTenantByInstance } from '../services/wa-helpers';
import { logger } from '../utils/logger';

export const validateApiKey = async (
  req: express.Request, 
  res: express.Response, 
  next: express.NextFunction
) => {
  try {
    const { instanceId } = req.params;
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API Key requerida no header x-api-key' });
    }
    
    const instance = await findTenantByInstance(instanceId);
    
    if (instance.api_key !== apiKey) {
      logger.warn('Tentativa de acesso com API key inválida', { 
        instanceId, 
        apiKey: apiKey.substring(0, 8) + '...' 
      });
      return res.status(401).json({ error: 'API Key inválida' });
    }
    
    req.waInstance = instance;
    next();
  } catch (error) {
    logger.error('Erro na validação da API key', { 
      error: error.message, 
      instanceId: req.params.instanceId 
    });
    return res.status(401).json({ error: 'Instância não encontrada ou inativa' });
  }
};
```

#### 2.2 Rota de Webhook
```typescript
// backend/src/routes/webhooks.ts
import express from 'express';
import rateLimit from 'express-rate-limit';
import { EvolutionWebhookSchema } from '../schemas/webhook';
import { 
  normalizePhoneE164, 
  isGroupJid, 
  extractMessageText,
  getMessageType
} from '../services/wa-helpers';
import { validateApiKey } from '../middleware/webhook-validation';
import { logger } from '../utils/logger';

const router = express.Router();

// Rate limiting para webhooks
const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto por IP
  message: 'Muitos webhooks recebidos, tente novamente em 1 minuto',
  standardHeaders: true,
  legacyHeaders: false
});

// POST /api/webhooks/wa/:instanceId
router.post('/wa/:instanceId', webhookRateLimit, validateApiKey, async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  try {
    const { instanceId } = req.params;
    const waInstance = req.waInstance;
    
    logger.info('Webhook WhatsApp recebido', { 
      requestId, 
      instanceId, 
      tenantId: waInstance.tenant_id 
    });
    
    // Validar payload
    const validatedPayload = EvolutionWebhookSchema.parse(req.body);
    
    const { key, pushName, messageTimestamp } = validatedPayload.data;
    const { remoteJid } = key;
    
    // Rejeitar grupos
    if (isGroupJid(remoteJid)) {
      logger.info('Mensagem de grupo ignorada', { requestId, remoteJid });
      return res.json({ ok: true, ignored: 'group_message' });
    }
    
    // Rejeitar mensagens próprias
    if (key.fromMe) {
      logger.info('Mensagem própria ignorada', { requestId, remoteJid });
      return res.json({ ok: true, ignored: 'own_message' });
    }
    
    // Processar dados básicos
    const waChatId = normalizePhoneE164(remoteJid);
    const phoneE164 = waChatId;
    const name = pushName || `WhatsApp ${phoneE164}`;
    const messageText = extractMessageText(validatedPayload);
    const messageType = getMessageType(validatedPayload);
    
    // Converter timestamp
    let lastMessageAt: Date;
    if (typeof messageTimestamp === 'number') {
      lastMessageAt = new Date(messageTimestamp * 1000);
    } else {
      lastMessageAt = new Date(parseInt(messageTimestamp) * 1000);
    }
    
    logger.info('Webhook processado com sucesso', { 
      requestId, 
      waChatId,
      name,
      messageType,
      tenantId: waInstance.tenant_id
    });
    
    // Por enquanto apenas validar - implementação completa na Fase 3
    res.json({ 
      ok: true, 
      processed: true,
      data: {
        waChatId,
        name,
        phoneE164,
        messageType,
        lastMessageAt: lastMessageAt.toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Erro no webhook WhatsApp', { 
      requestId, 
      error: error.message, 
      stack: error.stack,
      body: req.body 
    });
    
    // Sempre retornar 200 para não quebrar o fluxo do WhatsApp
    res.json({ ok: false, error: 'Erro interno' });
  }
});

export default router;

// Tipos para TypeScript
declare global {
  namespace Express {
    interface Request {
      waInstance?: {
        id: string;
        tenant_id: string;
        default_pipeline_id: string;
        api_key: string;
      };
    }
  }
}
```

#### 2.3 Integração no App Principal
```typescript
// backend/src/index.ts (adicionar após outras rotas)
import webhookRoutes from './routes/webhooks';

// ... outras configurações

app.use('/api/webhooks', webhookRoutes);

// ... resto do código
```

### **Dados para Teste Fase 2**
```json
{
  "instance": {
    "instanceId": "E19E8A220A78-4762-9FCE-E6798D73CDF3",
    "instanceName": "carlosandia"
  },
  "data": {
    "key": {
      "remoteJid": "5513988506995@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0C767D26A1D8C9E6C"
    },
    "pushName": "Carlos Andia",
    "messageTimestamp": 1722975600,
    "message": {
      "conversation": "Olá, gostaria de saber mais sobre seus serviços!"
    }
  }
}
```

### **Checklist Fase 2**
- [ ] Middleware de validação implementado
- [ ] Rate limiting configurado
- [ ] Rota webhook criada e integrada
- [ ] Validação de API key funcionando
- [ ] Rejeição de grupos e mensagens próprias
- [ ] Logs estruturados implementados
- [ ] Teste com curl retornando sucesso
- [ ] Payload Evolution validado com Zod
- [ ] Tratamento de erros robusto

---

## 💾 FASE 3: Inbox Management APIs

### **Escopo da Fase 3**
Implementar APIs para gerenciar inbox e promover cards para leads.

### **Arquivos a Criar/Modificar**
- `backend/src/routes/inbox.ts`
- `backend/src/services/inbox-service.ts`
- `backend/src/routes/webhooks.ts` (completar implementação)

### **Implementação Detalhada**

#### 3.1 Serviço de Inbox
```typescript
// backend/src/services/inbox-service.ts
import { supabase } from '../config/supabase';
import { shouldProcessMessage } from './wa-helpers';

export const upsertInboxCard = async (params: {
  tenantId: string;
  pipelineId: string;
  waInstanceId: string;
  waChatId: string;
  name: string;
  phoneE164: string;
  messagePreview: string;
  messageType: string;
  lastMessageAt: Date;
  rawPayload: any;
}) => {
  const currentTime = new Date();
  
  // Verificar se já existe e se deve processar
  const { data: existing } = await supabase
    .from('cards_inbox')
    .select('id, last_message_at')
    .eq('tenant_id', params.tenantId)
    .eq('wa_chat_id', params.waChatId)
    .single();
    
  if (existing) {
    const lastMessageTime = new Date(existing.last_message_at);
    if (!shouldProcessMessage(lastMessageTime, currentTime)) {
      return { cardId: existing.id, created: false };
    }
  }
  
  // Verificar se é primeiro contato
  const { count } = await supabase
    .from('cards_inbox')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', params.tenantId)
    .eq('wa_chat_id', params.waChatId);
    
  const isFirstContact = (count || 0) === 0;
  
  // Upsert
  const { data, error } = await supabase
    .from('cards_inbox')
    .upsert({
      tenant_id: params.tenantId,
      pipeline_id: params.pipelineId,
      wa_instance_id: params.waInstanceId,
      wa_chat_id: params.waChatId,
      name: params.name,
      phone_e164: params.phoneE164,
      message_preview: params.messagePreview.substring(0, 100),
      message_type: params.messageType,
      is_first_contact: isFirstContact,
      last_message_at: currentTime.toISOString(),
      raw_last_payload: params.rawPayload,
      updated_at: currentTime.toISOString()
    }, {
      onConflict: 'tenant_id,wa_chat_id'
    })
    .select('id')
    .single();
    
  if (error) {
    throw new Error(`Erro ao criar card inbox: ${error.message}`);
  }
  
  return { cardId: data.id, created: true };
};

export const promoteInboxCardToLead = async (
  inboxCardId: string,
  pipelineId: string,
  tenantId: string,
  userId: string
) => {
  // Buscar card da inbox
  const { data: inboxCard, error: inboxError } = await supabase
    .from('cards_inbox')
    .select('*')
    .eq('id', inboxCardId)
    .eq('tenant_id', tenantId)
    .single();
    
  if (inboxError || !inboxCard) {
    throw new Error('Card não encontrado na inbox');
  }
  
  // Buscar a etapa "Lead" (ordem 0) da pipeline
  const { data: leadStage, error: stageError } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipelineId)
    .eq('order_index', 0)
    .single();
    
  if (stageError || !leadStage) {
    throw new Error('Etapa Lead não encontrada na pipeline');
  }
  
  // Criar lead oficial
  const { data: newLead, error: leadError } = await supabase
    .from('pipeline_leads')
    .insert({
      tenant_id: tenantId,
      pipeline_id: pipelineId,
      stage_id: leadStage.id,
      name: inboxCard.name,
      email: null,
      phone: inboxCard.phone_e164,
      wa_chat_id: inboxCard.wa_chat_id,
      source: 'whatsapp_inbox',
      order_index: 0,
      created_by: userId
    })
    .select('id')
    .single();
    
  if (leadError) {
    throw new Error(`Erro ao criar lead: ${leadError.message}`);
  }
  
  // Remover card da inbox
  const { error: deleteError } = await supabase
    .from('cards_inbox')
    .delete()
    .eq('id', inboxCardId)
    .eq('tenant_id', tenantId);
    
  if (deleteError) {
    // Não falhar a operação, apenas logar
    console.warn('Erro ao remover card da inbox:', deleteError.message);
  }
  
  return { leadId: newLead.id, stageId: leadStage.id };
};
```

#### 3.2 Rotas de Inbox
```typescript
// backend/src/routes/inbox.ts
import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import { promoteInboxCardToLead } from '../services/inbox-service';
import { logger } from '../utils/logger';

const router = express.Router();

// Schema para promoção
const PromoteToLeadSchema = z.object({
  pipeline_id: z.string().uuid()
});

// GET /api/inbox
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { user } = req;
    const tenantId = user.user_metadata?.tenant_id;
    const { pipeline_id } = req.query;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }
    
    if (!pipeline_id) {
      return res.status(400).json({ error: 'pipeline_id é obrigatório' });
    }
    
    const { data, error } = await supabase
      .from('cards_inbox')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('pipeline_id', pipeline_id)
      .order('last_message_at', { ascending: false });
      
    if (error) {
      logger.error('Erro ao buscar inbox', { error: error.message, tenantId, pipeline_id });
      return res.status(500).json({ error: 'Erro ao buscar inbox' });
    }
    
    res.json({ data });
    
  } catch (error) {
    logger.error('Erro na rota GET /inbox', { error: error.message });
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/inbox/:id/promote-to-lead
router.post('/:id/promote-to-lead', authenticateUser, async (req, res) => {
  try {
    const { user } = req;
    const { id } = req.params;
    const tenantId = user.user_metadata?.tenant_id;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant não identificado' });
    }
    
    const validatedBody = PromoteToLeadSchema.parse(req.body);
    
    const result = await promoteInboxCardToLead(
      id,
      validatedBody.pipeline_id,
      tenantId,
      user.id
    );
    
    logger.info('Lead promovido com sucesso', { 
      inboxCardId: id, 
      leadId: result.leadId, 
      tenantId 
    });
    
    res.json({ 
      ok: true, 
      lead_id: result.leadId,
      lead_stage_id: result.stageId 
    });
    
  } catch (error) {
    logger.error('Erro ao promover para lead', { error: error.message, id: req.params.id });
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### 3.3 Completar Webhook (atualizar)
```typescript
// backend/src/routes/webhooks.ts (adicionar após validação dos dados)
import { upsertInboxCard } from '../services/inbox-service';

// ... código existente até a validação dos dados

// Substituir o final da rota POST por:
    // Criar/atualizar card na inbox
    const result = await upsertInboxCard({
      tenantId: waInstance.tenant_id,
      pipelineId: waInstance.default_pipeline_id,
      waInstanceId: waInstance.id,
      waChatId,
      name,
      phoneE164,
      messagePreview: messageText,
      messageType,
      lastMessageAt,
      rawPayload: validatedPayload
    });
    
    logger.info('Card inbox processado', { 
      requestId, 
      cardId: result.cardId, 
      created: result.created,
      waChatId,
      name 
    });
    
    res.json({ 
      ok: true, 
      card_id: result.cardId,
      created: result.created 
    });
```

#### 3.4 Integrar Rota no App
```typescript
// backend/src/index.ts (adicionar)
import inboxRoutes from './routes/inbox';

app.use('/api/inbox', inboxRoutes);
```

### **Checklist Fase 3**
- [ ] Serviço de inbox implementado
- [ ] Upsert de cards funcionando
- [ ] Dedupe por janela de tempo
- [ ] API GET /inbox retornando dados
- [ ] API POST promote-to-lead funcionando
- [ ] Webhook completo criando cards
- [ ] Promoção criando leads na etapa correta
- [ ] RLS validando acesso por tenant
- [ ] Testes manuais com curl passando

---

## 🎨 FASE 4: Frontend Core Components

### **Escopo da Fase 4**
Implementar hooks e componentes React para gerenciar inbox.

### **Arquivos a Criar**
- `frontend/src/modules/kanban/hooks/useInboxQuery.ts`
- `frontend/src/modules/kanban/hooks/usePromoteToLead.ts`
- `frontend/src/modules/kanban/components/InboxCard.tsx`
- `frontend/src/shared/types/inbox.ts`

### **Implementação Detalhada**

#### 4.1 Tipos TypeScript
```typescript
// frontend/src/shared/types/inbox.ts
export interface InboxCard {
  id: string;
  tenant_id: string;
  pipeline_id: string;
  wa_instance_id: string;
  wa_chat_id: string;
  name: string;
  phone_e164: string;
  message_preview: string | null;
  message_type: 'text' | 'image' | 'audio' | 'document' | 'video';
  is_first_contact: boolean;
  last_message_at: string;
  raw_last_payload: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PromoteToLeadResponse {
  ok: boolean;
  lead_id: string;
  lead_stage_id: string;
}
```

#### 4.2 Hook de Query da Inbox
```typescript
// frontend/src/modules/kanban/hooks/useInboxQuery.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { InboxCard } from '../../../shared/types/inbox';

interface UseInboxQueryOptions {
  pipelineId: string;
  enabled?: boolean;
}

export const useInboxQuery = ({ pipelineId, enabled = true }: UseInboxQueryOptions) => {
  return useQuery({
    queryKey: ['inbox', pipelineId],
    queryFn: async (): Promise<InboxCard[]> => {
      const response = await api.get(`/inbox?pipeline_id=${pipelineId}`);
      return response.data.data;
    },
    enabled: enabled && !!pipelineId,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 10000, // Considerar stale após 10 segundos
  });
};
```

#### 4.3 Hook de Promoção
```typescript
// frontend/src/modules/kanban/hooks/usePromoteToLead.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { toast } from '../../../components/ui/use-toast';

interface PromoteToLeadParams {
  inboxCardId: string;
  pipelineId: string;
}

export const usePromoteToLead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ inboxCardId, pipelineId }: PromoteToLeadParams) => {
      const response = await api.post(`/inbox/${inboxCardId}/promote-to-lead`, {
        pipeline_id: pipelineId
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['inbox', variables.pipelineId] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads', variables.pipelineId] });
      
      toast({
        title: 'Sucesso',
        description: 'Lead criado com sucesso!',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Erro ao promover para lead',
        variant: 'destructive'
      });
    }
  });
};
```

#### 4.4 Componente de Card
```typescript
// frontend/src/modules/kanban/components/InboxCard.tsx
import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Phone, MessageSquare, Clock } from 'lucide-react';
import { InboxCard as InboxCardType } from '../../../shared/types/inbox';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InboxCardProps {
  item: InboxCardType;
  onPromoteToLead: (item: InboxCardType) => void;
  isDragging?: boolean;
}

export const InboxCard: React.FC<InboxCardProps> = ({ 
  item, 
  onPromoteToLead, 
  isDragging = false 
}) => {
  const handleDoubleClick = () => {
    onPromoteToLead(item);
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const formatTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    });
  };
  
  return (
    <Card 
      className={`
        cursor-pointer transition-all duration-200 mb-2
        ${isDragging ? 'opacity-50 rotate-2' : 'hover:shadow-md'}
        border-l-4 border-l-green-500
      `}
      onDoubleClick={handleDoubleClick}
    >
      <CardContent className="p-3">
        {/* Header com Avatar e Nome */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
              {getInitials(item.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate text-gray-900">
              {item.name}
            </h4>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Phone className="w-3 h-3" />
              <span className="truncate">{item.phone_e164}</span>
            </div>
          </div>
          
          {item.is_first_contact && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
              Novo
            </Badge>
          )}
        </div>
        
        {/* Preview da Mensagem */}
        {item.message_preview && (
          <div className="mb-2">
            <div className="flex items-start gap-1">
              <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                {item.message_preview}
              </p>
            </div>
          </div>
        )}
        
        {/* Footer com Tipo e Timestamp */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <Badge 
            variant="outline" 
            className={`
              text-xs capitalize
              ${item.message_type === 'text' ? 'border-gray-300' : 'border-blue-300 text-blue-600'}
            `}
          >
            {item.message_type}
          </Badge>
          
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(item.last_message_at)}</span>
          </div>
        </div>
        
        {/* Dica de Ação */}
        <div className="mt-2 text-xs text-gray-400 text-center">
          Duplo-clique ou arraste para Lead
        </div>
      </CardContent>
    </Card>
  );
};
```

### **Checklist Fase 4**
- [ ] Tipos TypeScript criados
- [ ] Hook useInboxQuery implementado
- [ ] Hook usePromoteToLead implementado
- [ ] Componente InboxCard criado
- [ ] Formatação de data com date-fns
- [ ] Badges e avatars funcionando
- [ ] Duplo-clique para promoção
- [ ] Toasts de sucesso/erro
- [ ] Query invalidation funcionando

---

## 🔗 FASE 5: Kanban Integration

### **Escopo da Fase 5**
Integrar coluna virtual no Kanban com drag & drop.

### **Arquivos a Criar/Modificar**
- `frontend/src/modules/kanban/components/InboxVirtualColumn.tsx`
- `frontend/src/modules/kanban/components/KanbanBoard.tsx` (modificar)

### **Implementação Detalhada**

#### 5.1 Coluna Virtual da Inbox
```typescript
// frontend/src/modules/kanban/components/InboxVirtualColumn.tsx
import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardHeader, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { MessageSquareMore, ArrowRight } from 'lucide-react';
import { InboxCard } from './InboxCard';
import { useInboxQuery } from '../hooks/useInboxQuery';
import { usePromoteToLead } from '../hooks/usePromoteToLead';
import { InboxCard as InboxCardType } from '../../../shared/types/inbox';

interface InboxVirtualColumnProps {
  pipelineId: string;
}

export const InboxVirtualColumn: React.FC<InboxVirtualColumnProps> = ({ pipelineId }) => {
  const { data: inboxItems = [], isLoading, refetch } = useInboxQuery({ pipelineId });
  const promoteToLeadMutation = usePromoteToLead();
  
  // Não renderizar se não houver itens
  if (!isLoading && inboxItems.length === 0) {
    return null;
  }
  
  const handlePromoteToLead = async (item: InboxCardType) => {
    try {
      await promoteToLeadMutation.mutateAsync({
        inboxCardId: item.id,
        pipelineId: pipelineId
      });
      
      // Recarregar dados após sucesso
      refetch();
    } catch (error) {
      console.error('Erro ao promover lead:', error);
    }
  };
  
  return (
    <div className="flex-shrink-0 w-80">
      <Card className="h-full border-2 border-dashed border-green-300 bg-green-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareMore className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Novas Entradas</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-200 text-green-800">
                {inboxItems.length}
              </Badge>
              <ArrowRight className="w-4 h-4 text-green-600" />
            </div>
          </div>
          
          <p className="text-xs text-green-700 leading-relaxed">
            Mensagens do WhatsApp aguardando conversão em leads
          </p>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          <Droppable droppableId="inbox-virtual" type="INBOX_CARD">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`
                  h-full overflow-y-auto pr-2
                  ${snapshot.isDraggingOver ? 'bg-green-100/50' : ''}
                `}
              >
                {isLoading ? (
                  <div className="text-center text-gray-500 text-sm mt-4">
                    Carregando...
                  </div>
                ) : (
                  <>
                    {inboxItems.map((item, index) => (
                      <Draggable 
                        key={item.id} 
                        draggableId={`inbox-${item.id}`} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <InboxCard
                              item={item}
                              onPromoteToLead={handlePromoteToLead}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </>
                )}
              </div>
            )}
          </Droppable>
        </CardContent>
      </Card>
    </div>
  );
};
```

#### 5.2 Modificar KanbanBoard
```typescript
// frontend/src/modules/kanban/components/KanbanBoard.tsx
// AIDEV-NOTE: Adicionar apenas o necessário para integrar coluna virtual
// Não modificar a lógica existente do Kanban

import React from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { InboxVirtualColumn } from './InboxVirtualColumn';
import { usePromoteToLead } from '../hooks/usePromoteToLead';
// ... outras importações existentes

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  pipelineId, 
  stages, 
  leads,
  ...existingProps 
}) => {
  const promoteToLeadMutation = usePromoteToLead();
  
  // AIDEV-NOTE: Preservar função handleDragEnd existente e apenas adicionar lógica para inbox
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    if (!destination) return;
    
    // NOVA LÓGICA: Tratar drag da inbox para Lead
    if (source.droppableId === 'inbox-virtual' && destination.droppableId.startsWith('stage-')) {
      const inboxCardId = draggableId.replace('inbox-', '');
      const targetStageId = destination.droppableId.replace('stage-', '');
      
      // Verificar se o destino é a etapa Lead (ordem 0)
      const leadStage = stages.find(stage => stage.order_index === 0);
      
      if (leadStage && targetStageId === leadStage.id) {
        try {
          await promoteToLeadMutation.mutateAsync({
            inboxCardId,
            pipelineId
          });
        } catch (error) {
          console.error('Erro ao promover via drag:', error);
        }
        return;
      } else {
        // Não permitir drag para outras etapas
        return;
      }
    }
    
    // LÓGICA EXISTENTE: Preservar todo o resto da função handleDragEnd original
    // ... resto da lógica de drag existente que já funciona
  };
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto p-4">
        {/* NOVA COLUNA: Virtual da inbox - sempre primeira */}
        <InboxVirtualColumn pipelineId={pipelineId} />
        
        {/* COLUNAS EXISTENTES: Não modificar */}
        {stages.map(stage => (
          <StageColumn 
            key={stage.id} 
            stage={stage} 
            leads={leads.filter(lead => lead.stage_id === stage.id)}
            {...existingProps}
          />
        ))}
      </div>
    </DragDropContext>
  );
};
```

### **Checklist Fase 5**
- [ ] Coluna virtual implementada
- [ ] Só aparece quando há itens na inbox
- [ ] Drag & drop funcionando para etapa Lead
- [ ] Promoção via drag funcionando
- [ ] Lógica existente do Kanban preservada
- [ ] Visual consistente com resto do sistema
- [ ] Validação que só permite drop na etapa Lead
- [ ] Refetch automático após promoção

---

## ✅ REGRAS OBRIGATÓRIAS E FINAIS

### **🔒 REGRAS CRÍTICAS - NUNCA VIOLAR**

1. **CONSULTAR CONTEXT7**: Antes de implementar qualquer tecnologia (TypeScript, React, Express, Supabase), SEMPRE usar Context7 para ler a documentação oficial mais atual.

2. **SEGUIR CLAUDE.md**: Todas as implementações DEVEM seguir exatamente os padrões estabelecidos no CLAUDE.md, especialmente:
   - Basic Supabase Authentication
   - Padrões de RLS e tenant_id
   - Estrutura de arquivos e nomenclatura
   - Stack oficial (React 18, TypeScript, Vite, Express, Supabase)

3. **NÃO FUGIR DO ESCOPO**: Implementar APENAS o que está documentado nesta fase específica. Não adicionar funcionalidades extras ou modificar componentes fora do escopo.

4. **VALIDAÇÃO OBRIGATÓRIA**: Ao final de cada fase, EXECUTAR todos os itens do checklist e validar funcionamento antes de marcar como concluída.

5. **PRESERVAR SISTEMA EXISTENTE**: NUNCA quebrar funcionalidades que já funcionam. Sempre testar que o sistema continua operacional após cada implementação.

### **📋 PROCESSO DE CONCLUSÃO DE FASE**

Ao finalizar cada fase, OBRIGATORIAMENTE:

1. **Executar Checklist Completo**: Marcar cada item como ✅ apenas após validação real
2. **Testar Funcionalidade**: Executar testes manuais descritos na fase
3. **Validar Integração**: Confirmar que não quebrou nada existente
4. **Documentar Problemas**: Se houver issues, documentar para resolução
5. **Marcar Fase Concluída**: Apenas após 100% dos itens validados

### **🛡️ VALIDAÇÕES FINAIS OBRIGATÓRIAS**

Antes de marcar o projeto como CONCLUÍDO, validar:

- [ ] **Database**: Todas as tabelas criadas com RLS funcionando
- [ ] **Backend**: Webhooks recebendo e processando corretamente  
- [ ] **APIs**: Todas as rotas funcionando com autenticação
- [ ] **Frontend**: Coluna virtual aparecendo e funcionando
- [ ] **Integração**: Drag & drop promovendo leads corretamente
- [ ] **Segurança**: RLS isolando dados por tenant
- [ ] **Performance**: Sistema respondendo adequadamente
- [ ] **Logs**: Registros sendo gerados corretamente

### **⚠️ TRATAMENTO DE ERROS**

Se alguma fase falhar:
1. **NÃO PROSSEGUIR** para próxima fase
2. **IDENTIFICAR** o problema específico
3. **CORRIGIR** baseado no CLAUDE.md e Context7
4. **REVALIDAR** checklist completo
5. **DOCUMENTAR** solução para futuras referências

### **🎯 OBJETIVO FINAL**

Ao completar todas as 5 fases:
- Sistema deve receber webhooks WhatsApp via Evolution API
- Criar cards na coluna virtual "Novas Entradas"  
- Permitir promoção via drag & drop ou duplo-clique
- Converter para leads oficiais na etapa Lead
- Manter isolamento de tenants e segurança RLS
- Preservar 100% da funcionalidade existente

### **📝 MARCAÇÃO DE CONCLUSÃO**

**FASE 1 CONCLUÍDA**: [ ] (marcar apenas após checklist 100% validado)
**FASE 2 CONCLUÍDA**: [ ] (marcar apenas após checklist 100% validado)  
**FASE 3 CONCLUÍDA**: [ ] (marcar apenas após checklist 100% validado)
**FASE 4 CONCLUÍDA**: [ ] (marcar apenas após checklist 100% validado)
**FASE 5 CONCLUÍDA**: [ ] (marcar apenas após checklist 100% validado)

**PROJETO FINAL CONCLUÍDO**: [ ] (marcar apenas após validações finais 100% OK)

---

**LEMBRE-SE**: Cada fase é um pré-requisito para a próxima. Não pule etapas. Valide sempre. Consulte Context7 e CLAUDE.md sempre. Mantenha qualidade e segurança em primeiro lugar.