import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Calendar as CalendarComponent } from '../../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { format } from 'date-fns';
// Dialog removido - usando expansão inline com BlurFade
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogOverlay,
  AlertDialogPortal,
} from '../../ui/alert-dialog';
import { showErrorToast, showSuccessToast } from '../../../hooks/useToast';
// ✅ NOVA: Importar API axios para substituir fetch direto
import { api } from '../../../lib/api';
import { AnimatedCard } from '../../ui/animated-card';
import { BlurFade } from '../../ui/blur-fade';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Save,
  Database,
  FileText,
  Mail,
  Phone,
  AlignLeft,
  List,
  Hash,
  CalendarDays,
  Eye,
  EyeOff,
  Copy,
  Lock,
  AlertTriangle
} from 'lucide-react';

// Shared components
import { SectionHeader } from '../shared/SectionHeader';

// Constants
import { PIPELINE_UI_CONSTANTS } from '../../../styles/pipeline-constants';

// ================================================================================
// INTERFACES E TIPOS
// ================================================================================
export interface CustomField {
  id?: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
  show_in_card: boolean;
}

export interface CustomFieldsManagerProps {
  customFields: CustomField[];
  onFieldsUpdate: (fields: CustomField[]) => void;
  pipelineId?: string; // ✅ ID da pipeline para chamadas API
}

export interface CustomFieldsManagerReturn {
  // Data
  customFields: CustomField[];
  systemFields: CustomField[];
  customFieldsOnly: CustomField[];
  setCustomFields: React.Dispatch<React.SetStateAction<CustomField[]>>;
  editingField: CustomField | null;
  setEditingField: React.Dispatch<React.SetStateAction<CustomField | null>>;
  editFieldIndex: number | null;
  setEditFieldIndex: React.Dispatch<React.SetStateAction<number | null>>;
  
  // Modal states
  showFieldModal: boolean;
  setShowFieldModal: React.Dispatch<React.SetStateAction<boolean>>;
  
  // AlertDialog states
  showDeleteDialog: boolean;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  fieldToDelete: {field: CustomField, index: number} | null;
  handleConfirmDelete: () => Promise<void>;
  
  // Save state (similar to stages)
  hasUnsavedChanges: boolean;
  
  // CRUD operations
  handleAddField: () => void;
  handleEditField: (index: number) => void;
  handleSaveField: () => void;
  handleDeleteField: (index: number) => void;
  handleSaveAllChanges: () => void;
  
  // Field options management
  handleAddOption: () => void;
  handleRemoveOption: (optionIndex: number) => void;
  
  // Utilities
  getFieldIcon: (fieldType: string) => React.ReactNode;
  getFieldTypeLabel: (fieldType: string) => string;
  updateFieldOption: (index: number, value: string) => void;
  isSystemField: (fieldName: string) => boolean;
}

// ================================================================================
// CONSTANTES
// ================================================================================
const FIELD_TYPES = [
  { value: 'text', label: 'Texto', icon: FileText },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'phone', label: 'Telefone', icon: Phone },
  { value: 'textarea', label: 'Texto Longo', icon: AlignLeft },
  { value: 'select', label: 'Lista de Opções', icon: List },
  { value: 'number', label: 'Número', icon: Hash },
  { value: 'date', label: 'Data', icon: CalendarDays },
];

const SYSTEM_REQUIRED_FIELDS: CustomField[] = [
  { 
    field_name: 'nome_lead', 
    field_label: 'Nome do Lead', 
    field_type: 'text', 
    is_required: true, 
    field_order: 1, 
    placeholder: 'Digite o nome do lead', 
    show_in_card: true 
  },
  { 
    field_name: 'email', 
    field_label: 'E-mail', 
    field_type: 'email', 
    is_required: true, 
    field_order: 2, 
    placeholder: 'exemplo@email.com', 
    show_in_card: true 
  },
  { 
    field_name: 'telefone', 
    field_label: 'Telefone', 
    field_type: 'phone', 
    is_required: true, 
    field_order: 3, 
    placeholder: '(11) 99999-9999', 
    show_in_card: true 
  },
];

