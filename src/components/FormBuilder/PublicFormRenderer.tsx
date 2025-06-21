import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useForm } from 'react-hook-form';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  leadScore?: number;
}

interface FormData {
  id: string;
  name: string;
  description?: string;
  formio_schema: {
    fields: FormField[];
    submitButton: any;
    styling: any;
    leadScoring: any;
  };
}

const PublicFormRenderer: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [leadScore, setLeadScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (slug) {
      loadForm();
    } else {
      setError('Slug do formulário não encontrado');
      setLoading(false);
    }
  }, [slug]);

  const loadForm = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (supabaseError) {
        console.error('Erro do Supabase:', supabaseError);
        setError('Formulário não encontrado ou inativo');
        return;
      }

      if (!data) {
        setError('Formulário não encontrado');
        return;
      }

      // Validar schema do formulário
      let parsedSchema;
      try {
        parsedSchema = typeof data.formio_schema === 'string' 
          ? JSON.parse(data.formio_schema) 
          : data.formio_schema;
      } catch (parseError) {
        console.error('Erro ao fazer parse do schema:', parseError);
        setError('Formulário com configuração inválida');
        return;
      }

      if (!parsedSchema || !Array.isArray(parsedSchema.fields)) {
        setError('Formulário sem campos configurados');
        return;
      }

      setFormData({
        ...data,
        formio_schema: {
          fields: parsedSchema.fields || [],
          submitButton: parsedSchema.submitButton || { text: 'Enviar' },
          styling: parsedSchema.styling || {},
          leadScoring: parsedSchema.leadScoring || { enabled: false, qualificationThreshold: 70 }
        }
      });

    } catch (error) {
      console.error('Erro ao carregar formulário:', error);
      setError('Erro interno ao carregar formulário');
    } finally {
      setLoading(false);
    }
  };

  const calculateLeadScore = (submissionData: any) => {
    try {
      if (!formData?.formio_schema?.leadScoring?.enabled) return 0;

      let score = 0;
      const fields = formData.formio_schema.fields || [];
      
      fields.forEach(field => {
        if (!field || !field.id) return;
        
        const fieldValue = submissionData[field.id];
        if (fieldValue && fieldValue !== '') {
          score += field.leadScore || 0;
          
          // Pontuação adicional baseada no tipo de campo e valor
          if (field.type === 'email' && typeof fieldValue === 'string' && fieldValue.includes('@')) {
            score += 15;
          }
          if (field.type === 'phone' && typeof fieldValue === 'string' && fieldValue.length >= 10) {
            score += 10;
          }
          if (field.type === 'text' && typeof fieldValue === 'string' && fieldValue.length > 10) {
            score += 5;
          }
          if (field.type === 'textarea' && typeof fieldValue === 'string' && fieldValue.length > 50) {
            score += 10;
          }
        }
      });

      return Math.min(Math.max(score, 0), 100); // Entre 0 e 100 pontos
    } catch (error) {
      console.error('Erro ao calcular lead score:', error);
      return 0;
    }
  };

  const onSubmit = async (data: any) => {
    if (!formData) {
      alert('Erro: Dados do formulário não encontrados');
      return;
    }

    try {
      // Calcular lead score
      const score = calculateLeadScore(data);
      setLeadScore(score);

      // Determinar qualificação do lead
      const threshold = formData.formio_schema?.leadScoring?.qualificationThreshold || 70;
      const isQualified = score >= threshold;

      // Salvar submissão
      const submissionData = {
        form_id: formData.id,
        submission_data: data,
        lead_score: score,
        is_qualified: isQualified,
        submitted_at: new Date().toISOString(),
        ip_address: null, // Pode ser implementado se necessário
        user_agent: navigator.userAgent
      };

      const { error: insertError } = await supabase
        .from('form_submissions')
        .insert(submissionData);

      if (insertError) {
        console.error('Erro ao salvar submissão:', insertError);
        alert('Erro ao enviar formulário. Tente novamente.');
        return;
      }

      setSubmitted(true);

      // Se tiver WhatsApp configurado, abrir link
      const whatsappNumber = formData.formio_schema?.styling?.whatsappNumber;
      if (whatsappNumber) {
        try {
          const message = `Olá! Acabei de preencher o formulário "${formData.name}".`;
          const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
        } catch (whatsappError) {
          console.error('Erro ao abrir WhatsApp:', whatsappError);
        }
      }

    } catch (error) {
      console.error('Erro ao processar submissão:', error);
      alert('Erro ao enviar formulário. Tente novamente.');
    }
  };

  const renderField = (field: FormField) => {
    if (!field || !field.id || !field.type) {
      return null;
    }

    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    const errorClasses = errors[field.id] ? "border-red-500 focus:ring-red-500" : "";

    try {
      switch (field.type) {
        case 'text':
        case 'email':
        case 'phone':
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={field.type}
                {...register(field.id, { 
                  required: field.required ? `${field.label} é obrigatório` : false,
                  pattern: field.type === 'email' ? {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Email inválido"
                  } : undefined
                })}
                placeholder={field.placeholder}
                className={`${baseClasses} ${errorClasses}`}
              />
              {errors[field.id] && (
                <p className="mt-1 text-sm text-red-600">{String(errors[field.id]?.message || "")}</p>
              )}
            </div>
          );

        case 'textarea':
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <textarea
                {...register(field.id, { 
                  required: field.required ? `${field.label} é obrigatório` : false 
                })}
                placeholder={field.placeholder}
                rows={4}
                className={`${baseClasses} ${errorClasses}`}
              />
              {errors[field.id] && (
                <p className="mt-1 text-sm text-red-600">{String(errors[field.id]?.message || "")}</p>
              )}
            </div>
          );

        case 'number':
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="number"
                {...register(field.id, { 
                  required: field.required ? `${field.label} é obrigatório` : false 
                })}
                placeholder={field.placeholder}
                className={`${baseClasses} ${errorClasses}`}
              />
              {errors[field.id] && (
                <p className="mt-1 text-sm text-red-600">{String(errors[field.id]?.message || "")}</p>
              )}
            </div>
          );

        case 'select':
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <select
                {...register(field.id, { 
                  required: field.required ? `${field.label} é obrigatório` : false 
                })}
                className={`${baseClasses} ${errorClasses}`}
              >
                <option value="">Selecione uma opção</option>
                {field.options?.map((option, idx) => (
                  <option key={idx} value={option}>{option}</option>
                ))}
              </select>
              {errors[field.id] && (
                <p className="mt-1 text-sm text-red-600">{String(errors[field.id]?.message || "")}</p>
              )}
            </div>
          );

        case 'radio':
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <div className="space-y-2">
                {field.options?.map((option, idx) => (
                  <label key={idx} className="flex items-center">
                    <input
                      type="radio"
                      {...register(field.id, { 
                        required: field.required ? `${field.label} é obrigatório` : false 
                      })}
                      value={option}
                      className="mr-2"
                    />
                    {option}
                  </label>
                ))}
              </div>
              {errors[field.id] && (
                <p className="mt-1 text-sm text-red-600">{String(errors[field.id]?.message || "")}</p>
              )}
            </div>
          );

        case 'checkbox':
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <div className="space-y-2">
                {field.options?.map((option, idx) => (
                  <label key={idx} className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(`${field.id}.${idx}`)}
                      value={option}
                      className="mr-2"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          );

        case 'date':
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                {...register(field.id, { 
                  required: field.required ? `${field.label} é obrigatório` : false 
                })}
                className={`${baseClasses} ${errorClasses}`}
              />
              {errors[field.id] && (
                <p className="mt-1 text-sm text-red-600">{String(errors[field.id]?.message || "")}</p>
              )}
            </div>
          );

        case 'file':
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                {...register(field.id, { 
                  required: field.required ? `${field.label} é obrigatório` : false 
                })}
                className={`${baseClasses} ${errorClasses}`}
              />
              {errors[field.id] && (
                <p className="mt-1 text-sm text-red-600">{String(errors[field.id]?.message || "")}</p>
              )}
            </div>
          );

        default:
          return (
            <div key={field.id} className="p-4 bg-gray-100 rounded-lg">
              <p className="text-gray-600">Tipo de campo não suportado: {field.type}</p>
            </div>
          );
      }
    } catch (renderError) {
      console.error('Erro ao renderizar campo:', field, renderError);
      return (
        <div key={field.id} className="p-4 bg-red-100 rounded-lg">
          <p className="text-red-600">Erro ao renderizar campo: {field.label}</p>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar formulário</h1>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Formulário não encontrado</h1>
          <p className="text-gray-600">O formulário solicitado não existe ou foi desativado.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Formulário enviado com sucesso!</h2>
          <p className="text-gray-600 mb-4">Obrigado por enviar suas informações.</p>
          
          {formData.formio_schema?.leadScoring?.enabled && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Pontuação do Lead</h3>
              <div className="flex items-center justify-center">
                <div className="text-3xl font-bold text-blue-600">{leadScore}</div>
                <div className="text-sm text-blue-600 ml-2">/ 100 pontos</div>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                {leadScore >= (formData.formio_schema.leadScoring.qualificationThreshold || 70)
                  ? 'Lead Qualificado ✅' 
                  : 'Lead em Qualificação 📋'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div 
          className="bg-white rounded-lg shadow-lg p-8"
          style={{
            backgroundColor: formData.formio_schema?.styling?.backgroundColor || '#FFFFFF',
            fontFamily: formData.formio_schema?.styling?.fontFamily || 'system-ui'
          }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{formData.name}</h1>
            {formData.description && (
              <p className="text-gray-600">{formData.description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {formData.formio_schema?.fields?.map(field => renderField(field))}
            
            <div className="pt-4">
              <button
                type="submit"
                style={{
                  backgroundColor: formData.formio_schema?.submitButton?.backgroundColor || '#3B82F6',
                  color: formData.formio_schema?.submitButton?.textColor || '#FFFFFF',
                  borderRadius: formData.formio_schema?.submitButton?.borderRadius || '8px',
                  padding: formData.formio_schema?.submitButton?.padding || '12px 24px'
                }}
                className="w-full border transition-colors hover:opacity-90 font-medium"
              >
                {formData.formio_schema?.submitButton?.text || 'Enviar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PublicFormRenderer; 