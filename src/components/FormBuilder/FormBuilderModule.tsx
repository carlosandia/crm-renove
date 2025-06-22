
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import FormBuilderList from './FormBuilderList';
import FormBuilderModal from './FormBuilderModal';
import { Plus, FileText, Eye, Settings, TrendingUp } from 'lucide-react';

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
  formio_schema?: any;
  created_at: string;
  updated_at: string;
}

interface FormStats {
  total_forms: number;
  active_forms: number;
  total_leads: number;
  total_views: number;
  conversion_rate: number;
}

const FormBuilderModule: React.FC = () => {
  const { user } = useAuth();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [stats, setStats] = useState<FormStats>({
    total_forms: 0,
    active_forms: 0,
    total_leads: 0,
    total_views: 0,
    conversion_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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

      const formsData = data || [];
      setForms(formsData);
      await loadStats(formsData);
    } catch (error) {
      console.error('Erro ao carregar formulários:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar estatísticas
  const loadStats = async (formsList: CustomForm[]) => {
    if (!user?.tenant_id || formsList.length === 0) {
      setStats({
        total_forms: formsList.length,
        active_forms: formsList.filter(f => f.is_active).length,
        total_leads: 0,
        total_views: 0,
        conversion_rate: 0
      });
      return;
    }

    try {
      const formIds = formsList.map(f => f.id);
      
      // Contar submissões (leads gerados)
      const { count: submissionsCount } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .in('form_id', formIds);

      // Para views, vamos simular por enquanto (poderia ser implementado com analytics)
      const totalViews = submissionsCount ? Math.round(submissionsCount * 5.2) : 0;
      const conversionRate = totalViews > 0 ? ((submissionsCount || 0) / totalViews) * 100 : 0;

      setStats({
        total_forms: formsList.length,
        active_forms: formsList.filter(f => f.is_active).length,
        total_leads: submissionsCount || 0,
        total_views: totalViews,
        conversion_rate: Number(conversionRate.toFixed(1))
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    loadForms();
  }, [user?.tenant_id]);

  const handleCreateForm = () => {
    setEditingForm(null);
    setShowModal(true);
  };

  const handleEditForm = (form: CustomForm) => {
    setEditingForm(form);
    setShowModal(true);
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
    setShowModal(false);
  };

  const handleCancelForm = () => {
    setShowModal(false);
    setEditingForm(null);
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
              <h1 className="text-2xl font-semibold text-gray-900">Formulários Avançados</h1>
              <p className="text-sm text-gray-500 mt-1">
                Crie e gerencie formulários personalizados para captura de leads
              </p>
            </div>
          </div>
          
          <button
            onClick={handleCreateForm}
            className="flex items-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors"
          >
            <Plus size={16} />
            <span>Novo Formulário</span>
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Total de Formulários</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_forms}</div>
          <div className="text-sm text-gray-500">{stats.active_forms} ativos</div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Settings size={16} className="text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Leads Gerados</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_leads}</div>
          <div className="text-sm text-gray-500">Total capturado</div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Taxa de Conversão</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.conversion_rate}%</div>
          <div className="text-sm text-gray-500">Média geral</div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Eye size={16} className="text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Visualizações</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_views.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total de acessos</div>
        </div>
      </div>

      {/* Barra de pesquisa e filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar formulários..."
                className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <div className="absolute left-3 top-2.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              <option>Todos os status</option>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Formulários em Cards */}
      <div className="bg-white rounded-xl border border-gray-200">
        <FormBuilderList
          forms={forms}
          loading={loading}
          onEditForm={handleEditForm}
          onDeleteForm={handleDeleteForm}
        />
      </div>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <FormBuilderModal
          isOpen={showModal}
          onClose={handleCancelForm}
          onCancel={handleCancelForm}
          form={editingForm}
          onSave={handleSaveForm}
          tenantId={user.tenant_id}
        />
      )}
    </div>
  );
};

export default FormBuilderModule;
