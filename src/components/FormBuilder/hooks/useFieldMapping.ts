import { useState, useCallback } from 'react';
import { FormField } from '../../../types/Forms';

interface FieldMapping {
  form_field_id: string;
  pipeline_field_name: string;
  field_type: string;
  confidence: number;
}

interface PipelineField {
  name: string;
  label: string;
  type: string;
  is_required: boolean;
  is_custom: boolean;
  options?: any;
}

export interface UseFieldMappingReturn {
  fieldMappings: FieldMapping[];
  updateFieldMapping: (formFieldId: string, pipelineFieldName: string) => void;
  removeFieldMapping: (formFieldId: string) => void;
  addFieldMapping: (formFieldId: string, pipelineFieldName: string) => void;
  getFieldMapping: (formFieldId: string) => FieldMapping | undefined;
  resetMappings: () => void;
  isAutoMapping: boolean;
}

export const useFieldMapping = (): UseFieldMappingReturn => {
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [isAutoMapping, setIsAutoMapping] = useState(false);

  const updateFieldMapping = useCallback((formFieldId: string, pipelineFieldName: string) => {
    setFieldMappings(prev => {
      const existingIndex = prev.findIndex(m => m.form_field_id === formFieldId);
      const newMapping: FieldMapping = {
        form_field_id: formFieldId,
        pipeline_field_name: pipelineFieldName,
        field_type: 'custom',
        confidence: 100
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newMapping;
        return updated;
      } else {
        return [...prev, newMapping];
      }
    });
  }, []);

  const removeFieldMapping = useCallback((formFieldId: string) => {
    setFieldMappings(prev => prev.filter(m => m.form_field_id !== formFieldId));
  }, []);

  const addFieldMapping = useCallback((formFieldId: string, pipelineFieldName: string) => {
    updateFieldMapping(formFieldId, pipelineFieldName);
  }, [updateFieldMapping]);

  const getFieldMapping = useCallback((formFieldId: string) => {
    return fieldMappings.find(m => m.form_field_id === formFieldId);
  }, [fieldMappings]);

  const resetMappings = useCallback(() => {
    setFieldMappings([]);
  }, []);

  return {
    fieldMappings,
    updateFieldMapping,
    removeFieldMapping,
    addFieldMapping,
    getFieldMapping,
    resetMappings,
    isAutoMapping
  };
}; 