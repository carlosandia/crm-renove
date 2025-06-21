
import React from 'react';
import { Edit2, Trash2, Eye, Globe, BarChart3 } from 'lucide-react';

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
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Carregando formulários...</p>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum formulário encontrado</h3>
        <p className="text-gray-500">Comece criando seu primeiro formulário personalizado</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map((form) => (
          <div key={form.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{form.name}</h3>
                {form.description && (
                  <p className="text-sm text-gray-600 mb-3">{form.description}</p>
                )}
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    form.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {form.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="text-xs text-gray-500">
                    /{form.slug}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Eye size={14} />
                  <span>0</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BarChart3 size={14} />
                  <span>0%</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.open(`/form/${form.slug}`, '_blank')}
                  className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                  title="Visualizar"
                >
                  <Globe size={16} />
                </button>
                <button
                  onClick={() => onEditForm(form)}
                  className="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeleteForm(form.id)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormBuilderList;
