import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// ✅ LOGGING CENTRALIZADO: Importar hook de logging inteligente
import { useSmartLogger } from '../../../hooks/useSmartLogger';
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

// ✅ AIDEV-NOTE: Usando tipo derivado do schema Zod para garantir consistência
import { CustomField } from '../../../types/Pipeline';
// ✅ PARSING HELPER: Hook para processar field_options consistentemente
import { parseFieldOptions } from '../../../hooks/useFieldOptionsParsing';

// ================================================================================
// INTERFACES E TIPOS
// ================================================================================

export interface CustomFieldsManagerProps {
  customFields: CustomField[];
  onFieldsUpdate: (fields: CustomField[]) => void;
  pipelineId?: string; // ✅ ID da pipeline para chamadas API
  // ✅ DRAFT MODE: Callback para notificar quando pipeline é criada
  onPipelineCreated?: (pipelineId: string) => void;
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
  
  // ✅ DRAFT MODE: Estados e funções específicas
  isDraftMode: boolean;
  draftFields: CustomField[];
  isFlushingDraft: boolean;
  draftError: string | null;
  flushDraftFields: () => Promise<void>;
  
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
  pipelineId,
  onPipelineCreated
}: CustomFieldsManagerProps): CustomFieldsManagerReturn {
  
  // ✅ LOGGING CENTRALIZADO: Hook inteligente para logs estruturados
  const logger = useSmartLogger('CUSTOM_FIELDS_MANAGER');
  const [localFields, setLocalFields] = useState<CustomField[]>(() => {
    // Inicialização inteligente: combinar campos sistema + customFields/draftFields
    const systemFields = [...SYSTEM_REQUIRED_FIELDS];
    const isCurrentlyInDraftMode = !pipelineId || pipelineId === '';
    
    if (isCurrentlyInDraftMode) {
      return [...systemFields]; // Inicia apenas com campos sistema em modo draft
    } else {
      const customFieldsFromDB = customFields.filter(field => 
        !SYSTEM_REQUIRED_FIELDS.some(sys => sys.field_name === field.field_name)
      );
      return [...systemFields, ...customFieldsFromDB];
    }
  });
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editFieldIndex, setEditFieldIndex] = useState<number | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // ✅ DRAFT MODE: Estados para gerenciar campos draft
  const [draftFields, setDraftFields] = useState<CustomField[]>([]);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [isFlushingDraft, setIsFlushingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  
  // ✅ DETECÇÃO: Modo draft quando pipelineId é undefined
  const isInDraftMode = !pipelineId || pipelineId === '';
  
  // Estados para AlertDialog de confirmação de exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<{field: CustomField, index: number} | null>(null);

  // ✅ CORREÇÃO: Definir isSystemField ANTES de qualquer utilização
  const isSystemField = useCallback((fieldName: string) => {
    return SYSTEM_REQUIRED_FIELDS.some(field => field.field_name === fieldName);
  }, []);

  // Separar campos sistema vs customizados
  const systemFields = SYSTEM_REQUIRED_FIELDS;

  // ✅ EFEITO: Atualizar modo draft baseado no pipelineId
  useEffect(() => {
    const newDraftMode = isInDraftMode;
    setIsDraftMode(newDraftMode);
    
    if (newDraftMode) {
      logger.logDraft({}, 'Ativando modo draft - pipelineId ausente');
      setDraftError(null);
    } else {
      logger.logDraft({ pipelineId }, 'Modo normal - pipelineId presente');
    }
  }, [isInDraftMode, pipelineId]);
  
  // ✅ CORREÇÃO LOOP INFINITO: Usar useMemo para calcular fieldsToUse sem side effects
  const fieldsToUse = useMemo(() => {
    // Campos do sistema (sempre presentes)
    const systemFields = [...SYSTEM_REQUIRED_FIELDS];
    
    // ✅ CORREÇÃO: Campos customizados vindos do banco (sem filtro de field_order)
    let customFieldsFromDB: CustomField[] = [];
    if (customFields.length > 0) {
      customFieldsFromDB = customFields.filter(field => 
        !isSystemField(field.field_name)
      );
      
      // Ordenar por field_order
      customFieldsFromDB.sort((a, b) => a.field_order - b.field_order);
    }

    // ✅ DRAFT MODE: Se estiver em modo draft, usar campos draft locais
    if (isInDraftMode) {
      // Em modo draft: sistema + draft locais
      return [...systemFields, ...draftFields];
    } else {
      // Modo normal: sistema + banco
      return [...systemFields, ...customFieldsFromDB];
    }
  }, [customFields, isSystemField, isInDraftMode, draftFields]);

  // ✅ Sincronização quando customFields props mudam
  useEffect(() => {
    // Comparação otimizada por referência e length primeiro
    const localLength = localFields.length;
    const fieldsLength = fieldsToUse.length;
    
    // Quick check: Se lengths são diferentes, definitivamente precisa sincronizar
    if (localLength !== fieldsLength) {
      setLocalFields(fieldsToUse);
      setHasUnsavedChanges(false);
      return;
    }
    
    // Se lengths são iguais mas conteúdo pode ser diferente
    // Usar comparação mais eficiente apenas quando necessário
    const fieldsChanged = localFields.some((local, index) => {
      const fieldsItem = fieldsToUse[index];
      return !fieldsItem || local.id !== fieldsItem.id || local.field_name !== fieldsItem.field_name;
    });
    
    if (fieldsChanged) {
      setLocalFields(fieldsToUse);
      setHasUnsavedChanges(false);
    }
  }, [fieldsToUse, customFields.length]); // Dependências otimizadas

  // ✅ CORREÇÃO: Derivar customFieldsOnly incluindo draftFields quando em modo draft
  const customFieldsOnly = useMemo(() => {
    if (isInDraftMode) {
      // Em modo draft: mostrar campos draft locais
      return draftFields;
    } else {
      // ✅ CORREÇÃO: Modo normal: mostrar campos customizados do banco (sem filtro field_order)
      const filteredFields = localFields.filter(field => 
        !isSystemField(field.field_name)
      );
      
      // ✅ DEBUG TEMPORÁRIO: Log para diagnóstico da renderização
      console.log('🔍 [CUSTOM-FIELDS-ONLY-DEBUG] Filtragem de campos:', {
        localFields_length: localFields.length,
        customFields_props_length: customFields.length,
        filteredFields_length: filteredFields.length,
        isInDraftMode,
        pipelineId,
        localFields_sample: localFields.slice(0, 3).map(f => ({
          field_name: f.field_name,
          field_label: f.field_label,
          isSystem: isSystemField(f.field_name)
        })),
        filteredFields_sample: filteredFields.slice(0, 3).map(f => ({
          field_name: f.field_name,
          field_label: f.field_label
        }))
      });
      
      return filteredFields;
    }
  }, [isInDraftMode, draftFields, localFields, isSystemField, customFields.length, pipelineId]);

  // ✅ FUNÇÃO CRÍTICA: Sincronizar campos draft com API quando pipeline é criada
  const flushDraftFields = useCallback(async () => {
    if (!pipelineId || draftFields.length === 0 || isFlushingDraft) {
      logger.logFlush({
        hasPipelineId: !!pipelineId,
        draftFieldsCount: draftFields.length,
        isFlushingDraft
      }, 'Skipping flush');
      return;
    }

    logger.logFlush({
      pipelineId,
      draftFieldsCount: draftFields.length,
      draftFields: draftFields.map(f => ({ name: f.field_name, label: f.field_label }))
    }, 'Iniciando sincronização');

    setIsFlushingDraft(true);
    setDraftError(null);
    
    try {
      const savedFields: CustomField[] = [];
      
      // Sincronizar cada campo draft com a API
      for (const draftField of draftFields) {
        logger.logField({ fieldLabel: draftField.field_label }, 'Salvando campo');
        
        const response = await api.post(`/pipelines/${pipelineId}/custom-fields`, {
          field_name: draftField.field_name,
          field_label: draftField.field_label,
          field_type: draftField.field_type,
          field_options: draftField.field_options,
          is_required: draftField.is_required,
          show_in_card: draftField.show_in_card,
          field_order: draftField.field_order
        });
        
        const savedField = response.data.field || response.data;
        savedFields.push(savedField);
        logger.logField({ savedField }, 'Campo salvo');
      }
      
      // Limpar draft e atualizar campos locais
      setDraftFields([]);
      setIsDraftMode(false);
      
      // Combinar com campos do sistema
      const systemFields = [...SYSTEM_REQUIRED_FIELDS];
      const allFields = [...systemFields, ...savedFields];
      setLocalFields(allFields);
      
      // Notificar componente pai
      if (onFieldsUpdate) {
        onFieldsUpdate(allFields);
      }
      
      showSuccessToast(
        'Campos sincronizados!', 
        `${savedFields.length} campo(s) customizado(s) foram salvos automaticamente.`
      );
      
      logger.logFlush({
        savedCount: savedFields.length,
        totalFields: allFields.length
      }, 'Sincronização concluída com sucesso');
      
    } catch (error: any) {
      logger.logError(error, 'Erro na sincronização de flush');
      
      const errorMessage = error.response?.data?.error || error.message || 'Erro desconhecido';
      setDraftError(`Erro ao sincronizar campos: ${errorMessage}`);
      
      showErrorToast(
        'Erro na sincronização', 
        `Não foi possível salvar os campos automaticamente: ${errorMessage}`
      );
    } finally {
      setIsFlushingDraft(false);
    }
  }, [pipelineId, draftFields, isFlushingDraft, onFieldsUpdate]);
  
  // ✅ EFEITO: Executar flush automático quando pipelineId muda de undefined para válido
  useEffect(() => {
    if (pipelineId && !isInDraftMode && draftFields.length > 0) {
      // ✅ LOGGING CENTRALIZADO: Auto-flush é operação importante
      logger.logFlush(
        { draftFieldsCount: draftFields.length, trigger: 'auto-flush' }, 
        'AUTO'
      );
      flushDraftFields();
    }
  }, [pipelineId, isInDraftMode, draftFields.length, flushDraftFields]);

  // ✅ DRAFT MODE: Detectar criação da pipeline e acionar flush automático via callback
  useEffect(() => {
    if (onPipelineCreated && !pipelineId && draftFields.length > 0) {
      logger.logDraft({ draftFieldsCount: draftFields.length }, 'Callback onPipelineCreated disponível, aguardando criação da pipeline');
      // Aqui podemos implementar uma função para se registrar no callback
      // O flush será acionado quando ModernPipelineCreatorRefactored chamar onPipelineCreated
    }
  }, [onPipelineCreated, pipelineId, draftFields.length]);

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
    // ✅ CORREÇÃO: Campo customizado com order_index baseado nos existentes
    const nextOrder = Math.max(
      ...localFields.filter(f => !isSystemField(f.field_name)).map(f => f.field_order || 0),
      0 // Permitir qualquer order_index >= 1
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
    
    // ✅ CORREÇÃO: Usar helper para parsing consistente de field_options
    const processedField = parseFieldOptions(field);
    
    console.log('🔍 [CustomFieldsManager] Editing field:', {
      fieldName: field.field_name,
      fieldType: field.field_type,
      originalOptions: field.field_options,
      processedOptions: processedField.field_options,
      isSelectType: field.field_type === 'select'
    });
    
    setEditingField(processedField);
    
    // ✅ DEBUG: Log após setEditingField para confirmar estado
    console.log('🔍 [CustomFieldsManager] Estado definido após setEditingField:', {
      fieldName: processedField.field_name,
      fieldType: processedField.field_type,
      field_options: processedField.field_options,
      field_options_length: processedField.field_options?.length,
      setEditingFieldCalled: true
    });
    
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
      
      // ✅ DRAFT MODE: Validar se deve salvar em modo draft ou via API
      if (isInDraftMode) {
        logger.logDraft({
          fieldLabel: editingField.field_label,
          isNewField: editFieldIndex === null,
          draftFieldsCount: draftFields.length
        }, 'Salvando campo em modo draft');
        
        // Salvar localmente em modo draft
        savedField = {
          ...editingField,
          id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // ID temporário
        };
        
        if (editFieldIndex !== null) {
          // Editando campo draft existente
          const updatedDraftFields = [...draftFields];
          const draftIndex = draftFields.findIndex(f => f.field_name === editingField.field_name);
          if (draftIndex >= 0) {
            updatedDraftFields[draftIndex] = savedField;
          }
          setDraftFields(updatedDraftFields);
          
          showSuccessToast('🟡 Campo draft atualizado!', `O campo "${editingField.field_label}" será salvo quando a pipeline for criada.`);
        } else {
          // Novo campo draft
          setDraftFields(prev => [...prev, savedField]);
          showSuccessToast('🟡 Campo draft criado!', `O campo "${editingField.field_label}" será salvo automaticamente quando a pipeline for criada.`);
        }
        
      } else {
        // ✅ MODO NORMAL: Salvar via API com validação de segurança
        if (!pipelineId) {
          throw new Error('Pipeline ID é obrigatório para salvar campos via API');
        }
        
        if (editFieldIndex !== null) {
          // ✅ EDITANDO CAMPO EXISTENTE: Chamar API PUT usando axios
          const existingField = localFields[editFieldIndex];
          if (existingField.id && !existingField.id.startsWith('draft_')) {
            logger.logField({
              pipelineId,
              fieldId: existingField.id,
              fieldLabel: editingField.field_label
            }, 'Editando campo via API');

            const response = await api.put(`/pipelines/${pipelineId}/custom-fields/${existingField.id}`, {
              field_label: editingField.field_label,
              field_type: editingField.field_type,
              field_options: editingField.field_options,
              is_required: editingField.is_required,
              show_in_card: editingField.show_in_card,
              field_order: editingField.field_order
            });

            logger.logField({ response: response.data }, 'Campo editado com sucesso');
            savedField = response.data.field || response.data;
            
            showSuccessToast('Campo atualizado!', `O campo "${editingField.field_label}" foi atualizado com sucesso.`);
          } else {
            savedField = editingField;
          }
        } else {
          // ✅ NOVO CAMPO: Chamar API POST usando axios
          logger.logField({
            pipelineId,
            fieldData: {
              field_name: editingField.field_name,
              field_label: editingField.field_label,
              field_type: editingField.field_type
            }
          }, 'Criando novo campo via API');

          const response = await api.post(`/pipelines/${pipelineId}/custom-fields`, {
            field_name: editingField.field_name,
            field_label: editingField.field_label,
            field_type: editingField.field_type,
            field_options: editingField.field_options,
            is_required: editingField.is_required,
            show_in_card: editingField.show_in_card,
            field_order: editingField.field_order
          });

          logger.logField({ response: response.data }, 'Novo campo criado com sucesso');
          savedField = response.data.field || response.data;
          
          showSuccessToast('Campo criado!', `O campo "${editingField.field_label}" foi criado com sucesso.`);
        }
      }

      // ✅ ATUALIZAR ESTADO LOCAL: Diferenciar entre draft e normal
      if (!isInDraftMode) {
        // Modo normal: atualizar localFields diretamente
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
        
        // ✅ NOTIFICAR MUDANÇAS: Apenas em modo normal
        if (onFieldsUpdate) {
          onFieldsUpdate(updatedFields);
        }
      }
      // No modo draft, os campos são atualizados via useEffect que monitora draftFields
      
      // ✅ UX: Gerenciar estado do modal baseado no contexto
      if (editFieldIndex === null) {
        // Novo campo: limpar formulário mas manter modal aberto
        const nextOrder = Math.max(
          ...(isInDraftMode ? draftFields : localFields)
            .filter(f => !isSystemField(f.field_name))
            .map(f => f.field_order || 0),
          9
        ) + 1;
        
        setEditingField({
          field_name: '',
          field_label: '',
          field_type: 'text',
          is_required: false,
          field_order: nextOrder,
          show_in_card: true
        });
      } else {
        // Edição: fechar modal após salvar
        setShowFieldModal(false);
        setEditingField(null);
      }
      
      setEditFieldIndex(null);

    } catch (error: any) {
      console.error('❌ [handleSaveField] Erro ao salvar campo:', error);
      
      // ✅ TRATAMENTO DIFERENCIADO: Draft vs Normal
      if (isInDraftMode) {
        // Em modo draft, erros são menos críticos
        logger.logError(error, 'Erro em modo draft (não crítico)');
        showErrorToast('Erro no modo draft', 'Houve um problema ao salvar o campo em modo draft. Você pode tentar novamente.');
      } else {
        // Em modo normal, erros são críticos
        let errorMessage = 'Não foi possível salvar o campo. Verifique os dados e tente novamente.';
        
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        showErrorToast('Erro ao salvar', errorMessage);
      }
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
        // ✅ LOGGING CENTRALIZADO: Delete é operação importante
        logger.logField({
          pipelineId: pipelineId || 'undefined',
          fieldId: field.id,
          fieldLabel: field.field_label
        }, 'DELETE');

        const response = await api.delete(`/pipelines/${pipelineId || ''}/custom-fields/${field.id}`);

        // ✅ LOGGING CENTRALIZADO: Sucesso é operação importante
        logger.logField({
          success: true,
          response: response.data
        }, 'DELETE_SUCCESS');
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
      // ✅ CORREÇÃO: Enviar apenas campos customizados (sem filtro field_order)
      const customFieldsToSave = localFields.filter(field => 
        !isSystemField(field.field_name)
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
    // ✅ DRAFT MODE: Novos estados e funções
    isDraftMode: isInDraftMode,
    draftFields,
    isFlushingDraft,
    draftError,
    flushDraftFields,
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
  // ✅ RENDER: CustomFieldsManagerRender - logs removidos para evitar spam

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
    <div className="space-y-6">
      {/* ===== SEÇÃO 1: CAMPOS CUSTOMIZADOS (TOPO) ===== */}
      <BlurFade delay={0.1} direction="up">
        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">Campos Customizados</h3>
                  {/* ✅ DRAFT MODE: Indicador no header quando em modo draft */}
                  {fieldsManager.isDraftMode && fieldsManager.draftFields.length > 0 && (
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse">
                      {fieldsManager.draftFields.length} Draft{fieldsManager.draftFields.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {/* ✅ DRAFT MODE: Indicador quando está sincronizando */}
                  {fieldsManager.isFlushingDraft && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                      Sincronizando...
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-slate-500">
                  {fieldsManager.isDraftMode 
                    ? "Modo Draft: Campos serão salvos quando a pipeline for criada"
                    : "Personalize os campos específicos para sua pipeline"
                  }
                </div>
              </div>
            </div>
            <Button type="button" onClick={handleAddField} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Campo
            </Button>
          </div>
        </div>
      </BlurFade>

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
                      onValueChange={(value: CustomField['field_type']) => {
                        // ✅ CORREÇÃO: Preservar opções existentes quando já é select
                        const currentOptions = editingField?.field_options;
                        let newOptions;
                        
                        if (value === 'select') {
                          // ✅ PRESERVAR: opções existentes ou criar padrão apenas se não houver
                          newOptions = (currentOptions && currentOptions.length > 0) 
                            ? currentOptions 
                            : ['Opção 1'];
                        } else {
                          // ✅ LIMPAR: opções quando não é select
                          newOptions = undefined;
                        }
                        
                        console.log('🔍 [CustomFieldsManager] onValueChange tipo campo:', {
                          fieldName: editingField?.field_name,
                          oldType: editingField?.field_type,
                          newType: value,
                          currentOptions: currentOptions,
                          newOptions: newOptions,
                          optionsPreserved: value === 'select' && currentOptions && currentOptions.length > 0
                        });
                        
                        setEditingField({
                          ...editingField!,
                          field_type: value,
                          field_options: newOptions
                        });
                      }}
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

      {/* ✅ DRAFT MODE: Exibir erro de draft se houver */}
      {fieldsManager.draftError && (
        <BlurFade delay={0.15} direction="up">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Erro na sincronização draft</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{fieldsManager.draftError}</p>
          </div>
        </BlurFade>
      )}

      {/* Lista de Campos Customizados */}
      <BlurFade delay={0.2} direction="up">
        <div className="space-y-3">
          {customFieldsOnly.length > 0 ? (
            customFieldsOnly.map((field, index) => (
              <div key={field.id || `custom-${index}`}>
                <Card className={`transition-all duration-200 ${
                  fieldsManager.isDraftMode && field.id?.startsWith('draft_')
                    ? "bg-gradient-to-r from-yellow-50 to-amber-50/30 border-yellow-200/80 hover:border-yellow-300/60"
                    : "bg-gradient-to-r from-white to-blue-50/30 border-slate-200/80 hover:border-blue-300/60"
                }`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${
                        fieldsManager.isDraftMode && field.id?.startsWith('draft_')
                          ? "bg-yellow-100/70"
                          : "bg-blue-100/70"
                      }`}>
                        {getFieldIcon(field.field_type)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{field.field_label}</div>
                        <div className="text-sm text-slate-600 flex items-center gap-2">
                          {getFieldTypeLabel(field.field_type)}
                          {field.is_required && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                              Obrigatório
                            </Badge>
                          )}
                          {/* ✅ DRAFT MODE: Indicador visual de draft vs saved */}
                          {fieldsManager.isDraftMode && field.id?.startsWith('draft_') ? (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse">
                              Draft
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                              Salvo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditField(customFields.findIndex(f => f.field_name === field.field_name))}
                        className="hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteField(customFields.findIndex(f => f.field_name === field.field_name))}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {/* ✅ MELHOR UX: Formulário de edição aparece logo abaixo do campo sendo editado */}
                {showFieldModal && editFieldIndex === customFields.findIndex(f => f.field_name === field.field_name) && (
                  <div className="mt-2">
                    {(() => {
                      console.log('🔍 [CustomFieldsManager] MODAL EDIÇÃO RENDERIZANDO:', {
                        fieldName: field.field_name,
                        showFieldModal: showFieldModal,
                        editFieldIndex: editFieldIndex,
                        customFieldsIndex: customFields.findIndex(f => f.field_name === field.field_name),
                        indexMatch: editFieldIndex === customFields.findIndex(f => f.field_name === field.field_name),
                        editingField_exists: !!editingField,
                        editingField_fieldName: editingField?.field_name,
                        editingField_options: editingField?.field_options,
                        editingField_options_length: editingField?.field_options?.length
                      });
                      return null;
                    })()}
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

                          {/* ✅ CORREÇÃO: Seção de opções para campos select - DENTRO DO MODAL DE EDIÇÃO */}
                          {(() => {
                            console.log('🔍 [CustomFieldsManager] MODAL EDIÇÃO - CONDICIONAL RENDERIZAÇÃO:', {
                              editingField_exists: !!editingField,
                              editingField_fieldName: editingField?.field_name,
                              editingField_fieldType: editingField?.field_type,
                              editingField_isSelect: editingField?.field_type === 'select',
                              editingField_hasOptions: !!editingField?.field_options,
                              editingField_optionsLength: editingField?.field_options?.length,
                              condicionalPassará: !!editingField && editingField?.field_type === 'select'
                            });
                            return null;
                          })()}
                          
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
                                {(() => {
                                  console.log('🔍 [CustomFieldsManager] MODAL EDIÇÃO - RENDERIZAÇÃO OPÇÕES:', {
                                    fieldName: editingField?.field_name,
                                    fieldType: editingField?.field_type,
                                    field_options: editingField?.field_options,
                                    field_options_length: editingField?.field_options?.length,
                                    field_options_type: typeof editingField?.field_options,
                                    isArray: Array.isArray(editingField?.field_options),
                                    willRender: editingField?.field_options?.length > 0
                                  });
                                  return null;
                                })()}
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
      </BlurFade>

      {/* ===== SEÇÃO 2: CAMPOS DO SISTEMA (BAIXO) ===== */}
      <BlurFade delay={0.3} direction="up">
        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/60 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Lock className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Campos do Sistema</h3>
              <p className="text-sm text-slate-500">Campos obrigatórios e não editáveis</p>
            </div>
          </div>

          <div className="space-y-3">
            {systemFields.map((field, index) => (
              <Card key={field.field_name} className="bg-gradient-to-r from-white to-slate-50/30 border-slate-200/80">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100/70 rounded-md">
                      {getFieldIcon(field.field_type)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{field.field_label}</div>
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        {getFieldTypeLabel(field.field_type)}
                        <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 border-slate-200">
                          Sistema
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                          Obrigatório
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-100 rounded-md">
                      <Lock className="h-4 w-4 text-slate-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </BlurFade>

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