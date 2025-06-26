import React, { useState, useCallback } from 'react';
import { X, Calendar, Clock, MapPin, Users, FileText, Save, CalendarDays } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { BlurFade } from '../ui/blur-fade';
import { ShimmerButton } from '../ui/shimmer-button';
import { format, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoogleCalendarAuth, CalendarEvent } from '../../services/googleCalendarAuth';
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar';
import { showSuccessToast, showErrorToast } from '../../lib/toast';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadData?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  };
}

interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  attendees: string;
}

const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  isOpen,
  onClose,
  leadData
}) => {
  const { hasIntegration, activeIntegration, availableCalendars } = useGoogleCalendar();
  
  // Estados do formulário
  const [formData, setFormData] = useState<EventFormData>(() => {
    const now = new Date();
    const startDate = format(now, 'yyyy-MM-dd');
    const startTime = format(addHours(now, 1), 'HH:mm');
    const endTime = format(addHours(now, 2), 'HH:mm');
    
    return {
      title: leadData ? `Reunião com ${leadData.name}` : 'Nova Reunião',
      description: leadData ? `Reunião comercial com ${leadData.name}${leadData.company ? ` da ${leadData.company}` : ''}` : '',
      startDate,
      startTime,
      endDate: startDate,
      endTime,
      location: '',
      attendees: leadData?.email || ''
    };
  });

  const [selectedCalendar, setSelectedCalendar] = useState<string>('primary');
  const [isCreating, setIsCreating] = useState(false);

  // Handler para mudanças no formulário
  const handleInputChange = useCallback((field: keyof EventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handler para salvar evento
  const handleSaveEvent = useCallback(async () => {
    if (!hasIntegration || !activeIntegration) {
      showErrorToast('Google Calendar não conectado');
      return;
    }

    // Validações básicas
    if (!formData.title.trim()) {
      showErrorToast('Título do evento é obrigatório');
      return;
    }

    if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
      showErrorToast('Data e hora são obrigatórias');
      return;
    }

    // Construir datas ISO
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00.000Z`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00.000Z`);

    if (endDateTime <= startDateTime) {
      showErrorToast('Data/hora de fim deve ser após o início');
      return;
    }

    try {
      setIsCreating(true);
      
      const eventData: CalendarEvent = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: formData.location.trim(),
        attendees: formData.attendees ? formData.attendees.split(',').map(email => email.trim()).filter(Boolean) : [],
        lead_id: leadData?.id
      };

      console.log('📅 MODAL: Criando evento:', {
        title: eventData.title,
        start: eventData.start_time,
        end: eventData.end_time,
        leadId: eventData.lead_id
      });

      const eventId = await GoogleCalendarAuth.createEvent(activeIntegration.id, eventData);
      
      console.log('✅ MODAL: Evento criado com sucesso:', eventId);
      
      showSuccessToast(
        'Evento criado!', 
        `Evento "${formData.title}" criado no Google Calendar`
      );
      
      onClose();
    } catch (error) {
      console.error('❌ MODAL: Erro ao criar evento:', error);
      showErrorToast('Erro ao criar evento', 'Não foi possível criar o evento no Google Calendar');
    } finally {
      setIsCreating(false);
    }
  }, [formData, hasIntegration, activeIntegration, leadData, onClose]);

  // Handler para fechar modal
  const handleClose = useCallback(() => {
    if (!isCreating) {
      onClose();
    }
  }, [isCreating, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <BlurFade>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Criar Evento</h2>
                <p className="text-sm text-gray-500">
                  {leadData ? `Para o lead: ${leadData.name}` : 'Novo evento no Google Calendar'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isCreating}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Status da Integração */}
          {!hasIntegration && (
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
              <div className="flex items-center space-x-2">
                <Calendar className="text-yellow-600" size={16} />
                <p className="text-sm text-yellow-800">
                  Google Calendar não conectado. Vá para Integrações → Google Calendar para conectar.
                </p>
              </div>
            </div>
          )}

          {/* Formulário */}
          <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                Título do Evento *
              </Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Ex: Reunião comercial com cliente"
                className="w-full"
                disabled={isCreating}
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Descrição
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Adicione detalhes sobre o evento..."
                rows={3}
                className="w-full"
                disabled={isCreating}
              />
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data/Hora Início */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700">Início *</Label>
                <div className="space-y-2">
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full"
                    disabled={isCreating}
                  />
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    className="w-full"
                    disabled={isCreating}
                  />
                </div>
              </div>

              {/* Data/Hora Fim */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700">Fim *</Label>
                <div className="space-y-2">
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full"
                    disabled={isCreating}
                  />
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    className="w-full"
                    disabled={isCreating}
                  />
                </div>
              </div>
            </div>

            {/* Local */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                Local
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Ex: Escritório, Google Meet, etc."
                  className="w-full pl-10"
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Participantes */}
            <div className="space-y-2">
              <Label htmlFor="attendees" className="text-sm font-medium text-gray-700">
                Participantes (emails)
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="attendees"
                  type="text"
                  value={formData.attendees}
                  onChange={(e) => handleInputChange('attendees', e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full pl-10"
                  disabled={isCreating}
                />
              </div>
              <p className="text-xs text-gray-500">
                Separe múltiplos emails com vírgula
              </p>
            </div>

            {/* Calendário (se tiver múltiplos) */}
            {availableCalendars.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="calendar" className="text-sm font-medium text-gray-700">
                  Calendário
                </Label>
                <select
                  id="calendar"
                  value={selectedCalendar}
                  onChange={(e) => setSelectedCalendar(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isCreating}
                >
                  {availableCalendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.summary} {calendar.primary && '(Principal)'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar size={16} />
              <span>
                {hasIntegration ? 'Conectado ao Google Calendar' : 'Não conectado'}
              </span>
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
                className="px-4 py-2"
              >
                Cancelar
              </Button>
              
              <ShimmerButton
                onClick={handleSaveEvent}
                disabled={isCreating || !hasIntegration}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                {isCreating ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Criar Evento</span>
                  </>
                )}
              </ShimmerButton>
            </div>
          </div>
        </div>
      </BlurFade>
    </div>
  );
};

export default CalendarEventModal; 