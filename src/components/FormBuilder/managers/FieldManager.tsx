import React, { useCallback, useEffect } from 'react';
import { FormField } from '../../../types/Forms';
import { getDefaultPlaceholder } from '../utils/FormValidation';

export interface FieldManagerProps {
  fields: FormField[];
  selectedField: FormField | null;
  onFieldsChange: (fields: FormField[]) => void;
  onSelectedFieldChange: (field: FormField | null) => void;
}

export interface FieldManagerReturn {
  addField: (newField: FormField) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  removeField: (fieldId: string) => void;
  duplicateField: (fieldId: string) => void;
  generateId: () => string;
  createDefaultField: (fieldType: string) => FormField;
}

export const useFieldManager = (
  fields: FormField[],
  onFieldsChange: (fields: FormField[]) => void
): FieldManagerReturn => {

  const generateId = useCallback(() => {
    return Math.random().toString(36).substr(2, 9);
  }, []);

  const createDefaultField = useCallback((fieldType: string): FormField => {
    return {
      id: generateId(),
      field_name: `field_${generateId()}`,
      field_label: `Novo ${fieldType}`,
      field_type: fieldType as any,
      is_required: false,
      placeholder: getDefaultPlaceholder(fieldType),
      field_options: fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox' 
        ? { options: ['Opção 1', 'Opção 2', 'Opção 3'] }
        : {},
      order_index: fields.length,
      validation_rules: {
        min_length: 0,
        max_length: 255,
        pattern: '',
        custom_message: ''
      },
      styling: {
        fontSize: '14px',
        padding: '8px 12px',
        borderRadius: '6px'
      }
    };
  }, [fields.length, generateId]);

  const addField = useCallback((newField: FormField) => {
    const updatedFields = [...fields, newField];
    onFieldsChange(updatedFields);
  }, [fields, onFieldsChange]);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    const updatedFields = fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    );
    onFieldsChange(updatedFields);
  }, [fields, onFieldsChange]);

  const removeField = useCallback((fieldId: string) => {
    const updatedFields = fields.filter(field => field.id !== fieldId);
    onFieldsChange(updatedFields);
  }, [fields, onFieldsChange]);

  const duplicateField = useCallback((fieldId: string) => {
    const fieldToDuplicate = fields.find(field => field.id === fieldId);
    if (fieldToDuplicate) {
      const duplicatedField: FormField = {
        ...fieldToDuplicate,
        id: generateId(),
        field_name: `${fieldToDuplicate.field_name}_copy`,
        field_label: `${fieldToDuplicate.field_label} (Cópia)`,
        order_index: fields.length
      };
      const updatedFields = [...fields, duplicatedField];
      onFieldsChange(updatedFields);
    }
  }, [fields, onFieldsChange, generateId]);

  return {
    addField,
    updateField,
    removeField,
    duplicateField,
    generateId,
    createDefaultField
  };
};

export const FieldManager: React.FC<FieldManagerProps> = ({
  fields,
  selectedField,
  onFieldsChange,
  onSelectedFieldChange
}) => {
  const fieldManager = useFieldManager(fields, onFieldsChange);

  return (
    <div className="field-manager">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Gerenciar Campos
        </h3>
        <span className="text-sm text-gray-500">
          {fields.length} campo(s)
        </span>
      </div>

      {/* Lista de campos */}
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedField?.id === field.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSelectedFieldChange(field)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {field.field_label}
                </div>
                <div className="text-sm text-gray-500">
                  {field.field_type} {field.is_required && '(Obrigatório)'}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fieldManager.duplicateField(field.id);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Duplicar campo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fieldManager.removeField(field.id);
                    if (selectedField?.id === field.id) {
                      onSelectedFieldChange(null);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Remover campo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {fields.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Nenhum campo criado ainda</p>
          <p className="text-xs text-gray-400">
            Adicione campos usando o painel de tipos
          </p>
        </div>
      )}
    </div>
  );
};

export default FieldManager; 