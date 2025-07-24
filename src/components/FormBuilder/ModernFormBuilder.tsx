import React, { useState, useRef, useEffect, memo, useMemo, useCallback, Suspense, lazy } from 'react';

// ================================================================================
// FASE 3.7: INTEGRAÇÃO DE UTILIDADES CENTRALIZADAS E HOOKS CUSTOMIZADOS
// ================================================================================
import { applyMask, validateFieldValue, getDefaultPlaceholder, getDefaultOptions } from './utils/FormValidation';
import { usePipelineConnection } from './hooks/usePipelineConnection';
import { useFieldMapping } from './hooks/useFieldMapping';
import { useArrayState } from '../../hooks/useArrayState';
import { useAsyncState } from '../../hooks/useAsyncState';

// ================================================================================
// FASE 3.5.3 - INTEGRAÇÃO TYPES E LAZY LOADING DO FORMPREVIEW MODULAR
// ================================================================================
import { 
  FormField, ScoringRule, PipelineField, Pipeline, PipelineStage,
  FieldMapping, ModernFormBuilderProps, PreviewMode, ActivePanel 
} from '../../types/Forms';
const FormPreview = lazy(() => import('./rendering/FormPreview'));

// ================================================================================
// INTEGRAÇÃO COM BIBLIOTECAS E COMPONENTES
// ================================================================================
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { 
  Send, MessageSquare, Type, Mail, Phone, FileText, Hash, Calendar, 
  Clock, List, RadioIcon, CheckSquare, Star, Upload, Sliders, Shield, 
  DollarSign, Building, MapPin, Flag, Globe, Palette, Settings, 
  Share, AlertCircle, Target, TrendingUp, Link, Copy, Check, 
  Edit, Trash2, Plus, X, Eye, Smartphone, Tablet, Monitor,
  ChevronDown, ChevronUp, RotateCcw, Save, ArrowLeft,
  RefreshCw, HelpCircle, Lightbulb, Crown, Gift, Zap,
  GitBranch, Square, Bell, ExternalLink, Code, Info, Users
} from 'lucide-react';

// ================================================================================
// DEFINIÇÕES DE CONSTANTES E TIPOS DE CAMPO
// ================================================================================
const FIELD_TYPES = [
  { type: 'text', label: 'Texto', icon: Type, description: 'Campo de texto simples', color: 'bg-blue-100 text-blue-600' },
  { type: 'email', label: 'E-mail', icon: Mail, description: 'Campo de e-mail', color: 'bg-green-100 text-green-600' },
  { type: 'phone', label: 'Telefone', icon: Phone, description: 'Campo de telefone', color: 'bg-purple-100 text-purple-600' },
  { type: 'textarea', label: 'Texto Longo', icon: FileText, description: 'Área de texto', color: 'bg-yellow-100 text-yellow-600' },
  { type: 'number', label: 'Número', icon: Hash, description: 'Campo numérico', color: 'bg-indigo-100 text-indigo-600' },
  { type: 'date', label: 'Data', icon: Calendar, description: 'Seletor de data', color: 'bg-red-100 text-red-600' },
  { type: 'time', label: 'Hora', icon: Clock, description: 'Seletor de hora', color: 'bg-orange-100 text-orange-600' },
  { type: 'url', label: 'URL', icon: Globe, description: 'Campo de URL/Link', color: 'bg-cyan-100 text-cyan-600' },
  { type: 'currency', label: 'Moeda', icon: DollarSign, description: 'Campo monetário', color: 'bg-emerald-100 text-emerald-600' },
  { type: 'city', label: 'Cidade', icon: Building, description: 'Campo de cidade', color: 'bg-blue-100 text-blue-600' },
  { type: 'state', label: 'Estado', icon: MapPin, description: 'Campo de estado/província', color: 'bg-green-100 text-green-600' },
  { type: 'country', label: 'País', icon: Flag, description: 'Campo de país', color: 'bg-red-100 text-red-600' },
  { type: 'captcha', label: 'Captcha', icon: Shield, description: 'Verificação de segurança', color: 'bg-gray-100 text-gray-600' },
  { type: 'select', label: 'Lista Suspensa', icon: List, description: 'Menu dropdown', color: 'bg-pink-100 text-pink-600' },
  { type: 'radio', label: 'Múltipla Escolha', icon: RadioIcon, description: 'Botões de rádio', color: 'bg-violet-100 text-violet-600' },
  { type: 'checkbox', label: 'Caixas de Seleção', icon: CheckSquare, description: 'Múltiplas opções', color: 'bg-teal-100 text-teal-600' },
  { type: 'range', label: 'Slider', icon: Sliders, description: 'Controle deslizante', color: 'bg-amber-100 text-amber-600' },
  { type: 'rating', label: 'Avaliação', icon: Star, description: 'Sistema de estrelas', color: 'bg-yellow-100 text-yellow-600' },
  { type: 'file', label: 'Upload de Arquivo', icon: Upload, description: 'Envio de arquivos', color: 'bg-gray-100 text-gray-600' },
  { type: 'submit', label: 'Botão Enviar', icon: Send, description: 'Botão de envio do formulário', color: 'bg-blue-100 text-blue-600' },
  { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, description: 'Botão WhatsApp', color: 'bg-green-100 text-green-600' },
];

// ================================================================================
// FASE 3.7: CÓDIGO DUPLICADO REMOVIDO - USANDO VERSÕES CENTRALIZADAS
// ================================================================================
// Removidas funções duplicadas: applyMask, validateField
// Agora usando versões centralizadas de utils/FormValidation.ts

