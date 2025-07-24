import React from 'react';
import { 
  Star, Mail, Phone, Hash, Calendar, Clock, Globe, DollarSign, 
  Building, MapPin, Flag, Shield, Upload, User, 
  Plus, Send, MessageSquare
} from 'lucide-react';
import { FormField, PreviewMode } from '../../../types/Forms';

interface FormPreviewProps {
  fields: FormField[];
  previewMode: PreviewMode;
  selectedField?: FormField | null;
  onFieldSelect: (field: FormField) => void;
}

const FormPreview: React.FC<FormPreviewProps> = ({
  fields,
  previewMode,
  selectedField,
  onFieldSelect
}) => {
  // Dados padrão para preview
  const formData = { name: 'Preview do Formulário', description: '' };
  const formStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: true,
    borderWidth: '1px',
    borderColor: '#e5e7eb',
    shadow: true,
    padding: '32px',
    title: 'Formulário de Contato',
    titleColor: '#111827',
    titleSize: '24px',
    titleWeight: 'bold',
    titleAlign: 'left'
  };

  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile': return 'max-w-sm';
      case 'tablet': return 'max-w-2xl';
      default: return 'max-w-4xl';
    }
  };

  const renderField = (field: FormField) => {
    const baseStyle = {
      fontSize: field.styling?.fontSize || '16px',
      padding: field.styling?.padding || '12px',
      borderRadius: field.styling?.borderRadius || '8px',
      borderColor: field.styling?.borderColor || '#d1d5db',
      backgroundColor: field.styling?.backgroundColor || '#ffffff',
    };

    const baseClasses = "w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={field.placeholder}
            style={baseStyle}
            className={baseClasses}
            required={field.is_required}
          />
        );

      case 'email':
        return (
          <div className="relative">
            <input
              type="email"
              placeholder={field.placeholder || 'exemplo@email.com'}
              style={baseStyle}
              className={baseClasses}
              required={field.is_required}
            />
            <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
        );

      case 'phone':
        return (
          <div className="relative">
            <input
              type="tel"
              placeholder="(11) 99999-9999"
              style={baseStyle}
              className={baseClasses}
              required={field.is_required}
            />
            <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
        );

      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder}
            style={baseStyle}
            className={`${baseClasses} resize-none`}
            rows={4}
            required={field.is_required}
          />
        );

      case 'select':
        return (
          <select
            style={baseStyle}
            className={baseClasses}
            required={field.is_required}
          >
            <option value="">Selecione uma opção</option>
            {field.field_options?.options?.map((option: string, idx: number) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'submit':
        return (
          <button
            type="button"
            style={{
              fontSize: field.styling?.fontSize || '16px',
              padding: field.styling?.padding || '12px 24px',
              borderRadius: field.styling?.borderRadius || '8px',
              backgroundColor: field.field_options?.background_color || '#3b82f6',
              color: field.field_options?.text_color || '#ffffff',
            }}
            className="flex items-center justify-center w-full font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Send className="mr-3" size={20} />
            <span>{field.field_options?.button_text || 'Enviar Formulário'}</span>
          </button>
        );

      case 'whatsapp':
        return (
          <button
            type="button"
            style={{
              fontSize: field.styling?.fontSize || '16px',
              padding: field.styling?.padding || '12px 24px',
              borderRadius: field.styling?.borderRadius || '8px',
              backgroundColor: field.field_options?.background_color || '#25d366',
              color: field.field_options?.text_color || '#ffffff',
            }}
            className="flex items-center justify-center w-full font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <MessageSquare className="mr-3" size={20} />
            <span>{field.field_options?.button_text || 'Enviar via WhatsApp'}</span>
            <div className="ml-3 w-2 h-2 bg-white bg-opacity-30 rounded-full animate-pulse"></div>
          </button>
        );

      default:
        return (
          <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg text-center">
            <p className="text-gray-500">Campo {field.field_type} não suportado no preview</p>
          </div>
        );
    }
  };

  return (
    <div className={`mx-auto bg-white rounded-lg shadow-lg p-8 transition-all duration-300 ${getPreviewWidth()}`}
         style={{
           backgroundColor: formStyle.backgroundColor,
           borderRadius: formStyle.borderRadius,
           border: formStyle.border ? `${formStyle.borderWidth} solid ${formStyle.borderColor}` : 'none',
           boxShadow: formStyle.shadow ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none',
           padding: formStyle.padding
         }}>
      {/* Cabeçalho do Formulário */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2"
            style={{
              color: formStyle.titleColor,
              fontSize: formStyle.titleSize,
              fontWeight: formStyle.titleWeight,
              textAlign: formStyle.titleAlign as any
            }}>
          {formStyle.title || formData.name || 'Novo Formulário'}
        </h2>
        {formData.description && (
          <p className="text-gray-600">{formData.description}</p>
        )}
      </div>

      {/* Campos do Formulário */}
      <div className="space-y-6">
        {fields.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Plus size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Comece adicionando campos
            </h3>
            <p className="text-gray-500">
              Escolha um elemento da barra lateral para começar
            </p>
          </div>
        ) : (
          fields
            .filter(field => !['submit', 'whatsapp'].includes(field.field_type))
            .map((field, index) => (
              <div key={field.id}
                      className={`relative group cursor-pointer ${
                        selectedField?.id === field.id ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''
                      } p-4 rounded-lg transition-all hover:bg-gray-50`}
                      onClick={() => onFieldSelect(field)}
                    >
                      {/* Campo do formulário */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.field_label}
                          {field.is_required && <span className="text-red-500 ml-1">*</span>}
                          {field.scoring_weight && field.scoring_weight > 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Star size={10} className="mr-1" />
                              {field.scoring_weight}pts
                            </span>
                          )}
                        </label>
                        {field.field_description && (
                          <p className="text-sm text-gray-500">{field.field_description}</p>
                        )}
                        
                        {/* Renderização do campo baseada no tipo */}
                    {renderField(field)}
                  </div>
                </div>
              ))
        )}
      </div>

      {/* Botões de ação */}
      {fields.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          {(() => {
            const submitField = fields.find(field => field.field_type === 'submit');
            const whatsappField = fields.find(field => field.field_type === 'whatsapp');
            
            if (submitField && whatsappField) {
              // Layout 50/50 quando tem ambos os botões
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div onClick={() => onFieldSelect(submitField)}>
                    {renderField(submitField)}
                  </div>
                  <div onClick={() => onFieldSelect(whatsappField)}>
                    {renderField(whatsappField)}
                  </div>
                </div>
              );
            } else if (submitField) {
              // Apenas botão de Submit
              return (
                <div onClick={() => onFieldSelect(submitField)}>
                  {renderField(submitField)}
                </div>
              );
            } else if (whatsappField) {
              // Apenas botão WhatsApp
              return (
                <div onClick={() => onFieldSelect(whatsappField)}>
                  {renderField(whatsappField)}
                </div>
              );
            }
            
            return null;
          })()}
        </div>
      )}
    </div>
  );
};

export default FormPreview;