// ✅ CAMPOS PREDEFINIDOS REMOVIDOS: Mantendo apenas campos sistema essenciais
// Campos predefinidos removidos para interface mais limpa conforme solicitado

// ================================================================================
// COMPONENTE DE INPUT DINÂMICO
// ================================================================================
interface DynamicFieldInputProps {
  fieldType: string;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  fieldOptions?: string[];
  isRequired?: boolean;
}

const DynamicFieldInput: React.FC<DynamicFieldInputProps> = ({
  fieldType,
  value,
  onChange,
  placeholder,
  fieldOptions,
  isRequired = false
}) => {
  const [dateValue, setDateValue] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );

  const handleDateChange = (date: Date | undefined) => {
    setDateValue(date);
    onChange(date ? format(date, 'yyyy-MM-dd') : '');
  };

  switch (fieldType) {
    case 'date':
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              {dateValue ? format(dateValue, 'dd/MM/yyyy') : 
                <span className="text-muted-foreground">{placeholder || 'Selecione uma data'}</span>
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateValue}
              onSelect={handleDateChange}
            />
          </PopoverContent>
        </Popover>
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Digite um número'}
          required={isRequired}
        />
      );

    case 'email':
      return (
        <Input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'exemplo@email.com'}
          required={isRequired}
        />
      );

    case 'phone':
      return (
        <Input
          type="tel"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '(11) 99999-9999'}
          required={isRequired}
        />
      );

    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Digite um texto longo'}
          required={isRequired}
          rows={3}
        />
      );

    case 'select':
      // ✅ CORREÇÃO: Filtrar opções vazias para evitar erro do Radix UI
      const validOptions = fieldOptions?.filter(option => 
        option && typeof option === 'string' && option.trim() !== ''
      ) || [];
      
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder || 'Selecione uma opção'} />
          </SelectTrigger>
          <SelectContent>
            {validOptions.length > 0 ? (
              validOptions.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-1 text-sm text-muted-foreground">
                Nenhuma opção disponível
              </div>
            )}
          </SelectContent>
        </Select>
      );

    default: // 'text'
      return (
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Digite um texto'}
          required={isRequired}
        />
      );
  }
};

