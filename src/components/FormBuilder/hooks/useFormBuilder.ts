// FASE 3.7: Hook Principal - Lógica consolidada do ModernFormBuilder
// Extrai toda a lógica de estado e operações principais

import { useState, useCallback, useEffect } from 'react';
import { FormField, CustomForm, ScoringRule, FormStyling } from '../../../types/Forms';

export interface UseFormBuilderOptions {
  formId?: string;
  onSave?: (formData: CustomForm) => void;
}

export interface UseFormBuilderReturn {
  // Estado principal
  formData: CustomForm;
  fields: FormField[];
  selectedField: FormField | null;
  formStyle: FormStyling;
  scoringRules: ScoringRule[];
  
  // Controles
  saving: boolean;
  notification: { type: 'success' | 'error'; message: string } | null;
  
  // Ações principais
  setFormData: (data: Partial<CustomForm>) => void;
  setFields: (fields: FormField[]) => void;
  setSelectedField: (field: FormField | null) => void;
  updateFormStyle: (style: Partial<FormStyling>) => void;
  
  // Operações de campos
  addField: (fieldType: string) => void;
  removeField: (fieldId: string) => void;
  duplicateField: (fieldId: string) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  
  // Operações de scoring
  addScoringRule: () => void;
  updateScoringRule: (ruleId: string, updates: Partial<ScoringRule>) => void;
  removeScoringRule: (ruleId: string) => void;
  
  // Ações
  handleSave: () => Promise<void>;
  showNotification: (type: 'success' | 'error', message: string) => void;
  hideNotification: () => void;
}

export const useFormBuilder = (options: UseFormBuilderOptions = {}): UseFormBuilderReturn => {
  // Estado principal
  const [formData, setFormDataState] = useState<CustomForm>({
    id: '',
    name: '',
    description: '',
    slug: '',
    is_active: true,
    settings: {
      show_progress: false,
      allow_draft: false,
      max_submissions: 1000,
      collect_utm: true,
      lead_tracking: {
        enabled: true,
        customSource: '',
        customSourceName: '',
        customCampaign: '',
        customMedium: '',
        utmTracking: {
          enabled: true,
          autoDetect: true,
          sourceMappings: {}
        },
        leadSource: 'form',
        showInPipeline: true,
        trackConversions: true,
        formIdentifier: ''
      },
      notification_settings: {
        successMessage: 'Formulário enviado com sucesso!',
        errorMessage: 'Erro ao enviar formulário. Tente novamente.',
        showNotifications: true,
        autoHide: true,
        hideDelay: 3000,
        successBackgroundColor: '#10b981',
        successTextColor: '#ffffff',
        errorBackgroundColor: '#ef4444',
        errorTextColor: '#ffffff'
      },
      email_notifications: {
        enabled: false,
        recipients: [],
        subject: 'Novo formulário submetido',
        template: 'default',
        sendOnSubmit: true,
        sendOnWhatsApp: false,
        includeLeadData: true,
        includeMQLScore: false
      }
    },
    styling: {},
    qualification_rules: {
      mql_threshold: 0,
      scoring_threshold: 0
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tenant_id: ''
  });

  const [fields, setFieldsState] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [formStyle, setFormStyle] = useState<FormStyling>({
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: true,
    borderWidth: '1px',
    borderColor: '#e5e7eb',
    shadow: true,
    padding: '32px',
    title: '',
    titleColor: '#111827',
    titleSize: '24px',
    titleWeight: 'bold',
    titleAlign: 'left'
  });
  
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Gerar ID único
  const generateId = useCallback(() => Math.random().toString(36).substr(2, 9), []);

  // Atualizar form data
  const setFormData = useCallback((data: Partial<CustomForm>) => {
    setFormDataState(prev => ({ ...prev, ...data }));
  }, []);

  // Atualizar fields
  const setFields = useCallback((newFields: FormField[]) => {
    setFieldsState(newFields);
    // Fields são gerenciados separadamente, não fazem parte de CustomForm
  }, []);

  // Atualizar estilo
  const updateFormStyle = useCallback((style: Partial<FormStyling>) => {
    setFormStyle(prev => ({ ...prev, ...style }));
  }, []);

  // Adicionar campo
  const addField = useCallback((fieldType: string) => {
    const newField: FormField = {
      id: generateId(),
      field_type: fieldType as any,
      field_name: `${fieldType}_${Date.now()}`,
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

    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    setSelectedField(newField);
  }, [fields, generateId, setFields]);

  // Remover campo
  const removeField = useCallback((fieldId: string) => {
    const updatedFields = fields.filter(f => f.id !== fieldId);
    setFields(updatedFields);
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  }, [fields, selectedField, setFields]);

  // Duplicar campo
  const duplicateField = useCallback((fieldId: string) => {
    const fieldToDuplicate = fields.find(f => f.id === fieldId);
    if (!fieldToDuplicate) return;

    const duplicatedField: FormField = {
      ...fieldToDuplicate,
      id: generateId(),
      field_name: `${fieldToDuplicate.field_name}_copy`,
      field_label: `${fieldToDuplicate.field_label} (Cópia)`,
      order_index: fields.length
    };

    const updatedFields = [...fields, duplicatedField];
    setFields(updatedFields);
    setSelectedField(duplicatedField);
  }, [fields, generateId, setFields]);

  // Atualizar campo
  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    const updatedFields = fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );
    setFields(updatedFields);
    
    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
  }, [fields, selectedField, setFields]);

  // Adicionar regra de scoring
  const addScoringRule = useCallback(() => {
    const newRule: ScoringRule = {
      id: generateId(),
      field_id: '',
      condition: 'equals' as any,
      value: '',
      points: 0,
      description: ''
    };
    setScoringRules(prev => [...prev, newRule]);
  }, [generateId]);

  // Atualizar regra de scoring
  const updateScoringRule = useCallback((ruleId: string, updates: Partial<ScoringRule>) => {
    setScoringRules(prev =>
      prev.map(rule => rule.id === ruleId ? { ...rule, ...updates } : rule)
    );
  }, []);

  // Remover regra de scoring
  const removeScoringRule = useCallback((ruleId: string) => {
    setScoringRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  // Salvar formulário
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const formToSave = {
        ...formData,
        fields,
        styling: formStyle,
        scoring_rules: scoringRules
      };

      if (options.onSave) {
        await options.onSave(formToSave);
      }

      showNotification('success', 'Formulário salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showNotification('error', 'Erro ao salvar formulário');
    } finally {
      setSaving(false);
    }
  }, [formData, fields, formStyle, scoringRules, options]);

  // Mostrar notificação
  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Esconder notificação
  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Carregar formulário se ID fornecido
  useEffect(() => {
    if (options.formId) {
      // Aqui carregaria os dados do formulário existente
      // Por ora, mantemos o estado inicial
    }
  }, [options.formId]);

  return {
    // Estado
    formData,
    fields,
    selectedField,
    formStyle,
    scoringRules,
    saving,
    notification,
    
    // Setters
    setFormData,
    setFields,
    setSelectedField,
    updateFormStyle,
    
    // Operações
    addField,
    removeField,
    duplicateField,
    updateField,
    addScoringRule,
    updateScoringRule,
    removeScoringRule,
    
    // Ações
    handleSave,
    showNotification,
    hideNotification
  };
}; 