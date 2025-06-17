
import React from 'react';
import { Eye, Edit, Trash2, Copy, ExternalLink, Calendar, MoreHorizontal } from 'lucide-react';

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

interface FormBuilderListProps {
  forms: CustomForm[];
  loading: boolean;
  onEditForm: (form: CustomForm) => void;
  onDeleteForm: (formId: string) => void;
}

const FormBuilderList: React.FC<FormBuilderListProps> = ({
  forms,
  loading,
  onEditForm,
  onDeleteForm
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
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

  // Simular dados para demonstração
  const getFormStats = (formId: string) => {
    const randomLeads = Math.floor(Math.random() * 200) + 10;
    const randomViews = Math.floor(randomLeads * (Math.random() * 10 + 5));
    const conversion = ((randomLeads / randomViews) * 100).toFixed(1);
    
    return {
      leads: randomLeads,
      views: randomViews,
      conversion: conversion
    };
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Carregando formulários...</p>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📝</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum formulário criado</h3>
        <p className="text-gray-500">
          Comece criando seu primeiro formulário personalizado para captura de leads.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {forms.map((form) => {
          const stats = getFormStats(form.id);
          const fieldCount = Math.floor(Math.random() * 15) + 5; // Simular número de campos
          
          return (
            <div key={form.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              {/* Header do Card */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {form.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {form.description || 'Formulário para captura de leads da landing page principal'}
                    </p>
                  </div>
                  
                  <div className="relative ml-2">
                    <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{fieldCount} campos</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      form.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {form.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Estatísticas */}
              <div className="p-4 border-b border-gray-100">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{stats.leads}</div>
                    <div className="text-xs text-gray-500">Leads</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{stats.conversion}%</div>
                    <div className="text-xs text-gray-500">Conversão</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{stats.views}</div>
                    <div className="text-xs text-gray-500">Views</div>
                  </div>
                </div>
              </div>
              
              {/* Ações */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyFormLink(form.slug)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onEditForm(form)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => copyEmbedCode(form.slug)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Copiar código"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => onDeleteForm(form.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FormBuilderList;
