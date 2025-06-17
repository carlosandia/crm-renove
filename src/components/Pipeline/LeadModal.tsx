
import React from 'react';
import { X, Plus } from 'lucide-react';

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
}

interface Pipeline {
  id: string;
  name: string;
  pipeline_custom_fields?: CustomField[];
}

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipeline: Pipeline;
  formData: Record<string, any>;
  onFieldChange: (fieldName: string, value: any) => void;
  onSubmit: () => void;
}

const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  pipeline,
  formData,
  onFieldChange,
  onSubmit
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return '👤';
      case 'email': return '📧';
      case 'phone': return '📱';
      case 'number': return '💰';
      case 'date': return '📅';
      case 'textarea': return '📝';
      case 'select': return '📋';
      default: return '📄';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
        {/* Header moderno */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 border-b border-green-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Adicionar Novo Lead</h2>
                <p className="text-green-100 text-sm mt-1">
                  Preencha os campos para criar um novo lead
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo do modal */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {(pipeline.pipeline_custom_fields || []).length > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(pipeline.pipeline_custom_fields || [])
                  .sort((a, b) => a.field_order - b.field_order)
                  .map((field) => (
                    <div key={field.id} className={field.field_type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                        <span className="text-lg">{getFieldIcon(field.field_type)}</span>
                        <span>{field.field_label}</span>
                        {field.is_required && (
                          <span className="text-red-500 text-xs">*</span>
                        )}
                      </label>
                      
                      {field.field_type === 'textarea' ? (
                        <textarea
                          value={formData[field.field_name] || ''}
                          onChange={(e) => onFieldChange(field.field_name, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.is_required}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none text-sm"
                        />
                      ) : field.field_type === 'select' ? (
                        <select
                          value={formData[field.field_name] || ''}
                          onChange={(e) => onFieldChange(field.field_name, e.target.value)}
                          required={field.is_required}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm bg-white"
                        >
                          <option value="">Selecione...</option>
                          {(field.field_options || []).map((option, index) => (
                            <option key={index} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.field_type}
                          value={formData[field.field_name] || ''}
                          onChange={(e) => onFieldChange(field.field_name, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.is_required}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm"
                        />
                      )}
                    </div>
                  ))
                }
              </div>
            </form>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum Campo Customizado
              </h3>
              <p className="text-gray-600 mb-2">
                Esta pipeline ainda não possui campos customizados configurados.
              </p>
              <p className="text-gray-500 text-sm">
                Entre em contato com seu administrador para configurar os campos necessários.
              </p>
            </div>
          )}
        </div>

        {/* Footer moderno */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancelar
          </button>
          {(pipeline.pipeline_custom_fields || []).length > 0 && (
            <button
              onClick={onSubmit}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Lead</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadModal;
