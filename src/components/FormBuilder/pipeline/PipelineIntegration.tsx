import React, { useCallback, useState, useEffect } from 'react';
import { Pipeline, PipelineField, FieldMapping, FormField } from '../../../types/Forms';
import { supabase } from '../../../lib/supabase';

export interface PipelineIntegrationProps {
  availablePipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  fieldMappings: FieldMapping[];
  formFields: FormField[];
  onPipelineSelect: (pipeline: Pipeline | null) => void;
  onFieldMappingsChange: (mappings: FieldMapping[]) => void;
}

export interface PipelineIntegrationReturn {
  // Pipeline management
  loadAvailablePipelines: () => Promise<void>;
  loadPipelineDetails: (pipelineId: string) => Promise<void>;
  
  // Field mapping
  autoMapFields: (pipelineFields: PipelineField[]) => void;
  updateFieldMapping: (formFieldId: string, pipelineFieldName: string) => void;
  removeFieldMapping: (formFieldId: string) => void;
  addFieldMapping: (formFieldId: string, pipelineFieldName: string) => void;
  
  // Validation
  validateMappings: () => { isValid: boolean; errors: string[] };
  
  // Utilities
  findBestFieldMatch: (formField: FormField, pipelineFields: PipelineField[]) => { field: PipelineField; confidence: number } | null;
  calculateFieldMatchConfidence: (formField: FormField, pipelineField: PipelineField) => number;
  
  // State
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const usePipelineIntegration = (
  availablePipelines: Pipeline[],
  selectedPipeline: Pipeline | null,
  fieldMappings: FieldMapping[],
  formFields: FormField[],
  onPipelineSelect: (pipeline: Pipeline | null) => void,
  onFieldMappingsChange: (mappings: FieldMapping[]) => void
): PipelineIntegrationReturn => {

  const [loading, setLoading] = useState(false);

  const loadAvailablePipelines = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔄 Carregando pipelines disponíveis...');
      
      // Primeira tentativa: API backend
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE_URL}/api/pipelines/available`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });
        
        if (response.ok) {
          const pipelines = await response.json();
          console.log('✅ Pipelines carregadas via API:', pipelines);
          return pipelines || [];
        }
      } catch (apiError) {
        console.warn('❌ API não respondeu, tentando Supabase diretamente:', apiError);
      }
      
      // Fallback: Supabase direto
      const { data: pipelines, error } = await supabase
        .from('pipelines')
        .select(`
          id,
          name,
          description,
          is_active,
          created_at,
          pipeline_stages(
            id,
            name,
            order_index,
            is_default,
            color
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar pipelines via Supabase:', error);
        throw error;
      }

      // Formatar pipelines
      const formattedPipelines = pipelines?.map(pipeline => ({
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        is_active: pipeline.is_active,
        stages: pipeline.pipeline_stages?.map((stage: any) => ({
          id: stage.id,
          name: stage.name,
          order_index: stage.order_index,
          is_default: stage.is_default || false,
          color: stage.color
        }))?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
        fields: [] // Será carregado quando a pipeline for selecionada
      })) || [];

