# 🎯 Exemplos de Uso - Sistema de Modais Unificados

> Exemplos práticos dos componentes criados na **TAREFA 5: Componentes de Modal Unificados**

---

## 📦 **1. BaseModal - Modal Base**

### Uso Básico
```tsx
import { BaseModal } from '../ui/base-modal';

<BaseModal
  isOpen={isOpen}
  onClose={onClose}
  title="Título do Modal"
  headerColor="blue"
  size="md"
>
  <p>Conteúdo do modal aqui</p>
</BaseModal>
```

### Modal com Footer Customizado
```tsx
<BaseModal
  isOpen={isOpen}
  onClose={onClose}
  title="Confirmar Ação"
  headerColor="red"
  headerIcon={<AlertTriangle className="w-5 h-5" />}
  footerContent={
    <div className="flex justify-end gap-2 w-full">
      <Button variant="outline" onClick={onClose}>
        Cancelar
      </Button>
      <Button variant="destructive" onClick={handleConfirm}>
        Excluir
      </Button>
    </div>
  }
>
  <p>Esta ação não pode ser desfeita. Deseja continuar?</p>
</BaseModal>
```

---

## 📝 **2. FormModal - Modal de Formulário**

### Formulário de Criação
```tsx
import { FormModal } from '../ui/form-modal';

<FormModal<Lead>
  isOpen={isOpen}
  onClose={onClose}
  title="Novo Lead"
  item={formData}
  onSave={handleSave}
  mode="create"
  saving={isSubmitting}
  onValidate={(data) => {
    const errors = [];
    if (!data.name) errors.push('Nome é obrigatório');
    if (!data.email) errors.push('Email é obrigatório');
    return errors.length > 0 ? errors : null;
  }}
>
  <div className="space-y-4">
    <Input
      label="Nome"
      value={formData.name}
      onChange={(e) => setFormData({...formData, name: e.target.value})}
      required
    />
    <Input
      label="Email"
      type="email"
      value={formData.email}
      onChange={(e) => setFormData({...formData, email: e.target.value})}
      required
    />
  </div>
</FormModal>
```

### Formulário de Edição com Delete
```tsx
<FormModal<Company>
  isOpen={isOpen}
  onClose={onClose}
  item={company}
  onSave={handleUpdate}
  onDelete={handleDelete}
  mode="edit"
  saving={isUpdating}
  deleting={isDeleting}
>
  {/* Campos do formulário */}
</FormModal>
```

---

## 👁️ **3. DetailsModal - Modal de Visualização**

### Visualização com Seções
```tsx
import { DetailsModal } from '../ui/details-modal';

const sections = [
  {
    id: 'basic',
    title: 'Informações Básicas',
    icon: <User className="w-4 h-4" />,
    fields: [
      { key: 'name', label: 'Nome', copyable: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
    ]
  },
  {
    id: 'financial',
    title: 'Informações Financeiras',
    icon: <DollarSign className="w-4 h-4" />,
    fields: [
      { key: 'revenue', label: 'Receita', type: 'currency' },
      { key: 'deal_count', label: 'Número de Deals' },
    ]
  }
];

<DetailsModal
  isOpen={isOpen}
  onClose={onClose}
  title={`Detalhes - ${lead.name}`}
  item={lead}
  sections={sections}
  actions={[
    {
      id: 'edit',
      label: 'Editar',
      icon: <Edit className="w-4 h-4" />,
      onClick: () => openEditModal()
    }
  ]}
/>
```

### Visualização com Tabs
```tsx
const tabs = [
  {
    id: 'details',
    label: 'Detalhes',
    icon: <Info className="w-4 h-4" />,
    content: <div>Conteúdo da aba detalhes</div>
  },
  {
    id: 'history',
    label: 'Histórico',
    icon: <Clock className="w-4 h-4" />,
    badge: historyItems.length,
    content: <div>Lista do histórico</div>
  }
];

<DetailsModal
  isOpen={isOpen}
  onClose={onClose}
  title="Detalhes do Lead"
  item={lead}
  tabs={tabs}
  defaultTab="details"
/>
```

---

## 🧙‍♂️ **4. WizardModal - Modal Multi-Step**

