import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
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
  Copy
} from 'lucide-react';

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
  // CRUD operations
  handleAddField: () => void;
  handleEditField: (index: number) => void;
  handleDeleteField: (index: number) => void;
  
  // Modal states
  isFieldModalOpen: boolean;
  setFieldModalOpen: (open: boolean) => void;
  
  // Form data
  tempField: CustomField;
  setTempField: (field: CustomField) => void;
  editingFieldIndex: number | null;
  
  // Save operation
  handleSaveField: () => void;
  
  // Validation
  validateFieldForm: () => boolean;
  
  // Field options management
  addFieldOption: () => void;
  removeFieldOption: (index: number) => void;
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

// ================================================================================
// HOOKS CUSTOMIZADOS
// ================================================================================
export function useCustomFieldsManager({ 
  initialFields = [], 
  onFieldsChange 
}: CustomFieldsManagerProps = {}): CustomFieldsManagerReturn {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editFieldIndex, setEditFieldIndex] = useState<number | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);

  // Inicializar com campos obrigatórios + campos customizados
  useEffect(() => {
    const allFields = [...SYSTEM_REQUIRED_FIELDS];
    
    if (initialFields.length > 0) {
      // Filtrar campos customizados (não obrigatórios)
      const customFieldsOnly = initialFields.filter(field => 
        !SYSTEM_REQUIRED_FIELDS.some(required => required.field_name === field.field_name)
      );
      allFields.push(...customFieldsOnly);
    }

    // Reorganizar order
    allFields.sort((a, b) => a.field_order - b.field_order);
    const reorderedFields = allFields.map((field, index) => ({
      ...field,
      field_order: index + 1
    }));

    setCustomFields(reorderedFields);
  }, [initialFields]);

  // Notificar mudanças nos campos
  useEffect(() => {
    if (onFieldsChange && customFields.length > 0) {
      onFieldsChange(customFields);
    }
  }, [customFields, onFieldsChange]);

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
    const nextOrder = Math.max(...customFields.map(f => f.field_order), 0) + 1;
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
    const field = customFields[index];
    setEditingField({ ...field });
    setEditFieldIndex(index);
    setShowFieldModal(true);
  };

  const handleSaveField = () => {
    if (!editingField || !editingField.field_name || !editingField.field_label) {
      return;
    }

    // Verificar se o nome já existe (exceto no caso de edição)
    const nameExists = customFields.some((field, index) => 
      field.field_name === editingField.field_name && index !== editFieldIndex
    );
    
    if (nameExists) {
      alert('Já existe um campo com este nome!');
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

    if (editFieldIndex !== null) {
      // Editando campo existente
      const updatedFields = [...customFields];
      updatedFields[editFieldIndex] = editingField;
      setCustomFields(updatedFields);
    } else {
      // Novo campo
      setCustomFields([...customFields, editingField]);
    }

    setShowFieldModal(false);
    setEditingField(null);
    setEditFieldIndex(null);
  };

  const handleDeleteField = (index: number) => {
    const field = customFields[index];
    
    // Não permitir excluir campos obrigatórios do sistema
    if (isSystemField(field.field_name)) {
      alert('Não é possível excluir campos obrigatórios do sistema!');
      return;
    }

    const updatedFields = customFields.filter((_, i) => i !== index);
    setCustomFields(updatedFields);
  };

  const handleAddOption = () => {
    if (!editingField) return;
    
    const newOptions = [...(editingField.field_options || []), ''];
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
    customFields,
    setCustomFields,
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-500" />
            Campos Customizados
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione campos personalizados para capturar informações específicas dos leads.
          </p>
        </div>
        <Button onClick={handleAddField} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Campo
        </Button>
      </div>

      <div className="grid gap-4">
        {customFields.map((field, index) => (
          <BlurFade key={field.field_name} delay={0.1 * index} inView>
            <AnimatedCard className={isSystemField(field.field_name) ? 'bg-muted/30' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFieldIcon(field.field_type)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{field.field_label}</h4>
                        {isSystemField(field.field_name) && (
                          <Badge variant="secondary" className="text-xs">
                            Obrigatório
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
                            Visível no card
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            Oculto no card
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditField(index)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
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

      {/* Modal de Edição */}
      <Dialog open={showFieldModal} onOpenChange={setShowFieldModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingField?.field_name ? `Editar Campo: ${editingField.field_label}` : 'Novo Campo'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do campo customizado.
            </DialogDescription>
          </DialogHeader>

          {editingField && (
            <div className="space-y-4">
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
                    onChange={(e) => setEditingField({
                      ...editingField,
                      field_name: e.target.value
                    })}
                    placeholder="ex: empresa"
                    disabled={isSystemField(editingField.field_name)}
                  />
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
                      field_options: value === 'select' ? [''] : undefined
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
                    {editingField.field_options?.map((option, index) => (
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
                  <Label htmlFor="showInCard">Mostrar no card</Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ================================================================================
// COMPONENTE PRINCIPAL
// ================================================================================
export function CustomFieldsManager({ customFields, onFieldsUpdate }: CustomFieldsManagerProps) {
  const fieldsManager = useCustomFieldsManager({ initialFields: customFields, onFieldsChange: onFieldsUpdate });

  return (
    <CustomFieldsManagerRender
      fieldsManager={fieldsManager}
    />
  );
}

export default CustomFieldsManager; 