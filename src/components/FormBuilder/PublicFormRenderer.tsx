import React, { useState, useEffect, useRef } from 'react';
import { 
  Star, MessageSquare, Upload, Calendar, Clock, 
  Send, CheckCircle, AlertCircle, Target, TrendingUp, X,
  Mail, Phone, Hash, Globe, DollarSign, Building, MapPin, Flag, Shield
} from 'lucide-react';
import { Button } from '../ui/button';
import { ShimmerButton } from '../ui/shimmer-button';
import { BlurFade } from '../ui/blur-fade';
import { cn } from '../../lib/utils';

// ================================================================================
// FASE 5: OTIMIZAÇÃO COM COMPONENTES MODULARES E LAZY LOADING
// ================================================================================
import { 
  FormField, 
  ScoringRule, 
  PublicFormRendererProps,
  NotificationState,
  NotificationSettings,
  FieldType,
  ScoringCondition,
  FormDataWithDestination
} from '../../types/Forms';

// Imports modulares FASE 5.3 e 5.4
import FieldRenderer from './rendering/FieldRenderer';
import { SubmissionHandler } from './core/SubmissionHandler';

// ================================================================================
// INTERFACE REMOVIDA - AGORA USANDO TIPO UNIFICADO
// ================================================================================
// ✅ PublicFormRendererProps → src/types/Forms.ts

// 🆕 FUNÇÕES DE CAPTURA E PROCESSAMENTO DE UTMs
const captureUTMParameters = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    utm_source: urlParams.get('utm_source') || '',
    utm_medium: urlParams.get('utm_medium') || '',
    utm_campaign: urlParams.get('utm_campaign') || '',
    utm_content: urlParams.get('utm_content') || '',
    utm_term: urlParams.get('utm_term') || '',
    referrer: document.referrer || '',
    landing_page: window.location.href
  };
};

const processLeadOrigin = (formData: any, utmData: any) => {
  const trackingConfig = formData?.lead_tracking || {};
  
  if (!trackingConfig.enabled) {
    return {
      origem: 'Website',
      lead_source: 'website',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      source_type: 'default'
    };
  }

  switch (trackingConfig.leadSource) {
    case 'utm':
      // Mapear fonte UTM para nome amigável
      const sourceMappings = trackingConfig.utmTracking?.sourceMappings || {};
      const friendlySource = sourceMappings[utmData.utm_source?.toLowerCase()] || utmData.utm_source || 'Website';
      
      return {
        origem: friendlySource,
        lead_source: utmData.utm_source || 'website',
        utm_source: utmData.utm_source,
        utm_medium: utmData.utm_medium,
        utm_campaign: utmData.utm_campaign,
        utm_content: utmData.utm_content,
        utm_term: utmData.utm_term,
        source_type: 'utm_automatic',
        campaign_name: utmData.utm_campaign || 'Sem Campanha',
        traffic_source: friendlySource,
        referrer: utmData.referrer,
        landing_page: utmData.landing_page
      };
      
    case 'custom':
      return {
        origem: trackingConfig.customSourceName || 'Origem Personalizada',
        lead_source: trackingConfig.customSource || 'custom',
        utm_source: trackingConfig.customSource,
        utm_medium: trackingConfig.customMedium,
        utm_campaign: trackingConfig.customCampaign,
        source_type: 'custom_defined',
        campaign_name: trackingConfig.customSourceName,
        traffic_source: trackingConfig.customSourceName,
        referrer: utmData.referrer,
        landing_page: utmData.landing_page
      };
      
    case 'form':
      return {
        origem: formData.name || 'Formulário Web',
        lead_source: 'formulario-web',
        utm_source: 'website',
        utm_medium: 'form',
        utm_campaign: formData.slug || 'form-submission',
        source_type: 'form_based',
        campaign_name: formData.name,
        traffic_source: 'Website',
        referrer: utmData.referrer,
        landing_page: utmData.landing_page
      };
      
    default:
      return {
        origem: 'Website',
        lead_source: 'website',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        source_type: 'default'
      };
  }
};

