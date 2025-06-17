
import React from 'react';
import { ArrowLeft, ExternalLink, Copy, Globe } from 'lucide-react';

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

interface FormBuilderPreviewProps {
  form: CustomForm;
  onBack: () => void;
}

const FormBuilderPreview: React.FC<FormBuilderPreviewProps> = ({
  form,
  onBack
}) => {
  const formUrl = `${window.location.origin}/form/${form.slug}`;
  const embedCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`;

  const copyFormLink = () => {
    navigator.clipboard.writeText(formUrl);
    alert('Link copiado para a área de transferência!');
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    alert('Código embed copiado para a área de transferência!');
  };

  const getWidthClass = () => {
    switch (form.styling?.width) {
      case 'small': return 'max-w-md';
      case 'medium': return 'max-w-2xl';
      case 'large': return 'max-w-4xl';
      case 'full': return 'max-w-full';
      default: return 'max-w-2xl';
    }
  };

  const getSpacingClass = () => {
    switch (form.styling?.spacing) {
      case 'compact': return 'space-y-3';
      case 'normal': return 'space-y-4';
      case 'relaxed': return 'space-y-6';
      default: return 'space-y-4';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Preview: {form.name}
            </h2>
            <p className="text-sm text-gray-500">
              Visualização do formulário
            </p>
          </div>
        </div>
      </div>

      {/* Links e Códigos */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Links e Integração</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link do Formulário
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={formUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={copyFormLink}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Copy size={14} />
                <span>Copiar</span>
              </button>
              <a
                href={formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <ExternalLink size={14} />
                <span>Abrir</span>
              </a>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código Embed (para sites)
            </label>
            <div className="flex items-center space-x-2">
              <textarea
                value={embedCode}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm h-20 resize-none"
              />
              <button
                onClick={copyEmbedCode}
                className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Globe size={14} />
                <span>Copiar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview do Formulário */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-4">Preview do Formulário</h3>
        
        <div 
          className={`mx-auto ${getWidthClass()}`}
          style={{
            fontFamily: form.styling?.fontFamily || 'system-ui',
            fontSize: form.styling?.fontSize || '16px',
            backgroundColor: form.styling?.theme === 'dark' ? '#1F2937' : '#FFFFFF',
            color: form.styling?.theme === 'dark' ? '#FFFFFF' : '#000000'
          }}
        >
          <div className="p-6 border border-gray-200 rounded-lg">
            {/* Título do Formulário */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">{form.name}</h1>
              {form.description && (
                <p className="text-gray-600">{form.description}</p>
              )}
            </div>

            {/* Simulação de campos - Em uma implementação real, carregaria os campos da base */}
            <div className={getSpacingClass()}>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Digite seu nome completo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  placeholder="Nome da sua empresa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Como podemos ajudar?
                </label>
                <textarea
                  placeholder="Descreva sua necessidade..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  disabled
                />
              </div>

              <button
                style={{ 
                  backgroundColor: form.styling?.primaryColor || '#3B82F6',
                  color: 'white'
                }}
                className="w-full px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                disabled
              >
                Enviar Formulário
              </button>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Este é apenas um preview. Para ver o formulário real com todos os campos configurados, 
                <a href={formUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  clique aqui para abrir o formulário
                </a>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status e Configurações */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm font-medium ${
                form.is_active ? 'text-green-600' : 'text-gray-600'
              }`}>
                {form.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Slug:</span>
              <span className="text-sm font-medium">{form.slug}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Configurações</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pipeline:</span>
              <span className="text-sm font-medium">
                {form.pipeline_id ? 'Configurado' : 'Não configurado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Atribuição:</span>
              <span className="text-sm font-medium">
                {form.assigned_to ? 'Configurada' : 'Manual'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Redirecionamento:</span>
              <span className="text-sm font-medium">
                {form.redirect_url ? 'Configurado' : 'Padrão'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilderPreview;
