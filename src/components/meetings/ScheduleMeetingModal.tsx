// =====================================================================================
// COMPONENT: Modal de Agendamento de Reunião
// Autor: Claude (Arquiteto Sênior)
// Descrição: Modal para agendar nova reunião com validação completa
// =====================================================================================

import React, { useState } from 'react';
import { X, Calendar, Clock, User, FileText } from 'lucide-react';
import { useCreateMeeting } from '../../hooks/useMeetings';
import { useAuth } from '../../contexts/AuthContext';
import type { CreateMeeting } from '../../shared/schemas/meetings';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineLeadId: string;
  leadMasterId: string;
  leadName?: string;
  companyName?: string;
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  pipelineLeadId,
  leadMasterId,
  leadName = 'Lead',
  companyName
}) => {
  const { user } = useAuth();
  const createMeetingMutation = useCreateMeeting();

  // AIDEV-NOTE: Estado do formulário
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // AIDEV-NOTE: Resetar formulário quando modal abre/fecha
  React.useEffect(() => {
    if (isOpen) {
      setFormData({ date: '', time: '', notes: '' });
      setErrors({});
    }
  }, [isOpen]);

  // AIDEV-NOTE: Validação do formulário
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = 'Data é obrigatória';
    }

    if (!formData.time) {
      newErrors.time = 'Horário é obrigatório';
    }

    // AIDEV-NOTE: Validar se data/hora não está no passado
    if (formData.date && formData.time) {
      const scheduledDateTime = new Date(`${formData.date}T${formData.time}`);
      if (scheduledDateTime <= new Date()) {
        newErrors.datetime = 'Data e horário devem ser no futuro';
      }
    }

    if (formData.notes && formData.notes.length > 500) {
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
      const meetingData: CreateMeeting = {
        pipeline_lead_id: pipelineLeadId,
        lead_master_id: leadMasterId,
        planned_at: new Date(`${formData.date}T${formData.time}`).toISOString(),
        notes: formData.notes || undefined
      };

      await createMeetingMutation.mutateAsync(meetingData);
      onClose();
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  // AIDEV-NOTE: Gerar horários sugeridos (próximas 2 semanas, horário comercial)
  const getSuggestedTimes = () => {
    const times = [];
    for (let hour = 9; hour <= 17; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 17) {
        times.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return times;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Agendar Reunião
              </h3>
              <p className="text-sm text-gray-500">
                {leadName} {companyName && `• ${companyName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Data */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                Data da Reunião
              </label>
              <input
                type="date"
                value={formData.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date}</p>
              )}
            </div>

            {/* Horário */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 mr-2" />
                Horário
              </label>
              <select
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.time ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Selecione um horário</option>
                {getSuggestedTimes().map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              {errors.time && (
                <p className="mt-1 text-sm text-red-600">{errors.time}</p>
              )}
            </div>

            {/* Erro de data/hora */}
            {errors.datetime && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.datetime}</p>
              </div>
            )}

            {/* Responsável */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 mr-2" />
                Responsável
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                <p className="text-sm text-gray-700">
                  {user?.first_name} {user?.last_name}
                </p>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 mr-2" />
                Observações (Opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Adicione detalhes sobre a reunião..."
                rows={3}
                maxLength={500}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.notes ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              <div className="flex justify-between mt-1">
                {errors.notes && (
                  <p className="text-sm text-red-600">{errors.notes}</p>
                )}
                <p className="text-xs text-gray-500 ml-auto">
                  {formData.notes.length}/500
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMeetingMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createMeetingMutation.isPending ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Agendando...
                </div>
              ) : (
                'Agendar Reunião'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};