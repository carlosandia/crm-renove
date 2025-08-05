// =====================================================================================
// COMPONENT: Modal de Edição de Reunião
// Autor: Claude (Arquiteto Sênior)
// Descrição: Modal simples para editar título e observações da reunião
// =====================================================================================

import React, { useState, useEffect } from 'react';
import { X, Edit3, Save } from 'lucide-react';
import { useUpdateMeeting } from '../../hooks/useMeetings';
import type { MeetingWithRelations, UpdateMeetingData } from '../../shared/schemas/meetings';

interface EditMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingWithRelations;
}

export const EditMeetingModal: React.FC<EditMeetingModalProps> = ({
  isOpen,
  onClose,
  meeting
}) => {
  const updateMeetingMutation = useUpdateMeeting();

  // AIDEV-NOTE: Estado do formulário
  const [formData, setFormData] = useState({
    title: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // AIDEV-NOTE: Pré-preencher formulário quando modal abre
  useEffect(() => {
    if (isOpen && meeting) {
      setFormData({
        title: meeting.title || '',
        notes: meeting.notes || ''
      });
      setErrors({});
    }
  }, [isOpen, meeting]);

  // AIDEV-NOTE: Validação do formulário
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (formData.title.trim().length > 500) {
      newErrors.title = 'Título deve ter no máximo 500 caracteres';
    }

    if (formData.notes.length > 500) {
      newErrors.notes = 'Observações devem ter no máximo 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // AIDEV-NOTE: Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const updateData: UpdateMeetingData = {
        title: formData.title.trim(),
        notes: formData.notes.trim() || undefined
      };

      await updateMeetingMutation.mutateAsync({
        meetingId: meeting.id,
        updateData
      });

      onClose();
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  // AIDEV-NOTE: Fechar modal (só se não estiver salvando)
  const handleClose = () => {
    if (!updateMeetingMutation.isPending) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Edit3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Editar Reunião
              </h3>
              <p className="text-sm text-gray-500">
                Altere o título e observações
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={updateMeetingMutation.isPending}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Título da Reunião */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título da Reunião *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Reunião comercial - Apresentação de proposta"
                maxLength={500}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={updateMeetingMutation.isPending}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.title.length}/500 caracteres
              </p>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Detalhes da reunião, agenda, objetivos..."
                rows={4}
                maxLength={500}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.notes ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={updateMeetingMutation.isPending}
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600">{errors.notes}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.notes.length}/500 caracteres
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={updateMeetingMutation.isPending}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMeetingMutation.isPending || !formData.title.trim()}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateMeetingMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Salvando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};