// Funções de máscara
const applyMask = (value: string, type: string): string => {
  if (!value) return '';
  
  switch (type) {
    case 'phone':
      // Remove tudo que não é número
      const phoneNumbers = value.replace(/\D/g, '');
      
      // Aplica máscara (11) 99999-9999
      if (phoneNumbers.length <= 10) {
        return phoneNumbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      } else {
        return phoneNumbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
      }
      
    case 'currency':
      // Remove tudo que não é número
      const currencyNumbers = value.replace(/\D/g, '');
      
      // Converte para formato de moeda
      if (currencyNumbers.length === 0) return '';
      
      const numberValue = parseInt(currencyNumbers) / 100;
      return numberValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
    case 'number':
      // Permite apenas números e vírgula/ponto para decimais
      return value.replace(/[^\d.,]/g, '').replace(/,/g, '.');
      
    case 'email':
      // Remove espaços e converte para minúsculo
      return value.replace(/\s/g, '').toLowerCase();
      
    case 'url':
      // Remove espaços
      return value.replace(/\s/g, '');
      
    default:
      return value;
  }
};

const validateField = (value: string, type: string): boolean => {
  if (!value) return true; // Validação de obrigatório é feita separadamente
  
  switch (type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
      
    case 'phone':
      const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
      return phoneRegex.test(value);
      
    case 'url':
      try {
        new URL(value.startsWith('http') ? value : `https://${value}`);
        return true;
      } catch {
        return false;
      }
      
    default:
      return true;
  }
};

