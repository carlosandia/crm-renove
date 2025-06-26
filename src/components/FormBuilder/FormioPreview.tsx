import React, { useState, useEffect } from 'react';
import { Monitor, Tablet, Smartphone, ExternalLink, Code, Copy, FileText, Mail, Phone, MessageSquare, Hash, List } from 'lucide-react';

interface FormComponent {
  id: string;
  type: 'textfield' | 'email' | 'phone' | 'textarea' | 'number' | 'select' | 'checkbox' | 'button';
  label: string;
  key: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface FormioPreviewProps {
  formSchema: any;
  form: any;
  onClose: () => void;
}

const FormioPreview: React.FC<FormioPreviewProps> = ({ formSchema, form, onClose }) => {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (form?.id) {
      const baseUrl = window.location.origin;
      setPublicUrl(`${baseUrl}/form/${form.slug}`);
      setEmbedCode(`<iframe src="${baseUrl}/form/${form.slug}" width="100%" height="600" frameborder="0"></iframe>`);
    }
  }, [form]);

  const getPreviewClass = () => {
    switch (previewMode) {
      case 'mobile':
        return 'w-80 h-[600px]';
      case 'tablet':
        return 'w-[768px] h-[600px]';
      default:
        return 'w-full h-[600px]';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    console.log('Copied to clipboard:', text);
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Formulário enviado com sucesso! (Preview Mode)');
  };

  const renderFormComponent = (component: FormComponent) => {
    const baseClasses = "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
    
    switch (component.type) {
      case 'textfield':
        return (
          <input
            type="text"
            placeholder={component.placeholder}
            value={formData[component.key] || ''}
            onChange={(e) => handleInputChange(component.key, e.target.value)}
            className={baseClasses}
            required={component.required}
          />
        );
        
      case 'email':
        return (
          <input
            type="email"
            placeholder={component.placeholder}
            value={formData[component.key] || ''}
            onChange={(e) => handleInputChange(component.key, e.target.value)}
            className={baseClasses}
            required={component.required}
          />
        );
        
      case 'phone':
        return (
          <input
            type="tel"
            placeholder={component.placeholder}
            value={formData[component.key] || ''}
            onChange={(e) => handleInputChange(component.key, e.target.value)}
            className={baseClasses}
            required={component.required}
          />
        );
        
      case 'textarea':
        return (
          <textarea
            placeholder={component.placeholder}
            value={formData[component.key] || ''}
            onChange={(e) => handleInputChange(component.key, e.target.value)}
            className={`${baseClasses} resize-none`}
            rows={4}
            required={component.required}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            placeholder={component.placeholder}
            value={formData[component.key] || ''}
            onChange={(e) => handleInputChange(component.key, e.target.value)}
            className={baseClasses}
            required={component.required}
          />
        );
        
      case 'select':
        return (
          <select
            value={formData[component.key] || ''}
            onChange={(e) => handleInputChange(component.key, e.target.value)}
            className={baseClasses}
            required={component.required}
          >
            <option value="">Selecione uma opção</option>
            {component.options?.map((option: string, idx: number) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );
        
      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData[component.key] || false}
              onChange={(e) => handleInputChange(component.key, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              required={component.required}
            />
            <span className="text-sm text-gray-700">{component.label}</span>
          </label>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Preview do Formulário</h2>
            <p className="text-sm text-gray-500 mt-1">{form?.name || formSchema?.title}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Controles de Viewport */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm' : ''}`}
              >
                <Monitor size={16} className={previewMode === 'desktop' ? 'text-blue-600' : 'text-gray-500'} />
              </button>
              <button
                onClick={() => setPreviewMode('tablet')}
                className={`p-2 rounded ${previewMode === 'tablet' ? 'bg-white shadow-sm' : ''}`}
              >
                <Tablet size={16} className={previewMode === 'tablet' ? 'text-blue-600' : 'text-gray-500'} />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm' : ''}`}
              >
                <Smartphone size={16} className={previewMode === 'mobile' ? 'text-blue-600' : 'text-gray-500'} />
              </button>
            </div>

            <button
              onClick={() => setShowEmbed(!showEmbed)}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <Code size={16} />
              <span>Embed</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Preview Area */}
          <div className="flex-1 p-6 bg-gray-50 flex items-start justify-center overflow-auto">
            <div className={`bg-white rounded-lg shadow-lg transition-all duration-300 ${getPreviewClass()}`}>
              <div className="h-full p-6 overflow-auto">
                {formSchema?.components ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {formSchema.title || 'Formulário'}
                      </h3>
                      <p className="text-gray-600">
                        Preencha todos os campos obrigatórios para enviar o formulário.
                      </p>
                    </div>

                    {formSchema.components.map((component: FormComponent) => (
                      <div key={component.id} className="space-y-2">
                        {component.type !== 'checkbox' && (
                          <label className="block text-sm font-medium text-gray-700">
                            {component.label}
                            {component.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                        )}
                        {renderFormComponent(component)}
                      </div>
                    ))}

                    <div className="pt-4">
                      <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Enviar Formulário
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">Nenhum formulário para exibir</p>
                    <p className="text-sm">Adicione componentes ao formulário para ver o preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Embed Panel */}
          {showEmbed && (
            <div className="w-96 bg-white border-l border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Incorporar Formulário
              </h3>

              <div className="space-y-6">
                {/* Link Público */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link Público
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={publicUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(publicUrl)}
                      className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                {/* Código Embed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código HTML
                  </label>
                  <div className="relative">
                    <textarea
                      value={embedCode}
                      readOnly
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(embedCode)}
                      className="absolute top-2 right-2 p-1 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {/* Analytics */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">
                    Analytics
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-blue-700">
                      <div className="font-medium">Visualizações</div>
                      <div className="text-lg">0</div>
                    </div>
                    <div className="text-blue-700">
                      <div className="font-medium">Conversões</div>
                      <div className="text-lg">0</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormioPreview;
