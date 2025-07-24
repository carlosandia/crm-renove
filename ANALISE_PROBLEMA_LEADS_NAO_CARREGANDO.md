# Análise: Problema de Leads Não Carregando na Pipeline

## Problema Identificado

O hook `useLeadManager` não está recebendo os leads corretamente devido a uma incompatibilidade de tipos entre:

1. **Lead do módulo CRM** (`src/types/CRM.ts`)
2. **Lead do módulo Pipeline** (`src/types/Pipeline.ts`)

## Estruturas Diferentes

### Lead Pipeline (esperado pelo useLeadManager)
```typescript
// src/types/Pipeline.ts
export interface Lead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  custom_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  moved_at?: string;
  status?: 'active' | 'won' | 'lost';
  assigned_to?: string;
  created_by?: string;
  lead_master_id?: string;
}
```

### Lead CRM (retornado pelo usePipelineData)
```typescript
// src/types/CRM.ts
export interface Lead {
  id: string;
  company_id: string;
  pipeline_id: string;
  stage_id: string;
  owner_id: string;
  title: string;
  value: number;
  currency: string;
  probability: number;
  contact_name?: string;
  contact_email?: string;
  // ... campos diferentes
}
```

## Fluxo Atual

1. `usePipelineData` busca leads da tabela `pipeline_leads` (que segue estrutura Pipeline)
2. Mas o tipo importado é `Lead` do CRM
3. Há conversão forçada `leads as any` no `ModernAdminPipelineManagerRefactored`
4. Os dados existem no banco (10 leads para pipeline "new13") mas não são exibidos

## Solução Recomendada

### Opção 1: Renomear tipos para evitar conflito
```typescript
// src/types/Pipeline.ts
export interface PipelineLead { // Renomear para diferenciar
  // ... estrutura atual
}

// src/types/CRM.ts  
export interface CRMLead { // Renomear para diferenciar
  // ... estrutura atual
}
```

### Opção 2: Usar namespace para organizar
```typescript
// src/types/index.ts
export * as Pipeline from './Pipeline';
export * as CRM from './CRM';

// Uso:
import { Pipeline, CRM } from '../types';
const pipelineLead: Pipeline.Lead = ...;
const crmLead: CRM.Lead = ...;
```

### Opção 3: Corrigir importação no usePipelineData
```typescript
// src/hooks/usePipelineData.ts
import { Lead as PipelineLead } from '../types/Pipeline'; // Importar tipo correto
// Remover: import { Lead } from '../types/CRM';
```

## Verificação no Banco

A query SQL confirma que existem 10 leads na pipeline "new13":
- Todos têm estrutura compatível com `PipelineLead`
- Campos como `custom_data`, `stage_id`, `assigned_to` estão presentes
- Não há campos como `title`, `value`, `owner_id` (específicos do CRM)

## Impacto

Este problema de tipos está impedindo:
1. Visualização dos leads no kanban
2. Drag & drop entre etapas
3. Edição e gerenciamento de leads
4. Contagem correta de leads por etapa

## Próximos Passos

1. Escolher uma das opções de solução
2. Ajustar importações em todos arquivos afetados
3. Remover conversões `as any`
4. Testar carregamento dos leads