const PublicFormRenderer: React.FC<PublicFormRendererProps> = ({
  formId,
  formSlug,
  embedded = false
}) => {
  const [formData, setFormData] = useState<any>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [isMQL, setIsMQL] = useState(false);

  // Sistema de Notificações
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    show: boolean;
  }>({
    type: 'success',
    message: '',
    show: false
  });

  // Configurações de notificação (vindas do formulário)
  const [notificationSettings, setNotificationSettings] = useState({
    successMessage: 'Mensagem enviada com sucesso, aguarde até que nossos especialistas retornem.',
    errorMessage: 'E-mail já cadastrado, favor corrija o e-mail e tente novamente.',
    showNotifications: true,
    autoHide: true,
    hideDelay: 5000
  });

  const [submissionMessage, setSubmissionMessage] = useState('');

  useEffect(() => {
    // 🆕 Capturar UTMs na URL automaticamente
    const utmData = captureUTMParameters();
    setFormValues(prev => ({ ...prev, ...utmData }));
    
    loadForm();
  }, [formId, formSlug]);

  useEffect(() => {
    calculateScore();
  }, [formValues, scoringRules]);

  const loadForm = async () => {
    try {
      setLoading(true);
      // Aqui você faria a chamada para sua API
      // const response = await fetch(`/api/forms/public/${formSlug || formId}`);
      // const data = await response.json();
      
      // Mock data para demonstração
      const mockForm = {
        id: formId,
        name: 'Formulário de Contato',
        description: 'Entre em contato conosco e receba uma proposta personalizada',
        fields: [
          {
            id: '1',
            field_type: 'text' as const,
            field_name: 'nome',
            field_label: 'Nome Completo',
            placeholder: 'Digite seu nome completo',
            is_required: true,
            field_options: {},
            validation_rules: {},
            styling: {
              fontSize: '16px',
              padding: '12px',
              borderRadius: '8px',
              borderColor: '#d1d5db',
              backgroundColor: '#ffffff'
            },
            order_index: 0,
            scoring_weight: 10
          },
          {
            id: '2',
            field_type: 'email' as const,
            field_name: 'email',
            field_label: 'E-mail',
            placeholder: 'seu@email.com',
            is_required: true,
            field_options: {},
            validation_rules: {},
            styling: {
              fontSize: '16px',
              padding: '12px',
              borderRadius: '8px',
              borderColor: '#d1d5db',
              backgroundColor: '#ffffff'
            },
            order_index: 1,
            scoring_weight: 15
          },
          {
            id: '3',
            field_type: 'phone' as const,
            field_name: 'telefone',
            field_label: 'Telefone',
            placeholder: '(11) 99999-9999',
            is_required: false,
            field_options: {},
            validation_rules: {},
            styling: {
              fontSize: '16px',
              padding: '12px',
              borderRadius: '8px',
              borderColor: '#d1d5db',
              backgroundColor: '#ffffff'
            },
            order_index: 2,
            scoring_weight: 5
          },
          {
            id: '4',
            field_type: 'select' as const,
            field_name: 'interesse',
            field_label: 'Área de Interesse',
            is_required: true,
            field_options: {
              options: ['Vendas', 'Marketing', 'Suporte', 'Outros']
            },
            validation_rules: {},
            styling: {
              fontSize: '16px',
              padding: '12px',
              borderRadius: '8px',
              borderColor: '#d1d5db',
              backgroundColor: '#ffffff'
            },
            order_index: 3,
            scoring_weight: 20
          }
        ],
        scoring_rules: [
          {
            id: '1',
            field_id: '1',
            condition: 'not_empty' as const,
            value: '',
            points: 10,
            description: 'Nome preenchido'
          },
          {
            id: '2',
            field_id: '2',
            condition: 'not_empty' as const,
            value: '',
            points: 15,
            description: 'E-mail preenchido'
          },
          {
            id: '3',
            field_id: '4',
            condition: 'equals' as const,
            value: 'Vendas',
            points: 25,
            description: 'Interesse em Vendas'
          }
        ],
        scoring_threshold: 30
      };

      setFormData(mockForm);
      setFields(mockForm.fields);
      setScoringRules(mockForm.scoring_rules);
      setMaxScore(mockForm.scoring_rules.reduce((sum: number, rule: any) => sum + rule.points, 0));
    } catch (error) {
      console.error('Erro ao carregar formulário:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = () => {
    let score = 0;
    
    scoringRules.forEach(rule => {
      const fieldValue = formValues[rule.field_id];
      let ruleMatches = false;

      switch (rule.condition) {
        case 'not_empty':
          ruleMatches = fieldValue && fieldValue.toString().trim() !== '';
          break;
        case 'equals':
          ruleMatches = fieldValue === rule.value;
          break;
        case 'contains':
          ruleMatches = fieldValue && fieldValue.toString().toLowerCase().includes(rule.value.toLowerCase());
          break;
        case 'greater_than':
          ruleMatches = parseFloat(fieldValue) > parseFloat(rule.value);
          break;
        case 'less_than':
          ruleMatches = parseFloat(fieldValue) < parseFloat(rule.value);
          break;
      }

      if (ruleMatches) {
        score += rule.points;
      }
    });

    setCurrentScore(score);
    setIsMQL(score >= (formData?.scoring_threshold || 30));
  };

  const showNotification = (type: 'success' | 'error', message?: string) => {
    if (!notificationSettings.showNotifications) return;
    
    const notificationMessage = message || (type === 'success' ? notificationSettings.successMessage : notificationSettings.errorMessage);
    
    setNotification({
      type,
      message: notificationMessage,
      show: true
    });

    if (notificationSettings.autoHide) {
      setTimeout(() => {
        hideNotification();
      }, notificationSettings.hideDelay);
    }
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  const handleInputChange = (fieldId: string, value: any) => {
    // Encontrar o campo para aplicar máscara
    const field = fields.find(f => f.id === fieldId);
    let maskedValue = value;
    
    if (field && typeof value === 'string') {
      maskedValue = applyMask(value, field.field_type);
    }
    
    setFormValues(prev => ({
      ...prev,
      [fieldId]: maskedValue
    }));

    // Limpar erro do campo
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      if (field.is_required) {
        const value = formValues[field.id];
        if (!value || value.toString().trim() === '') {
          newErrors[field.id] = `${field.field_label} é obrigatório`;
        }
      }

      // Validação de e-mail
      if (field.field_type === 'email' && formValues[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formValues[field.id])) {
          newErrors[field.id] = 'E-mail inválido';
        }
      }

      // Validação de telefone
      if (field.field_type === 'phone' && formValues[field.id]) {
        const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
        if (!phoneRegex.test(formValues[field.id])) {
          newErrors[field.id] = 'Telefone inválido. Use o formato (11) 99999-9999';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setSubmissionMessage('');

    try {
      console.log('📋 Iniciando submissão do formulário...');
      
      // 🆕 Capturar UTMs atuais e processar origem
      const utmData = captureUTMParameters();
      const originData = processLeadOrigin(formData, utmData);
      
      console.log('🎯 Dados de origem processados:', originData);
      
      // Preparar dados da submissão com origem
      const submissionData = {
        form_id: formId,
        form_data: { ...formValues, ...originData },
        tenant_id: formData.tenant_id,
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent,
        submitted_at: new Date().toISOString(),
        referrer: document.referrer,
        landing_page: window.location.href
      };

      console.log('📊 Dados da submissão com origem:', submissionData);

      // Verificar se há configuração de destino
      const formDataWithDestination = formData as FormDataWithDestination;
      const destinationConfig = formDataWithDestination.destination_config;
      console.log('🎯 Configuração de destino:', destinationConfig);

      let submitEndpoint = '/api/forms/submit';
      let submissionPayload: any = submissionData;

      // Determinar endpoint e payload baseado na configuração de destino
      if (destinationConfig?.type === 'leads-menu') {
        console.log('👥 Criando lead no menu de leads...');
        submitEndpoint = '/api/forms/create-simple-lead';
        submissionPayload = {
          ...submissionData,
          destination_config: destinationConfig
        };
      } else if (formData.pipeline_connection?.enabled) {
        console.log('🔄 Criando oportunidade na pipeline...');
        submitEndpoint = '/api/pipelines/create-lead-from-form';
        submissionPayload = {
          ...submissionData,
          pipeline_id: formData.pipeline_connection.pipeline_id,
          stage_id: formData.pipeline_connection.stage_id,
          field_mappings: formData.pipeline_connection.field_mappings || {},
          score_stage_mapping: formData.pipeline_connection.score_stage_mapping || {},
          use_score_for_stage: formData.pipeline_connection.use_score_for_stage || false,
          auto_assign: formData.pipeline_connection.auto_assign || false,
          create_task: formData.pipeline_connection.create_task || false,
          task_description: formData.pipeline_connection.task_description || '',
          task_due_days: formData.pipeline_connection.task_due_days || 1
        };
      }

      console.log(`🚀 Enviando para: ${submitEndpoint}`);

      const API_BASE_URL = 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}${submitEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload)
      });

      const result = await response.json();
      console.log('📨 Resposta do servidor:', result);

      if (!response.ok) {
        throw new Error(result.error || `Erro HTTP: ${response.status}`);
      }

      // Mostrar mensagem de sucesso baseada na origem
      let successMessage = 'Formulário enviado com sucesso!';
      
      if (destinationConfig?.type === 'leads-menu') {
        successMessage = `✅ Seus dados foram recebidos via ${originData.origem} e serão analisados pela nossa equipe.`;
        if (result.assigned_to) {
          successMessage += ' Um membro da equipe entrará em contato em breve.';
        }
      } else if (formData.pipeline_connection?.enabled) {
        successMessage = `✅ Sua oportunidade de ${originData.origem} foi criada e está sendo processada.`;
        if (result.stage_name) {
          successMessage += ` Status: ${result.stage_name}`;
        }
      }

      setSubmissionMessage(successMessage);
      showNotification('success', successMessage);

      console.log('🎉 Formulário enviado com sucesso! Origem:', originData.origem);

      // Reset do formulário após sucesso
      setTimeout(() => {
        setFormValues({});
        setSubmissionMessage('');
      }, 3000);

    } catch (error) {
      console.error('❌ Erro ao enviar formulário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar formulário';
      setSubmissionMessage(errorMessage);
      showNotification('error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Função auxiliar para obter IP do cliente
  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('Não foi possível obter IP do cliente:', error);
      return 'unknown';
    }
  };

  // Função auxiliar para formatar número de telefone
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const renderField = (field: FormField) => {
    const fieldValue = formValues[field.id] || '';
    const hasError = !!errors[field.id];

    const baseInputStyle = {
      fontSize: field.styling?.fontSize || '16px',
      padding: field.styling?.padding || '12px',
      borderRadius: field.styling?.borderRadius || '8px',
      borderColor: hasError ? '#ef4444' : (field.styling?.borderColor || '#d1d5db'),
      backgroundColor: field.styling?.backgroundColor || '#ffffff',
    };

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={fieldValue}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            style={baseInputStyle}
            className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-500' : ''
            }`}
            required={field.is_required}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={fieldValue}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            style={baseInputStyle}
            className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-500' : ''
            }`}
            required={field.is_required}
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            value={fieldValue}
            onChange={(e) => handleInputChange(field.id, formatPhoneNumber(e.target.value))}
            placeholder={field.placeholder}
            style={baseInputStyle}
            className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-500' : ''
            }`}
            required={field.is_required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={fieldValue}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            style={baseInputStyle}
            className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
              hasError ? 'border-red-500' : ''
            }`}
            rows={4}
            required={field.is_required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={fieldValue}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            style={baseInputStyle}
            className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-500' : ''
            }`}
            required={field.is_required}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={fieldValue}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            style={baseInputStyle}
            className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-500' : ''
            }`}
            required={field.is_required}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            value={fieldValue}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            style={baseInputStyle}
            className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-500' : ''
            }`}
            required={field.is_required}
          />
        );

      case 'url':
        return (
          <input
            type="url"
            value={fieldValue}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            style={baseInputStyle}
            className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-500' : ''
            }`}
            required={field.is_required}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
              R$
            </span>
            <input
              type="text"
              value={fieldValue}
              onChange={(e) => {
                // Formatação de moeda
                let value = e.target.value.replace(/\D/g, '');
                value = (parseFloat(value) / 100).toFixed(2);
                value = value.replace('.', ',');
                value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                handleInputChange(field.id, value);
              }}
              placeholder="0,00"
              style={{
                ...baseInputStyle,
                paddingLeft: '2.5rem',
              }}
              className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                hasError ? 'border-red-500' : ''
              }`}
              required={field.is_required}
            />
          </div>
        );

      case 'file':
        return (
          <div
            style={{
              borderRadius: field.styling?.borderRadius || '8px',
              borderColor: hasError ? '#ef4444' : (field.styling?.borderColor || '#d1d5db'),
              backgroundColor: field.styling?.backgroundColor || '#ffffff',
            }}
            className={`w-full border-2 border-dashed transition-all duration-200 hover:border-blue-400 hover:bg-blue-50 ${
              hasError ? 'border-red-500' : ''
            }`}
          >
            <label className="flex flex-col items-center justify-center py-6 cursor-pointer">
              <Upload size={32} className="text-gray-400 mb-2" />
              <span className="text-sm text-gray-600 font-medium">
                {fieldValue ? 'Arquivo selecionado' : 'Clique para enviar arquivo'}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {field.field_options?.accept || 'Todos os tipos'} • 
                Max: {field.field_options?.max_size || '10MB'}
              </span>
              <input
                type="file"
                className="hidden"
                accept={field.field_options?.accept}
                multiple={field.field_options?.multiple}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleInputChange(field.id, field.field_options?.multiple ? Array.from(files) : files[0]);
                  }
                }}
                required={field.is_required}
              />
            </label>
          </div>
        );

      case 'range':
        return (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{field.field_options?.min || 0}</span>
              <span className="font-medium text-blue-600">
                {fieldValue || Math.round(((field.field_options?.max || 100) + (field.field_options?.min || 0)) / 2)}
              </span>
              <span>{field.field_options?.max || 100}</span>
            </div>
            <input
              type="range"
              min={field.field_options?.min || 0}
              max={field.field_options?.max || 100}
              step={field.field_options?.step || 1}
              value={fieldValue || Math.round(((field.field_options?.max || 100) + (field.field_options?.min || 0)) / 2)}
              onChange={(e) => handleInputChange(field.id, parseInt(e.target.value))}
              style={{
                accentColor: field.styling?.borderColor || '#3b82f6',
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              required={field.is_required}
            />
          </div>
        );

      case 'select':
        return (
          <select
            value={fieldValue}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            style={baseInputStyle}
            className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              hasError ? 'border-red-500' : ''
            }`}
            required={field.is_required}
          >
            <option value="">Selecione uma opção</option>
            {field.field_options.options?.map((option: string, idx: number) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-3">
            {field.field_options.options?.map((option: string, idx: number) => (
              <label key={idx} className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name={field.field_name}
                  value={option}
                  checked={fieldValue === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                  required={field.is_required}
                />
                <span 
                  className="ml-3 text-gray-700 group-hover:text-gray-900 transition-colors"
                  style={{ fontSize: field.styling?.fontSize || '14px' }}
                >
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-3">
            {field.field_options.options?.map((option: string, idx: number) => (
              <label key={idx} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  value={option}
                  checked={(fieldValue || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = fieldValue || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter((v: string) => v !== option);
                    handleInputChange(field.id, newValues);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span 
                  className="ml-3 text-gray-700 group-hover:text-gray-900 transition-colors"
                  style={{ fontSize: field.styling?.fontSize || '14px' }}
                >
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      case 'rating':
        return (
          <div className="flex space-x-1">
            {Array.from({ length: field.field_options.max_rating || 5 }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInputChange(field.id, idx + 1)}
                className="transition-colors hover:scale-110 transform duration-200"
              >
                <Star 
                  size={28} 
                  className={`cursor-pointer transition-colors ${
                    (fieldValue || 0) > idx ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'
                  }`}
                  fill={(fieldValue || 0) > idx ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>
        );

      case 'city':
        return (
          <div className="relative">
            <input
              type="text"
              value={fieldValue}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder || 'São Paulo'}
              list={`cities-${field.id}`}
              style={baseInputStyle}
              className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                hasError ? 'border-red-500' : ''
              }`}
              required={field.is_required}
            />
            <Building className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <datalist id={`cities-${field.id}`}>
              {field.field_options?.suggestions?.map((city: string, idx: number) => (
                <option key={idx} value={city} />
              ))}
            </datalist>
          </div>
        );

      case 'state':
        return (
          <div className="relative">
            <select
              value={fieldValue}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={baseInputStyle}
              className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ${
                hasError ? 'border-red-500' : ''
              }`}
              required={field.is_required}
            >
              <option value="">Selecione um estado...</option>
              {field.field_options?.options?.map((state: string, idx: number) => (
                <option key={idx} value={state}>{state}</option>
              ))}
            </select>
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        );

      case 'country':
        return (
          <div className="relative">
            <select
              value={fieldValue}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={baseInputStyle}
              className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ${
                hasError ? 'border-red-500' : ''
              }`}
              required={field.is_required}
            >
              <option value="">Selecione um país...</option>
              {field.field_options?.options?.map((country: string, idx: number) => (
                <option key={idx} value={country}>{country}</option>
              ))}
            </select>
            <Flag className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        );

      case 'captcha':
        return (
          <div className="space-y-3">
            <div className="bg-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300">
              <div className="flex items-center justify-center space-x-2">
                <Shield className="text-blue-600" size={24} />
                <span className="text-lg font-mono font-bold text-gray-800">
                  {(() => {
                    const num1 = Math.floor(Math.random() * 10) + 1;
                    const num2 = Math.floor(Math.random() * 10) + 1;
                    return `${num1} + ${num2} = ?`;
                  })()}
                </span>
              </div>
            </div>
            <input
              type="text"
              value={fieldValue}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder="Digite o resultado..."
              style={baseInputStyle}
              className={`w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                hasError ? 'border-red-500' : ''
              }`}
              required={field.is_required}
            />
          </div>
        );

      // 🚀 OTIMIZAÇÃO: Cases duplicados removidos - mantendo apenas os cases originais

      case 'submit':
        return (
          <button
            type="button"
            style={{
              fontSize: field.styling?.fontSize || '16px',
              padding: field.styling?.padding || '12px 24px',
              borderRadius: field.styling?.borderRadius || '8px',
              backgroundColor: field.field_options?.background_color || '#3b82f6',
              color: field.field_options?.text_color || '#ffffff',
            }}
            className="flex items-center justify-center w-full font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Send className="mr-3" size={20} />
            <span>{field.field_options?.button_text || 'Enviar Formulário'}</span>
          </button>
        );

      case 'whatsapp':
        return (
          <ShimmerButton
            onClick={async (e) => {
              // Primeiro, submete o formulário
              await handleSubmit(e);
              
              // Depois, abre o WhatsApp
              const number = field.field_options?.number || '';
              const message = field.field_options?.message || 'Olá! Gostaria de mais informações.';
              const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
              window.open(whatsappUrl, '_blank');
            }}
            background={field.field_options?.background_color || '#25d366'}
            shimmerColor="#ffffff"
            className="w-full font-medium"
            style={{
              fontSize: field.styling?.fontSize || '16px',
              padding: field.styling?.padding || '12px 24px',
              borderRadius: field.styling?.borderRadius || '8px',
              color: field.field_options?.text_color || '#ffffff',
            }}
          >
            <div className="flex items-center justify-center">
              <MessageSquare className="mr-3" size={20} />
              <span>{field.field_options?.button_text || 'Enviar via WhatsApp'}</span>
              <div className="ml-3 w-2 h-2 bg-white bg-opacity-30 rounded-full animate-pulse"></div>
            </div>
          </ShimmerButton>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Formulário Enviado!</h2>
            <p className="text-gray-600">
              {submissionMessage}
            </p>
          </div>

          {/* Lead Score */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Target className="text-blue-600" size={20} />
              <span className="text-sm font-medium text-gray-700">Pontuação do Lead</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-1">{currentScore} pontos</div>
            <div className="text-sm text-gray-600">
              {isMQL ? (
                <span className="inline-flex items-center space-x-1 text-green-600">
                  <TrendingUp size={14} />
                  <span>Lead Qualificado (MQL)</span>
                </span>
              ) : (
                <span className="text-gray-500">Lead em Qualificação</span>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Você pode fechar esta janela.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${!embedded ? 'p-4' : ''}`}>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <h1 className="text-2xl font-bold mb-2">{formData?.name}</h1>
            {formData?.description && (
              <p className="text-blue-100">{formData.description}</p>
            )}
          </div>

          {/* Lead Score Indicator */}
          {maxScore > 0 && (
            <div className="bg-yellow-50 border-b border-yellow-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="text-yellow-600" size={20} />
                  <span className="text-sm font-medium text-gray-700">Pontuação do Lead</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-600">{currentScore}/{maxScore}</div>
                  <div className="text-xs text-gray-500">
                    {isMQL ? 'MQL Qualificado' : 'Em Qualificação'}
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isMQL ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min((currentScore / maxScore) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {fields
                .filter(field => !['submit', 'whatsapp'].includes(field.field_type))
                .map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.field_label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                    {field.scoring_weight && field.scoring_weight > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Star size={10} className="mr-1" />
                        +{field.scoring_weight}pts
                      </span>
                    )}
                  </label>
                  {field.field_description && (
                    <p className="text-sm text-gray-500 mb-2">{field.field_description}</p>
                  )}
                  
                  <FieldRenderer
                    field={field}
                    value={formValues[field.id]}
                    error={errors[field.id]}
                    onChange={handleInputChange}
                  />
                  
                  {errors[field.id] && (
                    <div className="mt-1 flex items-center space-x-1 text-red-600">
                      <AlertCircle size={14} />
                      <span className="text-sm">{errors[field.id]}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Botões de ação */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              {(() => {
                const submitField = fields.find(field => field.field_type === 'submit');
                const whatsappField = fields.find(field => field.field_type === 'whatsapp');
                
                if (submitField && whatsappField) {
                  // Layout 50/50 quando tem ambos os botões
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Botão de Submit */}
                      <Button
                        type="submit"
                        disabled={submitting}
                        className={cn(
                          "h-12 font-medium transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl",
                          submitting && "opacity-50 cursor-not-allowed"
                        )}
                        style={{
                          backgroundColor: submitField.field_options?.background_color || '#3b82f6',
                          color: submitField.field_options?.text_color || '#ffffff',
                        }}
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Send className="mr-2" size={18} />
                            {submitField.field_options?.button_text || 'Enviar Formulário'}
                          </>
                        )}
                      </Button>
                      
                      {/* Botão WhatsApp */}
                      <ShimmerButton
                        disabled={submitting}
                        onClick={async (e) => {
                          // Primeiro, submete o formulário
                          await handleSubmit(e);
                          
                          // Depois, abre o WhatsApp
                          const number = whatsappField.field_options?.number || '';
                          const message = whatsappField.field_options?.message || 'Olá! Gostaria de mais informações.';
                          const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
                          window.open(whatsappUrl, '_blank');
                        }}
                        background={whatsappField.field_options?.background_color || '#25d366'}
                        shimmerColor="#ffffff"
                        className={cn(
                          "h-12 font-medium",
                          submitting && "opacity-50 cursor-not-allowed"
                        )}
                        style={{
                          color: whatsappField.field_options?.text_color || '#ffffff',
                        }}
                      >
                        <div className="flex items-center justify-center">
                          {submitting ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <MessageSquare className="mr-2" size={18} />
                              {whatsappField.field_options?.button_text || 'Enviar via WhatsApp'}
                              <div className="ml-2 w-2 h-2 bg-white bg-opacity-30 rounded-full animate-pulse"></div>
                            </>
                          )}
                        </div>
                      </ShimmerButton>
                    </div>
                  );
                } else if (submitField) {
                  // Apenas botão de Submit
                  return (
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        backgroundColor: submitField.field_options?.background_color || '#3b82f6',
                        color: submitField.field_options?.text_color || '#ffffff',
                      }}
                      className="w-full flex items-center justify-center py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="mr-2" size={18} />
                          {submitField.field_options?.button_text || 'Enviar Formulário'}
                        </>
                      )}
                    </button>
                  );
                } else if (whatsappField) {
                  // Apenas botão WhatsApp
                  return (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={async (e) => {
                        // Primeiro, submete o formulário
                        await handleSubmit(e);
                        
                        // Depois, abre o WhatsApp
                        const number = whatsappField.field_options?.number || '';
                        const message = whatsappField.field_options?.message || 'Olá! Gostaria de mais informações.';
                        const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                      style={{
                        backgroundColor: whatsappField.field_options?.background_color || '#25d366',
                        color: whatsappField.field_options?.text_color || '#ffffff',
                      }}
                      className="w-full flex items-center justify-center py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="mr-2" size={18} />
                          {whatsappField.field_options?.button_text || 'Enviar via WhatsApp'}
                          <div className="ml-2 w-2 h-2 bg-white bg-opacity-30 rounded-full animate-pulse"></div>
                        </>
                      )}
                    </button>
                  );
                } else {
                  // Botão padrão se nenhum campo de botão foi inserido
                  return (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          <span>Enviar Formulário</span>
                        </>
                      )}
                    </button>
                  );
                }
              })()}
            </div>
          </form>
        </div>
      </div>

      {/* Sistema de Notificações */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div
            className={`p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 transform ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-400 text-green-800'
                : 'bg-red-50 border-red-400 text-red-800'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-red-400 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">
                  {notification.type === 'success' ? 'Sucesso!' : 'Erro!'}
                </p>
                <p className="text-sm mt-1">
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={hideNotification}
                  className={`inline-flex ${
                    notification.type === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'
                  } transition-colors`}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicFormRenderer; 