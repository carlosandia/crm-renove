import React from 'react';
import { 
  Star, Upload, Building, MapPin, Flag, Shield, 
  Mail, Phone, Hash, Globe, DollarSign
} from 'lucide-react';
import { FormField } from '../../../shared/types/Domain';
import { TextAlign } from '../../../types/Forms';

interface FieldRendererProps {
  field: FormField;
  value: any;
  error?: string;
  onChange: (fieldId: string, value: any) => void;
}

/**
 * Componente modular para renderização de campos de formulário
 * Extraído do PublicFormRenderer para melhor manutenibilidade
 */
const FieldRenderer: React.FC<FieldRendererProps> = ({ 
  field, 
  value, 
  error, 
  onChange 
}) => {
  const fieldValue = value || '';
  const hasError = !!error;

  // Função auxiliar para formatação de telefone
  const formatPhoneNumber = (value: string) => {
    const phoneNumbers = value.replace(/\D/g, '');
    if (phoneNumbers.length <= 10) {
      return phoneNumbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      return phoneNumbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
  };

  const baseInputStyle = {
    fontSize: field.styling?.fontSize || '16px',
    padding: field.styling?.padding || '12px',
    borderRadius: field.styling?.borderRadius || '8px',
    borderColor: hasError ? '#ef4444' : (field.styling?.borderColor || '#d1d5db'),
    backgroundColor: field.styling?.backgroundColor || '#ffffff',
  };

  const inputClassNames = `w-full border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
    hasError ? 'border-red-500' : ''
  }`;

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={fieldValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          style={baseInputStyle}
          className={inputClassNames}
          required={field.required}
        />
      );

    case 'email':
      return (
        <input
          type="email"
          value={fieldValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          style={baseInputStyle}
          className={inputClassNames}
          required={field.required}
        />
      );

    case 'phone':
      return (
        <input
          type="tel"
          value={fieldValue}
          onChange={(e) => onChange(field.id, formatPhoneNumber(e.target.value))}
          placeholder={field.placeholder}
          style={baseInputStyle}
          className={inputClassNames}
          required={field.required}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={fieldValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          style={baseInputStyle}
          className={`${inputClassNames} resize-none`}
          rows={4}
          required={field.required}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={fieldValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          style={baseInputStyle}
          className={inputClassNames}
          required={field.required}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={fieldValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          style={baseInputStyle}
          className={inputClassNames}
          required={field.required}
        />
      );

    case 'time':
      return (
        <input
          type="time"
          value={fieldValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          style={baseInputStyle}
          className={inputClassNames}
          required={field.required}
        />
      );

    case 'url':
      return (
        <input
          type="url"
          value={fieldValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          style={baseInputStyle}
          className={inputClassNames}
          required={field.required}
        />
      );

    case 'currency':
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
            R$
          </span>
          <input
            type="text"
            value={fieldValue}
            onChange={(e) => {
              // Formatação de moeda
              let value = e.target.value.replace(/\D/g, '');
              value = (parseFloat(value) / 100).toFixed(2);
              value = value.replace('.', ',');
              value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
              onChange(field.id, value);
            }}
            placeholder="0,00"
            style={{
              ...baseInputStyle,
              paddingLeft: '2.5rem',
            }}
            className={inputClassNames}
            required={field.required}
          />
        </div>
      );

    case 'file':
      return (
        <div
          style={{
            borderRadius: field.styling?.borderRadius || '8px',
            borderColor: hasError ? '#ef4444' : (field.styling?.borderColor || '#d1d5db'),
            backgroundColor: field.styling?.backgroundColor || '#ffffff',
          }}
          className={`w-full border-2 border-dashed transition-all duration-200 hover:border-blue-400 hover:bg-blue-50 ${
            hasError ? 'border-red-500' : ''
          }`}
        >
          <label className="flex flex-col items-center justify-center py-6 cursor-pointer">
            <Upload size={32} className="text-gray-400 mb-2" />
            <span className="text-sm text-gray-600 font-medium">
              {fieldValue ? 'Arquivo selecionado' : 'Clique para enviar arquivo'}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              {(field.validation_rules?.accept as string) || 'Todos os tipos'} • 
              Max: {(field.validation_rules?.max_size as string) || '10MB'}
            </span>
            <input
              type="file"
              className="hidden"
              accept={field.validation_rules?.accept as string}
              multiple={field.validation_rules?.multiple as boolean}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  onChange(field.id, field.validation_rules?.multiple ? Array.from(files) : files[0]);
                }
              }}
              required={field.required}
            />
          </label>
        </div>
      );

    case 'range':
      return (
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{(field.validation_rules?.min as number) || 0}</span>
            <span className="font-medium text-blue-600">
              {fieldValue || Math.round((((field.validation_rules?.max as number) || 100) + ((field.validation_rules?.min as number) || 0)) / 2)}
            </span>
            <span>{(field.validation_rules?.max as number) || 100}</span>
          </div>
          <input
            type="range"
            min={(field.validation_rules?.min as number) || 0}
            max={(field.validation_rules?.max as number) || 100}
            step={(field.validation_rules?.step as number) || 1}
            value={fieldValue || Math.round((((field.validation_rules?.max as number) || 100) + ((field.validation_rules?.min as number) || 0)) / 2)}
            onChange={(e) => onChange(field.id, parseInt(e.target.value))}
            style={{
              accentColor: field.styling?.borderColor || '#3b82f6',
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            required={field.required}
          />
        </div>
      );

    case 'select':
      return (
        <select
          value={fieldValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          style={baseInputStyle}
          className={inputClassNames}
          required={field.required}
        >
          <option value="">Selecione uma opção</option>
          {field.options?.map((option: string, idx: number) => (
            <option key={idx} value={option}>{option}</option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div className="space-y-3">
          {field.options?.map((option: string, idx: number) => (
            <label key={idx} className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name={field.name}
                value={option}
                checked={fieldValue === option}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                required={field.required}
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
          {field.options?.map((option: string, idx: number) => (
            <label key={idx} className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                value={option}
                checked={(fieldValue || []).includes(option)}
                onChange={(e) => {
                  const currentValues = fieldValue || [];
                  const newValues = e.target.checked
                    ? [...currentValues, option]
                    : currentValues.filter((v: string) => v !== option);
                  onChange(field.id, newValues);
                }}
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
          {Array.from({ length: (field.validation_rules?.max_rating as number) || 5 }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(field.id, idx + 1)}
              className="transition-colors hover:scale-110 transform duration-200"
            >
              <Star 
                size={28} 
                className={`cursor-pointer transition-colors ${
                  (fieldValue || 0) > idx ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'
                }`}
                fill={(fieldValue || 0) > idx ? 'currentColor' : 'none'}
              />
            </button>
          ))}
        </div>
      );

    case 'city':
      return (
        <div className="relative">
          <input
            type="text"
            value={fieldValue}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder || 'São Paulo'}
            list={`cities-${field.id}`}
            style={baseInputStyle}
            className={inputClassNames}
            required={field.required}
          />
          <Building className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <datalist id={`cities-${field.id}`}>
            {(field.validation_rules?.suggestions as string[])?.map((city: string, idx: number) => (
              <option key={idx} value={city} />
            ))}
          </datalist>
        </div>
      );

    case 'state':
      return (
        <div className="relative">
          <select
            value={fieldValue}
            onChange={(e) => onChange(field.id, e.target.value)}
            style={baseInputStyle}
            className={`${inputClassNames} appearance-none`}
            required={field.required}
          >
            <option value="">Selecione um estado...</option>
            {(field.validation_rules?.suggestions as string[])?.map((state: string, idx: number) => (
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
            value={fieldValue}
            onChange={(e) => onChange(field.id, e.target.value)}
            style={baseInputStyle}
            className={`${inputClassNames} appearance-none`}
            required={field.required}
          >
            <option value="">Selecione um país...</option>
            {(field.validation_rules?.suggestions as string[])?.map((country: string, idx: number) => (
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
            value={fieldValue}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder="Digite o resultado..."
            style={baseInputStyle}
            className={inputClassNames}
            required={field.required}
          />
        </div>
      );

    case 'heading':
      const HeadingTag = `h${(field.validation_rules?.level as number) || 2}` as keyof JSX.IntrinsicElements;
      return (
        <HeadingTag
          style={{
            fontSize: field.styling?.fontSize || '24px',
            color: field.styling?.textColor || '#374151',
            textAlign: ((field.validation_rules?.align as TextAlign) || 'left'),
            margin: 0,
            fontWeight: 'bold'
          }}
        >
          {field.label}
        </HeadingTag>
      );

    case 'paragraph':
      return (
        <p
          style={{
            fontSize: field.styling?.fontSize || '16px',
            color: field.styling?.textColor || '#6b7280',
            textAlign: ((field.validation_rules?.align as TextAlign) || 'left'),
            margin: 0,
            lineHeight: 1.6
          }}
        >
          {field.description || field.label}
        </p>
      );

    case 'divider':
      return (
        <hr
          style={{
            borderColor: field.styling?.borderColor || '#e5e7eb',
            margin: '16px 0'
          }}
          className="border-0 border-t"
        />
      );

    case 'image':
      return (
        <img
          src={(field.validation_rules?.src as string)}
          alt={(field.validation_rules?.alt as string) || field.label}
          style={{
            width: (field.validation_rules?.width as string) || 'auto',
            height: (field.validation_rules?.height as string) || 'auto',
            borderRadius: field.styling?.borderRadius || '8px',
            maxWidth: '100%'
          }}
          className="block"
        />
      );

    case 'whatsapp':
      return (
        <button
          type="button"
          onClick={() => {
            const phone = (field.validation_rules?.number as string) || '';
            const message = (field.validation_rules?.message as string) || '';
            const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
          }}
          style={{
            backgroundColor: '#25d366',
            color: 'white',
            padding: field.styling?.padding || '12px 24px',
            borderRadius: field.styling?.borderRadius || '8px',
            fontSize: field.styling?.fontSize || '16px',
          }}
          className="border-0 cursor-pointer hover:bg-green-600 transition-colors flex items-center space-x-2"
        >
          <Phone size={16} />
          <span>{(field.validation_rules?.button_text as string) || 'Enviar WhatsApp'}</span>
        </button>
      );

    case 'submit':
      return (
        <button
          type="submit"
          style={{
            fontSize: field.styling?.fontSize || '16px',
            padding: field.styling?.padding || '12px 24px',
            borderRadius: field.styling?.borderRadius || '8px',
            backgroundColor: (field.validation_rules?.background_color as string) || '#3b82f6',
            color: (field.validation_rules?.text_color as string) || '#ffffff',
          }}
          className="border-0 cursor-pointer hover:opacity-90 transition-opacity font-medium"
        >
          {(field.validation_rules?.button_text as string) || 'Enviar'}
        </button>
      );

    default:
      return (
        <div className="text-gray-500 text-sm">
          Tipo de campo não suportado: {field.type}
        </div>
      );
  }
};

// ✅ CORREÇÃO FASE 2: Exportando com React.memo e função de comparação customizada
export default React.memo(FieldRenderer, (prevProps, nextProps) => {
  return (
    prevProps.field.id === nextProps.field.id &&
    prevProps.field.type === nextProps.field.type &&
    prevProps.field.required === nextProps.field.required &&
    prevProps.field.label === nextProps.field.label &&
    prevProps.value === nextProps.value &&
    prevProps.onChange === nextProps.onChange &&
    JSON.stringify(prevProps.field.validation_rules) === JSON.stringify(nextProps.field.validation_rules) &&
    JSON.stringify(prevProps.field.options) === JSON.stringify(nextProps.field.options)
  );
}); 