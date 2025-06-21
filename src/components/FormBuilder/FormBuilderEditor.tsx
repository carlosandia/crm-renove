import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '../../lib/supabase';
import FormFieldEditor, { SingleFieldEditor } from './FormFieldEditor';
import FormStylingEditor from './FormStylingEditor';
import FormSettingsEditor from './FormSettingsEditor';
import { 
  Save, Eye, Settings, Palette, Plus, GripVertical, Trash2, Copy, 
  Type, Mail, Phone, Calendar, MapPin, Image, Star, CheckSquare,
  FileText, DollarSign, Clock, Users, MessageSquare, Hash,
  ToggleLeft, List, Upload, Link2, Smartphone
} from 'lucide-react';

interface CustomForm {
  id: string;
  name: string;
  description?: string;
  slug: string;
  is_active: boolean;
  settings: any;
  styling: any;
  redirect_url?: string;
  pipeline_id?: string;
  assigned_to?: string;
  qualification_rules: any;
  created_at: string;
  updated_at: string;
}

interface FormField {
  id?: string;
  field_type: string;
  field_name: string;
  field_label: string;
  field_description?: string;
  placeholder?: string;
  is_required: boolean;
  field_options: any;
  validation_rules: any;
  styling: any;
  order_index: number;
}

interface FormBuilderEditorProps {
  form: CustomForm | null;
  onSave: () => void;
  onCancel: () => void;
  tenantId: string;
}

// Tipos de campos avançados disponíveis
const FIELD_TYPES = [
  { type: 'text', label: 'Texto Simples', icon: Type, description: 'Campo de texto básico' },
  { type: 'email', label: 'E-mail', icon: Mail, description: 'Campo de e-mail com validação' },
  { type: 'phone', label: 'Telefone', icon: Phone, description: 'Campo de telefone formatado' },
  { type: 'textarea', label: 'Texto Longo', icon: FileText, description: 'Área de texto multilinha' },
  { type: 'number', label: 'Número', icon: Hash, description: 'Campo numérico' },
  { type: 'date', label: 'Data', icon: Calendar, description: 'Seletor de data' },
  { type: 'time', label: 'Horário', icon: Clock, description: 'Seletor de horário' },
  { type: 'select', label: 'Lista Suspensa', icon: List, description: 'Menu de opções' },
  { type: 'radio', label: 'Múltipla Escolha', icon: CheckSquare, description: 'Opções exclusivas' },
  { type: 'checkbox', label: 'Caixas de Seleção', icon: CheckSquare, description: 'Múltiplas seleções' },
  { type: 'range', label: 'Controle Deslizante', icon: ToggleLeft, description: 'Seletor de intervalo' },
  { type: 'rating', label: 'Avaliação', icon: Star, description: 'Sistema de estrelas' },
  { type: 'file', label: 'Upload de Arquivo', icon: Upload, description: 'Envio de arquivos' },
  { type: 'url', label: 'URL/Link', icon: Link2, description: 'Campo de URL' },
  { type: 'address', label: 'Endereço', icon: MapPin, description: 'Campo de endereço completo' },
  { type: 'currency', label: 'Moeda', icon: DollarSign, description: 'Campo monetário' },
  { type: 'cpf', label: 'CPF', icon: Users, description: 'Campo de CPF formatado' },
  { type: 'cnpj', label: 'CNPJ', icon: Users, description: 'Campo de CNPJ formatado' },
  { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, description: 'Botão de WhatsApp' },
  { type: 'divider', label: 'Divisor', icon: Type, description: 'Linha separadora' },
  { type: 'heading', label: 'Título', icon: Type, description: 'Título/cabeçalho' },
  { type: 'paragraph', label: 'Parágrafo', icon: FileText, description: 'Texto explicativo' },
  { type: 'image', label: 'Imagem', icon: Image, description: 'Inserir imagem' }
];

