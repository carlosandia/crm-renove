// FASE 3.7: Hook especializado para gerenciamento de campos
// Extrai operações CRUD e validações de campos

import { useState, useCallback } from 'react';
import { FormField, FieldType } from '../../../types/Forms';

export interface UseFieldManagementReturn {
  // Estado
  fields: FormField[];
  selectedField: FormField | null;
  
  // Operações CRUD
  addField: (fieldType: FieldType) => FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  removeField: (fieldId: string) => void;
  duplicateField: (fieldId: string) => FormField | null;
  
  // Seleção
  selectField: (field: FormField | null) => void;
  getFieldById: (fieldId: string) => FormField | undefined;
  
  // Ordenação
  moveField: (fromIndex: number, toIndex: number) => void;
  reorderFields: (newOrder: FormField[]) => void;
  
  // Validação
  validateField: (field: FormField) => { isValid: boolean; errors: string[] };
  validateAllFields: () => { isValid: boolean; fieldErrors: Record<string, string[]> };
  
  // Utilitários
  getFieldsByType: (type: FieldType) => FormField[];
  getRequiredFields: () => FormField[];
  generateFieldName: (type: FieldType) => string;
}

export const useFieldManagement = (initialFields: FormField[] = []): UseFieldManagementReturn => {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);

  // Gerar ID único
  const generateId = useCallback(() => Math.random().toString(36).substr(2, 9), []);

  // Gerar nome único para campo
  const generateFieldName = useCallback((type: FieldType): string => {
    const existingFields = fields.filter(f => f.field_type === type);
    const baseNames: Record<FieldType, string> = {
      text: 'texto',
      email: 'email', 
      phone: 'telefone',
      textarea: 'textarea',
      number: 'numero',
      date: 'data',
      time: 'hora',
      select: 'selecao',
      radio: 'radio',
      checkbox: 'checkbox',
      rating: 'avaliacao',
      range: 'faixa',
      file: 'arquivo',
      city: 'cidade',
      state: 'estado',
      country: 'pais',
      captcha: 'captcha',
      submit: 'enviar',
      whatsapp: 'whatsapp',
      url: 'url',
      password: 'senha',
      currency: 'moeda',
      cpf: 'cpf',
      cnpj: 'cnpj',
      heading: 'titulo',
      paragraph: 'paragrafo',
      divider: 'divisor',
      image: 'imagem'
    };
    
    const baseName = baseNames[type] || type;
    return existingFields.length > 0 
      ? `${baseName}_${existingFields.length + 1}` 
      : baseName;
  }, [fields]);

  // Adicionar campo
  const addField = useCallback((fieldType: FieldType): FormField => {
    const newField: FormField = {
      id: generateId(),
      field_type: fieldType,
      field_name: generateFieldName(fieldType),
      field_label: `Campo ${fieldType}`,
      field_description: '',
      placeholder: '',
      is_required: false,
      field_options: {},
      validation_rules: {},
      styling: {},
      order_index: fields.length,
      scoring_weight: 0
    };

    setFields(prev => [...prev, newField]);
    setSelectedField(newField);
    return newField;
  }, [fields.length, generateId, generateFieldName]);

  // Atualizar campo
  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
    
    if (selectedField?.id === fieldId) {
      setSelectedField(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedField]);

  // Remover campo
  const removeField = useCallback((fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  }, [selectedField]);

  // Duplicar campo
  const duplicateField = useCallback((fieldId: string): FormField | null => {
    const fieldToDuplicate = fields.find(f => f.id === fieldId);
    if (!fieldToDuplicate) return null;

    const duplicatedField: FormField = {
      ...fieldToDuplicate,
      id: generateId(),
      field_name: `${fieldToDuplicate.field_name}_copia`,
      field_label: `${fieldToDuplicate.field_label} (Cópia)`,
      order_index: fields.length
    };

    setFields(prev => [...prev, duplicatedField]);
    setSelectedField(duplicatedField);
    return duplicatedField;
  }, [fields, generateId]);

  // Selecionar campo
  const selectField = useCallback((field: FormField | null) => {
    setSelectedField(field);
  }, []);

  // Buscar campo por ID
  const getFieldById = useCallback((fieldId: string) => {
    return fields.find(f => f.id === fieldId);
  }, [fields]);

  // Mover campo
  const moveField = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    const newFields = [...fields];
    const [movedField] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, movedField);
    
    // Atualizar order_index
    const updatedFields = newFields.map((field, index) => ({
      ...field,
      order_index: index
    }));
    
    setFields(updatedFields);
  }, [fields]);

  // Reordenar campos
  const reorderFields = useCallback((newOrder: FormField[]) => {
    const updatedFields = newOrder.map((field, index) => ({
      ...field,
      order_index: index
    }));
    setFields(updatedFields);
  }, []);

  // Validar campo individual
  const validateField = useCallback((field: FormField) => {
    const errors: string[] = [];

    // Validações básicas
    if (!field.field_name.trim()) {
      errors.push('Nome do campo é obrigatório');
    }
    
    if (!field.field_label.trim()) {
      errors.push('Rótulo do campo é obrigatório');
    }

    // Validações específicas por tipo
    if (field.field_type === 'email') {
      // Email sempre válido
    } else if (field.field_type === 'select' || field.field_type === 'radio' || field.field_type === 'checkbox') {
      if (!field.field_options.options || field.field_options.options.length === 0) {
        errors.push('Campo de seleção deve ter pelo menos uma opção');
      }
    } else if (field.field_type === 'rating') {
      if (!field.field_options.max_rating || field.field_options.max_rating < 1) {
        errors.push('Avaliação deve ter pelo menos 1 estrela');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Validar todos os campos
  const validateAllFields = useCallback(() => {
    const fieldErrors: Record<string, string[]> = {};
    let isValid = true;

    fields.forEach(field => {
      const validation = validateField(field);
      if (!validation.isValid) {
        fieldErrors[field.id] = validation.errors;
        isValid = false;
      }
    });

    return { isValid, fieldErrors };
  }, [fields, validateField]);

  // Buscar campos por tipo
  const getFieldsByType = useCallback((type: FieldType) => {
    return fields.filter(f => f.field_type === type);
  }, [fields]);

  // Buscar campos obrigatórios
  const getRequiredFields = useCallback(() => {
    return fields.filter(f => f.is_required);
  }, [fields]);

  return {
    // Estado
    fields,
    selectedField,
    
    // Operações CRUD
    addField,
    updateField,
    removeField,
    duplicateField,
    
    // Seleção
    selectField,
    getFieldById,
    
    // Ordenação
    moveField,
    reorderFields,
    
    // Validação
    validateField,
    validateAllFields,
    
    // Utilitários
    getFieldsByType,
    getRequiredFields,
    generateFieldName
  };
}; 