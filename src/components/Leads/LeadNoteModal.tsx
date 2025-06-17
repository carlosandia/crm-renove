
import React, { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { X } from 'lucide-react';

interface LeadNoteModalProps {
  leadId: string;
  onClose: () => void;
  onSave: () => void;
}

const LeadNoteModal: React.FC<LeadNoteModalProps> = ({ leadId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    note_title: '',
    note_content: '',
    is_private: false
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: currentUser } = await supabase.auth.getUser();

      const noteData = {
        ...formData,
        lead_id: leadId,
        user_id: currentUser.user?.id
      };

      const { error } = await supabase
        .from('lead_notes')
        .insert([noteData]);

      if (error) throw error;

      onSave();
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      alert('Erro ao salvar nota. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Nova Nota</h2>
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
                Título (opcional)
              </label>
              <input
                type="text"
                name="note_title"
                value={formData.note_title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conteúdo da Nota *
              </label>
              <textarea
                name="note_content"
                value={formData.note_content}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite sua nota aqui..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_private"
                id="is_private"
                checked={formData.is_private}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_private" className="ml-2 block text-sm text-gray-700">
                Nota privada (apenas você pode ver)
              </label>
            </div>
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
              {isLoading ? 'Salvando...' : 'Salvar Nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadNoteModal;