// ================================================================================
// HOOKS CUSTOMIZADOS
// ================================================================================
export function useCustomFieldsManager({ 
  customFields = [], 
  onFieldsUpdate,
  pipelineId 
}: CustomFieldsManagerProps): CustomFieldsManagerReturn {
  const [localFields, setLocalFields] = useState<CustomField[]>([]);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editFieldIndex, setEditFieldIndex] = useState<number | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Estados para AlertDialog de confirmação de exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<{field: CustomField, index: number} | null>(null);

  // ✅ CORREÇÃO: Definir isSystemField ANTES de qualquer utilização
  const isSystemField = useCallback((fieldName: string) => {
    return SYSTEM_REQUIRED_FIELDS.some(field => field.field_name === fieldName);
  }, []);

  // Separar campos sistema vs customizados
  const systemFields = SYSTEM_REQUIRED_FIELDS;
  const customFieldsOnly = localFields.filter(field => !isSystemField(field.field_name));

  // ✅ INICIALIZAÇÃO: Combinar campos sistema + customizados
  useEffect(() => {
    // Campos do sistema (sempre presentes)
    const systemFields = [...SYSTEM_REQUIRED_FIELDS];
    
    // Campos customizados vindos do banco (field_order >= 10)
    let customFieldsFromDB: CustomField[] = [];
    if (customFields.length > 0) {
      customFieldsFromDB = customFields.filter(field => 
        !isSystemField(field.field_name) && field.field_order >= 10
      );
      
      // Ordenar por field_order
      customFieldsFromDB.sort((a, b) => a.field_order - b.field_order);
    }

    // Combinar todos os campos
    const allFields = [...systemFields, ...customFieldsFromDB];
    setLocalFields(allFields);
    setHasUnsavedChanges(false);
  }, [customFields, isSystemField]);

  // ✅ CORREÇÃO: Notificar mudanças apenas quando necessário, evitando loop infinito
  const notifyFieldsUpdate = useCallback(() => {
    if (onFieldsUpdate && localFields.length > 0) {
      onFieldsUpdate(localFields);
    }
  }, [onFieldsUpdate, localFields]);

  // Chamamos notifyFieldsUpdate apenas em eventos específicos (não automaticamente)
  // useEffect removido para evitar loop infinito

  const getFieldIcon = (type: string) => {
    const fieldType = FIELD_TYPES.find(ft => ft.value === type);
    if (!fieldType) return <FileText className="h-4 w-4" />;
    const IconComponent = fieldType.icon;
    return <IconComponent className="h-4 w-4" />;
  };

  const getFieldTypeLabel = (type: string) => {
    const fieldType = FIELD_TYPES.find(ft => ft.value === type);
    return fieldType?.label || type;
  };

  const handleAddField = () => {
    // ✅ CORREÇÃO: Campo customizado com field_order >= 10
    const nextOrder = Math.max(
      ...localFields.filter(f => !isSystemField(f.field_name)).map(f => f.field_order || 0),
      9 // Garantir que seja >= 10
    ) + 1;
    
    setEditingField({
      field_name: '',
      field_label: '',
      field_type: 'text',
      is_required: false,
      field_order: nextOrder,
      show_in_card: true
    });
    setEditFieldIndex(null);
    setShowFieldModal(true);
  };

  const handleEditField = (index: number) => {
    const field = localFields[index];
    setEditingField({ ...field });
    setEditFieldIndex(index);
    setShowFieldModal(true);
  };

  const handleSaveField = async () => {
    if (!editingField || !editingField.field_name || !editingField.field_label) {
      return;
    }

    // Verificar se o nome já existe (exceto no caso de edição)
    const nameExists = localFields.some((field, index) => 
      field.field_name === editingField.field_name && index !== editFieldIndex
    );
    
    if (nameExists) {
      showErrorToast('Nome duplicado', 'Já existe um campo com este nome!');
      return;
    }

    // Gerar field_name automaticamente se estiver vazio
    if (!editingField.field_name) {
      const generatedName = editingField.field_label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      editingField.field_name = generatedName;
    }

    try {
      let savedField: CustomField;
      
      if (editFieldIndex !== null) {
        // ✅ EDITANDO CAMPO EXISTENTE: Chamar API PUT usando axios
        const existingField = localFields[editFieldIndex];
        if (existingField.id) {
          console.log('✏️ [handleSaveField] Editando campo via API:', {
            pipelineId: pipelineId || 'undefined',
            fieldId: existingField.id,
            fieldLabel: editingField.field_label,
            changes: {
              field_label: editingField.field_label,
              field_type: editingField.field_type,
              is_required: editingField.is_required,
              show_in_card: editingField.show_in_card
            }
          });

          const response = await api.put(`/pipelines/${pipelineId || ''}/custom-fields/${existingField.id}`, {
            field_label: editingField.field_label,
            field_type: editingField.field_type,
            field_options: editingField.field_options,
            is_required: editingField.is_required,
            show_in_card: editingField.show_in_card,
            field_order: editingField.field_order
          });

          console.log('✅ [handleSaveField] Campo editado com sucesso:', response.data);
          savedField = response.data.field || response.data;
          
          showSuccessToast('Campo atualizado!', `O campo "${editingField.field_label}" foi atualizado com sucesso.`);
        } else {
          savedField = editingField;
        }
      } else {
        // ✅ NOVO CAMPO: Chamar API POST usando axios
        console.log('➕ [handleSaveField] Criando novo campo via API:', {
          pipelineId: pipelineId || 'undefined',
          fieldData: {
            field_name: editingField.field_name,
            field_label: editingField.field_label,
            field_type: editingField.field_type,
            is_required: editingField.is_required,
            show_in_card: editingField.show_in_card
          }
        });

        const response = await api.post(`/pipelines/${pipelineId || ''}/custom-fields`, {
          field_name: editingField.field_name,
          field_label: editingField.field_label,
          field_type: editingField.field_type,
          field_options: editingField.field_options,
          is_required: editingField.is_required,
          show_in_card: editingField.show_in_card,
          field_order: editingField.field_order
        });

        console.log('✅ [handleSaveField] Novo campo criado com sucesso:', response.data);
        savedField = response.data.field || response.data;
        
        showSuccessToast('Campo criado!', `O campo "${editingField.field_label}" foi criado com sucesso. Você pode continuar adicionando mais campos.`);
      }

      // ✅ ATUALIZAR ESTADO LOCAL COM DADOS DO SERVIDOR
      let updatedFields: CustomField[];
      
      if (editFieldIndex !== null) {
        // Editando campo existente
        updatedFields = [...localFields];
        updatedFields[editFieldIndex] = savedField;
      } else {
        // Novo campo
        updatedFields = [...localFields, savedField];
      }

      setLocalFields(updatedFields);
      
      // ✅ CORREÇÃO: NÃO fechar modal automaticamente para melhor UX
      // setShowFieldModal(false); // Removido para manter modal aberto
      
      // Limpar estado de edição mas manter modal aberto para novo campo
      if (editFieldIndex === null) {
        setEditingField({
          field_name: '',
          field_label: '',
          field_type: 'text',
          is_required: false,
          field_order: Math.max(
            ...updatedFields.filter(f => !isSystemField(f.field_name)).map(f => f.field_order || 0),
            9
          ) + 1,
          show_in_card: true
        });
      } else {
        // Para edição, fechar modal após salvar
        setShowFieldModal(false);
        setEditingField(null);
      }
      
      setEditFieldIndex(null);
      // ✅ CORREÇÃO: NÃO marcar hasUnsavedChanges para campos individuais
      // pois isso causa fechamento automático do modal
      // setHasUnsavedChanges(true); // Removido temporariamente
      
      // ✅ CORREÇÃO CRÍTICA: Notificar mudanças sem triggerar save automático
      if (onFieldsUpdate) {
        onFieldsUpdate(updatedFields);
      }

    } catch (error: any) {
      console.error('❌ [handleSaveField] Erro ao salvar campo:', error);
      
      // ✅ MELHOR TRATAMENTO DE ERRO: Detalhar resposta da API
      let errorMessage = 'Não foi possível salvar o campo. Verifique os dados e tente novamente.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showErrorToast('Erro ao salvar', errorMessage);
    }
  };

  const handleDeleteField = (index: number) => {
    const field = localFields[index];
    
    // Não permitir excluir campos obrigatórios do sistema
    if (isSystemField(field.field_name)) {
      showErrorToast('Ação não permitida', 'Não é possível excluir campos obrigatórios do sistema!');
      return;
    }

    // ✅ MODERNIZAÇÃO: Usar AlertDialog em vez de window.confirm
    setFieldToDelete({ field, index });
    setShowDeleteDialog(true);
  };

  // ✅ NOVA FUNÇÃO: Executar exclusão após confirmação no AlertDialog
  const handleConfirmDelete = async () => {
    if (!fieldToDelete) return;
    
    const { field, index } = fieldToDelete;

    try {
      // ✅ CORREÇÃO: Usar API axios em vez de fetch direto para aproveitar proxy do Vite
      if (field.id) {
        console.log('🗑️ [handleConfirmDelete] Excluindo campo via API:', {
          pipelineId: pipelineId || 'undefined',
          fieldId: field.id,
          fieldLabel: field.field_label
        });

        const response = await api.delete(`/pipelines/${pipelineId || ''}/custom-fields/${field.id}`);

        console.log('✅ [handleConfirmDelete] Campo excluído com sucesso:', response.data);
        showSuccessToast('Campo excluído!', `O campo "${field.field_label}" foi removido com sucesso.`);
      }

      // ✅ ATUALIZAR ESTADO LOCAL: Remover campo da lista
      const updatedFields = localFields.filter((_, i) => i !== index);
      setLocalFields(updatedFields);
      
      // ✅ NOTIFICAR MUDANÇAS: Atualizar componente pai
      if (onFieldsUpdate) {
        onFieldsUpdate(updatedFields);
      }

      // ✅ FECHAR DIALOG: Limpar estados do AlertDialog
      setShowDeleteDialog(false);
      setFieldToDelete(null);

    } catch (error: any) {
      console.error('❌ [handleConfirmDelete] Erro ao excluir campo:', error);
      
      // ✅ MELHOR TRATAMENTO DE ERRO: Detalhar resposta da API
      let errorMessage = 'Não foi possível excluir o campo. Tente novamente.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showErrorToast('Erro na exclusão', errorMessage);
      
      // ✅ MANTER DIALOG ABERTO: Para que usuário possa tentar novamente
    }
  };

  // ✅ NOVA FUNÇÃO: Salvar todas as mudanças (similar às stages)
  const handleSaveAllChanges = useCallback(() => {
    if (onFieldsUpdate && hasUnsavedChanges) {
      // Enviar apenas campos customizados (field_order >= 10)
      const customFieldsToSave = localFields.filter(field => 
        !isSystemField(field.field_name) && field.field_order >= 10
      );
      onFieldsUpdate(customFieldsToSave);
      setHasUnsavedChanges(false);
    }
  }, [onFieldsUpdate, hasUnsavedChanges, localFields, isSystemField]);

  const handleAddOption = () => {
    if (!editingField) return;
    
    // ✅ CORREÇÃO: Criar opção com valor padrão não vazio para evitar erro do Radix UI
    const currentOptions = editingField.field_options || [];
    const nextOptionNumber = currentOptions.length + 1;
    const defaultValue = `Opção ${nextOptionNumber}`;
    
    const newOptions = [...currentOptions, defaultValue];
    setEditingField({
      ...editingField,
      field_options: newOptions
    });
  };

  const handleRemoveOption = (index: number) => {
    if (!editingField || !editingField.field_options) return;
    
    const newOptions = editingField.field_options.filter((_, i) => i !== index);
    setEditingField({
      ...editingField,
      field_options: newOptions
    });
  };

  // ✅ FUNÇÃO: Atualizar opção específica de um campo select
  const updateFieldOption = (index: number, value: string) => {
    if (!editingField || !editingField.field_options) return;
    
    const newOptions = [...editingField.field_options];
    newOptions[index] = value;
    setEditingField({
      ...editingField,
      field_options: newOptions
    });
  };

  return {
    customFields: localFields,
    systemFields,
    customFieldsOnly,
    setCustomFields: setLocalFields,
    editingField,
    setEditingField,
    editFieldIndex,
    setEditFieldIndex,
    showFieldModal,
    setShowFieldModal,
    hasUnsavedChanges,
    // Estados e funções do AlertDialog
    showDeleteDialog,
    setShowDeleteDialog,
    fieldToDelete,
    handleConfirmDelete,
    // Funções originais
    handleAddField,
    handleEditField,
    handleSaveField,
    handleDeleteField,
    handleSaveAllChanges,
    handleAddOption,
    handleRemoveOption,
    updateFieldOption,
    getFieldIcon,
    getFieldTypeLabel,
    isSystemField
  };
}