const FormBuilderEditor: React.FC<FormBuilderEditorProps> = ({
  form,
  onSave,
  onCancel,
  tenantId
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    is_active: true,
    settings: {
      whatsapp_number: '',
      whatsapp_message: 'Olá! Gostaria de mais informações.',
      success_message: 'Formulário enviado com sucesso!',
      enable_captcha: false,
      enable_double_optin: false,
      enable_analytics: true
    },
    styling: {
      primaryColor: '#3B82F6',
      fontFamily: 'system-ui',
      fontSize: '16px',
      spacing: 'normal',
      theme: 'light',
      width: 'medium',
      borderRadius: '8px',
      boxShadow: 'medium'
    },
    redirect_url: '',
    pipeline_id: '',
    assigned_to: '',
    qualification_rules: {}
  });

  const [fields, setFields] = useState<FormField[]>([]);
  const [activeTab, setActiveTab] = useState<'builder' | 'preview' | 'styling' | 'settings'>('builder');
  const [saving, setSaving] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [showFieldTypes, setShowFieldTypes] = useState(false);

  useEffect(() => {
    if (form) {
      setFormData({
        name: form.name,
        description: form.description || '',
        slug: form.slug,
        is_active: form.is_active,
        settings: { ...formData.settings, ...form.settings },
        styling: { ...formData.styling, ...form.styling },
        redirect_url: form.redirect_url || '',
        pipeline_id: form.pipeline_id || '',
        assigned_to: form.assigned_to || '',
        qualification_rules: form.qualification_rules || {}
      });
      loadFormFields(form.id);
    }
  }, [form]);

  const loadFormFields = async (formId: string) => {
    try {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('order_index');

      if (error) {
        console.error('Erro ao carregar campos:', error);
        return;
      }

      setFields(data || []);
    } catch (error) {
      console.error('Erro ao carregar campos:', error);
    }
  };

  const generateSlug = (name: string) => {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .trim();
    
    // Adicionar timestamp para garantir unicidade se necessário
    return baseSlug || `form-${Date.now()}`;
  };

  const checkSlugExists = async (slug: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('custom_forms')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('slug', slug)
        .neq('id', form?.id || ''); // Excluir o próprio formulário se for edição

      if (error) {
        console.error('Erro ao verificar slug:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Erro ao verificar slug:', error);
      return false;
    }
  };

  const handleFormDataChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'name' && !form ? { slug: generateSlug(value) } : {})
    }));
  };

  const addField = (fieldType: string) => {
    const fieldConfig = FIELD_TYPES.find(f => f.type === fieldType);
    const newField: FormField = {
      field_type: fieldType,
      field_name: `${fieldType}_${Date.now()}`,
      field_label: fieldConfig?.label || `Campo ${fields.length + 1}`,
      field_description: '',
      placeholder: getDefaultPlaceholder(fieldType),
      is_required: false,
      field_options: getDefaultOptions(fieldType),
      validation_rules: getDefaultValidation(fieldType),
      styling: {},
      order_index: fields.length
    };
    setFields([...fields, newField]);
    setShowFieldTypes(false);
  };

  const getDefaultPlaceholder = (fieldType: string): string => {
    const placeholders: Record<string, string> = {
      text: 'Digite seu texto aqui...',
      email: 'seu@email.com',
      phone: '(11) 99999-9999',
      textarea: 'Digite sua mensagem...',
      number: '0',
      url: 'https://exemplo.com',
      address: 'Rua, número, bairro, cidade',
      currency: 'R$ 0,00',
      cpf: '000.000.000-00',
      cnpj: '00.000.000/0000-00'
    };
    return placeholders[fieldType] || '';
  };

  const getDefaultOptions = (fieldType: string): any => {
    const options: Record<string, any> = {
      select: { options: ['Opção 1', 'Opção 2', 'Opção 3'] },
      radio: { options: ['Opção 1', 'Opção 2', 'Opção 3'] },
      checkbox: { options: ['Opção 1', 'Opção 2', 'Opção 3'] },
      rating: { max_rating: 5, style: 'stars' },
      range: { min: 0, max: 100, step: 1 },
      file: { accept: '*', max_size: '10MB', multiple: false },
      whatsapp: { 
        number: formData.settings.whatsapp_number || '',
        message: formData.settings.whatsapp_message || 'Olá! Gostaria de mais informações.',
        button_text: 'Enviar via WhatsApp'
      },
      heading: { level: 'h2', align: 'left' },
      paragraph: { align: 'left' },
      image: { src: '', alt: '', width: '100%', align: 'center' }
    };
    return options[fieldType] || {};
  };

  const getDefaultValidation = (fieldType: string): any => {
    const validations: Record<string, any> = {
      email: { pattern: 'email' },
      phone: { pattern: 'phone' },
      url: { pattern: 'url' },
      number: { min: null, max: null },
      text: { min_length: null, max_length: null },
      textarea: { min_length: null, max_length: null },
      cpf: { pattern: 'cpf' },
      cnpj: { pattern: 'cnpj' }
    };
    return validations[fieldType] || {};
  };

  const updateField = (index: number, updatedField: FormField) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    setFields(newFields);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    newFields.forEach((field, i) => {
      field.order_index = i;
    });
    setFields(newFields);
  };

  const duplicateField = (index: number) => {
    const fieldToDuplicate = { ...fields[index] };
    fieldToDuplicate.field_name = `${fieldToDuplicate.field_name}_copy`;
    fieldToDuplicate.field_label = `${fieldToDuplicate.field_label} (Cópia)`;
    fieldToDuplicate.order_index = fields.length;
    setFields([...fields, fieldToDuplicate]);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newFields = Array.from(fields);
    const [reorderedField] = newFields.splice(result.source.index, 1);
    newFields.splice(result.destination.index, 0, reorderedField);

    newFields.forEach((field, index) => {
      field.order_index = index;
    });

    setFields(newFields);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      alert('Nome e slug são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      let formId = form?.id;

      // Garantir que os objetos estão bem formados
      const cleanSettings = {
        whatsapp_number: formData.settings.whatsapp_number || '',
        whatsapp_message: formData.settings.whatsapp_message || 'Olá! Gostaria de mais informações.',
        success_message: formData.settings.success_message || 'Formulário enviado com sucesso!',
        enable_captcha: Boolean(formData.settings.enable_captcha),
        enable_double_optin: Boolean(formData.settings.enable_double_optin),
        enable_analytics: Boolean(formData.settings.enable_analytics)
      };

      const cleanStyling = {
        primaryColor: formData.styling.primaryColor || '#3B82F6',
        fontFamily: formData.styling.fontFamily || 'system-ui',
        fontSize: formData.styling.fontSize || '16px',
        spacing: formData.styling.spacing || 'normal',
        theme: formData.styling.theme || 'light',
        width: formData.styling.width || 'medium',
        borderRadius: formData.styling.borderRadius || '8px',
        boxShadow: formData.styling.boxShadow || 'medium'
      };

      const qualificationRules = formData.qualification_rules || {};
      const cleanQualificationRules = {
        job_titles: (qualificationRules as any).job_titles || '',
        states: (qualificationRules as any).states || '',
        require_company: Boolean((qualificationRules as any).require_company),
        min_value: (qualificationRules as any).min_value || null,
        capture_ip: Boolean((qualificationRules as any).capture_ip),
        capture_user_agent: Boolean((qualificationRules as any).capture_user_agent),
        prevent_duplicates: Boolean((qualificationRules as any).prevent_duplicates)
      };

      const formPayload = {
        name: formData.name,
        description: formData.description || null,
        slug: formData.slug,
        is_active: formData.is_active,
        settings: cleanSettings,
        styling: cleanStyling,
        redirect_url: formData.redirect_url || null,
        pipeline_id: formData.pipeline_id || null,
        assigned_to: formData.assigned_to || null,
        qualification_rules: cleanQualificationRules,
        fields: fields // Incluir campos no payload
      };

      // Usar a abordagem mais simples - salvar diretamente no Supabase
      // sem verificações complexas de autenticação
      if (form) {
        // Atualizar formulário existente
        const { error } = await supabase
          .from('custom_forms')
          .update({
            name: formPayload.name,
            description: formPayload.description,
            slug: formPayload.slug,
            is_active: formPayload.is_active,
            settings: formPayload.settings,
            styling: formPayload.styling,
            redirect_url: formPayload.redirect_url,
            pipeline_id: formPayload.pipeline_id,
            assigned_to: formPayload.assigned_to,
            qualification_rules: formPayload.qualification_rules
          })
          .eq('id', form.id);

        if (error) {
          console.error('Erro ao atualizar formulário:', error);
          throw error;
        }
      } else {
        // Criar novo formulário - usar dados do contexto de autenticação
        const userData = localStorage.getItem('crm_user');
        let userId = null;
        
        if (userData) {
          try {
            const user = JSON.parse(userData);
            userId = user.id;
          } catch (e) {
            console.error('Erro ao obter dados do usuário:', e);
          }
        }

        if (!userId) {
          throw new Error('Usuário não autenticado. Faça login novamente.');
        }

        const { data, error } = await supabase
          .from('custom_forms')
          .insert({
            tenant_id: tenantId,
            created_by: userId,
            name: formPayload.name,
            description: formPayload.description,
            slug: formPayload.slug,
            is_active: formPayload.is_active,
            settings: formPayload.settings,
            styling: formPayload.styling,
            redirect_url: formPayload.redirect_url,
            pipeline_id: formPayload.pipeline_id,
            assigned_to: formPayload.assigned_to,
            qualification_rules: formPayload.qualification_rules
          })
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar formulário:', error);
          throw error;
        }
        
        formId = data.id;
      }

      // Gerenciar campos do formulário
      if (formId) {
        // Remover campos existentes
        await supabase
          .from('form_fields')
          .delete()
          .eq('form_id', formId);

        // Inserir novos campos se existirem
        if (fields.length > 0) {
          const fieldsToInsert = fields.map(field => ({
            form_id: formId,
            field_type: field.field_type,
            field_name: field.field_name,
            field_label: field.field_label,
            field_description: field.field_description || null,
            placeholder: field.placeholder || null,
            is_required: field.is_required,
            field_options: field.field_options || {},
            validation_rules: field.validation_rules || {},
            styling: field.styling || {},
            order_index: field.order_index
          }));

          const { error: fieldsError } = await supabase
            .from('form_fields')
            .insert(fieldsToInsert);

          if (fieldsError) {
            console.error('Erro ao salvar campos:', fieldsError);
            throw fieldsError;
          }
        }
      }

      alert('Formulário salvo com sucesso!');
      onSave();
    } catch (error: any) {
      console.error('Erro ao salvar formulário:', error);
      
      // Tratar erros específicos
      let errorMessage = 'Erro ao salvar formulário';
      
      if (error?.message?.includes('duplicate key') || error?.code === '23505') {
        errorMessage = 'Já existe um formulário com este slug. Por favor, use um slug diferente.';
      } else if (error?.message?.includes('violates foreign key constraint')) {
        errorMessage = 'Erro de referência no banco de dados. Verifique se o pipeline selecionado é válido.';
      } else if (error?.message?.includes('row-level security') || error?.message?.includes('permission')) {
        errorMessage = 'Erro de permissão. Execute o script SQL para corrigir as políticas RLS no Supabase.';
      } else if (error?.message?.includes('not authenticated') || error?.message?.includes('Usuário não autenticado')) {
        errorMessage = 'Usuário não autenticado. Faça login novamente.';
      } else if (error?.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const renderFormPreview = () => {
    const { styling } = formData;
    
    return (
      <div className="bg-gray-50 min-h-screen p-8">
        <div 
          className="mx-auto bg-white rounded-lg shadow-lg p-8"
          style={{
            maxWidth: styling.width === 'small' ? '400px' : styling.width === 'large' ? '800px' : '600px',
            fontFamily: styling.fontFamily,
            fontSize: styling.fontSize,
            borderRadius: styling.borderRadius
          }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{formData.name}</h2>
            {formData.description && (
              <p className="text-gray-600">{formData.description}</p>
            )}
          </div>

          <form className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.field_name || index}>
                {renderPreviewField(field, styling)}
              </div>
            ))}

            <div className="flex space-x-4 pt-6">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                style={{ backgroundColor: styling.primaryColor }}
              >
                Enviar Formulário
              </button>
              
              {formData.settings.whatsapp_number && (
                <button
                  type="button"
                  className="flex items-center justify-center bg-green-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  <Smartphone className="mr-2" size={20} />
                  WhatsApp
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderPreviewField = (field: FormField, styling: any) => {
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    
    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'url':
      case 'cpf':
      case 'cnpj':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-2">{field.field_description}</p>
            )}
            <input
              type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
              placeholder={field.placeholder}
              className={baseClasses}
              required={field.is_required}
            />
          </div>
        );

      case 'phone':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-2">{field.field_description}</p>
            )}
            <input
              type="tel"
              placeholder={field.placeholder}
              className={baseClasses}
              required={field.is_required}
            />
          </div>
        );

      case 'textarea':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-2">{field.field_description}</p>
            )}
            <textarea
              placeholder={field.placeholder}
              rows={4}
              className={baseClasses}
              required={field.is_required}
            />
          </div>
        );

      case 'number':
      case 'currency':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-2">{field.field_description}</p>
            )}
            <input
              type="number"
              placeholder={field.placeholder}
              className={baseClasses}
              required={field.is_required}
            />
          </div>
        );

      case 'date':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-2">{field.field_description}</p>
            )}
            <input
              type="date"
              className={baseClasses}
              required={field.is_required}
            />
          </div>
        );

      case 'time':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-2">{field.field_description}</p>
            )}
            <input
              type="time"
              className={baseClasses}
              required={field.is_required}
            />
          </div>
        );

      case 'select':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-2">{field.field_description}</p>
            )}
            <select className={baseClasses} required={field.is_required}>
              <option value="">Selecione uma opção</option>
              {field.field_options.options?.map((option: string, idx: number) => (
                <option key={idx} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );

      case 'radio':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-3">{field.field_description}</p>
            )}
            <div className="space-y-2">
              {field.field_options.options?.map((option: string, idx: number) => (
                <label key={idx} className="flex items-center">
                  <input
                    type="radio"
                    name={field.field_name}
                    value={option}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                    required={field.is_required}
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-3">{field.field_description}</p>
            )}
            <div className="space-y-2">
              {field.field_options.options?.map((option: string, idx: number) => (
                <label key={idx} className="flex items-center">
                  <input
                    type="checkbox"
                    name={field.field_name}
                    value={option}
                    className="mr-2 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'rating':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-3">{field.field_description}</p>
            )}
            <div className="flex space-x-1">
              {Array.from({ length: field.field_options.max_rating || 5 }).map((_, idx) => (
                <Star key={idx} size={24} className="text-gray-300 hover:text-yellow-400 cursor-pointer" />
              ))}
            </div>
          </div>
        );

      case 'range':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-3">{field.field_description}</p>
            )}
            <input
              type="range"
              min={field.field_options.min || 0}
              max={field.field_options.max || 100}
              step={field.field_options.step || 1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>{field.field_options.min || 0}</span>
              <span>{field.field_options.max || 100}</span>
            </div>
          </div>
        );

      case 'file':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.field_description && (
              <p className="text-sm text-gray-500 mb-2">{field.field_description}</p>
            )}
            <input
              type="file"
              accept={field.field_options.accept}
              multiple={field.field_options.multiple}
              className={baseClasses}
              required={field.is_required}
            />
          </div>
        );

      case 'whatsapp':
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-green-800 mb-2">
              {field.field_label}
            </h3>
            {field.field_description && (
              <p className="text-sm text-green-600 mb-3">{field.field_description}</p>
            )}
            <button
              type="button"
              className="flex items-center justify-center w-full bg-green-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-600 transition-colors"
              onClick={() => {
                const message = encodeURIComponent(field.field_options.message || 'Olá!');
                const number = field.field_options.number?.replace(/\D/g, '');
                window.open(`https://wa.me/${number}?text=${message}`, '_blank');
              }}
            >
              <MessageSquare className="mr-2" size={20} />
              {field.field_options.button_text || 'Enviar via WhatsApp'}
            </button>
          </div>
        );

      case 'heading':
        const HeadingTag = field.field_options.level || 'h2';
        return React.createElement(
          HeadingTag,
          {
            className: `font-bold text-gray-900 mb-2 ${
              HeadingTag === 'h1' ? 'text-3xl' :
              HeadingTag === 'h2' ? 'text-2xl' :
              HeadingTag === 'h3' ? 'text-xl' :
              'text-lg'
            }`,
            style: { textAlign: field.field_options.align || 'left' }
          },
          field.field_label
        );

      case 'paragraph':
        return (
          <div>
            <p 
              className="text-gray-700 mb-4"
              style={{ textAlign: field.field_options.align || 'left' }}
            >
              {field.field_label}
            </p>
          </div>
        );

      case 'divider':
        return <hr className="border-gray-300 my-6" />;

      case 'image':
        return (
          <div style={{ textAlign: field.field_options.align || 'center' }}>
            {field.field_options.src ? (
              <img
                src={field.field_options.src}
                alt={field.field_options.alt || field.field_label}
                style={{ width: field.field_options.width || '100%' }}
                className="rounded-lg"
              />
            ) : (
              <div className="bg-gray-200 rounded-lg p-8 text-center">
                <Image size={48} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Imagem será exibida aqui</p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              placeholder={field.placeholder}
              className={baseClasses}
              required={field.is_required}
            />
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {form ? 'Editar Formulário' : 'Novo Formulário Avançado'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Criador avançado com drag & drop, preview e integração WhatsApp
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              <span>{saving ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </div>

        {/* Informações básicas */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleFormDataChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Nome do formulário *"
            />
          </div>
          
          <div>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => handleFormDataChange('slug', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="slug-do-formulario *"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleFormDataChange('is_active', e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-2"
              />
              <span className="text-sm text-gray-700">Formulário ativo</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('builder')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'builder'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Plus size={16} />
            <span>Construtor</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'preview'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Eye size={16} />
            <span>Preview</span>
          </button>
          <button
            onClick={() => setActiveTab('styling')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'styling'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Palette size={16} />
            <span>Estilização</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'settings'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings size={16} />
            <span>Configurações</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'builder' && (
          <div className="flex h-full">
            {/* Sidebar com tipos de campos */}
            <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Elementos Disponíveis</h3>
                <div className="space-y-2">
                  {FIELD_TYPES.map((fieldType) => {
                    const Icon = fieldType.icon;
                    return (
                      <button
                        key={fieldType.type}
                        onClick={() => addField(fieldType.type)}
                        className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-300 transition-colors group"
                      >
                        <Icon size={20} className="text-gray-400 group-hover:text-purple-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{fieldType.label}</div>
                          <div className="text-xs text-gray-500">{fieldType.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Área de construção */}
            <div className="flex-1 overflow-y-auto p-6">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="form-fields">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {fields.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                          <Plus size={48} className="mx-auto text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Comece adicionando campos
                          </h3>
                          <p className="text-gray-500">
                            Escolha um elemento da barra lateral para começar a construir seu formulário
                          </p>
                        </div>
                      ) : (
                        fields.map((field, index) => (
                          <Draggable
                            key={field.field_name || index}
                            draggableId={field.field_name || index.toString()}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`bg-white border rounded-lg p-4 ${
                                  snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-move p-1 hover:bg-gray-100 rounded"
                                    >
                                      <GripVertical size={16} className="text-gray-400" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                      {field.field_label}
                                    </span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      {FIELD_TYPES.find(f => f.type === field.field_type)?.label}
                                    </span>
                                  </div>
                                  
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => duplicateField(index)}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Duplicar campo"
                                    >
                                      <Copy size={16} className="text-gray-400" />
                                    </button>
                                    <button
                                      onClick={() => removeField(index)}
                                      className="p-1 hover:bg-red-100 rounded"
                                      title="Remover campo"
                                    >
                                      <Trash2 size={16} className="text-red-400" />
                                    </button>
                                  </div>
                                </div>

                                <SingleFieldEditor
                                  field={field}
                                  onUpdate={(updatedField: FormField) => updateField(index, updatedField)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="h-full overflow-y-auto">
            {renderFormPreview()}
          </div>
        )}

        {activeTab === 'styling' && (
          <div className="h-full overflow-y-auto p-6">
            <FormStylingEditor
              styling={formData.styling}
              onUpdate={(styling) => handleFormDataChange('styling', styling)}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto p-6">
            <FormSettingsEditor
              settings={{
                redirect_url: formData.redirect_url,
                pipeline_id: formData.pipeline_id,
                assigned_to: formData.assigned_to,
                qualification_rules: formData.qualification_rules,
                ...formData.settings
              }}
              onUpdate={(settings) => {
                handleFormDataChange('redirect_url', settings.redirect_url);
                handleFormDataChange('pipeline_id', settings.pipeline_id);
                handleFormDataChange('assigned_to', settings.assigned_to);
                handleFormDataChange('qualification_rules', settings.qualification_rules);
                handleFormDataChange('settings', {
                  whatsapp_number: settings.whatsapp_number,
                  whatsapp_message: settings.whatsapp_message,
                  success_message: settings.success_message,
                  enable_captcha: settings.enable_captcha,
                  enable_double_optin: settings.enable_double_optin,
                  enable_analytics: settings.enable_analytics
                });
              }}
              tenantId={tenantId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FormBuilderEditor;
