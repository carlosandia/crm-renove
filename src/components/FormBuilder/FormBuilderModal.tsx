
import React, { useState, useEffect } from 'react';
import { X, Link, Code, Eye, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FormFieldEditor from './FormFieldEditor';
import FormStylingEditor from './FormStylingEditor';
import FormSettingsEditor from './FormSettingsEditor';

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

interface FormBuilderModalProps {
  form: CustomForm | null;
  onSave: () => void;
  onCancel: () => void;
  tenantId: string;
}

const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  form,
  onSave,
  onCancel,
  tenantId
}) => {
  const [activeTab, setActiveTab] = useState<'construtor' | 'visualizacao' | 'configuracoes' | 'publicar'>('construtor');
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
    newFields.forEach((field, i) => {
      field.order_index = i;
    });
    setFields(newFields);
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...fields];
    const [moved] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, moved);
    
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

      if (formId) {
        await supabase
          .from('form_fields')
          .delete()
          .eq('form_id', formId);

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

  const formUrl = `${window.location.origin}/form/${formData.slug}`;
  const embedCode = `<iframe
  src="${formUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
</iframe>`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {form ? 'Editar Formulário' : 'Criar Novo Formulário'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Use o construtor visual para criar formulários avançados de captura de leads
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('construtor')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'construtor'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Construtor
          </button>
          <button
            onClick={() => setActiveTab('visualizacao')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'visualizacao'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Visualização
          </button>
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'configuracoes'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Configurações
          </button>
          <button
            onClick={() => setActiveTab('publicar')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'publicar'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Publicar
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'construtor' && (
            <div className="h-full flex">
              {/* Sidebar com campos */}
              <div className="w-80 border-r border-gray-200 p-6 overflow-y-auto">
                <h3 className="font-medium text-gray-900 mb-4">Adicionar Campos</h3>
                
                {/* Informações básicas do formulário */}
                <div className="mb-6 space-y-4">
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

                {/* Tipos de campo */}
                <div className="space-y-3">
                  {[
                    { type: 'text', label: 'Texto', desc: 'Campo de texto simples', icon: 'T' },
                    { type: 'email', label: 'E-mail', desc: 'Campo de e-mail com validação', icon: '✉' },
                    { type: 'phone', label: 'Telefone', desc: 'Campo para números de telefone', icon: '📞' },
                    { type: 'textarea', label: 'Área de Texto', desc: 'Campo de texto longo', icon: '📝' },
                    { type: 'select', label: 'Lista Suspensa', desc: 'Campo de seleção', icon: '▼' },
                    { type: 'checkbox', label: 'Checkbox', desc: 'Campo de marcação', icon: '☑' },
                    { type: 'date', label: 'Data', desc: 'Seletor de data', icon: '📅' },
                    { type: 'file', label: 'Upload de Arquivo', desc: 'Campo para upload de arquivos', icon: '📎' },
                    { type: 'captcha', label: 'CAPTCHA', desc: 'Campo de classificação por estrelas', icon: '⭐' }
                  ].map((fieldType) => (
                    <button
                      key={fieldType.type}
                      onClick={addField}
                      className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-sm">
                          {fieldType.icon}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{fieldType.label}</div>
                          <div className="text-xs text-gray-500">{fieldType.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Área principal - Estrutura do formulário */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-2xl">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Estrutura do Formulário
                    <span className="text-sm text-gray-500 ml-2">({fields.length} campo{fields.length !== 1 ? 's' : ''})</span>
                  </h3>
                  
                  {fields.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-4xl mb-4">✨</div>
                      <p className="text-gray-500 font-medium">Nenhum campo adicionado ainda</p>
                      <p className="text-sm text-gray-400 mt-1">Use a paleta à esquerda para adicionar campos</p>
                    </div>
                  ) : (
                    <FormFieldEditor
                      fields={fields}
                      onAddField={addField}
                      onUpdateField={updateField}
                      onRemoveField={removeField}
                      onMoveField={moveField}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'visualizacao' && (
            <div className="p-6 h-full overflow-y-auto">
              <h3 className="font-medium text-gray-900 mb-4">Preview do Formulário</h3>
              <div className="bg-gray-50 p-8 rounded-lg">
                <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-sm">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">{formData.name || 'Nome do Formulário'}</h4>
                  {fields.map((field, index) => (
                    <div key={index} className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.field_label}
                        {field.is_required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.field_type === 'textarea' ? (
                        <textarea 
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={3}
                        />
                      ) : field.field_type === 'select' ? (
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                          <option>Selecione uma opção</option>
                        </select>
                      ) : field.field_type === 'checkbox' ? (
                        <div className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm">{field.field_label}</span>
                        </div>
                      ) : (
                        <input 
                          type={field.field_type === 'phone' ? 'tel' : field.field_type}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      )}
                      {field.field_description && (
                        <p className="text-xs text-gray-500 mt-1">{field.field_description}</p>
                      )}
                    </div>
                  ))}
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'configuracoes' && (
            <div className="p-6 h-full overflow-y-auto">
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
            </div>
          )}

          {activeTab === 'publicar' && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Link Público */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Link size={16} className="text-blue-600" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Link Público</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Use este link para compartilhar o formulário no Instagram, WhatsApp ou outras redes sociais
                    </p>
                    
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-gray-700 truncate">{formUrl}</span>
                        <button
                          onClick={() => copyFormLink(formData.slug)}
                          className="ml-2 p-2 text-gray-500 hover:text-gray-700"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">💡 Dicas de uso:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Adicione no link da bio do Instagram</li>
                        <li>• Compartilhe em stories e posts</li>
                        <li>• Use em campanhas de WhatsApp</li>
                        <li>• Inclua em QR Codes</li>
                      </ul>
                    </div>
                  </div>

                  {/* Código de Embed */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Code size={16} className="text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Código de Embed</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Incorpore o formulário diretamente em websites e landing pages
                    </p>
                    
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">{embedCode}</pre>
                      <button
                        onClick={() => copyEmbedCode(formData.slug)}
                        className="mt-2 p-2 text-gray-500 hover:text-gray-700"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">✅ Como usar:</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Cole o código no HTML da sua página</li>
                        <li>• Funciona em WordPress, Wix, Squarespace</li>
                        <li>• Responsivo e otimizado para mobile</li>
                        <li>• Carregamento rápido e seguro</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          
          <div className="flex space-x-3">
            <button
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Eye size={16} />
              <span>Visualizar</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              <span>{saving ? 'Salvando...' : 'Criar Formulário'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const copyFormLink = (slug: string) => {
  const formUrl = `${window.location.origin}/form/${slug}`;
  navigator.clipboard.writeText(formUrl);
  alert('Link copiado para a área de transferência!');
};

const copyEmbedCode = (slug: string) => {
  const formUrl = `${window.location.origin}/form/${slug}`;
  const embedCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`;
  navigator.clipboard.writeText(embedCode);
  alert('Código embed copiado para a área de transferência!');
};

export default FormBuilderModal;
