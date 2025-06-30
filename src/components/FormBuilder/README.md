# 📋 FormBuilder Module - Documentação Completa

## 🎯 Visão Geral

O módulo FormBuilder é responsável pela criação, edição e gerenciamento de formulários dinâmicos no CRM. Após a refatoração (Fases 1-7), o módulo foi completamente modularizado para melhor manutenibilidade e performance.

## 🏗️ Arquitetura Modular

### **Estrutura de Diretórios**

```
src/components/FormBuilder/
├── 📁 core/                          # Componentes essenciais
│   ├── FieldTypesPanel.tsx           # Painel de tipos de campo (78 linhas)
│   └── SubmissionHandler.tsx         # Lógica de submissão (352 linhas)
├── 📁 editors/                       # Editores de campo
│   └── PropertyPanel.tsx             # Editor de propriedades (429 linhas)
├── 📁 rendering/                     # Renderização pública
│   ├── FieldRenderer.tsx             # Renderização de campos (533 linhas)
│   └── FormPreview.tsx               # Preview do formulário (LAZY LOADED)
├── 📁 integrations/                  # Integrações externas
│   └── ScoringPanel.tsx              # Sistema MQL (LAZY LOADED)
├── 📁 utils/                         # Utilitários
│   └── FormValidation.ts             # Validações centralizadas (415 linhas)
├── 📁 hooks/                         # Hooks customizados
│   ├── useFormBuilder.ts             # Hook principal (217 linhas)
│   └── useFieldManagement.ts         # Gerenciamento de campos (234 linhas)
├── FormBuilderModule.tsx             # Módulo principal (434 linhas)
├── ModernFormBuilder.tsx             # Constructor principal (4,469 linhas)
├── PublicFormRenderer.tsx            # Renderizador público (1,433 linhas)
└── types/                            # ✅ Migrado para src/types/Forms.ts
```

## 🔧 Componentes Principais

### **1. ModernFormBuilder.tsx** 
- **Responsabilidade**: Constructor principal de formulários
- **Estado**: Integrado com hooks customizados (useFormBuilder)
- **Performance**: Lazy loading para ScoringPanel, memoização de cálculos
- **Linhas**: 4,469 (reduzido de 5,269 original)

### **2. PublicFormRenderer.tsx**
- **Responsabilidade**: Renderização pública de formulários
- **Modularização**: Usa FieldRenderer para campos individuais
- **Integração**: SubmissionHandler para lógica de envio
- **Performance**: React.memo aplicado

### **3. Componentes Modulares**

#### **FieldTypesPanel** (`core/`)
```tsx
// 21 tipos de campo suportados
export const FIELD_TYPES = [
  { type: 'text', label: 'Campo de Texto', icon: Type },
  { type: 'email', label: 'E-mail', icon: Mail },
  // ... mais 19 tipos
];
```

#### **PropertyPanel** (`editors/`)
```tsx
// Editor de propriedades dinâmico baseado no tipo de campo
interface PropertyPanelProps {
  field: FormField | null;
  onUpdateField: (updates: Partial<FormField>) => void;
  onClose: () => void;
}
```

#### **FieldRenderer** (`rendering/`)
```tsx
// Renderização modular de campos com máscaras e validações
const FieldRenderer: React.FC<FieldRendererProps> = memo(({ 
  field, 
  value, 
  error, 
  onChange 
}) => {
  // Lógica de renderização baseada em field.field_type
});
```

## 🎣 Hooks Customizados

### **useFormBuilder**
```tsx
const {
  formData,
  fields,
  selectedField,
  formStyle,
  scoringRules,
  saving,
  // Ações
  addField,
  removeField,
  updateField,
  handleSave
} = useFormBuilder({ formId, onSave });
```

### **useFieldManagement**
```tsx
// Hook especializado para operações CRUD de campos
const {
  addField,
  removeField,
  duplicateField,
  validateField,
  applyMask
} = useFieldManagement();
```

## 🚀 Performance & Otimizações

### **Lazy Loading** (Fase 7)
```tsx
// Componentes carregados apenas quando necessários
const ScoringPanel = lazy(() => import('./integrations/ScoringPanel'));

// Com Suspense fallback
<Suspense fallback={<LoadingSpinner />}>
  <ScoringPanel />
</Suspense>
```

### **Memoização**
```tsx
// Cálculos memoizados
const maxScore = useMemo(() => 
  scoringRules.reduce((sum, rule) => sum + rule.points, 0),
  [scoringRules]
);

const previewWidth = useMemo(() => {
  switch (previewMode) {
    case 'mobile': return 'max-w-sm';
    case 'tablet': return 'max-w-2xl';
    default: return 'max-w-4xl';
  }
}, [previewMode]);
```

