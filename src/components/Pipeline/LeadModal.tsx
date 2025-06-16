
import React from 'react';

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">➕ Adicionar Novo Lead</h2>
              <p className="text-blue-100 text-sm mt-1">
                Preencha os campos para criar um novo lead
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {(pipeline.pipeline_custom_fields || []).length > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(pipeline.pipeline_custom_fields || [])
                  .sort((a, b) => a.field_order - b.field_order)
                  .map((field) => (
                    <div key={field.id} className={field.field_type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.field_label}
                        {field.is_required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      
                      {field.field_type === 'textarea' ? (
                        <textarea
                          value={formData[field.field_name] || ''}
                          onChange={(e) => onFieldChange(field.field_name, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.is_required}
                          rows={4}
                          className="modern-input resize-none"
                        />
                      ) : field.field_type === 'select' ? (
                        <select
                          value={formData[field.field_name] || ''}
                          onChange={(e) => onFieldChange(field.field_name, e.target.value)}
                          required={field.is_required}
                          className="modern-select"
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
                          className="modern-input"
                        />
                      )}
                    </div>
                  ))
                }
              </div>
            </form>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚠️</div>
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

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="modern-btn modern-btn-secondary"
          >
            Cancelar
          </button>
          {(pipeline.pipeline_custom_fields || []).length > 0 && (
            <button
              onClick={onSubmit}
              className="modern-btn modern-btn-primary"
            >
              <span>✅</span>
              <span>Criar Lead</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadModal;