      return formattedPipelines;
      
    } catch (error) {
      console.error('❌ Erro geral ao carregar pipelines:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPipelineDetails = useCallback(async (pipelineId: string) => {
    setLoading(true);
    try {
      console.log('🔄 Carregando detalhes da pipeline:', pipelineId);
      
      // Primeira tentativa: API backend
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_BASE_URL}/api/pipelines/${pipelineId}/details`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (response.ok) {
          const pipeline = await response.json();
          console.log('✅ Detalhes da pipeline carregados via API:', pipeline);
          onPipelineSelect(pipeline);
          return pipeline;
        }
      } catch (apiError) {
        console.warn('❌ API não respondeu, tentando Supabase diretamente:', apiError);
      }
      
      // Fallback: Supabase direto
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .select(`
          id,
          name,
          description,
          is_active,
          pipeline_stages(
            id,
            name,
            order_index,
            is_default,
            color
          )
        `)
        .eq('id', pipelineId)
        .single();

      if (pipelineError) {
        throw pipelineError;
      }

      // Buscar campos customizados
      const { data: customFields, error: fieldsError } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('order_index');

      if (fieldsError) {
        console.warn('❌ Erro ao carregar campos customizados:', fieldsError);
      }

      // Montar pipeline completa
      const formattedPipeline: Pipeline = {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        is_active: pipeline.is_active,
        stages: pipeline.pipeline_stages?.map((stage: any) => ({
          id: stage.id,
          name: stage.name,
          order_index: stage.order_index,
          is_default: stage.is_default || false,
          color: stage.color
        }))?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
        fields: [
          // Campos padrão
          { name: 'name', label: 'Nome', type: 'text', is_required: true, is_custom: false },
          { name: 'email', label: 'E-mail', type: 'email', is_required: true, is_custom: false },
          { name: 'phone', label: 'Telefone', type: 'phone', is_required: false, is_custom: false },
          // Campos customizados
          ...(customFields?.map(field => ({
            name: field.field_name,
            label: field.field_label,
            type: field.field_type,
            is_required: field.is_required || false,
            is_custom: true,
            options: field.field_options
          })) || [])
        ]
      };

      onPipelineSelect(formattedPipeline);
      return formattedPipeline;

    } catch (error) {
      console.error('❌ Erro ao carregar detalhes da pipeline:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [onPipelineSelect]);

  const calculateFieldMatchConfidence = useCallback((formField: FormField, pipelineField: PipelineField): number => {
    let confidence = 0;
    
    // Correspondência exata de nome
    if (formField.field_name.toLowerCase() === pipelineField.name.toLowerCase()) {
      confidence += 40;
    }
    
    // Correspondência de label
    if (formField.field_label.toLowerCase() === pipelineField.label.toLowerCase()) {
      confidence += 30;
    }
    
    // Correspondência parcial de nome/label
    const formFieldWords = formField.field_label.toLowerCase().split(' ');
    const pipelineFieldWords = pipelineField.label.toLowerCase().split(' ');
    
    for (const word of formFieldWords) {
      if (pipelineFieldWords.some(pw => pw.includes(word) || word.includes(pw))) {
        confidence += 5;
      }
    }
    
    // Correspondência de tipo
    const typeMap: Record<string, string[]> = {
      'text': ['text', 'string'],
      'email': ['email'],
      'phone': ['phone', 'tel'],
      'number': ['number', 'integer', 'float'],
      'select': ['select', 'dropdown'],
      'radio': ['radio'],
      'checkbox': ['checkbox', 'boolean'],
      'textarea': ['textarea', 'longtext'],
      'date': ['date'],
      'url': ['url', 'link']
    };
    
    const formFieldTypes = typeMap[formField.field_type] || [formField.field_type];
    if (formFieldTypes.includes(pipelineField.type.toLowerCase())) {
      confidence += 20;
    }
    
    return Math.min(confidence, 100);
  }, []);

  const findBestFieldMatch = useCallback((formField: FormField, pipelineFields: PipelineField[]): { field: PipelineField; confidence: number } | null => {
    let bestMatch: { field: PipelineField; confidence: number } | null = null;
    
    for (const pipelineField of pipelineFields) {
      const confidence = calculateFieldMatchConfidence(formField, pipelineField);
      
      if (confidence > 30 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { field: pipelineField, confidence };
      }
    }
    
    return bestMatch;
  }, [calculateFieldMatchConfidence]);

  const autoMapFields = useCallback((pipelineFields: PipelineField[]) => {
    const newMappings: FieldMapping[] = [];
    
    formFields.forEach(formField => {
      const bestMatch = findBestFieldMatch(formField, pipelineFields);
      
      if (bestMatch && bestMatch.confidence >= 40) {
        newMappings.push({
          form_field_id: formField.id,
          pipeline_field_name: bestMatch.field.name,
          field_type: formField.field_type,
          confidence: bestMatch.confidence
        });
      }
    });
    
    onFieldMappingsChange(newMappings);
    console.log('🤖 Auto-mapeamento concluído:', newMappings);
  }, [formFields, findBestFieldMatch, onFieldMappingsChange]);

  const updateFieldMapping = useCallback((formFieldId: string, pipelineFieldName: string) => {
    const existingMappingIndex = fieldMappings.findIndex(m => m.form_field_id === formFieldId);
    const formField = formFields.find(f => f.id === formFieldId);
    
    if (!formField) return;
    
    const newMapping: FieldMapping = {
      form_field_id: formFieldId,
      pipeline_field_name: pipelineFieldName,
      field_type: formField.field_type,
      confidence: 100 // Manual mapping = 100% confidence
    };
    
    const updatedMappings = [...fieldMappings];
    
    if (existingMappingIndex >= 0) {
      updatedMappings[existingMappingIndex] = newMapping;
    } else {
      updatedMappings.push(newMapping);
    }
    
    onFieldMappingsChange(updatedMappings);
  }, [fieldMappings, formFields, onFieldMappingsChange]);

  const removeFieldMapping = useCallback((formFieldId: string) => {
    const updatedMappings = fieldMappings.filter(m => m.form_field_id !== formFieldId);
    onFieldMappingsChange(updatedMappings);
  }, [fieldMappings, onFieldMappingsChange]);

  const addFieldMapping = useCallback((formFieldId: string, pipelineFieldName: string) => {
    updateFieldMapping(formFieldId, pipelineFieldName);
  }, [updateFieldMapping]);

  const validateMappings = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!selectedPipeline) {
      errors.push('Nenhuma pipeline selecionada');
      return { isValid: false, errors };
    }
    
    // Verificar se campos obrigatórios estão mapeados
    const requiredPipelineFields = selectedPipeline.fields.filter(f => f.is_required);
    
    for (const requiredField of requiredPipelineFields) {
      const isMapped = fieldMappings.some(m => m.pipeline_field_name === requiredField.name);
      if (!isMapped) {
        errors.push(`Campo obrigatório '${requiredField.label}' não está mapeado`);
      }
    }
    
    // Verificar duplicações
    const mappedPipelineFields = fieldMappings.map(m => m.pipeline_field_name);
    const duplicates = mappedPipelineFields.filter((field, index) => 
      mappedPipelineFields.indexOf(field) !== index
    );
    
    if (duplicates.length > 0) {
      errors.push(`Campos duplicados no mapeamento: ${duplicates.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [selectedPipeline, fieldMappings]);

  return {
    loadAvailablePipelines,
    loadPipelineDetails,
    autoMapFields,
    updateFieldMapping,
    removeFieldMapping,
    addFieldMapping,
    validateMappings,
    findBestFieldMatch,
    calculateFieldMatchConfidence,
    loading,
    setLoading
  };
};

export const PipelineIntegration: React.FC<PipelineIntegrationProps> = ({
  availablePipelines,
  selectedPipeline,
  fieldMappings,
  formFields,
  onPipelineSelect,
  onFieldMappingsChange
}) => {
  const pipelineIntegration = usePipelineIntegration(
    availablePipelines,
    selectedPipeline,
    fieldMappings,
    formFields,
    onPipelineSelect,
    onFieldMappingsChange
  );

  const validation = pipelineIntegration.validateMappings();

  const handlePipelineChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pipelineId = e.target.value;
    if (pipelineId) {
      await pipelineIntegration.loadPipelineDetails(pipelineId);
    } else {
      onPipelineSelect(null);
    }
  };

  const handleAutoMap = () => {
    if (selectedPipeline) {
      pipelineIntegration.autoMapFields(selectedPipeline.fields);
    }
  };

  return (
    <div className="pipeline-integration space-y-6">
      {/* Seleção de Pipeline */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Conectar com Pipeline
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione uma Pipeline
            </label>
            <select
              value={selectedPipeline?.id || ''}
              onChange={handlePipelineChange}
              disabled={pipelineIntegration.loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Nenhuma pipeline selecionada</option>
              {availablePipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name} ({pipeline.stages.length} etapas)
                </option>
              ))}
            </select>
          </div>

          {pipelineIntegration.loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Carregando pipeline...</p>
            </div>
          )}

          {selectedPipeline && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-900">
                  {selectedPipeline.name}
                </h4>
                <button
                  onClick={handleAutoMap}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  Auto-mapear
                </button>
              </div>
              <p className="text-sm text-blue-700">
                {selectedPipeline.description || 'Sem descrição'}
              </p>
              <div className="text-xs text-blue-600 mt-2">
                {selectedPipeline.stages.length} etapas • {selectedPipeline.fields.length} campos
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mapeamento de Campos */}
      {selectedPipeline && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">
              Mapeamento de Campos
            </h4>
            <div className={`px-2 py-1 text-xs rounded-full ${
              validation.isValid 
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {validation.isValid ? 'Válido' : `${validation.errors.length} erro(s)`}
            </div>
          </div>

          {/* Erros de validação */}
          {!validation.isValid && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h5 className="text-sm font-medium text-red-800 mb-1">Erros encontrados:</h5>
              <ul className="text-sm text-red-600 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Lista de mapeamentos */}
          <div className="space-y-3">
            {formFields.map((formField) => {
              const mapping = fieldMappings.find(m => m.form_field_id === formField.id);
              
              return (
                <div key={formField.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {formField.field_label}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formField.field_type} {formField.is_required && '(Obrigatório)'}
                    </div>
                  </div>
                  
                  <div className="text-gray-400">→</div>
                  
                  <div className="flex-1">
                    <select
                      value={mapping?.pipeline_field_name || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          pipelineIntegration.updateFieldMapping(formField.id, e.target.value);
                        } else {
                          pipelineIntegration.removeFieldMapping(formField.id);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Não mapear</option>
                      {selectedPipeline.fields.map((pipelineField) => (
                        <option key={pipelineField.name} value={pipelineField.name}>
                          {pipelineField.label} {pipelineField.is_required && '(Obrigatório)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {mapping && (
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        mapping.confidence >= 80 ? 'bg-green-500' :
                        mapping.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} title={`Confiança: ${mapping.confidence}%`} />
                      <button
                        onClick={() => pipelineIntegration.removeFieldMapping(formField.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resumo */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{fieldMappings.length}</span> de <span className="font-medium">{formFields.length}</span> campos mapeados
            </div>
          </div>
        </div>
      )}

      {/* Informações sobre campos obrigatórios */}
      {selectedPipeline && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">ℹ️ Campos Obrigatórios da Pipeline</h5>
          <div className="text-sm text-gray-600">
            {selectedPipeline.fields.filter(f => f.is_required).map((field, index) => (
              <span key={field.name}>
                {index > 0 && ', '}
                <span className="font-medium">{field.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineIntegration; 