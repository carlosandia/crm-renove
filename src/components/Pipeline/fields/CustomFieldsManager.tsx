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
import { showErrorToast } from '../../../hooks/useToast';
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
  Lock
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
}

export interface CustomFieldsManagerReturn {
  // Data
  customFields: CustomField[];
  setCustomFields: React.Dispatch<React.SetStateAction<CustomField[]>>;
  editingField: CustomField | null;
  setEditingField: React.Dispatch<React.SetStateAction<CustomField | null>>;
  editFieldIndex: number | null;
  setEditFieldIndex: React.Dispatch<React.SetStateAction<number | null>>;
  
  // Modal states
  showFieldModal: boolean;
  setShowFieldModal: React.Dispatch<React.SetStateAction<boolean>>;
  
  // CRUD operations
  handleAddField: () => void;
  handleEditField: (index: number) => void;
  handleSaveField: () => void;
  handleDeleteField: (index: number) => void;
  
  // Field options management
  handleAddOption: (optionIndex: number) => void;
  handleRemoveOption: (optionIndex: number) => void;
  
  // Utilities
  getFieldIcon: (fieldType: string) => React.ReactNode;
  getFieldTypeLabel: (fieldType: string) => string;
  updateFieldOption: (index: number, value: string) => void;
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
  onFieldsUpdate 
}: CustomFieldsManagerProps = {}): CustomFieldsManagerReturn {
  const [localFields, setLocalFields] = useState<CustomField[]>([]);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editFieldIndex, setEditFieldIndex] = useState<number | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);

  // ✅ CORREÇÃO: Inicializar apenas com campos sistema essenciais + campos customizados
  useEffect(() => {
    // Campos do sistema (ordem fixa 1-3)
    const systemFields = [...SYSTEM_REQUIRED_FIELDS];
    
    // Campos customizados (ordem dinâmica a partir de 4)
    let customFieldsOnly: CustomField[] = [];
    if (customFields.length > 0) {
      const reservedFieldNames = SYSTEM_REQUIRED_FIELDS.map(f => f.field_name);
      
      customFieldsOnly = customFields.filter(field => 
        !reservedFieldNames.includes(field.field_name)
      );
      
      // ✅ CORREÇÃO UX: Garantir que campos customizados sempre apareçam no final
      // Ordenar campos customizados por field_order e reordenar sequencialmente
      customFieldsOnly.sort((a, b) => a.field_order - b.field_order);
      customFieldsOnly = customFieldsOnly.map((field, index) => ({
        ...field,
        field_order: systemFields.length + index + 1
      }));
    }

    // Combinar apenas campos sistema + customizados
    const allFields = [...systemFields, ...customFieldsOnly];

    setLocalFields(allFields);
  }, [customFields]);

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

  const isSystemField = (fieldName: string) => {
    return SYSTEM_REQUIRED_FIELDS.some(field => field.field_name === fieldName);
  };

  const handleAddField = () => {
    // ✅ CORREÇÃO UX: Garantir que novos campos customizados sempre apareçam no final
    // Calcular ordem após campos do sistema
    const systemFieldsCount = SYSTEM_REQUIRED_FIELDS.length;
    const customFieldsOnly = localFields.filter(field => {
      const reservedFieldNames = SYSTEM_REQUIRED_FIELDS.map(f => f.field_name);
      return !reservedFieldNames.includes(field.field_name);
    });
    
    const nextOrder = systemFieldsCount + customFieldsOnly.length + 1;
    
    setEditingField({
      field_name: '',
      field_label: '',
      field_type: 'text',
      is_required: false,
      field_order: nextOrder,
      placeholder: '',
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

  const handleSaveField = () => {
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

    let updatedFields: CustomField[];
    
    if (editFieldIndex !== null) {
      // Editando campo existente
      updatedFields = [...localFields];
      updatedFields[editFieldIndex] = editingField;
    } else {
      // Novo campo
      updatedFields = [...localFields, editingField];
    }

    setLocalFields(updatedFields);
    setShowFieldModal(false);
    setEditingField(null);
    setEditFieldIndex(null);
    
    // ✅ CORREÇÃO CRÍTICA: Notificar mudanças com os dados atualizados
    if (onFieldsUpdate) {
      onFieldsUpdate(updatedFields);
    }
  };

  const handleDeleteField = (index: number) => {
    const field = localFields[index];
    
    // Não permitir excluir campos obrigatórios do sistema
    if (isSystemField(field.field_name)) {
      showErrorToast('Ação não permitida', 'Não é possível excluir campos obrigatórios do sistema!');
      return;
    }

    const updatedFields = localFields.filter((_, i) => i !== index);
    setLocalFields(updatedFields);
    
    // ✅ CORREÇÃO: Notificar mudanças após deletar campo
    setTimeout(() => notifyFieldsUpdate(), 0);
  };

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

  return {
    customFields: localFields,
    setCustomFields: setLocalFields,
    editingField,
    setEditingField,
    editFieldIndex,
    setEditFieldIndex,
    showFieldModal,
    setShowFieldModal,
    handleAddField,
    handleEditField,
    handleSaveField,
    handleDeleteField,
    handleAddOption,
    handleRemoveOption,
    getFieldIcon,
    getFieldTypeLabel
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
    editingField,
    setEditingField,
    showFieldModal,
    setShowFieldModal,
    handleAddField,
    handleEditField,
    handleSaveField,
    handleDeleteField,
    handleAddOption,
    handleRemoveOption,
    getFieldIcon,
    getFieldTypeLabel
  } = fieldsManager;

  const isSystemField = (fieldName: string) => {
    return SYSTEM_REQUIRED_FIELDS.some(field => field.field_name === fieldName);
  };

  return (
    <div className={PIPELINE_UI_CONSTANTS.spacing.section}>
      <SectionHeader
        icon={Database}
        title="Campos Customizados"
        action={
          <Button onClick={handleAddField} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Campo
          </Button>
        }
      />

      {/* Formulário de Edição Inline */}
      {showFieldModal && editingField && (
        <BlurFade delay={0.05} inView>
          <AnimatedCard className="border-2 border-dashed border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5 text-primary" />
                    {editingField?.field_name ? `Editar Campo: ${editingField.field_label}` : 'Novo Campo'}
                  </CardTitle>
                  <CardDescription>
                    Configure os detalhes do campo customizado.
                  </CardDescription>
                </div>
                <Button
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
                    value={editingField.field_label}
                    onChange={(e) => setEditingField({
                      ...editingField,
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
                    value={editingField.field_name}
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
                  value={editingField.field_type}
                  onValueChange={(value: CustomField['field_type']) => 
                    setEditingField({
                      ...editingField,
                      field_type: value,
                      // ✅ CORREÇÃO: Inicializar select com opção válida padrão
                      field_options: value === 'select' ? ['Opção 1'] : undefined
                    })
                  }
                  disabled={isSystemField(editingField.field_name)}
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

              <div>
                <Label htmlFor="placeholder">Placeholder</Label>
                <Input
                  id="placeholder"
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({
                    ...editingField,
                    placeholder: e.target.value
                  })}
                  placeholder="Texto de exemplo para o campo"
                />
              </div>

              {/* Preview do campo */}
              <div>
                <Label>Preview do Campo</Label>
                <div className="border border-dashed border-muted-foreground/30 rounded-md p-3 bg-muted/10">
                  <Label className="text-sm font-medium mb-2 block">
                    {editingField.field_label || 'Nome do Campo'}
                    {editingField.is_required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <DynamicFieldInput
                    fieldType={editingField.field_type}
                    value=""
                    onChange={() => {}} // Preview apenas, sem funcionalidade
                    placeholder={editingField.placeholder}
                    fieldOptions={editingField.field_options}
                    isRequired={editingField.is_required}
                  />
                </div>
              </div>

              {/* Opções para campos select */}
              {editingField.field_type === 'select' && (
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
                    checked={editingField.is_required}
                    onCheckedChange={(checked) => setEditingField({
                      ...editingField,
                      is_required: checked
                    })}
                    disabled={isSystemField(editingField.field_name)}
                  />
                  <Label htmlFor="isRequired">Campo obrigatório</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="showInCard"
                    checked={editingField.show_in_card}
                    onCheckedChange={(checked) => setEditingField({
                      ...editingField,
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

              {/* Footer com botões */}
              <div className="flex items-center justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowFieldModal(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveField}
                  disabled={!editingField?.field_label || !editingField?.field_name}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </CardContent>
          </AnimatedCard>
        </BlurFade>
      )}

      <div className="grid gap-4">
        {customFields.map((field: CustomField, index: number) => (
          <BlurFade key={field.field_name} delay={0.03 * index} inView>
            <AnimatedCard className={isSystemField(field.field_name) ? 'bg-muted/30 border-muted-foreground/20' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isSystemField(field.field_name) ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      getFieldIcon(field.field_type)
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${isSystemField(field.field_name) ? 'text-muted-foreground' : ''}`}>
                          {field.field_label}
                        </h4>
                        {isSystemField(field.field_name) && (
                          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                            Sistema
                          </Badge>
                        )}
                        {field.is_required && !isSystemField(field.field_name) && (
                          <Badge variant="destructive" className="text-xs">
                            Requerido
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Tipo: {getFieldTypeLabel(field.field_type)}</span>
                        <span>Nome: {field.field_name}</span>
                        {field.show_in_card ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <Eye className="h-3 w-3" />
                            Visível no modal
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            Oculto no modal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isSystemField(field.field_name) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditField(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {!isSystemField(field.field_name) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteField(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </AnimatedCard>
          </BlurFade>
        ))}
      </div>
    </div>
  );
}

// ================================================================================
// COMPONENTE PRINCIPAL
// ================================================================================
export function CustomFieldsManager({ customFields, onFieldsUpdate }: CustomFieldsManagerProps) {
  const fieldsManager = useCustomFieldsManager({ customFields, onFieldsUpdate });

  return (
    <CustomFieldsManagerRender
      fieldsManager={fieldsManager}
    />
  );
}

export default CustomFieldsManager; 