// ================================================================================
// COMPONENTE DE RENDERIZAÇÃO DE CAMPOS
// ================================================================================
interface CustomFieldsManagerRenderProps {
  fieldsManager: CustomFieldsManagerReturn;
}

export function CustomFieldsManagerRender({ fieldsManager }: CustomFieldsManagerRenderProps) {
  const {
    customFields,
    systemFields,
    customFieldsOnly,
    editingField,
    setEditingField,
    editFieldIndex,
    showFieldModal,
    setShowFieldModal,
    hasUnsavedChanges,
    // Estados e funções do AlertDialog
    showDeleteDialog,
    setShowDeleteDialog,
    fieldToDelete,
    handleConfirmDelete,
    // Funções originais
    handleAddField,
    handleEditField,
    handleSaveField,
    handleDeleteField,
    handleSaveAllChanges,
    handleAddOption,
    handleRemoveOption,
    getFieldIcon,
    getFieldTypeLabel,
    isSystemField
  } = fieldsManager;

  return (
    <div className={PIPELINE_UI_CONSTANTS.spacing.section}>
      {/* ===== SEÇÃO 1: CAMPOS CUSTOMIZADOS (TOPO) ===== */}
      <div className="mb-6">
        <SectionHeader
          icon={Database}
          title="Campos Customizados"
          action={
            <Button type="button" onClick={handleAddField} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Campo
          </Button>
        }
        />

        {/* ✅ MELHOR UX: Formulário de adição aparece logo após o header quando ativo */}
        {showFieldModal && editFieldIndex === null && (
          <div className="mb-4">
            <BlurFade delay={0.05} inView>
              <AnimatedCard className="border-2 border-dashed border-primary/50 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-primary" />
                        Novo Campo Customizado
                      </CardTitle>
                      <CardDescription>
                        Configure os detalhes do novo campo customizado.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFieldModal(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fieldLabel">Rótulo do Campo *</Label>
                      <Input
                        id="fieldLabel"
                        value={editingField?.field_label || ''}
                        onChange={(e) => setEditingField({
                          ...editingField!,
                          field_label: e.target.value,
                          field_name: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9\s]/g, '')
                            .replace(/\s+/g, '_')
                            .substring(0, 50)
                        })}
                        placeholder="Ex: Empresa"
                      />
                    </div>

                    <div>
                      <Label htmlFor="fieldName">Nome Interno</Label>
                      <Input
                        id="fieldName"
                        value={editingField?.field_name || ''}
                        readOnly={true}
                        className="bg-muted/50 cursor-not-allowed text-muted-foreground"
                        placeholder="auto-gerado a partir do rótulo"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Gerado automaticamente a partir do rótulo do campo
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="fieldType">Tipo do Campo</Label>
                    <Select
                      value={editingField?.field_type || 'text'}
                      onValueChange={(value: CustomField['field_type']) => 
                        setEditingField({
                          ...editingField!,
                          field_type: value,
                          field_options: value === 'select' ? ['Opção 1'] : undefined
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map(type => {
                          const IconComponent = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>


                  {/* Opções para campos select */}
                  {editingField?.field_type === 'select' && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Opções</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddOption}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {editingField.field_options?.map((option: string, index: number) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(editingField.field_options || [])];
                                newOptions[index] = e.target.value;
                                setEditingField({
                                  ...editingField,
                                  field_options: newOptions
                                });
                              }}
                              placeholder={`Opção ${index + 1}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveOption(index)}
                              disabled={(editingField.field_options?.length || 0) <= 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isRequired"
                        checked={editingField?.is_required || false}
                        onCheckedChange={(checked) => setEditingField({
                          ...editingField!,
                          is_required: checked
                        })}
                      />
                      <Label htmlFor="isRequired">Campo obrigatório</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="showInCard"
                        checked={editingField?.show_in_card || false}
                        onCheckedChange={(checked) => setEditingField({
                          ...editingField!,
                          show_in_card: checked
                        })}
                      />
                      <div>
                        <Label htmlFor="showInCard">Mostrar no Modal de Detalhes</Label>
                        <p className="text-xs text-muted-foreground">
                          Campo será exibido no modal de visualização completa do lead
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowFieldModal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleSaveField}
                      disabled={!editingField?.field_label || !editingField?.field_name}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Campo
                    </Button>
                  </div>
                </CardContent>
              </AnimatedCard>
            </BlurFade>
          </div>
        )}

        {/* Lista de Campos Customizados */}
        <div className="space-y-3 mt-6">
          {customFieldsOnly.length > 0 ? (
            customFieldsOnly.map((field, index) => (
              <div key={field.id || `custom-${index}`}>
                <AnimatedCard className="border-l-4 border-l-blue-500">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      {getFieldIcon(field.field_type)}
                      <div>
                        <div className="font-medium">{field.field_label}</div>
                        <div className="text-sm text-muted-foreground">
                          {getFieldTypeLabel(field.field_type)}
                          {field.is_required && <Badge variant="secondary" className="ml-2">Obrigatório</Badge>}
                          {field.show_in_card && <Badge variant="outline" className="ml-2">Visível no Card</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditField(customFields.findIndex(f => f.field_name === field.field_name))}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteField(customFields.findIndex(f => f.field_name === field.field_name))}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </AnimatedCard>
                
                {/* ✅ MELHOR UX: Formulário de edição aparece logo abaixo do campo sendo editado */}
                {showFieldModal && editFieldIndex === customFields.findIndex(f => f.field_name === field.field_name) && (
                  <div className="mt-2">
                    <BlurFade delay={0.05} inView>
                      <AnimatedCard className="border-2 border-dashed border-orange-500/50 bg-orange-50/50">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <Edit className="h-5 w-5 text-orange-600" />
                                Editando: {field.field_label}
                              </CardTitle>
                              <CardDescription>
                                Modifique os detalhes deste campo customizado.
                              </CardDescription>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowFieldModal(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="editFieldLabel">Rótulo do Campo *</Label>
                              <Input
                                id="editFieldLabel"
                                value={editingField?.field_label || ''}
                                onChange={(e) => setEditingField({
                                  ...editingField!,
                                  field_label: e.target.value,
                                  field_name: e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9\s]/g, '')
                                    .replace(/\s+/g, '_')
                                    .substring(0, 50)
                                })}
                                placeholder="Ex: Empresa"
                              />
                            </div>

                            <div>
                              <Label htmlFor="editFieldName">Nome Interno</Label>
                              <Input
                                id="editFieldName"
                                value={editingField?.field_name || ''}
                                readOnly={true}
                                className="bg-muted/50 cursor-not-allowed text-muted-foreground"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowFieldModal(false)}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              type="button"
                              onClick={handleSaveField}
                              disabled={!editingField?.field_label}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Salvar Alterações
                            </Button>
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    </BlurFade>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum campo customizado criado</p>
              <p className="text-sm">Clique em "Adicionar Campo" para começar</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== SEÇÃO 2: CAMPOS DO SISTEMA (BAIXO) ===== */}
      <div className="mb-6">
        <SectionHeader
          icon={Lock}
          title="Campos do Sistema"
          description="Campos obrigatórios e não editáveis"
        />

        <div className="space-y-3 mt-6">
          {systemFields.map((field, index) => (
            <AnimatedCard key={field.field_name} className="border-l-4 border-l-gray-400 bg-gray-50/50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {getFieldIcon(field.field_type)}
                  <div>
                    <div className="font-medium text-gray-700">{field.field_label}</div>
                    <div className="text-sm text-muted-foreground">
                      {getFieldTypeLabel(field.field_type)}
                      <Badge variant="secondary" className="ml-2">Sistema</Badge>
                      <Badge variant="secondary" className="ml-2">Obrigatório</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
              </CardContent>
            </AnimatedCard>
          ))}
        </div>
      </div>

      {/* ===== ALERT DIALOG PARA CONFIRMAÇÃO DE EXCLUSÃO ===== */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="!z-[10001]" style={{ zIndex: 10001 }} />
          <AlertDialogContent className="!z-[10001]" style={{ zIndex: 10001 }}>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o campo <strong>"{fieldToDelete?.field.field_label}"</strong>?
                <br />
                <span className="text-destructive font-medium">Esta ação não pode ser desfeita.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Campo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

    </div>
  );
}

// ================================================================================
// COMPONENTE PRINCIPAL
// ================================================================================
export function CustomFieldsManager({ customFields, onFieldsUpdate, pipelineId }: CustomFieldsManagerProps) {
  const fieldsManager = useCustomFieldsManager({ customFields, onFieldsUpdate, pipelineId });

  return (
    <CustomFieldsManagerRender
      fieldsManager={fieldsManager}
    />
  );
}

export default CustomFieldsManager; 