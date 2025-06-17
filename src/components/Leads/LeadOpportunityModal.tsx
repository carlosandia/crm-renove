
import React, { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { X } from 'lucide-react';

interface LeadOpportunityModalProps {
  leadId: string;
  onClose: () => void;
  onSave: () => void;
}

const LeadOpportunityModal: React.FC<LeadOpportunityModalProps> = ({ leadId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    opportunity_name: '',
    opportunity_value: 0,
    status: 'active',
    probability: 0,
    expected_close_date: '',
    lost_reason: '',
    lost_notes: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const opportunityData = {
        ...formData,
        lead_id: leadId,
        opportunity_value: Number(formData.opportunity_value),
        probability: Number(formData.probability),
        expected_close_date: formData.expected_close_date || null,
        closed_at: formData.status === 'won' || formData.status === 'lost' ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('lead_opportunities')
        .insert([opportunityData]);

      if (error) throw error;

      onSave();
    } catch (error) {
      console.error('Erro ao salvar oportunidade:', error);
      alert('Erro ao salvar oportunidade. Tente novamente.');
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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Nova Oportunidade</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Oportunidade *
              </label>
              <input
                type="text"
                name="opportunity_name"
                value={formData.opportunity_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  name="opportunity_value"
                  value={formData.opportunity_value}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <option value="active">Ativa</option>
                  <option value="won">Ganha</option>
                  <option value="lost">Perdida</option>
                  <option value="paused">Pausada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Prevista de Fechamento
                </label>
                <input
                  type="date"
                  name="expected_close_date"
                  value={formData.expected_close_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {formData.status === 'lost' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo da Perda
                  </label>
                  <input
                    type="text"
                    name="lost_reason"
                    value={formData.lost_reason}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações sobre a Perda
                  </label>
                  <textarea
                    name="lost_notes"
                    value={formData.lost_notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
          </div>

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
              {isLoading ? 'Salvando...' : 'Criar Oportunidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadOpportunityModal;
