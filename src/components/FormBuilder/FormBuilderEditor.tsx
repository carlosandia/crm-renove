
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import FormFieldEditor from './FormFieldEditor';
import FormStylingEditor from './FormStylingEditor';
import FormSettingsEditor from './FormSettingsEditor';
import { Save, Eye, Settings, Palette, Plus } from 'lucide-react';

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
    settings: {},
    styling: {
      primaryColor: '#3B82F6',
      fontFamily: 'system-ui',
      fontSize: '16px',
      spacing: 'normal',
      theme: 'light',
      width: 'medium'
    },
    redirect_url: '',
    pipeline_id: '',
    assigned_to: '',
    qualification_rules: {}
  });

  const [fields, setFields] = useState<FormField[]>([]);
  const [activeTab, setActiveTab] = useState<'fields' | 'styling' | 'settings'>('fields');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form) {
      setFormData({
        name: form.name,
        description: form.description || '',
        slug: form.slug,
        is_active: form.is_active,
        settings: form.settings || {},
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
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleFormDataChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'name' && !form ? { slug: generateSlug(value) } : {})
    }));
  };

  const addField = () => {
    const newField: FormField = {
      field_type: 'text',
      field_name: `field_${fields.length + 1}`,
      field_label: `Campo ${fields.length + 1}`,
      field_description: '',
      placeholder: '',
      is_required: false,
      field_options: {},
      validation_rules: {},
      styling: {},
      order_index: fields.length
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updatedField: FormField) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    setFields(newFields);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    // Reordenar os índices
    newFields.forEach((field, i) => {
      field.order_index = i;
    });
    setFields(newFields);
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...fields];
    const [moved] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, moved);
    
    // Reordenar os índices
    newFields.forEach((field, i) => {
      field.order_index = i;
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

      if (form) {
        // Atualizar formulário existente
        const { error } = await supabase
          .from('custom_forms')
          .update({
            name: formData.name,
            description: formData.description,
            slug: formData.slug,
            is_active: formData.is_active,
            settings: formData.settings,
            styling: formData.styling,
            redirect_url: formData.redirect_url,
            pipeline_id: formData.pipeline_id || null,
            assigned_to: formData.assigned_to || null,
            qualification_rules: formData.qualification_rules
          })
          .eq('id', form.id);

        if (error) throw error;
      } else {
        // Criar novo formulário
        const { data, error } = await supabase
          .from('custom_forms')
          .insert({
            tenant_id: tenantId,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            name: formData.name,
            description: formData.description,
            slug: formData.slug,
            is_active: formData.is_active,
            settings: formData.settings,
            styling: formData.styling,
            redirect_url: formData.redirect_url,
            pipeline_id: formData.pipeline_id || null,
            assigned_to: formData.assigned_to || null,
            qualification_rules: formData.qualification_rules
          })
          .select()
          .single();

        if (error) throw error;
        formId = data.id;
      }

      // Salvar campos
      if (formId) {
        // Remover campos existentes
        await supabase
          .from('form_fields')
          .delete()
          .eq('form_id', formId);

        // Inserir novos campos
        if (fields.length > 0) {
          const fieldsToInsert = fields.map(field => ({
            form_id: formId,
            field_type: field.field_type,
            field_name: field.field_name,
            field_label: field.field_label,
            field_description: field.field_description,
            placeholder: field.placeholder,
            is_required: field.is_required,
            field_options: field.field_options,
            validation_rules: field.validation_rules,
            styling: field.styling,
            order_index: field.order_index
          }));

          const { error: fieldsError } = await supabase
            .from('form_fields')
            .insert(fieldsToInsert);

          if (fieldsError) throw fieldsError;
        }
      }

      alert('Formulário salvo com sucesso!');
      onSave();
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      alert('Erro ao salvar formulário');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {form ? 'Editar Formulário' : 'Novo Formulário'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure seu formulário de captura de leads
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
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Formulário *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleFormDataChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Ex: Formulário de Contato"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (URL) *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => handleFormDataChange('slug', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="formulario-contato"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleFormDataChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            rows={2}
            placeholder="Descrição do formulário..."
          />
        </div>
        
        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => handleFormDataChange('is_active', e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Formulário ativo</span>
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('fields')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fields'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Plus className="inline w-4 h-4 mr-1" />
            Campos
          </button>
          <button
            onClick={() => setActiveTab('styling')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'styling'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Palette className="inline w-4 h-4 mr-1" />
            Estilização
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="inline w-4 h-4 mr-1" />
            Configurações
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'fields' && (
        <FormFieldEditor
          fields={fields}
          onAddField={addField}
          onUpdateField={updateField}
          onRemoveField={removeField}
          onMoveField={moveField}
        />
      )}

      {activeTab === 'styling' && (
        <FormStylingEditor
          styling={formData.styling}
          onUpdate={(styling) => handleFormDataChange('styling', styling)}
        />
      )}

      {activeTab === 'settings' && (
        <FormSettingsEditor
          settings={{
            redirect_url: formData.redirect_url,
            pipeline_id: formData.pipeline_id,
            assigned_to: formData.assigned_to,
            qualification_rules: formData.qualification_rules
          }}
          onUpdate={(settings) => {
            handleFormDataChange('redirect_url', settings.redirect_url);
            handleFormDataChange('pipeline_id', settings.pipeline_id);
            handleFormDataChange('assigned_to', settings.assigned_to);
            handleFormDataChange('qualification_rules', settings.qualification_rules);
          }}
          tenantId={tenantId}
        />
      )}
    </div>
  );
};

export default FormBuilderEditor;
