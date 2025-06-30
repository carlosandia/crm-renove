# 🔧 Refatoração do Sistema de Tipos TypeScript

## 📋 Resumo Executivo

Este documento contém tarefas para melhorar o sistema de tipos do projeto CRM, aumentando a type safety e reduzindo bugs.

### 🎯 Objetivos Principais
- [ ] Eliminar uso excessivo do tipo `any` (75+ ocorrências)
- [ ] Substituir type assertions perigosas (`as any`) 
- [ ] Padronizar uso de `interface` vs `type`
- [ ] Criar tipos mais específicos e restritivos
- [ ] Melhorar tipagem de Props de componentes

---

## 🚨 CATEGORIA 1: ELIMINAÇÃO DE TIPOS `any`

### 1.1 Logger e Utilities
- [ ] **src/lib/logger.ts**
  - [ ] Substituir `data?: any` por tipo genérico `T`
  - [ ] Criar interface `LogEntry<T = unknown>`
  - [ ] Tipar funções `debug()`, `info()`, `error()`

- [ ] **src/lib/utils.ts** 
  - [ ] Função `debounce`: melhorar `(...args: any[]) => any`
  - [ ] Usar generics para preservar tipos

### 1.2 Hooks com Problemas de Tipo
- [ ] **src/hooks/useContacts.ts**
  - [ ] Substituir `filters?: any` por `ContactFilters`
  - [ ] Tipar objeto `filters: any` (linha 156)

- [ ] **src/hooks/useSupabaseCrud.ts**
  - [ ] Substituir `[key: string]: any`
  - [ ] Criar interfaces para cache
  - [ ] Tipar `setCache(key: string, data: any)`

### 1.3 Services e APIs
- [ ] **src/services/api.ts**
  - [ ] Substituir `data?: any` em `post()` e `put()`
  - [ ] Usar generics para payloads

- [ ] **src/services/googleCalendarAuth.ts**
  - [ ] Tipar `integration: any` (linha 116)
  - [ ] Criar `GoogleCalendarItem` para `item: any`

---

## 🔥 CATEGORIA 2: ELIMINAÇÃO DE `as any`

### 2.1 Pipeline Components (🚨 CRÍTICO)
- [ ] **src/hooks/usePipelineData.ts** (20+ ocorrências)
  - [ ] Criar `PipelineWithRelations` interface
  - [ ] Eliminar `(pipeline as any).pipeline_stages`
  - [ ] Eliminar `(pipeline as any).pipeline_custom_fields`
  - [ ] Eliminar `(pipeline as any).pipeline_members`

- [ ] **src/components/Pipeline/PipelineCard.tsx**
  - [ ] Eliminar `(pipeline as any).leads_count`
  - [ ] Criar `PipelineWithMetrics` interface
  - [ ] Tipar `(pm as any).users`

### 2.2 Form Builder Components
- [ ] **src/components/FormBuilder/PublicFormRenderer.tsx**
  - [ ] Substituir `(formData as any).destination_config`
  - [ ] Criar `FormDestinationConfig` interface
  - [ ] Eliminar `e as any` em handlers

- [ ] **src/components/FormBuilder/rendering/FieldRenderer.tsx**
  - [ ] Substituir `field.field_options?.align as any`
  - [ ] Criar tipo `TextAlign = 'left' | 'center' | 'right'`

### 2.3 UI e Modal Components
- [ ] **src/components/Pipeline/StageSelector.tsx**
  - [ ] Eliminar `(window as any)` - criar `WindowWithGlobals`
  - [ ] Tipar `(user as any).first_name`

- [ ] **src/hooks/useFilters.ts**
  - [ ] Substituir `(parsedFilters as any)[key]`
  - [ ] Substituir `(item as any)[key]`
  - [ ] Criar tipos para filtros

---

## 🏗️ CATEGORIA 3: PROPS SEM TIPOS

### 3.1 Componentes sem Interfaces
- [ ] **src/components/SystemStatus.tsx**
  - [ ] Criar `SystemStatusProps` interface
  - [ ] Substituir `details?: any`

- [ ] **src/components/CRMLayout.tsx**
  - [ ] Melhorar `user: any` para tipo específico

### 3.2 Event Handlers sem Tipos
- [ ] **src/components/FormBuilder/ModernFormBuilder.tsx**
  - [ ] Tipar event handlers corretamente
  - [ ] Adicionar tipos para form data

---

## 📐 CATEGORIA 4: PADRONIZAÇÃO `interface` vs `type`

