import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Lead } from '../types/Pipeline';
import { GoogleCalendarAuth, CalendarEvent } from '../services/googleCalendarAuth';
import { useAuth } from '../providers/AuthProvider';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface GoogleCalendarEventModalProps {
  lead: Lead;
  onClose: () => void;
  onEventCreated?: (eventId: string) => void;
}

export const GoogleCalendarEventModal: React.FC<GoogleCalendarEventModalProps> = ({
  lead,
  onClose,
  onEventCreated
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados do formulário
  const [eventData, setEventData] = useState<CalendarEvent>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    attendees: [],
    lead_id: lead.id
  });

  // Verificar se o usuário está conectado ao Google Calendar
  useEffect(() => {
    const checkConnection = async () => {
      setIsCheckingConnection(true);
      try {
        if (!user?.id || !user.tenant_id) {
          setIsConnected(false);
          return;
        }
        
        const connected = await GoogleCalendarAuth.hasActiveIntegration(user.id, user.tenant_id);
        setIsConnected(connected);
        
        if (connected) {
          // Pré-preencher dados do lead
          const leadData = lead.custom_data || {};
          const nomeLead = leadData.nome_lead || leadData.nome_contato || leadData.contato || leadData.nome || 'Lead';
          const nomeOportunidade = leadData.nome_oportunidade || leadData.titulo_oportunidade || leadData.titulo || 'Reunião';
          
          setEventData({
            title: `${nomeOportunidade} - ${nomeLead}`,
            description: `Reunião comercial com ${nomeLead}\n\nOportunidade: ${nomeOportunidade}\nLead ID: ${lead.id}`,
            start_time: getDefaultStartTime(),
            end_time: getDefaultEndTime(),
            location: '',
            attendees: leadData.email ? [leadData.email] : [],
            lead_id: lead.id
          });
        }
      } catch (error) {
        console.error('Erro ao verificar conexão:', error);
        setError('Erro ao verificar conexão com Google Calendar');
      } finally {
        setIsCheckingConnection(false);
      }
    };

    checkConnection();
  }, [lead]);

  // Função para obter horário padrão (próxima hora)
  const getDefaultStartTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0); // Próxima hora
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  };

  // Função para obter horário de fim padrão (1 hora após o início)
  const getDefaultEndTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 2, 0, 0, 0); // 2 horas a partir de agora
    return now.toISOString().slice(0, 16);
  };

  // Conectar ao Google Calendar
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const authUrl = await GoogleCalendarAuth.getAuthUrl();
      if (authUrl === 'demo_mode') {
        setError('Google Calendar não está configurado. Entre em contato com o administrador.');
        return;
      }
      
      // Redirecionar para o Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Erro ao conectar:', error);
      setError('Erro ao conectar com Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  // Criar evento no Google Calendar
  const handleCreateEvent = async () => {
    if (!eventData.title || !eventData.start_time || !eventData.end_time) {
      setError('Título, data/hora de início e fim são obrigatórios');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!user?.id || !user.tenant_id) {
        setError('Usuário não autenticado');
        return;
      }

      // Obter integração ativa
      const integration = await GoogleCalendarAuth.getActiveIntegration(user.id, user.tenant_id);
      if (!integration) {
        setError('Nenhuma integração ativa encontrada. Conecte-se primeiro.');
        return;
      }

      const eventId = await GoogleCalendarAuth.createEvent(integration.id, eventData);
      
      if (eventId) {
        setSuccess('Evento criado com sucesso no Google Calendar!');
        if (onEventCreated) {
          onEventCreated(eventId);
        }
        
        // Fechar modal após 2 segundos
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError('Erro ao criar evento. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      setError('Erro ao criar evento no Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar dados do evento
  const updateEventData = (field: keyof CalendarEvent, value: any) => {
    setEventData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Adicionar participante
  const addAttendee = () => {
    const email = prompt('Digite o e-mail do participante:');
    if (email && email.includes('@')) {
      setEventData(prev => ({
        ...prev,
        attendees: [...(prev.attendees || []), email]
      }));
    }
  };

  // Remover participante
  const removeAttendee = (email: string) => {
    setEventData(prev => ({
      ...prev,
      attendees: prev.attendees?.filter(e => e !== email) || []
    }));
  };

  if (isCheckingConnection) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando conexão com Google Calendar...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Google Calendar</h2>
              <p className="text-sm text-gray-600">Criar evento para este lead</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <CardContent className="p-6 overflow-y-auto max-h-[70vh]">
          {!isConnected ? (
            // Tela de conexão
            <div className="text-center py-8">
              <div className="p-4 bg-orange-50 rounded-lg mb-6">
                <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-orange-900 mb-2">
                  Google Calendar não conectado
                </h3>
                <p className="text-orange-700">
                  Você precisa conectar sua conta do Google Calendar para criar eventos.
                </p>
              </div>

              <Button
                onClick={handleConnect}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Conectando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Conectar Google Calendar</span>
                  </div>
                )}
              </Button>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>
          ) : (
            // Formulário de criação de evento
            <div className="space-y-6">
              {/* Informações do Lead */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Lead Selecionado</h3>
                <div className="text-sm text-gray-600">
                  <p><strong>Nome:</strong> {lead.custom_data?.nome_lead || lead.custom_data?.nome || 'Lead sem nome'}</p>
                  <p><strong>Oportunidade:</strong> {lead.custom_data?.nome_oportunidade || lead.custom_data?.titulo || 'Oportunidade'}</p>
                  {lead.custom_data?.email && (
                    <p><strong>E-mail:</strong> {lead.custom_data.email}</p>
                  )}
                </div>
              </div>

              {/* Título do Evento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  value={eventData.title}
                  onChange={(e) => updateEventData('title', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Reunião comercial - Nome do cliente"
                />
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Data/Hora Início *
                  </label>
                  <input
                    type="datetime-local"
                    value={eventData.start_time}
                    onChange={(e) => updateEventData('start_time', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Data/Hora Fim *
                  </label>
                  <input
                    type="datetime-local"
                    value={eventData.end_time}
                    onChange={(e) => updateEventData('end_time', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Local */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Local
                </label>
                <input
                  type="text"
                  value={eventData.location}
                  onChange={(e) => updateEventData('location', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Escritório, Google Meet, Zoom, etc."
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Descrição
                </label>
                <textarea
                  value={eventData.description}
                  onChange={(e) => updateEventData('description', e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Detalhes da reunião, agenda, objetivos..."
                />
              </div>

              {/* Participantes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    <Users className="w-4 h-4 inline mr-1" />
                    Participantes
                  </label>
                  <button
                    type="button"
                    onClick={addAttendee}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Adicionar
                  </button>
                </div>
                {eventData.attendees && eventData.attendees.length > 0 ? (
                  <div className="space-y-2">
                    {eventData.attendees.map((email, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <span className="text-sm text-gray-700">{email}</span>
                        <button
                          onClick={() => removeAttendee(email)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Nenhum participante adicionado</p>
                )}
              </div>

              {/* Mensagens de Status */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-green-700 text-sm">{success}</p>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateEvent}
                  disabled={loading || !eventData.title || !eventData.start_time || !eventData.end_time}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Criando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Criar Evento</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 