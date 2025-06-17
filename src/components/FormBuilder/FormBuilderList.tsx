
import React from 'react';
import { Eye, Edit, Trash2, Copy, ExternalLink, Calendar, Globe } from 'lucide-react';

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
  onPreviewForm: (form: CustomForm) => void;
  onDeleteForm: (formId: string) => void;
}

const FormBuilderList: React.FC<FormBuilderListProps> = ({
  forms,
  loading,
  onEditForm,
  onPreviewForm,
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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Formulário
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Links
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Criado em
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {forms.map((form) => (
            <tr key={form.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {form.name}
                  </div>
                  {form.description && (
                    <div className="text-sm text-gray-500 mt-1">
                      {form.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Slug: {form.slug}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  form.is_active 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-1 ${
                    form.is_active ? 'bg-green-400' : 'bg-gray-400'
                  }`}></div>
                  {form.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyFormLink(form.slug)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                    title="Copiar link do formulário"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => copyEmbedCode(form.slug)}
                    className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                    title="Copiar código embed"
                  >
                    <Globe size={14} />
                  </button>
                  <a
                    href={`/form/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-900 p-1 rounded transition-colors"
                    title="Abrir formulário"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {formatDate(form.created_at)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() => onPreviewForm(form)}
                  className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                  title="Visualizar"
                >
                  <Eye size={16} />
                </button>
                
                <button
                  onClick={() => onEditForm(form)}
                  className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                  title="Editar"
                >
                  <Edit size={16} />
                </button>
                
                <button
                  onClick={() => onDeleteForm(form.id)}
                  className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FormBuilderList;
