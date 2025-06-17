
import React, { useState, useEffect } from 'react';
import { X, Save, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_temperature?: string;
  status?: string;
  lead_source?: string;
  estimated_value?: number;
  lead_score?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface LeadFormModalProps {
  lead?: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  tenantId: string;
}

const LeadFormModal: React.FC<LeadFormModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSave,
  tenantId
}) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
    lead_temperature: 'cold',
    status: 'active',
    lead_source: '',
    estimated_value: '',
    lead_score: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preencher formulário quando lead for fornecido
  useEffect(() => {
    if (lead) {
      setFormData({
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        job_title: lead.job_title || '',
        lead_temperature: lead.lead_temperature || 'cold',
        status: lead.status || 'active',
        lead_source: lead.lead_source || '',
        estimated_value: lead.estimated_value?.toString() || '',
        lead_score: lead.lead_score?.toString() || '',
        utm_source: lead.utm_source || '',
        utm_medium: lead.utm_medium || '',
        utm_campaign: lead.utm_campaign || ''
      });
    } else {
      // Reset form for new lead
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        job_title: '',
        lead_temperature: 'cold',
        status: 'active',
        lead_source: '',
        estimated_value: '',
        lead_score: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: ''
      });
    }
    setErrors({});
  }, [lead, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (formData.estimated_value && isNaN(Number(formData.estimated_value))) {
      newErrors.estimated_value = 'Valor deve ser um número';
    }

    if (formData.lead_score && (isNaN(Number(formData.lead_score)) || Number(formData.lead_score) < 0 || Number(formData.lead_score) > 100)) {
      newErrors.lead_score = 'Score deve ser um número entre 0 e 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const leadData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        company: formData.company.trim() || null,
        job_title: formData.job_title.trim() || null,
        lead_temperature: formData.lead_temperature,
        status: formData.status,
        lead_source: formData.lead_source.trim() || null,
        estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
        lead_score: formData.lead_score ? Number(formData.lead_score) : null,
        utm_source: formData.utm_source.trim() || null,
        utm_medium: formData.utm_medium.trim() || null,
        utm_campaign: formData.utm_campaign.trim() || null,
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      };

      if (lead) {
        // Atualizar lead existente
        const { error } = await supabase
          .from('leads_master')
          .update(leadData)
          .eq('id', lead.id);

        if (error) throw error;
        alert('Lead atualizado com sucesso!');
      } else {
        // Criar novo lead
        const { error } = await supabase
          .from('leads_master')
          .insert({
            ...leadData,
            created_by: tenantId, // Usando tenant_id temporariamente
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        alert('Lead criado com sucesso!');
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      alert('Erro ao salvar lead. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {lead ? 'Editar Lead' : 'Novo Lead'}
            </h2>
            <button
              onClick={onClose}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.first_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nome do lead"
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sobrenome
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Sobrenome do lead"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="email@exemplo.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome da empresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => handleInputChange('job_title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Cargo na empresa"
                  />
                </div>
              </div>
            </div>

            {/* Status e Qualificação */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status e Qualificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Ativo</option>
                    <option value="converted">Convertido</option>
                    <option value="lost">Perdido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperatura
                  </label>
                  <select
                    value={formData.lead_temperature}
                    onChange={(e) => handleInputChange('lead_temperature', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cold">Frio</option>
                    <option value="warm">Morno</option>
                    <option value="hot">Quente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.estimated_value}
                    onChange={(e) => handleInputChange('estimated_value', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.estimated_value ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.estimated_value && (
                    <p className="text-red-500 text-sm mt-1">{errors.estimated_value}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Score (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.lead_score}
                    onChange={(e) => handleInputChange('lead_score', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.lead_score ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.lead_score && (
                    <p className="text-red-500 text-sm mt-1">{errors.lead_score}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Origem e UTM */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Origem e Rastreamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Origem do Lead
                  </label>
                  <input
                    type="text"
                    value={formData.lead_source}
                    onChange={(e) => handleInputChange('lead_source', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Google Ads, Facebook, Indicação, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Source
                  </label>
                  <input
                    type="text"
                    value={formData.utm_source}
                    onChange={(e) => handleInputChange('utm_source', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="google, facebook, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Medium
                  </label>
                  <input
                    type="text"
                    value={formData.utm_medium}
                    onChange={(e) => handleInputChange('utm_medium', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="cpc, social, email, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Campaign
                  </label>
                  <input
                    type="text"
                    value={formData.utm_campaign}
                    onChange={(e) => handleInputChange('utm_campaign', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome da campanha"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>{loading ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadFormModal;
