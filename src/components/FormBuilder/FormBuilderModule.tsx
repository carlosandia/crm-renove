
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import FormBuilderList from './FormBuilderList';
import FormBuilderEditor from './FormBuilderEditor';
import FormBuilderPreview from './FormBuilderPreview';
import { Plus, FileText, Eye, Settings } from 'lucide-react';

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

const FormBuilderModule: React.FC = () => {
  const { user } = useAuth();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [selectedForm, setSelectedForm] = useState<CustomForm | null>(null);
  const [editingForm, setEditingForm] = useState<CustomForm | null>(null);

  // Carregar formulários
  const loadForms = async () => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar formulários:', error);
        return;
      }

      setForms(data || []);
    } catch (error) {
      console.error('Erro ao carregar formulários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, [user?.tenant_id]);

  const handleCreateForm = () => {
    setEditingForm(null);
    setActiveView('editor');
  };

  const handleEditForm = (form: CustomForm) => {
    setEditingForm(form);
    setActiveView('editor');
  };

  const handlePreviewForm = (form: CustomForm) => {
    setSelectedForm(form);
    setActiveView('preview');
  };

  const handleDeleteForm = async (formId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este formulário?')) return;

    try {
      const { error } = await supabase
        .from('custom_forms')
        .delete()
        .eq('id', formId);

      if (error) {
        console.error('Erro ao excluir formulário:', error);
        alert('Erro ao excluir formulário');
        return;
      }

      await loadForms();
      alert('Formulário excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir formulário:', error);
      alert('Erro ao excluir formulário');
    }
  };

  const handleSaveForm = async () => {
    await loadForms();
    setActiveView('list');
  };

  const handleBackToList = () => {
    setActiveView('list');
    setEditingForm(null);
    setSelectedForm(null);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Acesso restrito a administradores</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="text-white text-lg" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Criador de Formulários</h1>
              <p className="text-sm text-gray-500 mt-1">
                Crie formulários personalizados para captura de leads
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {activeView !== 'list' && (
              <button
                onClick={handleBackToList}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>Voltar</span>
              </button>
            )}
            
            {activeView === 'list' && (
              <button
                onClick={handleCreateForm}
                className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus size={16} />
                <span>Novo Formulário</span>
              </button>
            )}
          </div>
        </div>

        {/* Estatísticas */}
        {activeView === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <FileText size={16} className="text-purple-600" />
                <span className="text-sm font-medium text-gray-600">Total de Formulários</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{forms.length}</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Eye size={16} className="text-green-600" />
                <span className="text-sm font-medium text-gray-600">Formulários Ativos</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {forms.filter(f => f.is_active).length}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Settings size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Em Desenvolvimento</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {forms.filter(f => !f.is_active).length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="bg-white rounded-xl border border-gray-200">
        {activeView === 'list' && (
          <FormBuilderList
            forms={forms}
            loading={loading}
            onEditForm={handleEditForm}
            onPreviewForm={handlePreviewForm}
            onDeleteForm={handleDeleteForm}
          />
        )}

        {activeView === 'editor' && (
          <FormBuilderEditor
            form={editingForm}
            onSave={handleSaveForm}
            onCancel={handleBackToList}
            tenantId={user.tenant_id}
          />
        )}

        {activeView === 'preview' && selectedForm && (
          <FormBuilderPreview
            form={selectedForm}
            onBack={handleBackToList}
          />
        )}
      </div>
    </div>
  );
};

export default FormBuilderModule;
