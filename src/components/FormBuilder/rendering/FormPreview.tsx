import React from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { 
  Star, Mail, Phone, Hash, Calendar, Clock, Globe, DollarSign, 
  Building, MapPin, Flag, Shield, Upload, User, GripVertical,
  Copy, Trash2, Edit, Plus, Send, MessageSquare
} from 'lucide-react';
import { FormField, FormStyling, PreviewMode } from '../../../types/Forms';

interface FormPreviewProps {
  fields: FormField[];
  formData?: {
    name: string;
    description?: string;
  };
  formStyle?: FormStyling;
  previewMode: PreviewMode;
  selectedField?: FormField | null;
  onFieldSelect: (field: FormField) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  removeField?: (fieldId: string) => void;
  duplicateField?: (fieldId: string) => void;
}

const FormPreview: React.FC<FormPreviewProps> = ({
  fields,
  formData = { name: 'Formulário' },
  formStyle = {},
  previewMode,
  selectedField,
  onFieldSelect,
  onDragEnd,
  removeField = () => {},
  duplicateField = () => {}
}) => {
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

      case 'number':
        return (
          <div className="relative">
            <input
              type="text"
              placeholder={field.placeholder || '123,45'}
              style={baseStyle}
              className={baseClasses}
              required={field.is_required}
            />
            <Hash className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
        );

      case 'date':
        return (
          <div className="relative">
            <input
              type="date"
              style={baseStyle}
              className={baseClasses}
              required={field.is_required}
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        );

      case 'time':
        return (
          <div className="relative">
            <input
              type="time"
              style={baseStyle}
              className={baseClasses}
              required={field.is_required}
            />
            <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        );

      case 'url':
        return (
          <div className="relative">
            <input
              type="url"
              placeholder="https://exemplo.com"
              style={baseStyle}
              className={baseClasses}
              required={field.is_required}
            />
            <Globe className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
              R$
            </span>
            <input
              type="text"
              placeholder="1.234,56"
              style={{
                ...baseStyle,
                paddingLeft: '2.5rem',
                paddingRight: '2.5rem',
              }}
              className={baseClasses}
              required={field.is_required}
            />
            <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
        );

      case 'city':
        return (
          <div className="relative">
            <input
              type="text"
              placeholder={field.placeholder || 'São Paulo'}
              list={`cities-${field.id}`}
              style={baseStyle}
              className={baseClasses}
              required={field.is_required}
            />
            <Building className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <datalist id={`cities-${field.id}`}>
              {field.field_options?.suggestions?.map((city: string, idx: number) => (
                <option key={idx} value={city} />
              ))}
            </datalist>
          </div>
        );

      case 'state':
        return (
          <div className="relative">
            <select
              style={baseStyle}
              className={`${baseClasses} appearance-none`}
              required={field.is_required}
            >
              <option value="">Selecione um estado...</option>
              {field.field_options?.options?.map((state: string, idx: number) => (
                <option key={idx} value={state}>{state}</option>
              ))}
            </select>
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        );

      case 'country':
        return (
          <div className="relative">
            <select
              style={baseStyle}
              className={`${baseClasses} appearance-none`}
              required={field.is_required}
            >
              <option value="">Selecione um país...</option>
              {field.field_options?.options?.map((country: string, idx: number) => (
                <option key={idx} value={country}>{country}</option>
              ))}
            </select>
            <Flag className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        );

      case 'captcha':
        return (
          <div className="space-y-3">
            <div className="bg-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300">
              <div className="flex items-center justify-center space-x-2">
                <Shield className="text-blue-600" size={24} />
                <span className="text-lg font-mono font-bold text-gray-800">
                  {(() => {
                    const num1 = Math.floor(Math.random() * 10) + 1;
                    const num2 = Math.floor(Math.random() * 10) + 1;
                    return `${num1} + ${num2} = ?`;
                  })()}
                </span>
              </div>
            </div>
            <input
              type="text"
              placeholder="Digite o resultado..."
              style={baseStyle}
              className={baseClasses}
              required={field.is_required}
            />
          </div>
        );

      case 'file':
        return (
          <div
            style={{
              borderRadius: field.styling?.borderRadius || '8px',
              borderColor: field.styling?.borderColor || '#d1d5db',
              backgroundColor: field.styling?.backgroundColor || '#ffffff',
            }}
            className="w-full border-2 border-dashed transition-all duration-200 hover:border-blue-400 hover:bg-blue-50"
          >
            <label className="flex flex-col items-center justify-center py-6 cursor-pointer">
              <Upload size={32} className="text-gray-400 mb-2" />
              <span className="text-sm text-gray-600 font-medium">
                Clique para enviar arquivo
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {field.field_options?.accept || 'Todos os tipos'} • 
                Max: {field.field_options?.max_size || '10MB'}
              </span>
              <input
                type="file"
                className="hidden"
                accept={field.field_options?.accept}
                multiple={field.field_options?.multiple}
                required={field.is_required}
              />
            </label>
          </div>
        );

      case 'range':
        return (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{field.field_options?.min || 0}</span>
              <span className="font-medium text-blue-600">
                {Math.round(((field.field_options?.max || 100) + (field.field_options?.min || 0)) / 2)}
              </span>
              <span>{field.field_options?.max || 100}</span>
            </div>
            <input
              type="range"
              min={field.field_options?.min || 0}
              max={field.field_options?.max || 100}
              step={field.field_options?.step || 1}
              defaultValue={Math.round(((field.field_options?.max || 100) + (field.field_options?.min || 0)) / 2)}
              style={{
                accentColor: field.styling?.borderColor || '#3b82f6',
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              required={field.is_required}
            />
          </div>
        );

      case 'select':
        return (
          <select
            style={baseStyle}
            className={baseClasses}
            required={field.is_required}
          >
            <option value="">Selecione uma opção</option>
            {field.field_options.options?.map((option: string, idx: number) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-3">
            {field.field_options.options?.map((option: string, idx: number) => (
              <label key={idx} className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name={field.field_name}
                  value={option}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                  required={field.is_required}
                />
                <span 
                  className="ml-3 text-gray-700 group-hover:text-gray-900 transition-colors"
                  style={{ fontSize: field.styling?.fontSize || '14px' }}
                >
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-3">
            {field.field_options.options?.map((option: string, idx: number) => (
              <label key={idx} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  value={option}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span 
                  className="ml-3 text-gray-700 group-hover:text-gray-900 transition-colors"
                  style={{ fontSize: field.styling?.fontSize || '14px' }}
                >
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      case 'rating':
        return (
          <div className="flex space-x-1">
            {Array.from({ length: field.field_options.max_rating || 5 }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                className="transition-colors hover:scale-110 transform duration-200"
              >
                <Star 
                  size={28} 
                  className="text-gray-300 hover:text-yellow-400 cursor-pointer" 
                  fill="none"
                />
              </button>
            ))}
          </div>
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

      {/* Campos do Formulário (drag-and-drop temporariamente desabilitado) */}
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
              <div
                key={field.id}
                className={`relative group cursor-pointer ${
                  selectedField?.id === field.id ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''
                } p-4 rounded-lg transition-all`}
                onClick={() => onFieldSelect(field)}
              >
                {/* Controles do campo */}
                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10">
                  <button
                    className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
                    title="Arrastar (temporariamente desabilitado)"
                    disabled
                  >
                    <GripVertical size={12} className="text-gray-300" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateField(field.id);
                    }}
                    className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
                    title="Duplicar"
                  >
                    <Copy size={12} className="text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(field.id);
                    }}
                    className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-red-50"
                    title="Remover"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>

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
                  {/* Botão de Submit */}
                  <div className="relative group">
                    <button
                      type="submit"
                      onClick={() => onFieldSelect(submitField)}
                      style={{
                        backgroundColor: submitField.field_options?.background_color || '#3b82f6',
                        color: submitField.field_options?.text_color || '#ffffff',
                      }}
                      className={`w-full flex items-center justify-center py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                        selectedField?.id === submitField.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                      }`}
                    >
                      <Send className="mr-2" size={18} />
                      {submitField.field_options?.button_text || 'Enviar Formulário'}
                    </button>
                    
                    {/* Controles do botão */}
                    <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFieldSelect(submitField);
                        }}
                        className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
                        title="Editar"
                      >
                        <Edit size={12} className="text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(submitField.id);
                        }}
                        className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-red-50"
                        title="Remover"
                      >
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Botão WhatsApp */}
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => onFieldSelect(whatsappField)}
                      style={{
                        backgroundColor: whatsappField.field_options?.background_color || '#25d366',
                        color: whatsappField.field_options?.text_color || '#ffffff',
                      }}
                      className={`w-full flex items-center justify-center py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                        selectedField?.id === whatsappField.id ? 'ring-2 ring-green-500 ring-opacity-50' : ''
                      }`}
                    >
                      <MessageSquare className="mr-2" size={18} />
                      {whatsappField.field_options?.button_text || 'Enviar via WhatsApp'}
                      <div className="ml-2 w-2 h-2 bg-white bg-opacity-30 rounded-full animate-pulse"></div>
                    </button>
                    
                    {/* Controles do botão */}
                    <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFieldSelect(whatsappField);
                        }}
                        className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
                        title="Editar"
                      >
                        <Edit size={12} className="text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(whatsappField.id);
                        }}
                        className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-red-50"
                        title="Remover"
                      >
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            } else if (submitField) {
              // Apenas botão de Submit
              return (
                <div className="relative group">
                  <button
                    type="submit"
                    onClick={() => onFieldSelect(submitField)}
                    style={{
                      backgroundColor: submitField.field_options?.background_color || '#3b82f6',
                      color: submitField.field_options?.text_color || '#ffffff',
                    }}
                    className={`w-full flex items-center justify-center py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                      selectedField?.id === submitField.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                    }`}
                  >
                    <Send className="mr-2" size={18} />
                    {submitField.field_options?.button_text || 'Enviar Formulário'}
                  </button>
                  
                  {/* Controles do botão */}
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFieldSelect(submitField);
                      }}
                      className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
                      title="Editar"
                    >
                      <Edit size={12} className="text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(submitField.id);
                      }}
                      className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-red-50"
                      title="Remover"
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                </div>
              );
            } else if (whatsappField) {
              // Apenas botão WhatsApp
              return (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => onFieldSelect(whatsappField)}
                    style={{
                      backgroundColor: whatsappField.field_options?.background_color || '#25d366',
                      color: whatsappField.field_options?.text_color || '#ffffff',
                    }}
                    className={`w-full flex items-center justify-center py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                      selectedField?.id === whatsappField.id ? 'ring-2 ring-green-500 ring-opacity-50' : ''
                    }`}
                  >
                    <MessageSquare className="mr-2" size={18} />
                    {whatsappField.field_options?.button_text || 'Enviar via WhatsApp'}
                    <div className="ml-2 w-2 h-2 bg-white bg-opacity-30 rounded-full animate-pulse"></div>
                  </button>
                  
                  {/* Controles do botão */}
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFieldSelect(whatsappField);
                      }}
                      className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
                      title="Editar"
                    >
                      <Edit size={12} className="text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(whatsappField.id);
                      }}
                      className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-red-50"
                      title="Remover"
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
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
