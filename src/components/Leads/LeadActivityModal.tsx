
import React, { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { X } from 'lucide-react';

interface LeadActivityModalProps {
  leadId: string;
  onClose: () => void;
  onSave: () => void;
}

const LeadActivityModal: React.FC<LeadActivityModalProps> = ({ leadId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    activity_type: 'call',
    activity_title: '',
    activity_description: '',
    due_date: '',
    communication_direction: 'outbound'
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: currentUser } = await supabase.auth.getUser();

      const activityData = {
        ...formData,
        lead_id: leadId,
        user_id: currentUser.user?.id,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        communication_direction: ['call', 'email'].includes(formData.activity_type) ? formData.communication_direction : null
      };

      const { error } = await supabase
        .from('lead_activities')
        .insert([activityData]);

      if (error) throw error;

      onSave();
    } catch (error) {
      console.error('Erro ao salvar atividade:', error);
      alert('Erro ao salvar atividade. Tente novamente.');
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
          <h2 className="text-xl font-semibold text-gray-900">Nova Atividade</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Atividade *
                </label>
                <select
                  name="activity_type"
                  value={formData.activity_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="call">Ligação</option>
                  <option value="email">Email</option>
                  <option value="meeting">Reunião</option>
                  <option value="note">Anotação</option>
                  <option value="task">Tarefa</option>
                </select>
              </div>

              {['call', 'email'].includes(formData.activity_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Direção
                  </label>
                  <select
                    name="communication_direction"
                    value={formData.communication_direction}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="outbound">Saída</option>
                    <option value="inbound">Entrada</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título da Atividade *
              </label>
              <input
                type="text"
                name="activity_title"
                value={formData.activity_title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                name="activity_description"
                value={formData.activity_description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {['task', 'meeting'].includes(formData.activity_type) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Vencimento
                </label>
                <input
                  type="datetime-local"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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
              {isLoading ? 'Salvando...' : 'Criar Atividade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadActivityModal;