### **Callbacks Otimizados**
```tsx
// Drag & drop otimizado
const onDragEnd = useCallback((result: DropResult) => {
  // Lógica de reordenação
}, [fields]);
```

## 🔍 Tipos Unificados

### **FormField Interface**
```tsx
interface FormField {
  id: string;
  field_type: FieldType;
  field_name: string;
  field_label: string;
  field_description?: string;
  placeholder?: string;
  is_required: boolean;
  field_options: FieldOptions;
  validation_rules: ValidationRules;
  styling: FieldStyling;
  order_index: number;
  scoring_weight: number;
}
```

### **21 Tipos de Campo Suportados**
- **Básicos**: text, email, phone, textarea, number
- **Seleção**: select, radio, checkbox, toggle
- **Especiais**: upload, rating, range, currency
- **Localização**: city, state, country
- **Ações**: submit, whatsapp
- **Estrutura**: divider, spacer, captcha

## 🔗 Fluxos de Integração

### **Pipeline Integration**
```typescript
// Conexão automática com pipelines
const handleFormSubmit = async (formData) => {
  // 1. Validação de campos
  // 2. Cálculo de MQL score
  // 3. Criação de lead no pipeline
  // 4. Disparo de automações
};
```

### **WhatsApp Integration**
```typescript
// Integração direta com WhatsApp
const whatsappIntegration = {
  number: '+5511999999999',
  message: 'Olá! Gostaria de mais informações.',
  autoRedirect: true
};
```

### **MQL Scoring**
```typescript
// Sistema de pontuação de leads
interface ScoringRule {
  field_id: string;
  condition: 'equals' | 'contains' | 'greater_than' | 'not_empty';
  value: string;
  points: number;
}
```

## 🧪 Testing Guidelines

### **Componentes para Teste**
1. **FieldRenderer** - Renderização de diferentes tipos de campo
2. **FormValidation** - Validações (CPF, CNPJ, email, telefone)
3. **SubmissionHandler** - Lógica de submissão e integração
4. **useFormBuilder** - Estados e operações do hook

### **Casos de Teste Críticos**
```typescript
// Exemplo de teste para FieldRenderer
describe('FieldRenderer', () => {
  test('should render email field with validation', () => {
    const field = { field_type: 'email', field_label: 'E-mail' };
    render(<FieldRenderer field={field} onChange={mockFn} />);
    // Verificar renderização e validação
  });
});
```

## 📊 Métricas de Sucesso

### **Performance**
- ✅ Build time: 10.47s (otimizado)
- ✅ Bundle size: Modular com lazy loading
- ✅ Zero erros TypeScript
- ✅ Componentes memoizados

### **Modularização**
- ✅ 7 componentes modulares criados
- ✅ 2 hooks customizados funcionais
- ✅ Tipos unificados (src/types/Forms.ts)
- ✅ Lazy loading implementado

### **Funcionalidades**
- ✅ 21 tipos de campo suportados
- ✅ Sistema MQL integrado
- ✅ Integrações WhatsApp/Pipeline
- ✅ Validações robustas
- ✅ Drag & drop funcional

## 🔧 Guia de Desenvolvimento

### **Adicionando Novo Tipo de Campo**

1. **Atualizar FIELD_TYPES** em `FieldTypesPanel.tsx`
2. **Implementar renderização** em `FieldRenderer.tsx`
3. **Adicionar validação** em `FormValidation.ts`
4. **Atualizar tipos** em `src/types/Forms.ts`

### **Criando Nova Integração**

1. **Criar componente** em `integrations/`
2. **Implementar lazy loading** se necessário
3. **Adicionar ao ModernFormBuilder** como painel
4. **Documentar API/configuração**

### **Performance Best Practices**

1. **Use React.memo** para componentes pesados
2. **Implemente lazy loading** para funcionalidades opcionais
3. **Memoize cálculos** com useMemo
4. **Otimize callbacks** com useCallback

## 🚨 Troubleshooting

### **Problemas Comuns**

1. **Build errors**: Verificar imports de tipos unificados
2. **Performance issues**: Verificar memoizações e lazy loading
3. **Field rendering**: Verificar FieldRenderer para novo tipo
4. **Form submission**: Verificar SubmissionHandler e validações

### **Debug Mode**
```tsx
// Ativar logs detalhados
const DEBUG_FORMS = process.env.NODE_ENV === 'development';
if (DEBUG_FORMS) {
  console.log('Form state:', { fields, scoringRules, formData });
}
```

---

**📋 Última atualização**: Fase 8 - Janeiro 2025  
**🎯 Status**: Refatoração 70% concluída (7/10 fases)  
**⚡ Performance**: Otimizada com lazy loading e memoização 