### 4.1 Estabelecer Convenção
- [ ] **Definir padrão:**
  - [ ] `interface` para objetos e shapes
  - [ ] `type` para unions e aliases
  - [ ] `type` para computed types

### 4.2 Arquivos para Revisar
- [ ] **src/types/Forms.ts**
  - [ ] Revisar `type FieldType` vs interfaces
  - [ ] Padronizar nomenclatura

- [ ] **src/types/CRM.ts**
  - [ ] Manter `type UserRole` (union)
  - [ ] Manter `type LeadSource` (union)

---

## 🎯 CATEGORIA 5: TIPOS MAIS ESPECÍFICOS

### 5.1 Record<string, any> → Específicos
- [ ] **src/types/CRM.ts**
  - [ ] `settings: Record<string, any>` → `CompanySettings`
  - [ ] `custom_data: Record<string, any>` → `LeadCustomData`

- [ ] **src/components/Pipeline/LeadEditModal.tsx**
  - [ ] `custom_data: Record<string, any>`
  - [ ] `formData: Record<string, any>`

### 5.2 Promise<any> → Promise<T>
- [ ] **src/hooks/useAnalytics.ts** (5 funções)
  - [ ] `exportReport(): Promise<any>` → `Promise<ExportResult>`
  - [ ] `getLeadSources(): Promise<any>` → `Promise<LeadSourcesData>`
  - [ ] `getPipelineAnalysis(): Promise<any>`
  - [ ] `getRevenueAnalysis(): Promise<any>`
  - [ ] `getActivitiesAnalysis(): Promise<any>`

- [ ] **src/hooks/useAutomation.ts**
  - [ ] `testRule(): Promise<any>` → `Promise<TestRuleResult>`

### 5.3 Arrays Genéricos
- [ ] **src/components/Analytics/ConversionFunnel.tsx**
  - [ ] `stages: any[]` → `FunnelStage[]`
  - [ ] `teamData: any[]` → `TeamMember[]`

- [ ] **src/components/FormBuilder/FormSettingsEditor.tsx**
  - [ ] `pipelines: any[]` → `Pipeline[]`
  - [ ] `members: any[]` → `User[]`

---

## 🔧 CATEGORIA 6: NOVOS TIPOS UTILITY

### 6.1 Criar Arquivo Utility Types
- [ ] **src/types/Utility.ts** (NOVO)
  - [ ] `Prettify<T>` para melhor IntelliSense
  - [ ] `DeepPartial<T>` para formulários
  - [ ] `RequiredKeys<T, K>` para validações
  - [ ] `Optional<T, K>` para updates

### 6.2 Estado Global
- [ ] **src/types/State.ts** (NOVO)
  - [ ] Interfaces para state management
  - [ ] Tipos para actions
  - [ ] Estados loading/error padronizados

---

## 📊 CATEGORIA 7: CONFIGURAÇÃO STRICT

### 7.1 TypeScript Config
- [ ] **tsconfig.json**
  - [ ] `strict: true`
  - [ ] `noImplicitAny: true` 
  - [ ] `noImplicitReturns: true`
  - [ ] `noUncheckedIndexedAccess: true`

### 7.2 Validação
- [ ] **Executar verificações:**
  - [ ] `tsc --noEmit` sem erros
  - [ ] ESLint rules para TypeScript
  - [ ] Type coverage report

---

## ✅ CRONOGRAMA DE EXECUÇÃO

### 🚨 **Semana 1 - Crítico**
- [ ] usePipelineData.ts (20+ `as any`)
- [ ] Logger e utils (`any` → generics)
- [ ] Props críticas sem tipos

### ⚠️ **Semana 2 - Alto**
- [ ] FormBuilder type assertions
- [ ] Pipeline components
- [ ] API Promise types

### 📋 **Semana 3 - Médio** 
- [ ] Record<string, any> específicos
- [ ] Padronização interface/type
- [ ] Arrays genéricos

### 🔧 **Semana 4 - Baixo**
- [ ] Utility types
- [ ] State types
- [ ] Config strict

---

## 📏 MÉTRICAS DE SUCESSO

- [ ] **Redução de `any`**: 75+ → <10 ocorrências
- [ ] **Eliminação `as any`**: 50+ → 0 ocorrências  
- [ ] **Type Coverage**: >95%
- [ ] **Zero Errors**: modo strict
- [ ] **IntelliSense**: 100% funcional

---

**💡 Nota**: Testar `tsc --noEmit` após cada categoria para garantir que não há regressões. 