### Wizard de Criação
```tsx
import { WizardModal } from '../ui/wizard-modal';

const steps = [
  {
    id: 'basic',
    title: 'Informações Básicas',
    description: 'Dados principais do lead',
    content: <BasicInfoStep />,
    validate: async () => {
      if (!data.name) return ['Nome é obrigatório'];
      return true;
    }
  },
  {
    id: 'contact',
    title: 'Contato',
    description: 'Dados de contato',
    content: <ContactStep />,
    validate: async () => {
      if (!data.email) return ['Email é obrigatório'];
      return true;
    }
  },
  {
    id: 'review',
    title: 'Revisão',
    description: 'Confirme as informações',
    content: <ReviewStep />
  }
];

<WizardModal
  isOpen={isOpen}
  onClose={onClose}
  title="Novo Lead - Assistente"
  steps={steps}
  data={wizardData}
  onDataChange={setWizardData}
  onComplete={handleCreateLead}
  showProgress={true}
  allowFreeNavigation={false}
  completeButtonText="Criar Lead"
/>
```

### Step Components
```tsx
const BasicInfoStep = ({ data, updateData }) => (
  <div className="space-y-4">
    <Input
      label="Nome"
      value={data.name || ''}
      onChange={(e) => updateData({ name: e.target.value })}
    />
    <Textarea
      label="Descrição"
      value={data.description || ''}
      onChange={(e) => updateData({ description: e.target.value })}
    />
  </div>
);
```

---

## ⚠️ **5. ConfirmModal - Modal de Confirmação**

### Confirmação de Delete
```tsx
import { ConfirmModal } from '../ui/confirm-modal';

<ConfirmModal
  isOpen={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  title="Excluir Lead"
  message="Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita."
  type="danger"
  confirmText="Excluir"
  cancelText="Cancelar"
  onConfirm={handleDelete}
  executing={isDeleting}
/>
```

### Confirmação de Saída
```tsx
<ConfirmModal
  isOpen={showExitConfirm}
  onClose={() => setShowExitConfirm(false)}
  title="Sair sem Salvar"
  message="Você tem alterações não salvas. Deseja realmente sair?"
  type="warning"
  confirmText="Sair"
  cancelText="Continuar Editando"
  onConfirm={handleExit}
/>
```

### Confirmação de Sucesso
```tsx
<ConfirmModal
  isOpen={showSuccess}
  onClose={() => setShowSuccess(false)}
  title="Lead Criado"
  message="O lead foi criado com sucesso! Você será redirecionado para a lista."
  type="success"
  confirmText="Continuar"
  onConfirm={() => router.push('/leads')}
/>
```

---

## 🔄 **6. Migração de Modais Existentes**

### Antes (Modal Tradicional)
```tsx
// Código antigo duplicado
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-2xl">
    <div className="bg-blue-600 text-white p-6">
      <DialogHeader>
        <DialogTitle>Título</DialogTitle>
      </DialogHeader>
    </div>
    <div className="p-6">
      {/* Conteúdo */}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>
        Cancelar
      </Button>
      <Button onClick={onSave}>
        Salvar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Depois (Modal Unificado)
```tsx
// Código novo usando FormModal
<FormModal
  isOpen={isOpen}
  onClose={onClose}
  title="Título"
  item={data}
  onSave={onSave}
  mode="create"
>
  {/* Mesmo conteúdo */}
</FormModal>
```

---

## 📚 **7. Imports Unificados**

```tsx
// Import único para todos os componentes UI
import { 
  BaseModal, 
  FormModal, 
  DetailsModal, 
  WizardModal, 
  ConfirmModal,
  Button,
  Input,
  Label
} from '../ui';

// Ou imports específicos
import { FormModal } from '../ui/form-modal';
import { ConfirmModal } from '../ui/confirm-modal';
```

---

## 🎨 **8. Customização e Temas**

### Headers Coloridos
```tsx
// Diferentes cores para diferentes contextos
<BaseModal headerColor="blue">    {/* Padrão */}
<FormModal headerColor="green">   {/* Sucesso/Edit */}
<ConfirmModal headerColor="red">  {/* Perigo */}
<DetailsModal headerColor="gray"> {/* Neutro */}
```

### Tamanhos Responsivos
```tsx
<BaseModal size="sm">   {/* 384px */}
<BaseModal size="md">   {/* 512px */}
<BaseModal size="lg">   {/* 768px */}
<BaseModal size="xl">   {/* 1024px */}
<BaseModal size="full"> {/* 1280px */}
```

---

> **💡 Dica**: Sempre use TypeScript genérico para typagem forte:
> ```tsx
> <FormModal<Lead>
> <DetailsModal<Company>
> ```

> **⚡ Performance**: Os modais incluem lazy loading e close protection automática

> **🔒 Acessibilidade**: Todos modais são keyboard-friendly e screen-reader compatible 