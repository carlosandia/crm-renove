
import React, { useState, useEffect } from 'react';
import { X, FileText, Star, MessageCircle, BarChart3, Code, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FormioEditor from './FormioEditor';
import FormioPreview from './FormioPreview';
import MQLScoringManager from './MQLScoringManager';
import WhatsAppIntegration from './WhatsAppIntegration';

interface FormBuilderModalProps {
  form: any;
  onSave: () => void;
  onCancel: () => void;
  tenantId: string;
}

const FormBuilderModal: React.FC<FormBuilderModalProps> = ({ form, onSave, onCancel, tenantId }) => {
  const [currentTab, setCurrentTab] = useState<'editor' | 'mql' | 'whatsapp' | 'analytics'>('editor');
  const [formData, setFormData] = useState({
    name: form?.name || '',
    description: form?.description || '',
    slug: form?.slug || '',
    formio_schema: form?.formio_schema || { type: 'form', display: 'form', components: [] },
    settings: form?.settings || {},
    styling: form?.styling || {},
    is_active: form?.is_active !== undefined ? form.is_active : true
  });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const tabs = [
    { id: 'editor', label: 'Editor', icon: FileText },
    { id: 'mql', label: 'MQL Scoring', icon: Star },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: !form?.id ? generateSlug(name) : formData.slug
    });
  };

  const handleSchemaChange = (newSchema: any) => {
    setFormData({
      ...formData,
      formio_schema: newSchema
    });
  };

  const handleSettingsChange = (newSettings: any) => {
    setFormData({
      ...formData,
      settings: newSettings
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Nome do formulário é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (form?.id) {
        // Atualizar formulário existente
        const { error } = await supabase
          .from('custom_forms')
          .update({
            name: formData.name,
            description: formData.description,
            slug: formData.slug,
            formio_schema: formData.formio_schema,
            settings: formData.settings,
            styling: formData.styling,
            is_active: formData.is_active
          })
          .eq('id', form.id);

        if (error) throw error;

        // Salvar versão
        await supabase
          .from('form_versions')
          .insert({
            form_id: form.id,
            version_number: (form.version_number || 1) + 1,
            formio_schema: formData.formio_schema,
            created_by: tenantId
          });

      } else {
        // Criar novo formulário
        const { error } = await supabase
          .from('custom_forms')
          .insert({
            tenant_id: tenantId,
            created_by: tenantId,
            name: formData.name,
            description: formData.description,
            slug: formData.slug,
            formio_schema: formData.formio_schema,
            settings: formData.settings,
            styling: formData.styling,
            is_active: formData.is_active
          });

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      alert('Erro ao salvar formulário');
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 'editor':
        return (
          <FormioEditor
            form={{ ...form, ...formData }}
            onSave={handleSchemaChange}
            onPreview={() => setShowPreview(true)}
            tenantId={tenantId}
          />
        );
      
      case 'mql':
        return form?.id ? (
          <MQLScoringManager
            form={{ ...form, ...formData }}
            onSave={(scoringConfig) => {
              console.log('Scoring config received:', scoringConfig);
              // Aqui podemos salvar as configurações MQL no formulário
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Star size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Salve o formulário primeiro para configurar o MQL Scoring</p>
            </div>
          </div>
        );
      
      case 'whatsapp':
        return (
          <WhatsAppIntegration
            form={{ ...form, ...formData }}
            onSave={handleSettingsChange}
          />
        );
      
      case 'analytics':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Analytics do Formulário</h2>
                <p className="text-sm text-gray-500">Métricas de performance e conversão</p>
              </div>
            </div>

            {form?.id ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Visualizações</h3>
                  <div className="text-3xl font-bold text-blue-600">1,234</div>
                  <p className="text-sm text-blue-700">Total de acessos</p>
                </div>
                
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">Submissões</h3>
                  <div className="text-3xl font-bold text-green-600">85</div>
                  <p className="text-sm text-green-700">Formulários enviados</p>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="font-medium text-purple-900 mb-2">Taxa de Conversão</h3>
                  <div className="text-3xl font-bold text-purple-600">6.9%</div>
                  <p className="text-sm text-purple-700">Visitantes que converteram</p>
                </div>

                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="font-medium text-orange-900 mb-2">Leads MQL</h3>
                  <div className="text-3xl font-bold text-orange-600">34</div>
                  <p className="text-sm text-orange-700">Leads qualificados</p>
                </div>

                <div className="bg-indigo-50 p-6 rounded-lg">
                  <h3 className="font-medium text-indigo-900 mb-2">WhatsApp</h3>
                  <div className="text-3xl font-bold text-indigo-600">21</div>
                  <p className="text-sm text-indigo-700">Redirecionamentos</p>
                </div>

                <div className="bg-pink-50 p-6 rounded-lg">
                  <h3 className="font-medium text-pink-900 mb-2">Score Médio</h3>
                  <div className="text-3xl font-bold text-pink-600">58</div>
                  <p className="text-sm text-pink-700">Pontuação MQL média</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Salve o formulário primeiro para ver analytics</p>
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-7xl max-h-[95vh] w-full mx-4 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {form?.id ? 'Editar Formulário' : 'Novo Formulário'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Sistema avançado com Form.io, MQL Scoring e WhatsApp
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowPreview(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Code size={16} />
                  <span>Preview</span>
                </button>
                
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Save size={16} />
                  <span>{saving ? 'Salvando...' : 'Salvar'}</span>
                </button>
                
                <button
                  onClick={onCancel}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Formulário
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do formulário"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="url-amigavel"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                      currentTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Conteúdo da Tab */}
          <div className="flex-1 overflow-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <FormioPreview
          formSchema={formData.formio_schema}
          form={{ ...form, ...formData }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

export default FormBuilderModal;