// 🚀 OTIMIZAÇÃO: Memoização do componente principal para evitar re-renders desnecessários
const ModernFormBuilder: React.FC<ModernFormBuilderProps> = memo(({
  form,
  onSave,
  onCancel,
  tenantId
}) => {
  const { user } = useAuth();
  
  // ✅ REFATORADO: Arrays usando useArrayState
  const fieldsState = useArrayState<FormField>([]);
  const fields = fieldsState.items;
  const setFields = fieldsState.replaceAll;
  const hasNoFields = fieldsState.isEmpty;

  const scoringRulesState = useArrayState<ScoringRule>([]);
  const scoringRules = scoringRulesState.items;
  const setScoringRules = scoringRulesState.replaceAll;

  const pipelinesState = useArrayState<Pipeline>([]);
  const availablePipelines = pipelinesState.items;
  const setAvailablePipelines = pipelinesState.replaceAll;
  const hasNoPipelines = pipelinesState.isEmpty;

  const membersState = useArrayState<Member>([]);
  const availableMembers = membersState.items;
  const setAvailableMembers = membersState.replaceAll;

  // ✅ REFATORADO: Loading states usando useAsyncState
  const saveState = useAsyncState();
  const saving = saveState.loading;
  const executeSave = saveState.execute;
  const canSave = saveState.isIdle;

  const pipelinesLoadState = useAsyncState();
  const loadingPipelines = pipelinesLoadState.loading;

  // Interface para Members
  interface Member {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    is_active: boolean;
  }

  // ✅ Helper functions para compatibilidade com IDs
  const addField = useCallback((newField: FormField) => {
    fieldsState.addItem(newField);
  }, [fieldsState]);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    fieldsState.updateItem((field) => field.id === fieldId, updates);
  }, [fieldsState]);

  const removeField = useCallback((fieldId: string) => {
    fieldsState.removeItem((field) => field.id === fieldId);
  }, [fieldsState]);

  const addScoringRule = useCallback((newRule: ScoringRule) => {
    scoringRulesState.addItem(newRule);
  }, [scoringRulesState]);

  const updateScoringRule = useCallback((ruleId: string, updates: Partial<ScoringRule>) => {
    scoringRulesState.updateItem((rule) => rule.id === ruleId, updates);
  }, [scoringRulesState]);

  const removeScoringRule = useCallback((ruleId: string) => {
    scoringRulesState.removeItem((rule) => rule.id === ruleId);
  }, [scoringRulesState]);

  const [formData, setFormData] = useState({
    name: form?.name || '',
    description: form?.description || '',
    slug: form?.slug || '',
    is_active: form?.is_active ?? true,
  });

  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [activePanel, setActivePanel] = useState<ActivePanel>('properties');

  // Estados para botões do formulário
  const [submitButton, setSubmitButton] = useState({
    text: 'Enviar Formulário',
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    redirectUrl: '',
    enabled: true
  });
  
  // Lead Scoring
  const [scoringThreshold, setScoringThreshold] = useState(70);
  
  // Share/Embed
  const [publicUrl, setPublicUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');

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

  const [notificationSettings, setNotificationSettings] = useState({
    successMessage: 'Mensagem enviada com sucesso, aguarde até que nossos especialistas retornem.',
    errorMessage: 'E-mail já cadastrado, favor corrija o e-mail e tente novamente.',
    showNotifications: true,
    autoHide: true,
    hideDelay: 5000,
    successBackgroundColor: '#10b981',
    successTextColor: '#ffffff',
    errorBackgroundColor: '#ef4444',
    errorTextColor: '#ffffff'
  });

  // Configurações de Email para Notificações
  const [emailNotificationSettings, setEmailNotificationSettings] = useState({
    enabled: false,
    recipients: [] as string[],
    subject: 'Novo cadastro no formulário: {form_name}',
    template: `Olá!

Um novo cadastro foi realizado no formulário "{form_name}".

📋 **Detalhes do Formulário:**
• Nome: {form_name}
• Data/Hora: {submission_date}
• Lead Score: {lead_score} pontos
• Status MQL: {is_mql}

👤 **Dados do Lead:**
{lead_data}

🔗 **Ações Rápidas:**
• Ver no CRM: {crm_link}
• Responder via WhatsApp: {whatsapp_link}

---
Enviado automaticamente pelo sistema CRM Marketing`,
    sendOnSubmit: true,
    sendOnWhatsApp: true,
    includeLeadData: true,
    includeMQLScore: true
  });

  // Editor de Estilização do Formulário
  const [formStyle, setFormStyle] = useState({
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: true,
    borderColor: '#e5e7eb',
    borderWidth: '1px',
    shadow: true,
    title: 'Novo Formulário',
    titleColor: '#1f2937',
    titleSize: '24px',
    titleWeight: 'bold',
    titleAlign: 'left',
    padding: '24px'
  });

  // Conexão com Pipeline
  const [pipelineConnection, setPipelineConnection] = useState({
    enabled: false,
    pipeline_id: '',
    stage_id: '',
    field_mappings: [] as FieldMapping[],
    auto_assign: true,
    create_task: true,
    task_description: 'Novo lead captado via formulário: {form_name}',
    task_due_days: 1,
    use_score_for_stage: false,
    score_stage_mapping: {
      low: '', // 0-30 pontos
      medium: '', // 31-70 pontos  
      high: '' // 71+ pontos
    },
    notification_settings: {
      notify_assigned_user: true,
      notify_team: false,
      custom_message: 'Novo lead de alta qualidade captado!'
    }
  });

  // Estado para pipelines disponíveis
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);

  const [leadDestination, setLeadDestination] = useState({
    type: 'pipeline' as 'pipeline' | 'leads-menu',
    visibility: {
      type: 'all-members' as 'all-members' | 'specific-members' | 'admin-only',
      specific_members: [] as string[]
    },
    distribution: {
      mode: 'manual' as 'manual' | 'round-robin' | 'first-available',
      auto_assign: false
    },
    field_mappings: {}
  });

  // 🆕 SISTEMA DE RASTREAMENTO DE ORIGEM
  const [leadTracking, setLeadTracking] = useState({
    enabled: true,
    customSource: '',
    customSourceName: '',
    customCampaign: '',
    customMedium: '',
    utmTracking: {
      enabled: true,
      autoDetect: true,
      sourceMappings: {
        'google': 'Google Ads',
        'facebook': 'Meta Ads',
        'instagram': 'Instagram Ads', 
        'youtube': 'YouTube Ads',
        'linkedin': 'LinkedIn Ads',
        'tiktok': 'TikTok Ads',
        'email': 'E-mail Marketing',
        'organic': 'Busca Orgânica',
        'direct': 'Acesso Direto',
        'referral': 'Site de Referência'
      }
    },
    leadSource: 'utm' as 'utm' | 'custom' | 'form',
    showInPipeline: true,
    trackConversions: true,
    formIdentifier: ''
  });

  const generateId = () => Math.random().toString(36).substr(2, 9);

  React.useEffect(() => {
    if (form?.id) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/form/${form.slug || form.id}`;
      setPublicUrl(url);
      setEmbedCode(`<iframe src="${url}" width="100%" height="600" frameborder="0" style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"></iframe>`);
    }
  }, [form]);

  // 🚀 OTIMIZAÇÃO: useCallback para evitar recriação da função a cada render
  const addFormField = useCallback((fieldType: string) => {
    const fieldConfig = FIELD_TYPES.find(f => f.type === fieldType);
    const newField: FormField = {
      id: generateId(),
      field_type: fieldType as any,
      field_name: `${fieldType}_${Date.now()}`,
      field_label: fieldConfig?.label || 'Campo',
      field_description: '',
      placeholder: getDefaultPlaceholder(fieldType),
      is_required: false,
      field_options: getDefaultOptions(fieldType),
      validation_rules: {},
      styling: {
        fontSize: '16px',
        padding: '12px',
        borderRadius: '8px',
        borderColor: '#d1d5db',
        backgroundColor: '#ffffff'
      },
      order_index: fields.length,
      scoring_weight: 0
    };
    
    addField(newField);
    setSelectedField(newField);
  }, [addField]);

  // ================================================================================
  // REMOVIDO: getDefaultPlaceholder e getDefaultOptions locais
  // Agora usando versões centralizadas de utils/FormValidation.ts
  // ================================================================================

  // 🚀 OTIMIZAÇÃO: useCallback para updateField
  const updateFormField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    updateField(fieldId, updates);
    
    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
  }, [updateField, selectedField]);



  const duplicateField = (fieldId: string) => {
    const fieldToDuplicate = fields.find(f => f.id === fieldId);
    if (fieldToDuplicate) {
      const newField = {
        ...fieldToDuplicate,
        id: generateId(),
        field_name: `${fieldToDuplicate.field_name}_copy`,
        field_label: `${fieldToDuplicate.field_label} (Cópia)`,
        order_index: fields.length
      };
      setFields([...fields, newField]);
    }
  };

  // 🚀 OTIMIZAÇÃO: useCallback para onDragEnd
  const onDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const newFields = Array.from(fields);
    const [reorderedField] = newFields.splice(result.source.index, 1);
    newFields.splice(result.destination.index, 0, reorderedField);

    newFields.forEach((field, index) => {
      field.order_index = index;
    });

    setFields(newFields);
  }, [fields]);

  const handleSave = async () => {
    saveState.setLoading(true);
    try {
      await onSave();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      saveState.setLoading(false);
    }
  };

  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile': return 'max-w-sm';
      case 'tablet': return 'max-w-2xl';
      default: return 'max-w-4xl';
    }
  };



  // 🚀 OTIMIZAÇÃO: useMemo para cálculo do score máximo
  const maxScore = useMemo(() => {
    return scoringRules.reduce((sum, rule) => sum + rule.points, 0);
  }, [scoringRules]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Aqui você pode adicionar uma notificação de sucesso
  };

  const showNotification = (type: 'success' | 'error', message?: string) => {
    setNotification({
      type,
      message: message || (type === 'success' ? notificationSettings.successMessage : notificationSettings.errorMessage),
      show: true
    });

    if (notificationSettings.autoHide) {
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, notificationSettings.hideDelay);
    }
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  // Funções para gerenciar emails de notificação
  const addEmailRecipient = (email: string) => {
    if (email && !emailNotificationSettings.recipients.includes(email)) {
      setEmailNotificationSettings(prev => ({
        ...prev,
        recipients: [...prev.recipients, email]
      }));
    }
  };

  const removeEmailRecipient = (email: string) => {
    setEmailNotificationSettings(prev => ({
      ...prev,
      recipients: prev.recipients.filter(recipient => recipient !== email)
    }));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Funções para conexão com pipeline
  const loadAvailablePipelines = async () => {
    pipelinesLoadState.setLoading(true);
    try {
      console.log('🔄 Carregando pipelines disponíveis...');
      
      // Primeira tentativa: API backend
      try {
              const API_BASE_URL = 'http://localhost:3001';
      const token = localStorage.getItem('token');
      console.log('🔑 Token encontrado:', token ? 'Sim' : 'Não');
        
        const response = await fetch(`${API_BASE_URL}/api/pipelines/available`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });
        
        console.log('📊 Resposta do servidor:', response.status, response.statusText);
        
        if (response.ok) {
          const pipelines = await response.json();
          console.log('✅ Pipelines carregadas via API:', pipelines);
          setAvailablePipelines(pipelines || []);
          
          if (!pipelines || pipelines.length === 0) {
            console.log('⚠️ Nenhuma pipeline encontrada no banco');
            showNotification('error', 'Nenhuma pipeline disponível encontrada. Crie uma pipeline primeiro.');
          } else {
            console.log(`✅ ${pipelines.length} pipelines encontradas`);
            showNotification('success', `${pipelines.length} pipeline(s) carregada(s) com sucesso!`);
          }
          return;
        }
      } catch (apiError) {
        console.warn('❌ API não respondeu, tentando Supabase diretamente:', apiError);
      }
      
      // Fallback: Supabase direto
      console.log('🔄 Carregando pipelines via Supabase...');
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
        showNotification('error', `Erro ao carregar pipelines: ${error.message}`);
        return;
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

      console.log('✅ Pipelines carregadas via Supabase:', formattedPipelines);
      setAvailablePipelines(formattedPipelines);
      
      if (formattedPipelines.length === 0) {
        console.log('⚠️ Nenhuma pipeline encontrada no banco');
        showNotification('error', 'Nenhuma pipeline disponível encontrada. Crie uma pipeline primeiro.');
      } else {
        console.log(`✅ ${formattedPipelines.length} pipelines encontradas`);
        showNotification('success', `${formattedPipelines.length} pipeline(s) carregada(s) com sucesso!`);
      }
      
    } catch (error) {
      console.error('❌ Erro geral ao carregar pipelines:', error);
      showNotification('error', 'Erro ao carregar pipelines');
    } finally {
      pipelinesLoadState.setLoading(false);
    }
  };

  const loadPipelineDetails = async (pipelineId: string) => {
    try {
      console.log('🔄 Carregando detalhes da pipeline:', pipelineId);
      
      // Primeira tentativa: API backend
      try {
              const API_BASE_URL = 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/pipelines/${pipelineId}/details`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        console.log('📊 Resposta detalhes pipeline:', response.status);
        
        if (response.ok) {
          const pipeline = await response.json();
          console.log('✅ Detalhes da pipeline carregados via API:', pipeline);
          setSelectedPipeline(pipeline);
          // Auto-mapear campos quando pipeline é selecionada
          if (pipeline.fields) {
            autoMapFields(pipeline.fields);
          }
          return;
        }
      } catch (apiError) {
        console.warn('❌ API não respondeu, tentando Supabase diretamente:', apiError);
      }
      
      // Fallback: Supabase direto
      console.log('🔄 Carregando detalhes da pipeline via Supabase...');
      
      // Buscar pipeline com estágios
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

      if (pipelineError || !pipeline) {
        console.error('❌ Pipeline não encontrada:', pipelineError);
        showNotification('error', 'Pipeline não encontrada');
        return;
      }

      // Buscar campos customizados da pipeline
      const { data: customFields } = await supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('field_order');

      // Definir campos padrão do sistema
      const systemFields = [
        { name: 'name', label: 'Nome', type: 'text', is_required: true, is_custom: false },
        { name: 'email', label: 'Email', type: 'email', is_required: false, is_custom: false },
        { name: 'phone', label: 'Telefone', type: 'tel', is_required: false, is_custom: false },
        { name: 'company', label: 'Empresa', type: 'text', is_required: false, is_custom: false },
        { name: 'position', label: 'Cargo', type: 'text', is_required: false, is_custom: false },
        { name: 'estimated_value', label: 'Valor Estimado', type: 'number', is_required: false, is_custom: false },
        { name: 'description', label: 'Descrição', type: 'textarea', is_required: false, is_custom: false },
        { name: 'source', label: 'Origem', type: 'text', is_required: false, is_custom: false },
      ];

      // Converter campos customizados para formato padrão
      const customFieldsFormatted = (customFields || []).map(field => ({
        name: field.field_name,
        label: field.field_label,
        type: field.field_type,
        is_required: field.is_required,
        is_custom: true,
        options: field.field_options
      }));

      // Combinar campos do sistema com campos customizados
      const allFields = [...systemFields, ...customFieldsFormatted];

      // Ordenar estágios
      const sortedStages = pipeline.pipeline_stages.sort((a: any, b: any) => a.order_index - b.order_index);

      const pipelineDetails = {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        is_active: pipeline.is_active,
        stages: sortedStages,
        fields: allFields
      };

      console.log('✅ Detalhes da pipeline carregados via Supabase:', pipelineDetails);
      setSelectedPipeline(pipelineDetails);
      
      // Auto-mapear campos quando pipeline é selecionada
      if (allFields.length > 0) {
        autoMapFields(allFields);
      }
      
    } catch (error) {
      console.error('❌ Erro geral ao carregar detalhes da pipeline:', error);
      showNotification('error', 'Erro ao carregar configurações da pipeline');
    }
  };

  const autoMapFields = (pipelineFields: PipelineField[]) => {
    const mappings: FieldMapping[] = [];
    
    fields.forEach(formField => {
      const bestMatch = findBestFieldMatch(formField, pipelineFields);
      if (bestMatch) {
        mappings.push({
          form_field_id: formField.id,
          pipeline_field_name: bestMatch.field.name,
          field_type: bestMatch.field.type,
          confidence: bestMatch.confidence
        });
      }
    });

    setPipelineConnection(prev => ({
      ...prev,
      field_mappings: mappings
    }));
  };

  const findBestFieldMatch = (formField: FormField, pipelineFields: PipelineField[]): { field: PipelineField; confidence: number } | null => {
    let bestMatch: { field: PipelineField; confidence: number } | null = null;
    let highestConfidence = 0;

    pipelineFields.forEach(pipelineField => {
      const confidence = calculateFieldMatchConfidence(formField, pipelineField);
      if (confidence > highestConfidence && confidence >= 70) { // Mínimo 70% de confiança
        highestConfidence = confidence;
        bestMatch = { field: pipelineField, confidence };
      }
    });

    return bestMatch;
  };

  const calculateFieldMatchConfidence = (formField: FormField, pipelineField: PipelineField): number => {
    let confidence = 0;

    // Correspondência exata de tipo
    if (formField.field_type === pipelineField.type) {
      confidence += 40;
    }

    // Correspondência de nome/label
    const formName = formField.field_name.toLowerCase();
    const formLabel = formField.field_label.toLowerCase();
    const pipelineName = pipelineField.name.toLowerCase();
    const pipelineLabel = pipelineField.label.toLowerCase();

    // Correspondência exata de nome
    if (formName === pipelineName) {
      confidence += 50;
    } else if (formLabel === pipelineLabel) {
      confidence += 45;
    }
    // Correspondência parcial
    else if (formName.includes(pipelineName) || pipelineName.includes(formName)) {
      confidence += 30;
    } else if (formLabel.includes(pipelineLabel) || pipelineLabel.includes(formLabel)) {
      confidence += 25;
    }

    // Correspondências semânticas comuns
    const semanticMappings = {
      'email': ['email', 'e-mail', 'correio', 'mail'],
      'phone': ['telefone', 'celular', 'fone', 'contato'],
      'name': ['nome', 'nome completo', 'cliente', 'pessoa'],
      'company': ['empresa', 'companhia', 'organização', 'firma'],
      'position': ['cargo', 'função', 'posição', 'trabalho'],
      'value': ['valor', 'preço', 'orçamento', 'investimento'],
      'description': ['descrição', 'detalhes', 'observações', 'comentários']
    };

    Object.entries(semanticMappings).forEach(([key, synonyms]) => {
      if (pipelineName.includes(key) || synonyms.some(syn => pipelineName.includes(syn))) {
        if (formName.includes(key) || synonyms.some(syn => formName.includes(syn)) ||
            formLabel.includes(key) || synonyms.some(syn => formLabel.includes(syn))) {
          confidence += 20;
        }
      }
    });

    return Math.min(confidence, 100);
  };

  const updateFieldMapping = (formFieldId: string, pipelineFieldName: string) => {
    const pipelineField = selectedPipeline?.fields.find(f => f.name === pipelineFieldName);
    if (!pipelineField) return;

    setPipelineConnection(prev => ({
      ...prev,
      field_mappings: prev.field_mappings.map(mapping =>
        mapping.form_field_id === formFieldId
          ? { ...mapping, pipeline_field_name: pipelineFieldName, field_type: pipelineField.type }
          : mapping
      )
    }));
  };

  const removeFieldMapping = (formFieldId: string) => {
    setPipelineConnection(prev => ({
      ...prev,
      field_mappings: prev.field_mappings.filter(mapping => mapping.form_field_id !== formFieldId)
    }));
  };

  const addFieldMapping = (formFieldId: string, pipelineFieldName: string) => {
    const pipelineField = selectedPipeline?.fields.find(f => f.name === pipelineFieldName);
    if (!pipelineField) return;

    const existingMapping = pipelineConnection.field_mappings.find(m => m.form_field_id === formFieldId);
    if (existingMapping) {
      updateFieldMapping(formFieldId, pipelineFieldName);
    } else {
      setPipelineConnection(prev => ({
        ...prev,
        field_mappings: [...prev.field_mappings, {
          form_field_id: formFieldId,
          pipeline_field_name: pipelineFieldName,
          field_type: pipelineField.type,
          confidence: 100 // Manual mapping = 100% confidence
        }]
      }));
    }
  };

  // Carregar pipelines quando o painel é aberto (OTIMIZADO)
  React.useEffect(() => {
    if (activePanel === 'pipeline' && availablePipelines.length === 0) {
      loadAvailablePipelines();
    }
  }, [activePanel, availablePipelines.length]); // OTIMIZADO: Evitar re-calls

  // Carregar pipelines imediatamente quando componente montar (OTIMIZADO)
  React.useEffect(() => {
    loadAvailablePipelines();
  }, []); // OTIMIZADO: Apenas na montagem

  // Carregar detalhes quando pipeline é selecionada
  React.useEffect(() => {
    if (pipelineConnection.pipeline_id && pipelineConnection.pipeline_id !== selectedPipeline?.id) {
      loadPipelineDetails(pipelineConnection.pipeline_id);
    }
  }, [pipelineConnection.pipeline_id]);

  // Carregar members disponíveis
  useEffect(() => {
    const loadAvailableMembers = async () => {
      try {
        const response = await fetch(`/api/forms/available-members/${tenantId}`);
        const result = await response.json();

        if (result.success) {
          setAvailableMembers(result.members || []);
        } else {
          console.error('Erro ao carregar members:', result.error);
        }
      } catch (error) {
        console.error('Erro ao carregar members:', error);
      }
    };

    if (tenantId) {
      loadAvailableMembers();
    }
  }, [tenantId]);

  const tabs = [
    { id: 'properties', label: 'Propriedades', icon: Settings },
    { id: 'scoring', label: 'Scoring', icon: Target },
    { id: 'pipeline', label: 'Pipeline', icon: GitBranch },
    { id: 'destination', label: 'Destino do Lead', icon: MapPin },
    { id: 'buttons', label: 'Botões', icon: Square },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'style', label: 'Estilo', icon: Palette },
    { id: 'form-settings', label: 'Ajustes no Formulário', icon: Sliders }
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onCancel}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Voltar</span>
          </button>
          
          <div className="h-6 w-px bg-gray-300"></div>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {form ? 'Editar Formulário' : 'Novo Formulário'}
            </h1>
            <p className="text-sm text-gray-500">
              Editor visual unificado • Preview em tempo real • Lead Scoring inteligente
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Controles de Preview */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm' : ''}`}
              title="Desktop"
            >
              <Monitor size={16} className={previewMode === 'desktop' ? 'text-blue-600' : 'text-gray-500'} />
            </button>
            <button
              onClick={() => setPreviewMode('tablet')}
              className={`p-2 rounded ${previewMode === 'tablet' ? 'bg-white shadow-sm' : ''}`}
              title="Tablet"
            >
              <Tablet size={16} className={previewMode === 'tablet' ? 'text-blue-600' : 'text-gray-500'} />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm' : ''}`}
              title="Mobile"
            >
              <Smartphone size={16} className={previewMode === 'mobile' ? 'text-blue-600' : 'text-gray-500'} />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </div>

      {/* Informações básicas */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Nome do formulário *"
          />
          
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="slug-do-formulario *"
          />

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <span className="text-sm text-gray-700">Formulário ativo</span>
          </label>
        </div>
      </div>

      {/* Layout Principal Split-Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Esquerda - Componentes */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <Plus className="mr-2" size={16} />
              Elementos Disponíveis
            </h3>
            
            <div className="space-y-2">
              {FIELD_TYPES.map((fieldType) => {
                const Icon = fieldType.icon;
                return (
                  <button
                    key={fieldType.type}
                    onClick={() => {
                      const newField: FormField = {
                        id: generateId(),
                        field_type: fieldType.type as any,
                        field_name: `field_${generateId()}`,
                        field_label: fieldType.label,
                        placeholder: getDefaultPlaceholder(fieldType.type as any),
                        is_required: false,
                        order_index: fields.length,

                        field_description: '',
                        scoring_weight: 1,
                        field_options: {} as any,
                        validation_rules: {} as any,
                        styling: {}
                      };
                      addField(newField);
                    }}
                    className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${fieldType.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{fieldType.label}</div>
                      <div className="text-xs text-gray-500 truncate">{fieldType.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Área Central - Preview em Tempo Real */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6 relative">
          {/* Header de controles do preview */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Edit className="text-white" size={16} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Preview do Formulário</h3>
                <p className="text-sm text-gray-600">Veja como ficará para seus usuários</p>
              </div>
            </div>
            
            {/* Botões de controle - Sempre Visíveis */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActivePanel('form-settings')}
                className={`p-2 rounded-lg border transition-all duration-200 ${
                  activePanel === 'form-settings' 
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-md' 
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                }`}
                title="🎯 Ajustes no Formulário - Configure nome, notificações e comportamento"
              >
                <Settings size={16} />
              </button>
              
              <button
                onClick={() => setActivePanel('style')}
                className={`p-2 rounded-lg border transition-all duration-200 ${
                  activePanel === 'style' 
                    ? 'bg-pink-50 border-pink-300 text-pink-700 shadow-md' 
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-700'
                }`}
                title="🎨 Editar Estilo - Personalize cores, fontes e aparência"
              >
                <Palette size={16} />
              </button>
            </div>
          </div>

          {/* FASE 3.5.3 - INTEGRAÇÃO FORMPREVIEW COM SUSPENSE E LAZY LOADING */}
          <Suspense fallback={
            <div className="flex items-center justify-center h-96">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-gray-600 font-medium">Carregando preview...</p>
              </div>
            </div>
          }>
            <FormPreview
              fields={fields}
              formData={formData}
              formStyle={formStyle}
              previewMode={previewMode}
              selectedField={selectedField}
              onFieldSelect={setSelectedField}
              removeField={removeField}
              duplicateField={duplicateField}
            />
          </Suspense>
        </div>

        {/* Sidebar Direita - Propriedades/Scoring/Share */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          {/* Header do Painel com Título */}
          <div className="border-b border-gray-200 px-4 py-4 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Settings className="text-white" size={16} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Configurações</h3>
                <p className="text-sm text-gray-600">Personalize seu formulário</p>
              </div>
            </div>
          </div>

          {/* Menu de Navegação Melhorado */}
          <div className="border-b border-gray-200">
            <nav className="px-4 py-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Primeira linha - Principais */}
              <button
                onClick={() => setActivePanel('properties')}
                  className={`flex items-center space-x-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                  activePanel === 'properties'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                  <Settings size={16} />
                <span>Propriedades</span>
              </button>
                
              <button
                onClick={() => setActivePanel('scoring')}
                  className={`flex items-center space-x-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                  activePanel === 'scoring'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                  <Target size={16} />
                <span>Scoring</span>
              </button>

                {/* Segunda linha - Pipeline e Compartilhamento */}
                <button
                  onClick={() => setActivePanel('pipeline')}
                  className={`flex items-center space-x-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                    activePanel === 'pipeline'
                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-cyan-50 hover:text-cyan-700'
                  }`}
                >
                  <TrendingUp size={16} />
                  <span>Pipeline</span>
                  {pipelineConnection.enabled && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  )}
                </button>

                <button
                  onClick={() => setActivePanel('destination')}
                  className={`flex items-center space-x-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                    activePanel === 'destination'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <MapPin size={16} />
                  <span>Destino</span>
                  {leadDestination.type === 'leads-menu' && (
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  )}
                </button>

                {/* Terceira linha - Compartilhamento e Botões */}
              <button
                onClick={() => setActivePanel('share')}
                  className={`flex items-center space-x-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                  activePanel === 'share'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                  <Share size={16} />
                <span>Compartilhar</span>
              </button>

              <button
                onClick={() => setActivePanel('buttons')}
                  className={`flex items-center space-x-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                  activePanel === 'buttons'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-700'
                }`}
              >
                  <Send size={16} />
                <span>Botões</span>
              </button>

                {/* Terceira linha - Avançadas */}
              <button
                onClick={() => setActivePanel('notifications')}
                  className={`flex items-center space-x-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                  activePanel === 'notifications'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-red-50 hover:text-red-700'
                }`}
              >
                  <AlertCircle size={16} />
                <span>Notificações</span>
              </button>

              <button
                onClick={() => setActivePanel('style')}
                  className={`flex items-center space-x-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                  activePanel === 'style'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-700 hover:bg-pink-50 hover:text-pink-700'
                }`}
              >
                  <Palette size={16} />
                <span>Estilo</span>
              </button>
            </div>

              {/* Menu "Ajustes no Formulário" - Destacado */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={() => setActivePanel('form-settings')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                    activePanel === 'form-settings'
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-indigo-50 hover:to-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Edit size={16} />
                    <span className="font-semibold">Ajustes no Formulário</span>
                  </div>
                  <div className="ml-auto">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                </button>
                <p className="text-xs text-gray-500 mt-1 px-4">
                  Configure título, aparência e comportamento do formulário
                </p>
              </div>
            </nav>
          </div>

          {/* Conteúdo do painel */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Painel de Propriedades */}
            {activePanel === 'properties' && selectedField && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Propriedades do Campo</h3>
                  <button
                    onClick={() => setSelectedField(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rótulo (Label)
                    </label>
                    <input
                      type="text"
                      value={selectedField.field_label}
                      onChange={(e) => updateField(selectedField.id, { field_label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Campo
                    </label>
                    <input
                      type="text"
                      value={selectedField.field_name}
                      onChange={(e) => updateField(selectedField.id, { field_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {!['whatsapp'].includes(selectedField.field_type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Placeholder
                      </label>
                      <input
                        type="text"
                        value={selectedField.placeholder || ''}
                        onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição/Ajuda
                    </label>
                    <input
                      type="text"
                      value={selectedField.field_description || ''}
                      onChange={(e) => updateField(selectedField.id, { field_description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {!['whatsapp'].includes(selectedField.field_type) && (
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedField.is_required}
                          onChange={(e) => updateField(selectedField.id, { is_required: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Campo obrigatório</span>
                      </label>
                    </div>
                  )}

                  {/* Peso do Lead Scoring */}
                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peso para Lead Scoring
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={selectedField.scoring_weight || 0}
                        onChange={(e) => updateField(selectedField.id, { scoring_weight: parseInt(e.target.value) || 0 })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <span className="text-sm text-gray-500">pontos</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Pontos atribuídos quando este campo for preenchido
                    </p>
                  </div>

                  {/* Estilização */}
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <Palette className="mr-2" size={14} />
                      Estilização
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tamanho da Fonte
                        </label>
                        <select
                          value={selectedField.styling?.fontSize || '16px'}
                          onChange={(e) => updateField(selectedField.id, { 
                            styling: { ...selectedField.styling, fontSize: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="12px">12px - Pequeno</option>
                          <option value="14px">14px - Médio</option>
                          <option value="16px">16px - Normal</option>
                          <option value="18px">18px - Grande</option>
                          <option value="20px">20px - Extra Grande</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Padding
                        </label>
                        <select
                          value={selectedField.styling?.padding || '12px'}
                          onChange={(e) => updateField(selectedField.id, { 
                            styling: { ...selectedField.styling, padding: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="8px">8px - Compacto</option>
                          <option value="12px">12px - Normal</option>
                          <option value="16px">16px - Confortável</option>
                          <option value="20px">20px - Espaçoso</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Border Radius
                        </label>
                        <select
                          value={selectedField.styling?.borderRadius || '8px'}
                          onChange={(e) => updateField(selectedField.id, { 
                            styling: { ...selectedField.styling, borderRadius: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="0px">0px - Quadrado</option>
                          <option value="4px">4px - Levemente Arredondado</option>
                          <option value="8px">8px - Arredondado</option>
                          <option value="12px">12px - Muito Arredondado</option>
                          <option value="20px">20px - Circular</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cor da Borda
                        </label>
                        <input
                          type="color"
                          value={selectedField.styling?.borderColor || '#d1d5db'}
                          onChange={(e) => updateField(selectedField.id, { 
                            styling: { ...selectedField.styling, borderColor: e.target.value }
                          })}
                          className="w-full h-10 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cor de Fundo
                        </label>
                        <input
                          type="color"
                          value={selectedField.styling?.backgroundColor || '#ffffff'}
                          onChange={(e) => updateField(selectedField.id, { 
                            styling: { ...selectedField.styling, backgroundColor: e.target.value }
                          })}
                          className="w-full h-10 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Opções específicas por tipo */}
                  {['select', 'radio', 'checkbox'].includes(selectedField.field_type) && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Opções</h4>
                      <textarea
                        value={(selectedField.field_options.options || []).join('\n')}
                        onChange={(e) => updateField(selectedField.id, {
                          field_options: {
                            ...selectedField.field_options,
                            options: e.target.value.split('\n').filter(opt => opt.trim())
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={4}
                        placeholder="Uma opção por linha"
                      />
                    </div>
                  )}

                  {/* Configurações do Range/Slider */}
                  {selectedField.field_type === 'range' && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Configurações do Slider</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valor Mínimo
                          </label>
                          <input
                            type="number"
                            value={selectedField.field_options?.min || 0}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                min: parseInt(e.target.value) || 0
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Valor Máximo
                          </label>
                          <input
                            type="number"
                            value={selectedField.field_options?.max || 100}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                max: parseInt(e.target.value) || 100
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Incremento (Step)
                          </label>
                          <input
                            type="number"
                            value={selectedField.field_options?.step || 1}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                step: parseInt(e.target.value) || 1
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Configurações do Rating */}
                  {selectedField.field_type === 'rating' && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Configurações da Avaliação</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Número de Estrelas
                        </label>
                        <select
                          value={selectedField.field_options?.max_rating || 5}
                          onChange={(e) => updateField(selectedField.id, {
                            field_options: {
                              ...selectedField.field_options,
                              max_rating: parseInt(e.target.value)
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value={3}>3 estrelas</option>
                          <option value={4}>4 estrelas</option>
                          <option value={5}>5 estrelas</option>
                          <option value={10}>10 estrelas</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Configurações do File Upload */}
                  {selectedField.field_type === 'file' && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Configurações de Upload</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipos de Arquivo Aceitos
                          </label>
                          <select
                            value={selectedField.field_options?.accept || '*'}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                accept: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="*">Todos os tipos</option>
                            <option value="image/*">Apenas imagens</option>
                            <option value=".pdf">Apenas PDF</option>
                            <option value=".doc,.docx">Documentos Word</option>
                            <option value=".xls,.xlsx">Planilhas Excel</option>
                            <option value="image/*,.pdf,.doc,.docx">Imagens e Documentos</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tamanho Máximo
                          </label>
                          <select
                            value={selectedField.field_options?.max_size || '10MB'}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                max_size: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="1MB">1 MB</option>
                            <option value="5MB">5 MB</option>
                            <option value="10MB">10 MB</option>
                            <option value="25MB">25 MB</option>
                            <option value="50MB">50 MB</option>
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedField.field_options?.multiple || false}
                              onChange={(e) => updateField(selectedField.id, {
                                field_options: {
                                  ...selectedField.field_options,
                                  multiple: e.target.checked
                                }
                              })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Permitir múltiplos arquivos</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Configurações do WhatsApp */}
                  {selectedField.field_type === 'whatsapp' && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <MessageSquare className="mr-2 text-green-600" size={14} />
                        Configurações do WhatsApp
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número do WhatsApp
                          </label>
                          <input
                            type="text"
                            value={selectedField.field_options?.number || ''}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                number: e.target.value.replace(/\D/g, '')
                              }
                            })}
                            placeholder="5511999999999"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Formato: código do país + DDD + número (ex: 5511999999999)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mensagem Padrão
                          </label>
                          <textarea
                            value={selectedField.field_options?.message || 'Olá! Gostaria de mais informações.'}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                message: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            rows={3}
                            placeholder="Mensagem que será enviada automaticamente"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Texto do Botão
                          </label>
                          <input
                            type="text"
                            value={selectedField.field_options?.button_text || 'Enviar via WhatsApp'}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                button_text: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cor de Fundo
                          </label>
                          <input
                            type="color"
                            value={selectedField.field_options?.background_color || '#25d366'}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                background_color: e.target.value
                              }
                            })}
                            className="w-full h-10 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cor do Texto
                          </label>
                          <input
                            type="color"
                            value={selectedField.field_options?.text_color || '#ffffff'}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                text_color: e.target.value
                              }
                            })}
                            className="w-full h-10 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Configurações do Botão Submit */}
                  {selectedField.field_type === 'submit' && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <Send className="mr-2 text-blue-600" size={14} />
                        Configurações do Botão Submit
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Texto do Botão
                          </label>
                          <input
                            type="text"
                            value={selectedField.field_options?.button_text || 'Enviar Formulário'}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                button_text: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Enviar Formulário"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cor de Fundo
                          </label>
                          <input
                            type="color"
                            value={selectedField.field_options?.background_color || '#3b82f6'}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                background_color: e.target.value
                              }
                            })}
                            className="w-full h-10 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cor do Texto
                          </label>
                          <input
                            type="color"
                            value={selectedField.field_options?.text_color || '#ffffff'}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                text_color: e.target.value
                              }
                            })}
                            className="w-full h-10 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL de Redirecionamento (Opcional)
                          </label>
                          <input
                            type="url"
                            value={selectedField.field_options?.redirect_url || ''}
                            onChange={(e) => updateField(selectedField.id, {
                              field_options: {
                                ...selectedField.field_options,
                                redirect_url: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="https://exemplo.com/obrigado"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Página para onde o usuário será redirecionado após enviar
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activePanel === 'properties' && !selectedField && (
              <div className="text-center py-8 text-gray-500">
                <Settings size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Selecione um campo</p>
                <p className="text-sm">Clique em um campo do formulário para editar suas propriedades</p>
              </div>
            )}

            {/* Painel de Lead Scoring */}
            {activePanel === 'scoring' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Lead Scoring Inteligente</h3>
                  <div className="flex items-center space-x-2 text-sm">
                    <TrendingUp size={14} className="text-green-500" />
                    <span className="text-green-600 font-medium">{maxScore} pts máx</span>
                  </div>
                </div>

                {/* Configuração do Threshold */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pontuação Mínima para MQL (Marketing Qualified Lead)
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={scoringThreshold}
                      onChange={(e) => setScoringThreshold(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <div className="w-16 text-center">
                      <span className="text-lg font-bold text-blue-600">{scoringThreshold}</span>
                      <span className="text-xs text-gray-500 block">pontos</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Leads com {scoringThreshold}+ pontos serão marcados como MQL automaticamente
                  </p>
                </div>

                {/* Regras de Scoring */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">Regras de Pontuação</h4>
                    {selectedField && (
                      <button
                        onClick={() => {
                          if (!selectedField) return;
                          const newRule: ScoringRule = {
                            id: generateId(),
                            field_id: selectedField.id,
                            condition: 'not_empty',
                            value: '',
                            points: 10,
                            description: `Pontuação para ${selectedField.field_label}`
                          };
                          addScoringRule(newRule);
                        }}
                        className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Plus size={14} />
                        <span>Adicionar Regra</span>
                      </button>
                    )}
                  </div>

                  {scoringRules.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Target size={32} className="mx-auto mb-3 text-gray-300" />
                      <p className="text-sm font-medium mb-1">Nenhuma regra definida</p>
                      <p className="text-xs">Selecione um campo e adicione regras de pontuação</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scoringRules.map((rule) => {
                        const field = fields.find(f => f.id === rule.field_id);
                        return (
                          <div key={rule.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {field?.field_label || 'Campo removido'}
                              </span>
                              <button
                                onClick={() => removeScoringRule(rule.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Condição</label>
                                <select
                                  value={rule.condition}
                                  onChange={(e) => updateScoringRule(rule.id, { condition: e.target.value as any })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="not_empty">Não está vazio</option>
                                  <option value="equals">Igual a</option>
                                  <option value="contains">Contém</option>
                                  <option value="greater_than">Maior que</option>
                                  <option value="less_than">Menor que</option>
                                  <option value="range">Entre valores</option>
                                </select>
                              </div>

                              {!['not_empty'].includes(rule.condition) && (
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Valor</label>
                                  <input
                                    type="text"
                                    value={rule.value}
                                    onChange={(e) => updateScoringRule(rule.id, { value: e.target.value })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="Valor para comparação"
                                  />
                                </div>
                              )}

                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Pontos</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={rule.points}
                                  onChange={(e) => updateScoringRule(rule.id, { points: parseInt(e.target.value) || 0 })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Descrição</label>
                                <input
                                  type="text"
                                  value={rule.description}
                                  onChange={(e) => updateScoringRule(rule.id, { description: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Descrição da regra"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Resumo do Scoring */}
                {scoringRules.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                      <Zap className="mr-2 text-green-600" size={14} />
                      Resumo do Lead Scoring
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total de regras:</span>
                        <span className="font-medium">{scoringRules.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pontuação máxima:</span>
                        <span className="font-medium text-green-600">{maxScore} pontos</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Threshold MQL:</span>
                        <span className="font-medium text-blue-600">{scoringThreshold} pontos</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxa de conversão:</span>
                        <span className="font-medium text-purple-600">
                          {maxScore > 0 ? Math.round((scoringThreshold / maxScore) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Painel de Compartilhamento */}
            {activePanel === 'share' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Compartilhar Formulário</h3>
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Publicado</span>
                  </div>
                </div>

                {/* Link Público */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link Público
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={publicUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(publicUrl)}
                        className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Copy size={14} />
                        <span>Copiar</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Link direto para acessar o formulário
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => window.open(publicUrl, '_blank')}
                      className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <ExternalLink size={14} />
                      <span>Visualizar</span>
                    </button>
                    <button
                      onClick={() => copyToClipboard(publicUrl)}
                      className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <Share size={14} />
                      <span>Compartilhar</span>
                    </button>
                  </div>
                </div>

                {/* Código de Embed */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código de Embed (iframe)
                    </label>
                    <textarea
                      value={embedCode}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
                      rows={4}
                    />
                    <button
                      onClick={() => copyToClipboard(embedCode)}
                      className="mt-2 flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <Code size={14} />
                      <span>Copiar Código</span>
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Cole este código em sua landing page ou site
                    </p>
                  </div>
                </div>

                {/* Opções de Integração */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Zap className="mr-2 text-blue-600" size={14} />
                    Integrações Disponíveis
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center space-x-2">
                        <MessageSquare size={16} className="text-green-500" />
                        <span className="text-sm font-medium">WhatsApp</span>
                      </div>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Ativo</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center space-x-2">
                        <Mail size={16} className="text-blue-500" />
                        <span className="text-sm font-medium">E-mail</span>
                      </div>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Ativo</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center space-x-2">
                        <Target size={16} className="text-purple-500" />
                        <span className="text-sm font-medium">Lead Scoring</span>
                      </div>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Ativo</span>
                    </div>
                  </div>
                </div>

                {/* Estatísticas */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <TrendingUp className="mr-2 text-gray-600" size={14} />
                    Estatísticas do Formulário
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-lg font-bold text-blue-600">0</div>
                      <div className="text-xs text-gray-500">Visualizações</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-lg font-bold text-green-600">0</div>
                      <div className="text-xs text-gray-500">Conversões</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-lg font-bold text-purple-600">0%</div>
                      <div className="text-xs text-gray-500">Taxa Conversão</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-lg font-bold text-orange-600">0</div>
                      <div className="text-xs text-gray-500">MQLs Gerados</div>
                    </div>
                  </div>
                </div>

                {/* QR Code para Mobile */}
                <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <span className="text-xs text-gray-500">QR Code</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Acesso Mobile</p>
                  <p className="text-xs text-gray-500">
                    Escaneie para abrir o formulário no celular
                  </p>
                </div>
              </div>
            )}

            {/* Painel de Configuração de Botões */}
            {activePanel === 'buttons' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Configuração dos Botões</h3>
                  <div className="flex items-center space-x-1 text-xs text-blue-600">
                    <Send size={12} />
                    <span>Ações</span>
                  </div>
                </div>

                {/* Instruções */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Info className="mr-2 text-blue-600" size={14} />
                    Como Adicionar Botões
                  </h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• Arraste <strong>"Botão Enviar"</strong> da barra lateral para adicionar botão de envio</p>
                    <p>• Arraste <strong>"WhatsApp"</strong> da barra lateral para adicionar botão WhatsApp</p>
                    <p>• Configure as propriedades clicando no botão inserido</p>
                    <p>• Com ambos inseridos, ficam lado a lado (50/50)</p>
                  </div>
                </div>

                {/* Status dos Botões */}
                <div className="space-y-3">
                  {(() => {
                    const submitField = fields.find(field => field.field_type === 'submit');
                    const whatsappField = fields.find(field => field.field_type === 'whatsapp');
                    
                    return (
                      <>
                        {/* Status Botão Submit */}
                        <div className={`p-3 rounded-lg border-2 ${submitField ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Send className={`mr-2 ${submitField ? 'text-green-600' : 'text-gray-400'}`} size={16} />
                              <span className="text-sm font-medium">Botão Enviar</span>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full ${submitField ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {submitField ? 'Inserido' : 'Não inserido'}
                            </div>
                          </div>
                          {submitField && (
                            <div className="mt-2 text-xs text-gray-600">
                              Texto: {submitField.field_options?.button_text || 'Enviar Formulário'}
                            </div>
                          )}
                        </div>

                        {/* Status Botão WhatsApp */}
                        <div className={`p-3 rounded-lg border-2 ${whatsappField ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <MessageSquare className={`mr-2 ${whatsappField ? 'text-green-600' : 'text-gray-400'}`} size={16} />
                              <span className="text-sm font-medium">Botão WhatsApp</span>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full ${whatsappField ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {whatsappField ? 'Inserido' : 'Não inserido'}
                            </div>
                          </div>
                          {whatsappField && (
                            <div className="mt-2 text-xs text-gray-600">
                              Texto: {whatsappField.field_options?.button_text || 'Enviar via WhatsApp'}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Preview dos Botões */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Preview dos Botões</h4>
                  
                  {(() => {
                    const submitField = fields.find(field => field.field_type === 'submit');
                    const whatsappField = fields.find(field => field.field_type === 'whatsapp');
                    
                    if (submitField && whatsappField) {
                      // Layout 50/50
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            style={{
                              backgroundColor: submitField.field_options?.background_color || '#3b82f6',
                              color: submitField.field_options?.text_color || '#ffffff',
                            }}
                            className="flex items-center justify-center py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 transform hover:scale-105 shadow-lg"
                          >
                            <Send className="mr-2" size={14} />
                            {submitField.field_options?.button_text || 'Enviar Formulário'}
                          </button>
                          
                          <button
                            type="button"
                            style={{
                              backgroundColor: whatsappField.field_options?.background_color || '#25d366',
                              color: whatsappField.field_options?.text_color || '#ffffff',
                            }}
                            className="flex items-center justify-center py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 transform hover:scale-105 shadow-lg"
                          >
                            <MessageSquare className="mr-2" size={14} />
                            {whatsappField.field_options?.button_text || 'WhatsApp'}
                          </button>
                        </div>
                      );
                    } else if (submitField) {
                      // Apenas Submit
                      return (
                        <button
                          type="button"
                          style={{
                            backgroundColor: submitField.field_options?.background_color || '#3b82f6',
                            color: submitField.field_options?.text_color || '#ffffff',
                          }}
                          className="w-full flex items-center justify-center py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                          <Send className="mr-2" size={14} />
                          {submitField.field_options?.button_text || 'Enviar Formulário'}
                        </button>
                      );
                    } else if (whatsappField) {
                      // Apenas WhatsApp
                      return (
                        <button
                          type="button"
                          style={{
                            backgroundColor: whatsappField.field_options?.background_color || '#25d366',
                            color: whatsappField.field_options?.text_color || '#ffffff',
                          }}
                          className="w-full flex items-center justify-center py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                          <MessageSquare className="mr-2" size={14} />
                          {whatsappField.field_options?.button_text || 'Enviar via WhatsApp'}
                        </button>
                      );
                    }
                    
                    return (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        <div className="mb-2">
                          <Send size={24} className="mx-auto text-gray-300 mb-2" />
                        </div>
                        <p>Nenhum botão inserido</p>
                        <p className="text-xs mt-1">Arraste os botões da barra lateral</p>
                      </div>
                    );
                  })()}
                </div>

                {/* Dicas de Configuração */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <AlertCircle className="mr-2 text-yellow-600" size={14} />
                    Dicas de Configuração
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Botões são elementos inseríveis como qualquer campo</li>
                    <li>• Configure cores e textos nas propriedades do botão</li>
                    <li>• WhatsApp tem cor verde padrão (#25d366)</li>
                    <li>• Com ambos inseridos, layout fica 50/50 automaticamente</li>
                    <li>• Apenas um botão = largura total (100%)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Painel de Configuração de Notificações */}
            {activePanel === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Sistema de Notificações</h3>
                  <div className="flex items-center space-x-1 text-xs text-blue-600">
                    <Info size={12} />
                    <span>Mensagens</span>
                  </div>
                </div>

                {/* Configurações Gerais */}
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notificationSettings.showNotifications}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          showNotifications: e.target.checked
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Exibir notificações</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notificationSettings.autoHide}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          autoHide: e.target.checked
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Ocultar automaticamente</span>
                    </label>
                  </div>

                  {notificationSettings.autoHide && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tempo para ocultar (ms)
                      </label>
                      <input
                        type="number"
                        min="1000"
                        max="10000"
                        step="500"
                        value={notificationSettings.hideDelay}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          hideDelay: parseInt(e.target.value) || 5000
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Mensagem de Sucesso */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center">
                    <div className="w-4 h-4 bg-green-400 rounded-full flex items-center justify-center mr-2">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    Mensagem de Sucesso
                  </h4>
                  <textarea
                    value={notificationSettings.successMessage}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      successMessage: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
                    rows={3}
                    placeholder="Mensagem exibida quando o formulário for enviado com sucesso..."
                  />
                  <p className="text-xs text-green-600 mt-2">
                    Esta mensagem será exibida quando o formulário for enviado com sucesso.
                  </p>
                </div>

                {/* Mensagem de Erro */}
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="text-sm font-medium text-red-800 mb-3 flex items-center">
                    <div className="w-4 h-4 bg-red-400 rounded-full flex items-center justify-center mr-2">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    Mensagem de Erro
                  </h4>
                  <textarea
                    value={notificationSettings.errorMessage}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      errorMessage: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm bg-white"
                    rows={3}
                    placeholder="Mensagem exibida quando houver erro no envio..."
                  />
                  <p className="text-xs text-red-600 mt-2">
                    Esta mensagem será exibida quando houver erro no envio do formulário.
                  </p>
                </div>

                {/* Preview das Notificações */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Preview das Notificações</h4>
                  
                  <div className="space-y-3">
                    {/* Botão para testar sucesso */}
                    <button
                      onClick={() => showNotification('success')}
                      className="w-full flex items-center justify-center py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <div className="w-4 h-4 bg-green-400 rounded-full flex items-center justify-center mr-2">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      Testar Notificação de Sucesso
                    </button>

                    {/* Botão para testar erro */}
                    <button
                      onClick={() => showNotification('error')}
                      className="w-full flex items-center justify-center py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <div className="w-4 h-4 bg-red-400 rounded-full flex items-center justify-center mr-2">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      Testar Notificação de Erro
                    </button>
                  </div>
                </div>

                {/* Dicas de Uso */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <Info className="mr-2 text-blue-600" size={14} />
                    Dicas de Uso
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Mensagens aparecerão no canto superior direito</li>
                    <li>• Verde para sucesso, vermelho para erro</li>
                    <li>• Usuário pode fechar manualmente clicando no X</li>
                    <li>• Configure tempo de auto-ocultação entre 1-10 segundos</li>
                    <li>• Mensagens são exibidas após envio do formulário</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Painel de Estilo */}
            {activePanel === 'style' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center">
                    <Palette className="mr-2 text-blue-600" size={16} />
                    Estilo do Formulário
                  </h3>
                  <div className="text-xs text-gray-500">
                    Edição em tempo real
                  </div>
                </div>

                {/* Título do Formulário */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Título do Formulário</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Texto do Título</label>
                      <input
                        type="text"
                        value={formStyle.title}
                        onChange={(e) => setFormStyle({...formStyle, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Digite o título do formulário..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cor do Título</label>
                        <input
                          type="color"
                          value={formStyle.titleColor}
                          onChange={(e) => setFormStyle({...formStyle, titleColor: e.target.value})}
                          className="w-full h-8 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tamanho</label>
                        <select
                          value={formStyle.titleSize}
                          onChange={(e) => setFormStyle({...formStyle, titleSize: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="18px">Pequeno</option>
                          <option value="20px">Médio</option>
                          <option value="24px">Grande</option>
                          <option value="28px">Extra Grande</option>
                          <option value="32px">Gigante</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Peso da Fonte</label>
                        <select
                          value={formStyle.titleWeight}
                          onChange={(e) => setFormStyle({...formStyle, titleWeight: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="normal">Normal</option>
                          <option value="medium">Médio</option>
                          <option value="semibold">Semi-Negrito</option>
                          <option value="bold">Negrito</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alinhamento</label>
                        <select
                          value={formStyle.titleAlign}
                          onChange={(e) => setFormStyle({...formStyle, titleAlign: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="left">Esquerda</option>
                          <option value="center">Centro</option>
                          <option value="right">Direita</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aparência do Formulário */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Aparência do Formulário</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cor de Fundo</label>
                      <input
                        type="color"
                        value={formStyle.backgroundColor}
                        onChange={(e) => setFormStyle({...formStyle, backgroundColor: e.target.value})}
                        className="w-full h-8 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Raio da Borda</label>
                      <select
                        value={formStyle.borderRadius}
                        onChange={(e) => setFormStyle({...formStyle, borderRadius: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="0px">Sem arredondamento</option>
                        <option value="4px">Pequeno (4px)</option>
                        <option value="8px">Médio (8px)</option>
                        <option value="12px">Grande (12px)</option>
                        <option value="16px">Extra Grande (16px)</option>
                        <option value="24px">Muito Grande (24px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Espaçamento Interno</label>
                      <select
                        value={formStyle.padding}
                        onChange={(e) => setFormStyle({...formStyle, padding: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="16px">Pequeno (16px)</option>
                        <option value="24px">Médio (24px)</option>
                        <option value="32px">Grande (32px)</option>
                        <option value="40px">Extra Grande (40px)</option>
                        <option value="48px">Muito Grande (48px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formStyle.border}
                          onChange={(e) => setFormStyle({...formStyle, border: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Mostrar borda</span>
                      </label>
                    </div>

                    {formStyle.border && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Cor da Borda</label>
                          <input
                            type="color"
                            value={formStyle.borderColor}
                            onChange={(e) => setFormStyle({...formStyle, borderColor: e.target.value})}
                            className="w-full h-8 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Espessura</label>
                          <select
                            value={formStyle.borderWidth}
                            onChange={(e) => setFormStyle({...formStyle, borderWidth: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="1px">Fina (1px)</option>
                            <option value="2px">Média (2px)</option>
                            <option value="3px">Grossa (3px)</option>
                            <option value="4px">Extra Grossa (4px)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formStyle.shadow}
                          onChange={(e) => setFormStyle({...formStyle, shadow: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Mostrar sombra</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Dicas de Uso */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <Info className="mr-2 text-green-600" size={14} />
                    Dicas de Estilização
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• As mudanças são aplicadas em tempo real no preview</li>
                    <li>• Use cores contrastantes para melhor legibilidade</li>
                    <li>• Bordas arredondadas dão um visual mais moderno</li>
                    <li>• Sombras adicionam profundidade ao formulário</li>
                    <li>• Espaçamento adequado melhora a experiência do usuário</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Painel de Ajustes no Formulário */}
            {activePanel === 'form-settings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Ajustes no Formulário</h3>
                  <div className="flex items-center space-x-1 text-xs text-indigo-600">
                    <Edit size={12} />
                    <span>Editor</span>
          </div>
        </div>

                {/* Configurações Básicas do Formulário */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-200">
                  <h4 className="text-sm font-semibold text-indigo-900 mb-4 flex items-center">
                    <FileText className="mr-2 text-indigo-600" size={16} />
                    Informações Básicas
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome do Formulário
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="Digite o nome do formulário..."
                      />
      </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrição
                      </label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        rows={3}
                        placeholder="Descreva o propósito do formulário..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL Amigável (Slug)
                      </label>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-2">/form/</span>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({...formData, slug: e.target.value.replace(/[^a-z0-9-]/g, '')})}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                          placeholder="meu-formulario"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Apenas letras minúsculas, números e hífens
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Formulário ativo</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        Formulários inativos não podem receber submissões
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configurações de Notificação Visual */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                  <h4 className="text-sm font-semibold text-green-900 mb-4 flex items-center">
                    <AlertCircle className="mr-2 text-green-600" size={16} />
                    Notificações Visuais
                  </h4>

                  {/* Toggle de Notificações */}
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Exibir notificações</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.showNotifications}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            showNotifications: e.target.checked
                          })}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </label>
                    </div>

                    {notificationSettings.showNotifications && (
                      <>
                        {/* Mensagem de Sucesso */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Mensagem de Sucesso
                            </label>
                            <textarea
                              value={notificationSettings.successMessage}
                              onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                successMessage: e.target.value
                              })}
                              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm bg-white"
                              rows={2}
                              placeholder="Mensagem exibida quando o formulário for enviado com sucesso..."
                            />
                          </div>

                          {/* Cor de fundo da notificação de sucesso */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cor de Fundo (Sucesso)
                              </label>
                              <input
                                type="color"
                                value={notificationSettings.successBackgroundColor || '#10b981'}
                                onChange={(e) => setNotificationSettings({
                                  ...notificationSettings,
                                  successBackgroundColor: e.target.value
                                })}
                                className="w-full h-8 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cor do Texto (Sucesso)
                              </label>
                              <input
                                type="color"
                                value={notificationSettings.successTextColor || '#ffffff'}
                                onChange={(e) => setNotificationSettings({
                                  ...notificationSettings,
                                  successTextColor: e.target.value
                                })}
                                className="w-full h-8 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Mensagem de Erro */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Mensagem de Erro
                            </label>
                            <textarea
                              value={notificationSettings.errorMessage}
                              onChange={(e) => setNotificationSettings({
                                ...notificationSettings,
                                errorMessage: e.target.value
                              })}
                              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm bg-white"
                              rows={2}
                              placeholder="Mensagem exibida quando houver erro no envio..."
                            />
                          </div>

                          {/* Cor de fundo da notificação de erro */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cor de Fundo (Erro)
                              </label>
                              <input
                                type="color"
                                value={notificationSettings.errorBackgroundColor || '#ef4444'}
                                onChange={(e) => setNotificationSettings({
                                  ...notificationSettings,
                                  errorBackgroundColor: e.target.value
                                })}
                                className="w-full h-8 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cor do Texto (Erro)
                              </label>
                              <input
                                type="color"
                                value={notificationSettings.errorTextColor || '#ffffff'}
                                onChange={(e) => setNotificationSettings({
                                  ...notificationSettings,
                                  errorTextColor: e.target.value
                                })}
                                className="w-full h-8 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Configurações Avançadas */}
                        <div className="space-y-3 pt-3 border-t border-green-200">
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={notificationSettings.autoHide}
                                onChange={(e) => setNotificationSettings({
                                  ...notificationSettings,
                                  autoHide: e.target.checked
                                })}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Ocultar automaticamente</span>
                            </label>
                          </div>

                          {notificationSettings.autoHide && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tempo para ocultar (segundos)
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={Math.round((notificationSettings.hideDelay || 5000) / 1000)}
                                onChange={(e) => setNotificationSettings({
                                  ...notificationSettings,
                                  hideDelay: parseInt(e.target.value) * 1000 || 5000
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                              />
                            </div>
                          )}
                        </div>

                        {/* Preview das Notificações */}
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <h5 className="text-xs font-medium text-gray-700 mb-2">Preview das Notificações</h5>
                          <div className="space-y-2">
                            <button
                              onClick={() => showNotification('success')}
                              className="w-full text-xs py-2 px-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            >
                              Testar Notificação de Sucesso
                            </button>
                            <button
                              onClick={() => showNotification('error')}
                              className="w-full text-xs py-2 px-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            >
                              Testar Notificação de Erro
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Configurações de Notificações por Email */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-xl border border-orange-200">
                  <h4 className="text-sm font-semibold text-orange-900 mb-4 flex items-center">
                    <Mail className="mr-2 text-orange-600" size={16} />
                    Notificações por Email
                  </h4>

                  <div className="space-y-4">
                    {/* Toggle principal */}
                    <div>
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Enviar emails de notificação</span>
                        <input
                          type="checkbox"
                          checked={emailNotificationSettings.enabled}
                          onChange={(e) => setEmailNotificationSettings({
                            ...emailNotificationSettings,
                            enabled: e.target.checked
                          })}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Notificar por email quando houver novos cadastros
                      </p>
                    </div>

                    {emailNotificationSettings.enabled && (
                      <>
                        {/* Lista de emails destinatários */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Emails para notificar
                          </label>
                          
                          {/* Campo para adicionar novo email */}
                          <div className="flex items-center space-x-2 mb-3">
                            <input
                              type="email"
                              placeholder="digite@email.com"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  const email = e.currentTarget.value.trim();
                                  if (validateEmail(email)) {
                                    addEmailRecipient(email);
                                    e.currentTarget.value = '';
                                  } else {
                                    showNotification('error', 'Email inválido');
                                  }
                                }
                              }}
                            />
                            <button
                              onClick={(e) => {
                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                const email = input.value.trim();
                                if (validateEmail(email)) {
                                  addEmailRecipient(email);
                                  input.value = '';
                                } else {
                                  showNotification('error', 'Email inválido');
                                }
                              }}
                              className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {/* Lista de emails adicionados */}
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {emailNotificationSettings.recipients.length === 0 ? (
                              <div className="text-center py-3 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                                Nenhum email adicionado
                              </div>
                            ) : (
                              emailNotificationSettings.recipients.map((email, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center space-x-2">
                                    <Mail size={14} className="text-orange-600" />
                                    <span className="text-sm text-gray-700">{email}</span>
                                  </div>
                                  <button
                                    onClick={() => removeEmailRecipient(email)}
                                    className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Configurações de quando enviar */}
                        <div className="space-y-3 pt-3 border-t border-orange-200">
                          <h5 className="text-sm font-medium text-gray-700">Quando enviar email:</h5>
                          
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={emailNotificationSettings.sendOnSubmit}
                                onChange={(e) => setEmailNotificationSettings({
                                  ...emailNotificationSettings,
                                  sendOnSubmit: e.target.checked
                                })}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Ao clicar no botão "Enviar"</span>
                            </label>
                          </div>

                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={emailNotificationSettings.sendOnWhatsApp}
                                onChange={(e) => setEmailNotificationSettings({
                                  ...emailNotificationSettings,
                                  sendOnWhatsApp: e.target.checked
                                })}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Ao clicar no botão "WhatsApp"</span>
                            </label>
                          </div>
                        </div>

                        {/* Personalização do email */}
                        <div className="space-y-3 pt-3 border-t border-orange-200">
                          <h5 className="text-sm font-medium text-gray-700">Personalização do Email:</h5>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Assunto do email
                            </label>
                            <input
                              type="text"
                              value={emailNotificationSettings.subject}
                              onChange={(e) => setEmailNotificationSettings({
                                ...emailNotificationSettings,
                                subject: e.target.value
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                              placeholder="Assunto do email..."
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Use {'{form_name}'} para o nome do formulário
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Template do email
                            </label>
                            <textarea
                              value={emailNotificationSettings.template}
                              onChange={(e) => setEmailNotificationSettings({
                                ...emailNotificationSettings,
                                template: e.target.value
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                              rows={6}
                              placeholder="Template do email..."
                            />
                            <div className="text-xs text-gray-500 mt-2">
                              <p className="font-medium mb-1">Variáveis disponíveis:</p>
                              <div className="grid grid-cols-2 gap-1">
                                <span>• {'{form_name}'}</span>
                                <span>• {'{submission_date}'}</span>
                                <span>• {'{lead_score}'}</span>
                                <span>• {'{is_mql}'}</span>
                                <span>• {'{lead_data}'}</span>
                                <span>• {'{crm_link}'}</span>
                                <span>• {'{whatsapp_link}'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Configurações adicionais */}
                        <div className="space-y-3 pt-3 border-t border-orange-200">
                          <h5 className="text-sm font-medium text-gray-700">Configurações Adicionais:</h5>
                          
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={emailNotificationSettings.includeLeadData}
                                onChange={(e) => setEmailNotificationSettings({
                                  ...emailNotificationSettings,
                                  includeLeadData: e.target.checked
                                })}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Incluir dados completos do lead</span>
                            </label>
                          </div>

                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={emailNotificationSettings.includeMQLScore}
                                onChange={(e) => setEmailNotificationSettings({
                                  ...emailNotificationSettings,
                                  includeMQLScore: e.target.checked
                                })}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Incluir pontuação MQL</span>
                            </label>
                          </div>
                        </div>

                        {/* Preview e Teste do email */}
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-medium text-gray-700">Preview do Email</h5>
                            <button
                              onClick={async () => {
                                if (emailNotificationSettings.recipients.length === 0) {
                                  showNotification('error', 'Adicione pelo menos um email para testar');
                                  return;
                                }
                                
                                try {
                                  const response = await fetch('/api/notifications/test', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      email: emailNotificationSettings.recipients[0]
                                    })
                                  });
                                  
                                  const result = await response.json();
                                  
                                  if (result.success) {
                                    showNotification('success', 'Email de teste enviado com sucesso!');
                                  } else {
                                    showNotification('error', result.error || 'Erro ao enviar email de teste');
                                  }
                                } catch (error) {
                                  showNotification('error', 'Erro ao testar email. Verifique as configurações SMTP.');
                                }
                              }}
                              className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                            >
                              Testar Email
                            </button>
                          </div>
                          <div className="bg-gray-50 p-3 rounded text-xs">
                            <div className="font-medium text-gray-900 mb-2">
                              📧 {emailNotificationSettings.subject.replace('{form_name}', formData.name || 'Novo Formulário')}
                            </div>
                            <div className="text-gray-700 whitespace-pre-line">
                              {emailNotificationSettings.template
                                .replace('{form_name}', formData.name || 'Novo Formulário')
                                .replace('{submission_date}', new Date().toLocaleString('pt-BR'))
                                .replace('{lead_score}', '85')
                                .replace('{is_mql}', 'Sim')
                                .replace('{lead_data}', 'Nome: João Silva\nEmail: joao@exemplo.com\nTelefone: (11) 99999-9999')
                                .replace('{crm_link}', `${window.location.origin}/pipeline`)
                                .replace('{whatsapp_link}', 'https://wa.me/5511999999999')
                                .substring(0, 200) + '...'}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Configurações Avançadas */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-900 mb-4 flex items-center">
                    <Settings className="mr-2 text-purple-600" size={16} />
                    Configurações Avançadas
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL de Redirecionamento (após envio)
                      </label>
                      <input
                        type="url"
                        value={submitButton.redirectUrl || ''}
                        onChange={(e) => setSubmitButton({...submitButton, redirectUrl: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="https://exemplo.com/obrigado"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Deixe vazio para exibir apenas a notificação
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Threshold MQL (pontos mínimos)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={scoringThreshold}
                        onChange={(e) => setScoringThreshold(parseInt(e.target.value) || 70)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leads com essa pontuação ou mais serão marcados como MQL
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dicas de Configuração */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                    <Info className="mr-2 text-blue-600" size={14} />
                    Dicas de Configuração
                  </h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Use URLs amigáveis para melhor SEO e experiência</li>
                    <li>• Personalize as cores das notificações para sua marca</li>
                    <li>• Configure o tempo de exibição baseado no tamanho da mensagem</li>
                    <li>• URLs de redirecionamento são úteis para páginas de agradecimento</li>
                    <li>• Ajuste o threshold MQL baseado na sua estratégia de qualificação</li>
                  </ul>
                </div>

                {/* 🆕 NOVA SEÇÃO - Configurações de Fonte de Captação */}
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-xl border border-violet-200">
                  <h4 className="text-sm font-semibold text-violet-900 mb-4 flex items-center">
                    <Target className="mr-2 text-violet-600" size={16} />
                    Fonte de Captação & Rastreamento
                  </h4>

                  {/* Toggle Principal */}
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Rastreamento de origem ativo</span>
                          <p className="text-xs text-gray-500 mt-1">
                            Rastreia automaticamente a origem dos leads (UTMs + origem personalizada)
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={leadTracking.enabled}
                          onChange={(e) => setLeadTracking({
                            ...leadTracking,
                            enabled: e.target.checked
                          })}
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 transform scale-125"
                        />
                      </label>
                    </div>

                    {leadTracking.enabled && (
                      <>
                        {/* Estratégia de Rastreamento */}
                        <div className="bg-white p-3 rounded-lg border border-violet-200">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Estratégia de Rastreamento
                          </label>
                          <div className="space-y-3">
                            <div>
                              <label className="flex items-start">
                                <input
                                  type="radio"
                                  name="leadSource"
                                  value="utm"
                                  checked={leadTracking.leadSource === 'utm'}
                                  onChange={(e) => setLeadTracking({
                                    ...leadTracking,
                                    leadSource: e.target.value as 'utm' | 'custom' | 'form'
                                  })}
                                  className="text-violet-600 focus:ring-violet-500 mt-0.5"
                                />
                                <div className="ml-3">
                                  <span className="text-sm font-medium text-gray-700">
                                    UTMs Automáticos (Recomendado)
                                  </span>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Detecta automaticamente utm_source, utm_medium, utm_campaign da URL
                                  </p>
                                </div>
                              </label>
                            </div>
                            
                            <div>
                              <label className="flex items-start">
                                <input
                                  type="radio"
                                  name="leadSource"
                                  value="custom"
                                  checked={leadTracking.leadSource === 'custom'}
                                  onChange={(e) => setLeadTracking({
                                    ...leadTracking,
                                    leadSource: e.target.value as 'utm' | 'custom' | 'form'
                                  })}
                                  className="text-violet-600 focus:ring-violet-500 mt-0.5"
                                />
                                <div className="ml-3">
                                  <span className="text-sm font-medium text-gray-700">
                                    Origem Personalizada
                                  </span>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Define uma origem fixa para este formulário específico
                                  </p>
                                </div>
                              </label>
                            </div>
                            
                            <div>
                              <label className="flex items-start">
                                <input
                                  type="radio"
                                  name="leadSource"
                                  value="form"
                                  checked={leadTracking.leadSource === 'form'}
                                  onChange={(e) => setLeadTracking({
                                    ...leadTracking,
                                    leadSource: e.target.value as 'utm' | 'custom' | 'form'
                                  })}
                                  className="text-violet-600 focus:ring-violet-500 mt-0.5"
                                />
                                <div className="ml-3">
                                  <span className="text-sm font-medium text-gray-700">
                                    Nome do Formulário
                                  </span>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Usa o nome do formulário como origem
                                  </p>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Configuração para Origem Personalizada */}
                        {leadTracking.leadSource === 'custom' && (
                          <div className="bg-white p-3 rounded-lg border border-violet-200 space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nome da Fonte/Campanha
                              </label>
                              <input
                                type="text"
                                value={leadTracking.customSourceName}
                                onChange={(e) => setLeadTracking({
                                  ...leadTracking,
                                  customSourceName: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm"
                                placeholder="Ex: E-book Marketing Digital 2024"
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Fonte (Source)
                                </label>
                                <input
                                  type="text"
                                  value={leadTracking.customSource}
                                  onChange={(e) => setLeadTracking({
                                    ...leadTracking,
                                    customSource: e.target.value
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm"
                                  placeholder="Ex: ebook, webinar, ads"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Meio (Medium)
                                </label>
                                <input
                                  type="text"
                                  value={leadTracking.customMedium}
                                  onChange={(e) => setLeadTracking({
                                    ...leadTracking,
                                    customMedium: e.target.value
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm"
                                  placeholder="Ex: social, email, cpc"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Campanha (Campaign)
                              </label>
                              <input
                                type="text"
                                value={leadTracking.customCampaign}
                                onChange={(e) => setLeadTracking({
                                  ...leadTracking,
                                  customCampaign: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm"
                                placeholder="Ex: black-friday-2024"
                              />
                            </div>
                          </div>
                        )}

                        {/* Configurações Avançadas */}
                        <div className="bg-white p-3 rounded-lg border border-violet-200 space-y-3">
                          <h5 className="text-sm font-medium text-gray-700">Configurações Avançadas</h5>
                          
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={leadTracking.showInPipeline}
                                onChange={(e) => setLeadTracking({
                                  ...leadTracking,
                                  showInPipeline: e.target.checked
                                })}
                                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Exibir origem no card da pipeline</span>
                            </label>
                          </div>
                          
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={leadTracking.trackConversions}
                                onChange={(e) => setLeadTracking({
                                  ...leadTracking,
                                  trackConversions: e.target.checked
                                })}
                                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Rastrear conversões por fonte</span>
                            </label>
                          </div>
                        </div>

                        {/* Preview da Configuração */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Eye className="mr-1" size={14} />
                            Preview da Origem
                          </h5>
                          <div className="text-xs">
                            {leadTracking.leadSource === 'utm' && (
                              <div className="space-y-1">
                                <p><strong>Fonte:</strong> Google Ads (detecção automática)</p>
                                <p><strong>Meio:</strong> cpc (da URL)</p>
                                <p><strong>Campanha:</strong> nome-da-campanha (da URL)</p>
                                <p className="text-violet-600">🔄 Valores captados automaticamente da URL</p>
                              </div>
                            )}
                            
                            {leadTracking.leadSource === 'custom' && (
                              <div className="space-y-1">
                                <p><strong>Nome:</strong> {leadTracking.customSourceName || 'Nome personalizado'}</p>
                                <p><strong>Fonte:</strong> {leadTracking.customSource || 'custom'}</p>
                                <p><strong>Meio:</strong> {leadTracking.customMedium || 'form'}</p>
                                <p><strong>Campanha:</strong> {leadTracking.customCampaign || 'sem-campanha'}</p>
                                <p className="text-violet-600">🎯 Valores fixos para este formulário</p>
                              </div>
                            )}
                            
                            {leadTracking.leadSource === 'form' && (
                              <div className="space-y-1">
                                <p><strong>Origem:</strong> {formData.name || 'Nome do Formulário'}</p>
                                <p><strong>Fonte:</strong> formulario-web</p>
                                <p><strong>Meio:</strong> website</p>
                                <p className="text-violet-600">📝 Baseado no nome do formulário</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mapeamento de Fontes UTM */}
                        {leadTracking.leadSource === 'utm' && (
                          <div className="bg-white p-3 rounded-lg border border-violet-200">
                            <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                              <Sliders className="mr-1" size={14} />
                              Mapeamento de Fontes UTM
                            </h5>
                            <div className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                              {Object.entries(leadTracking.utmTracking.sourceMappings).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center py-1">
                                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{key}</span>
                                  <span className="text-gray-600">→</span>
                                  <span className="font-medium">{value}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                              Quando utm_source=google, será exibido como "Google Ads" na pipeline
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Painel de Conexão com Pipeline */}
            {activePanel === 'pipeline' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Conexão com Pipeline</h3>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-xs text-cyan-600">
                      <TrendingUp size={12} />
                      <span>Integração Inteligente</span>
                    </div>
                    {pipelineConnection.enabled && (
                      <div className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Conectado
                      </div>
                    )}
                  </div>
                </div>

                {/* Toggle Principal */}
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-xl border border-cyan-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-cyan-900 flex items-center">
                        <TrendingUp className="mr-2 text-cyan-600" size={16} />
                        Ativar Conexão com Pipeline
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Conecte este formulário diretamente a uma pipeline para criar leads automaticamente
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={pipelineConnection.enabled}
                      onChange={(e) => setPipelineConnection({
                        ...pipelineConnection,
                        enabled: e.target.checked
                      })}
                      className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 transform scale-125"
                    />
                  </div>
                </div>

                {pipelineConnection.enabled && (
                  <>
                    {/* Seleção de Pipeline */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 mb-4 flex items-center">
                        <Target className="mr-2 text-blue-600" size={16} />
                        Selecionar Pipeline
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Pipeline de Destino
                            </label>
                            <button
                              onClick={() => loadAvailablePipelines()}
                              disabled={loadingPipelines}
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {loadingPipelines ? 'Carregando...' : 'Recarregar'}
                            </button>
                          </div>
                          
                          {loadingPipelines ? (
                            <div className="flex items-center justify-center py-3 text-gray-500">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                              Carregando pipelines...
                            </div>
                          ) : (
                            <>
                              <select
                                value={pipelineConnection.pipeline_id}
                                onChange={(e) => setPipelineConnection({
                                  ...pipelineConnection,
                                  pipeline_id: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="">Selecione uma pipeline...</option>
                                {availablePipelines.map(pipeline => (
                                  <option key={pipeline.id} value={pipeline.id}>
                                    {pipeline.name} {pipeline.description && `- ${pipeline.description}`}
                                  </option>
                                ))}
                              </select>
                              
                              {availablePipelines.length === 0 && (
                                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <div className="flex items-center text-yellow-800 text-sm">
                                    <AlertCircle className="mr-2" size={16} />
                                    <span>Nenhuma pipeline encontrada. Certifique-se de ter criado pelo menos uma pipeline ativa.</span>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {selectedPipeline && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Estágio Inicial
                            </label>
                            <select
                              value={pipelineConnection.stage_id}
                              onChange={(e) => setPipelineConnection({
                                ...pipelineConnection,
                                stage_id: e.target.value
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="">Selecione o estágio inicial...</option>
                              {selectedPipeline.stages.map(stage => (
                                <option key={stage.id} value={stage.id}>
                                  {stage.name} {stage.is_default && '(Padrão)'}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mapeamento Inteligente de Campos */}
                    {selectedPipeline && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-green-900 flex items-center">
                            <Zap className="mr-2 text-green-600" size={16} />
                            Mapeamento Inteligente de Campos
                          </h4>
                          <button
                            onClick={() => autoMapFields(selectedPipeline.fields)}
                            className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Mapear Automaticamente
                          </button>
                        </div>

                        <div className="space-y-3">
                          {fields.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              Adicione campos ao formulário para configurar o mapeamento
                            </div>
                          ) : (
                            fields.map(field => {
                              const mapping = pipelineConnection.field_mappings.find(m => m.form_field_id === field.id);
                              const isHighConfidence = mapping && mapping.confidence >= 85;
                              const isMediumConfidence = mapping && mapping.confidence >= 70 && mapping.confidence < 85;
                              
                              return (
                                <div
                                  key={field.id}
                                  className={`p-3 rounded-lg border-2 transition-all ${
                                    mapping 
                                      ? isHighConfidence 
                                        ? 'bg-green-50 border-green-300' 
                                        : isMediumConfidence 
                                          ? 'bg-yellow-50 border-yellow-300'
                                          : 'bg-blue-50 border-blue-300'
                                      : 'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {field.field_label}
                                      </span>
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {field.field_type}
                                      </span>
                                      {mapping && (
                                        <div className={`text-xs px-2 py-1 rounded-full ${
                                          isHighConfidence 
                                            ? 'bg-green-100 text-green-700'
                                            : isMediumConfidence
                                              ? 'bg-yellow-100 text-yellow-700'  
                                              : 'bg-blue-100 text-blue-700'
                                        }`}>
                                          {mapping.confidence}% confiança
                                        </div>
                                      )}
                                    </div>
                                    {mapping && (
                                      <button
                                        onClick={() => removeFieldMapping(field.id)}
                                        className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">mapeia para</span>
                                    <select
                                      value={mapping?.pipeline_field_name || ''}
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          addFieldMapping(field.id, e.target.value);
                                        } else {
                                          removeFieldMapping(field.id);
                                        }
                                      }}
                                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-green-500"
                                    >
                                      <option value="">Não mapear</option>
                                      <optgroup label="Campos Padrão">
                                        {selectedPipeline.fields.filter(f => !f.is_custom).map(pipelineField => (
                                          <option key={pipelineField.name} value={pipelineField.name}>
                                            {pipelineField.label} ({pipelineField.name})
                                          </option>
                                        ))}
                                      </optgroup>
                                      {selectedPipeline.fields.some(f => f.is_custom) && (
                                        <optgroup label="Campos Customizados">
                                          {selectedPipeline.fields.filter(f => f.is_custom).map(pipelineField => (
                                            <option key={pipelineField.name} value={pipelineField.name}>
                                              {pipelineField.label} ({pipelineField.name})
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                    </select>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                          <h5 className="text-xs font-medium text-gray-700 mb-2">Estatísticas do Mapeamento</h5>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-2 bg-green-50 rounded">
                              <div className="font-semibold text-green-700">
                                {pipelineConnection.field_mappings.filter(m => m.confidence >= 85).length}
                              </div>
                              <div className="text-green-600">Alta Confiança</div>
                            </div>
                            <div className="text-center p-2 bg-yellow-50 rounded">
                              <div className="font-semibold text-yellow-700">
                                {pipelineConnection.field_mappings.filter(m => m.confidence >= 70 && m.confidence < 85).length}
                              </div>
                              <div className="text-yellow-600">Média Confiança</div>
                            </div>
                            <div className="text-center p-2 bg-blue-50 rounded">
                              <div className="font-semibold text-blue-700">
                                {pipelineConnection.field_mappings.filter(m => m.confidence < 70).length}
                              </div>
                              <div className="text-blue-600">Manual</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Configurações Avançadas da Pipeline */}
                    {selectedPipeline && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                        <h4 className="text-sm font-semibold text-purple-900 mb-4 flex items-center">
                          <Settings className="mr-2 text-purple-600" size={16} />
                          Configurações Avançadas
                        </h4>

                        <div className="space-y-4">
                          {/* Uso de Score para Estágio */}
                          <div>
                            <label className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Usar Lead Score para definir estágio</span>
                              <input
                                type="checkbox"
                                checked={pipelineConnection.use_score_for_stage}
                                onChange={(e) => setPipelineConnection({
                                  ...pipelineConnection,
                                  use_score_for_stage: e.target.checked
                                })}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              Define automaticamente o estágio baseado na pontuação do lead
                            </p>
                          </div>

                          {pipelineConnection.use_score_for_stage && (
                            <div className="space-y-3 pt-3 border-t border-purple-200">
                              <h5 className="text-sm font-medium text-gray-700">Mapeamento de Score → Estágio:</h5>
                              
                              <div className="grid grid-cols-1 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    0-30 pontos (Lead Frio)
                                  </label>
                                  <select
                                    value={pipelineConnection.score_stage_mapping.low}
                                    onChange={(e) => setPipelineConnection({
                                      ...pipelineConnection,
                                      score_stage_mapping: {
                                        ...pipelineConnection.score_stage_mapping,
                                        low: e.target.value
                                      }
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  >
                                    <option value="">Usar estágio padrão</option>
                                    {selectedPipeline.stages.map(stage => (
                                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    31-70 pontos (Lead Qualificado)
                                  </label>
                                  <select
                                    value={pipelineConnection.score_stage_mapping.medium}
                                    onChange={(e) => setPipelineConnection({
                                      ...pipelineConnection,
                                      score_stage_mapping: {
                                        ...pipelineConnection.score_stage_mapping,
                                        medium: e.target.value
                                      }
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  >
                                    <option value="">Usar estágio padrão</option>
                                    {selectedPipeline.stages.map(stage => (
                                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    71+ pontos (MQL Pronto)
                                  </label>
                                  <select
                                    value={pipelineConnection.score_stage_mapping.high}
                                    onChange={(e) => setPipelineConnection({
                                      ...pipelineConnection,
                                      score_stage_mapping: {
                                        ...pipelineConnection.score_stage_mapping,
                                        high: e.target.value
                                      }
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  >
                                    <option value="">Usar estágio padrão</option>
                                    {selectedPipeline.stages.map(stage => (
                                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Criação de Tarefas */}
                          <div className="pt-3 border-t border-purple-200">
                            <label className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Criar tarefa automática</span>
                              <input
                                type="checkbox"
                                checked={pipelineConnection.create_task}
                                onChange={(e) => setPipelineConnection({
                                  ...pipelineConnection,
                                  create_task: e.target.checked
                                })}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                            </label>
                            
                            {pipelineConnection.create_task && (
                              <div className="space-y-3 mt-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Descrição da tarefa
                                  </label>
                                  <textarea
                                    value={pipelineConnection.task_description}
                                    onChange={(e) => setPipelineConnection({
                                      ...pipelineConnection,
                                      task_description: e.target.value
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    rows={2}
                                    placeholder="Descrição da tarefa..."
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Use {'{form_name}'} para o nome do formulário
                                  </p>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Prazo (dias)
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={pipelineConnection.task_due_days}
                                    onChange={(e) => setPipelineConnection({
                                      ...pipelineConnection,
                                      task_due_days: parseInt(e.target.value) || 1
                                    })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Atribuição Automática */}
                          <div className="pt-3 border-t border-purple-200">
                            <label className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Atribuição automática (Round-robin)</span>
                              <input
                                type="checkbox"
                                checked={pipelineConnection.auto_assign}
                                onChange={(e) => setPipelineConnection({
                                  ...pipelineConnection,
                                  auto_assign: e.target.checked
                                })}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              Distribui leads automaticamente entre os vendedores da pipeline
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Preview da Conexão */}
                    {selectedPipeline && pipelineConnection.field_mappings.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                          <Eye className="mr-2 text-gray-600" size={16} />
                          Preview da Conexão
                        </h4>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Pipeline:</span>
                            <span className="font-medium">{selectedPipeline.name}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Estágio inicial:</span>
                            <span className="font-medium">
                              {selectedPipeline.stages.find(s => s.id === pipelineConnection.stage_id)?.name || 'Não definido'}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Campos mapeados:</span>
                            <span className="font-medium">{pipelineConnection.field_mappings.length}/{fields.length}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Atribuição automática:</span>
                            <span className={`font-medium ${pipelineConnection.auto_assign ? 'text-green-600' : 'text-gray-500'}`}>
                              {pipelineConnection.auto_assign ? 'Ativada' : 'Desativada'}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Criação de tarefa:</span>
                            <span className={`font-medium ${pipelineConnection.create_task ? 'text-green-600' : 'text-gray-500'}`}>
                              {pipelineConnection.create_task ? 'Ativada' : 'Desativada'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <h5 className="text-xs font-medium text-blue-900 mb-2">Fluxo de Submissão:</h5>
                          <ol className="text-xs text-blue-700 space-y-1">
                            <li>1. Lead preenche e envia o formulário</li>
                            <li>2. Sistema calcula Lead Score automaticamente</li>
                            <li>3. Lead é criado na pipeline "{selectedPipeline.name}"</li>
                            <li>4. Campos são mapeados conforme configuração</li>
                            {pipelineConnection.use_score_for_stage && (
                              <li>5. Estágio é definido baseado no score</li>
                            )}
                            {pipelineConnection.auto_assign && (
                              <li>{pipelineConnection.use_score_for_stage ? '6' : '5'}. Lead é atribuído automaticamente</li>
                            )}
                            {pipelineConnection.create_task && (
                              <li>{(pipelineConnection.use_score_for_stage ? 6 : 5) + (pipelineConnection.auto_assign ? 1 : 0)}. Tarefa de follow-up é criada</li>
                            )}
                            <li>{((pipelineConnection.use_score_for_stage ? 6 : 5) + (pipelineConnection.auto_assign ? 1 : 0) + (pipelineConnection.create_task ? 1 : 0))}. Notificações são enviadas</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Dicas de Pipeline */}
                <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                  <h4 className="text-sm font-medium text-cyan-900 mb-2 flex items-center">
                    <Info className="mr-2 text-cyan-600" size={14} />
                    Dicas de Conexão com Pipeline
                  </h4>
                  <ul className="text-xs text-cyan-700 space-y-1">
                    <li>• O mapeamento automático usa inteligência semântica para sugerir campos</li>
                    <li>• Leads com score alto podem ir direto para estágios avançados</li>
                    <li>• A atribuição round-robin distribui leads igualmente entre vendedores</li>
                    <li>• Tarefas automáticas garantem follow-up rápido dos leads</li>
                    <li>• Todos os dados do formulário são preservados no lead</li>
                  </ul>
                </div>
              </div>
            )}

            {activePanel === 'destination' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-900">Destino do Lead</h3>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Escolha onde os leads capturados por este formulário devem ser direcionados
                  </p>
                </div>

                {/* Toggle Principal */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">📍 Para onde enviar os leads?</h4>
                  
                  <div className="space-y-3">
                    {/* Opção Pipeline */}
                    <label className={`cursor-pointer border-2 rounded-lg p-4 block transition-all ${
                      leadDestination.type === 'pipeline' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-start gap-3">
                        <input 
                          type="radio" 
                          name="destination-type" 
                          value="pipeline"
                          checked={leadDestination.type === 'pipeline'}
                          onChange={(e) => setLeadDestination(prev => ({ ...prev, type: e.target.value as 'pipeline' | 'leads-menu' }))}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <GitBranch className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-gray-900">Criar Oportunidade na Pipeline</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Lead vai diretamente para um estágio da pipeline como oportunidade de venda
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">✅ Mapeamento automático</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">🎯 Score intelligence</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">⚡ Automação completa</span>
                          </div>
                        </div>
                      </div>
                    </label>

                    {/* Opção Leads Menu */}
                    <label className={`cursor-pointer border-2 rounded-lg p-4 block transition-all ${
                      leadDestination.type === 'leads-menu' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-start gap-3">
                        <input 
                          type="radio" 
                          name="destination-type" 
                          value="leads-menu"
                          checked={leadDestination.type === 'leads-menu'}
                          onChange={(e) => setLeadDestination(prev => ({ ...prev, type: e.target.value as 'pipeline' | 'leads-menu' }))}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-5 h-5 text-purple-600" />
                            <span className="font-medium text-gray-900">Criar Lead no Menu de Leads</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Lead fica disponível no menu "Leads" para qualificação e distribuição manual
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">👥 Visibilidade customizada</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">🔄 Rodízio automático</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">📋 Distribuição manual</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Configurações Específicas */}
                {leadDestination.type === 'pipeline' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">⚙️ Configurações da Pipeline</h4>
                    <p className="text-blue-700 text-sm">
                      As configurações da pipeline estão disponíveis na aba "Pipeline" ➡️
                    </p>
                  </div>
                )}

                {leadDestination.type === 'leads-menu' && (
                  <div className="space-y-6">
                    {/* Configurações de Visibilidade */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-medium text-purple-900 mb-3">👁️ Quem pode ver este lead?</h4>
                      
                      <div className="space-y-3">
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="visibility-type" 
                            value="all-members"
                            checked={leadDestination.visibility.type === 'all-members'}
                            onChange={(e) => setLeadDestination(prev => ({ 
                              ...prev, 
                              visibility: { ...prev.visibility, type: e.target.value as 'all-members' | 'specific-members' | 'admin-only', specific_members: [] }
                            }))}
                          />
                          <span className="text-sm font-medium">Todos os Members</span>
                        </label>
                        
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="visibility-type" 
                            value="specific-members"
                            checked={leadDestination.visibility.type === 'specific-members'}
                            onChange={(e) => setLeadDestination(prev => ({ 
                              ...prev, 
                              visibility: { ...prev.visibility, type: e.target.value as 'all-members' | 'specific-members' | 'admin-only' }
                            }))}
                          />
                          <span className="text-sm font-medium">Members Específicos</span>
                        </label>
                        
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="visibility-type" 
                            value="admin-only"
                            checked={leadDestination.visibility.type === 'admin-only'}
                            onChange={(e) => setLeadDestination(prev => ({ 
                              ...prev, 
                              visibility: { ...prev.visibility, type: e.target.value as 'all-members' | 'specific-members' | 'admin-only', specific_members: [] }
                            }))}
                          />
                          <span className="text-sm font-medium">Apenas Admins</span>
                        </label>
                      </div>

                      {/* Seletor de Members Específicos */}
                      {leadDestination.visibility.type === 'specific-members' && (
                        <div className="mt-4 p-3 bg-white rounded border">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Selecione os Members:
                          </label>
                          <div className="max-h-32 overflow-y-auto space-y-2">
                            {availableMembers.map(member => (
                              <label key={member.id} className="flex items-center gap-2">
                                <input 
                                  type="checkbox"
                                  checked={leadDestination.visibility.specific_members.includes(member.id)}
                                  onChange={(e) => {
                                    const memberId = member.id;
                                    setLeadDestination(prev => ({
                                      ...prev,
                                      visibility: {
                                        ...prev.visibility,
                                        specific_members: e.target.checked 
                                          ? [...prev.visibility.specific_members, memberId]
                                          : prev.visibility.specific_members.filter(id => id !== memberId)
                                      }
                                    }));
                                  }}
                                />
                                <span className="text-sm">
                                  {member.first_name} {member.last_name} ({member.email})
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Configurações de Distribuição */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-3">📋 Como distribuir os leads?</h4>
                      
                      <div className="space-y-3">
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="distribution-mode" 
                            value="manual"
                            checked={leadDestination.distribution.mode === 'manual'}
                            onChange={(e) => setLeadDestination(prev => ({ 
                              ...prev, 
                              distribution: { ...prev.distribution, mode: e.target.value as 'manual' | 'round-robin' | 'first-available', auto_assign: false }
                            }))}
                          />
                          <span className="text-sm font-medium">📝 Distribuição Manual</span>
                          <span className="text-xs text-gray-500">(Admin atribui depois)</span>
                        </label>
                        
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="distribution-mode" 
                            value="round-robin"
                            checked={leadDestination.distribution.mode === 'round-robin'}
                            onChange={(e) => setLeadDestination(prev => ({ 
                              ...prev, 
                              distribution: { ...prev.distribution, mode: e.target.value as 'manual' | 'round-robin' | 'first-available', auto_assign: true }
                            }))}
                          />
                          <span className="text-sm font-medium">🔄 Rodízio Automático</span>
                          <span className="text-xs text-gray-500">(Distribuição igualitária)</span>
                        </label>
                        
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="distribution-mode" 
                            value="first-available"
                            checked={leadDestination.distribution.mode === 'first-available'}
                            onChange={(e) => setLeadDestination(prev => ({ 
                              ...prev, 
                              distribution: { ...prev.distribution, mode: e.target.value as 'manual' | 'round-robin' | 'first-available', auto_assign: true }
                            }))}
                          />
                          <span className="text-sm font-medium">⚡ Primeiro Disponível</span>
                          <span className="text-xs text-gray-500">(Menor carga de trabalho)</span>
                        </label>
                      </div>

                      {/* Auto Assignment Toggle */}
                      <div className="mt-4 p-3 bg-white rounded border">
                        <label className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={leadDestination.distribution.auto_assign}
                            onChange={(e) => setLeadDestination(prev => ({ 
                              ...prev, 
                              distribution: { ...prev.distribution, auto_assign: e.target.checked }
                            }))}
                            disabled={leadDestination.distribution.mode === 'manual'}
                          />
                          <span className="text-sm font-medium">🤖 Atribuição Automática</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Se desabilitado, lead ficará pendente para atribuição manual
                        </p>
                      </div>
                    </div>

                    {/* Mapeamento de Campos */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2">🔗 Mapeamento Automático de Campos</h4>
                      <p className="text-yellow-800 text-sm mb-3">
                        Os campos do formulário serão mapeados automaticamente para os campos padrão do menu de leads:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span className="px-2 py-1 bg-white rounded border">📝 Nome → first_name</span>
                        <span className="px-2 py-1 bg-white rounded border">📧 Email → email</span>
                        <span className="px-2 py-1 bg-white rounded border">📞 Telefone → phone</span>
                        <span className="px-2 py-1 bg-white rounded border">🏢 Empresa → company</span>
                        <span className="px-2 py-1 bg-white rounded border">💼 Cargo → job_title</span>
                        <span className="px-2 py-1 bg-white rounded border">💰 Valor → estimated_value</span>
                      </div>
                    </div>

                    {/* Preview da Configuração */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">👀 Preview da Configuração</h4>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Destino:</span>
                          <span className="font-medium">Menu de Leads</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Visibilidade:</span>
                          <span className="font-medium">
                            {leadDestination.visibility.type === 'all-members' && 'Todos os Members'}
                            {leadDestination.visibility.type === 'specific-members' && 
                              `${leadDestination.visibility.specific_members.length} Members específicos`}
                            {leadDestination.visibility.type === 'admin-only' && 'Apenas Admins'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Distribuição:</span>
                          <span className="font-medium">
                            {leadDestination.distribution.mode === 'manual' && 'Manual'}
                            {leadDestination.distribution.mode === 'round-robin' && 'Rodízio Automático'}
                            {leadDestination.distribution.mode === 'first-available' && 'Primeiro Disponível'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Atribuição:</span>
                          <span className="font-medium">
                            {leadDestination.distribution.auto_assign ? 'Automática' : 'Manual'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sistema de Notificações Personalizadas */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div
            style={{
              backgroundColor: notification.type === 'success' 
                ? notificationSettings.successBackgroundColor 
                : notificationSettings.errorBackgroundColor,
              color: notification.type === 'success' 
                ? notificationSettings.successTextColor 
                : notificationSettings.errorTextColor,
            }}
            className="p-4 rounded-lg shadow-xl border-l-4 transition-all duration-300 transform"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <div 
                    style={{ backgroundColor: notificationSettings.successTextColor, opacity: 0.2 }}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                  >
                    <svg 
                      className="w-4 h-4" 
                      style={{ color: notificationSettings.successTextColor }}
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div 
                    style={{ backgroundColor: notificationSettings.errorTextColor, opacity: 0.2 }}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                  >
                    <svg 
                      className="w-4 h-4" 
                      style={{ color: notificationSettings.errorTextColor }}
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold">
                  {notification.type === 'success' ? 'Sucesso!' : 'Erro!'}
                </p>
                <p className="text-sm mt-1 opacity-90">
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={hideNotification}
                  style={{ 
                    color: notification.type === 'success' 
                      ? notificationSettings.successTextColor 
                      : notificationSettings.errorTextColor,
                    opacity: 0.7
                  }}
                  className="inline-flex hover:opacity-100 transition-opacity"
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
});

// 🚀 OTIMIZAÇÃO: Nome para display do componente memoizado
ModernFormBuilder.displayName = 'ModernFormBuilder';

export default ModernFormBuilder;
