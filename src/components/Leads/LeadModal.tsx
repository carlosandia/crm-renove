
import React, { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { X } from 'lucide-react';

interface Lead {
  id: string;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_source?: string;
  campaign_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  estimated_value: number;
  lead_score: number;
  lead_temperature: string;
  probability: number;
  status: string;
  assigned_to?: string;
  last_contact_date?: string;
  next_action_date?: string;
}

interface LeadModalProps {
  lead?: Lead | null;
  onClose: () => void;
  onSave: () => void;
}

const LeadModal: React.FC<LeadModalProps> = ({ lead, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
    lead_source: '',
    campaign_name: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    estimated_value: 0,
    lead_score: 0,
    lead_temperature: 'cold',
    probability: 0,
    status: 'active',
    assigned_to: '',
    last_contact_date: '',
    next_action_date: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        job_title: lead.job_title || '',
        lead_source: lead.lead_source || '',
        campaign_name: lead.campaign_name || '',
        utm_source: lead.utm_source || '',
        utm_medium: lead.utm_medium || '',
        utm_campaign: lead.utm_campaign || '',
        estimated_value: lead.estimated_value || 0,
        lead_score: lead.lead_score || 0,
        lead_temperature: lead.lead_temperature || 'cold',
        probability: lead.probability || 0,
        status: lead.status || 'active',
        assigned_to: lead.assigned_to || '',
        last_contact_date: lead.last_contact_date ? lead.last_contact_date.split('T')[0] : '',
        next_action_date: lead.next_action_date ? lead.next_action_date.split('T')[0] : ''
      });
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Obter tenant_id do usuário atual
      const { data: currentUser } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', currentUser.user?.id)
        .single();

      const leadData = {
        ...formData,
        tenant_id: userData?.tenant_id,
        created_by: currentUser.user?.id,
        estimated_value: Number(formData.estimated_value),
        lead_score: Number(formData.lead_score),
        probability: Number(formData.probability),
        last_contact_date: formData.last_contact_date ? new Date(formData.last_contact_date).toISOString() : null,
        next_action_date: formData.next_action_date ? new Date(formData.next_action_date).toISOString() : null
      };

      if (lead) {
        // Editar lead existente
        const { error } = await supabase
          .from('leads_master')
          .update(leadData)
          .eq('id', lead.id);

        if (error) throw error;
      } else {
        // Criar novo lead
        const { error } = await supabase
          .from('leads_master')
          .insert([leadData]);

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      alert('Erro ao salvar lead. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {lead ? 'Editar Lead' : 'Novo Lead'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Dados Básicos */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dados Básicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sobrenome
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Dados de Origem */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Origem do Lead</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fonte do Lead
                  </label>
                  <select
                    name="lead_source"
                    value={formData.lead_source}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="website">Website</option>
                    <option value="social_media">Redes Sociais</option>
                    <option value="referral">Indicação</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="email_marketing">Email Marketing</option>
                    <option value="paid_ads">Anúncios Pagos</option>
                    <option value="event">Evento</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Campanha
                  </label>
                  <input
                    type="text"
                    name="campaign_name"
                    value={formData.campaign_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Source
                  </label>
                  <input
                    type="text"
                    name="utm_source"
                    value={formData.utm_source}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Medium
                  </label>
                  <input
                    type="text"
                    name="utm_medium"
                    value={formData.utm_medium}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Dados Comerciais */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Dados Comerciais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="number"
                    name="estimated_value"
                    value={formData.estimated_value}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Score do Lead (0-100)
                  </label>
                  <input
                    type="number"
                    name="lead_score"
                    value={formData.lead_score}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperatura
                  </label>
                  <select
                    name="lead_temperature"
                    value={formData.lead_temperature}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cold">Frio</option>
                    <option value="warm">Morno</option>
                    <option value="hot">Quente</option>
                    <option value="very_hot">Muito Quente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Probabilidade (%)
                  </label>
                  <input
                    type="number"
                    name="probability"
                    value={formData.probability}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Ativo</option>
                    <option value="converted">Convertido</option>
                    <option value="lost">Perdido</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Datas */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Datas Importantes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Último Contato
                  </label>
                  <input
                    type="date"
                    name="last_contact_date"
                    value={formData.last_contact_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Próxima Ação
                  </label>
                  <input
                    type="date"
                    name="next_action_date"
                    value={formData.next_action_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Salvando...' : (lead ? 'Atualizar' : 'Criar Lead')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
