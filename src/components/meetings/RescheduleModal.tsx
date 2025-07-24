// =====================================================================================
// COMPONENT: RescheduleModal
// Autor: Claude (Arquiteto Sênior)
// Descrição: Modal para reagendamento com calendário e lógica enterprise
// =====================================================================================

import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { X, Calendar, Clock, RotateCcw, AlertTriangle, User } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

// AIDEV-NOTE: Registrar locale pt-BR do date-fns para react-datepicker
registerLocale('pt-BR', ptBR);

// AIDEV-NOTE: Interface para props do modal
interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  meetingData?: {
    planned_at: string;
    owner_name?: string;
  };
  onReschedule: (data: RescheduleData) => void;
  isSubmitting?: boolean;
}

// AIDEV-NOTE: Interface para dados do reagendamento
export interface RescheduleData {
  new_planned_at: string;
  reschedule_reason: string;
  notes?: string;
}

// AIDEV-NOTE: Motivos de reagendamento padronizados
const RESCHEDULE_REASONS = [
  {
    value: 'conflito_agenda',
    label: 'Conflito de agenda',
    icon: Calendar,
    description: 'Choque com outro compromisso'
  },
  {
    value: 'solicitacao_cliente',
    label: 'Solicitação do cliente',
    icon: User,
    description: 'Cliente solicitou mudança de horário'
  },
  {
    value: 'problema_tecnico',
    label: 'Problema técnico',
    icon: AlertTriangle,
    description: 'Falha técnica impediu a reunião'
  },
  {
    value: 'emergencia',
    label: 'Emergência',
    icon: AlertTriangle,
    description: 'Situação de emergência'
  },
  {
    value: 'outro',
    label: 'Outro motivo',
    icon: RotateCcw,
    description: 'Outro motivo não listado'
  }
];

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  meetingId,
  meetingData,
  onReschedule,
  isSubmitting = false
}) => {
  // AIDEV-NOTE: Estados do formulário
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  // AIDEV-NOTE: Reset states quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      // Definir data mínima como amanhã
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9:00 AM por padrão
      setSelectedDate(tomorrow);
      setSelectedReason('');
      setNotes('');
      setCustomReason('');
    }
  }, [isOpen]);

  // AIDEV-NOTE: Validações do formulário
  const isFormValid = () => {
    return selectedDate && 
           selectedReason && 
           (selectedReason !== 'outro' || customReason.trim()) &&
           selectedDate > new Date();
  };

  // AIDEV-NOTE: Handler para confirmar reagendamento
  const handleConfirmReschedule = () => {
    if (!isFormValid() || !selectedDate) return;

    const rescheduleData: RescheduleData = {
      new_planned_at: selectedDate.toISOString(),
      reschedule_reason: selectedReason,
      notes: selectedReason === 'outro' ? customReason : notes
    };

    onReschedule(rescheduleData);
  };

  // AIDEV-NOTE: Handler para mudança de data
  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Garantir que não seja no passado
      const now = new Date();
      if (date <= now) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(date.getHours(), date.getMinutes());
        setSelectedDate(tomorrow);
        return;
      }
    }
    setSelectedDate(date);
  };

  // AIDEV-NOTE: Configurações do DatePicker
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // Amanhã como mínimo
  
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90); // Máximo 3 meses

  if (!isOpen) return null;

  const selectedReasonData = RESCHEDULE_REASONS.find(r => r.value === selectedReason);
  const originalDate = meetingData ? new Date(meetingData.planned_at) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Reagendar Reunião
              </h3>
              <p className="text-sm text-gray-500">
                Selecionar nova data e horário
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Reunião Original */}
          {originalDate && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Reunião original:
              </h4>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>
                  {originalDate.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <Clock className="w-4 h-4 ml-4 mr-2" />
                <span>
                  {originalDate.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Seletor de Data e Hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Nova data e horário <span className="text-red-500">*</span>
            </label>
            <div className="border border-gray-300 rounded-lg p-3 bg-white">
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="Horário"
                dateFormat="EEEE, dd/MM/yyyy - HH:mm"
                minDate={minDate}
                maxDate={maxDate}
                locale={ptBR}
                placeholderText="Selecione data e horário"
                className="w-full border-0 focus:ring-0 text-center text-lg font-medium"
                calendarClassName="!border-0 !shadow-none"
                showPopperArrow={false}
                inline
              />
            </div>
            {selectedDate && selectedDate <= new Date() && (
              <p className="mt-2 text-sm text-red-600">
                A data deve ser no futuro
              </p>
            )}
          </div>

          {/* Motivo do Reagendamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Motivo do reagendamento <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {RESCHEDULE_REASONS.map((reason) => {
                const IconComponent = reason.icon;
                return (
                  <label
                    key={reason.value}
                    className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedReason === reason.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reschedule_reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="sr-only"
                    />
                    <IconComponent className={`w-5 h-5 mt-0.5 mr-3 ${
                      selectedReason === reason.value ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {reason.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reason.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Campo customizado para "outro" */}
          {selectedReason === 'outro' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Especifique o motivo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Descreva o motivo específico do reagendamento..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                required
              />
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações adicionais (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre o reagendamento..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          {/* Resumo */}
          {selectedDate && selectedReasonData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Resumo do reagendamento:
              </h4>
              <div className="space-y-1 text-sm text-blue-700">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    {selectedDate.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>
                    {selectedDate.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex items-center">
                  <selectedReasonData.icon className="w-4 h-4 mr-2" />
                  <span>{selectedReasonData.label}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmReschedule}
            disabled={!isFormValid() || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Reagendando...' : 'Confirmar Reagendamento'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;