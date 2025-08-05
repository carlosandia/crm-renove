import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Separator } from '../../ui/separator';
import { BlurFade } from '../../ui/blur-fade';
import { 
  Calendar, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Settings,
  User,
  MapPin,
  Video,
  Phone,
  Mail,
  RefreshCw,
  Plus,
  Trash2,
  Info,
  Globe,
  Pause,
  Play
} from 'lucide-react';
import { useGoogleCalendar } from '../../../hooks/useGoogleCalendar';
import { useAuth } from '../../../providers/AuthProvider';

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  day_of_week: number; // 0 = domingo, 1 = segunda, etc.
  is_available: boolean;
  max_bookings?: number;
}

interface CalendarConfig {
  enable_calendar_booking: boolean;
  calendar_id: string;
  auto_confirm_bookings: boolean;
  booking_duration: number; // em minutos
  buffer_time: number; // tempo entre agendamentos em minutos
  advance_booking_days: number; // quantos dias de antecedência
  available_slots: TimeSlot[];
  meeting_type: 'online' | 'in_person' | 'phone' | 'flexible';
  default_location?: string;
  meeting_link?: string;
  confirmation_email: boolean;
  reminder_email: boolean;
  timezone: string;
}

interface CalendarIntegrationProps {
  initialConfig?: Partial<CalendarConfig>;
  onConfigChange: (config: CalendarConfig) => void;
  disabled?: boolean;
}

export const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({
  initialConfig,
  onConfigChange,
  disabled = false
}) => {
  const { user } = useAuth();
  const { 
    hasIntegration, 
    connectCalendar, 
    disconnectCalendar, 
    isLoading: calendarLoading 
  } = useGoogleCalendar();
  
  const [config, setConfig] = useState<CalendarConfig>({
    enable_calendar_booking: false,
    calendar_id: 'primary',
    auto_confirm_bookings: true,
    booking_duration: 30,
    buffer_time: 15,
    advance_booking_days: 30,
    available_slots: [
      {
        id: '1',
        start_time: '09:00',
        end_time: '12:00',
        day_of_week: 1, // Segunda
        is_available: true,
        max_bookings: 4
      },
      {
        id: '2',
        start_time: '14:00',
        end_time: '17:00',
        day_of_week: 1, // Segunda
        is_available: true,
        max_bookings: 3
      },
      // Terça a Sexta
      ...Array.from({ length: 4 }, (_, i) => [
        {
          id: `${i + 2}_morning`,
          start_time: '09:00',
          end_time: '12:00',
          day_of_week: i + 2,
          is_available: true,
          max_bookings: 4
        },
        {
          id: `${i + 2}_afternoon`,
          start_time: '14:00',
          end_time: '17:00',
          day_of_week: i + 2,
          is_available: true,
          max_bookings: 3
        }
      ]).flat()
    ],
    meeting_type: 'online',
    meeting_link: 'https://meet.google.com/new',
    confirmation_email: true,
    reminder_email: true,
    timezone: 'America/Sao_Paulo',
    ...initialConfig
  });

  const [newSlot, setNewSlot] = useState<Partial<TimeSlot>>({
    start_time: '09:00',
    end_time: '10:00',
    day_of_week: 1,
    is_available: true,
    max_bookings: 1
  });

  // ATUALIZAR CONFIG QUANDO MUDANÇAS ACONTECEREM
  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  const updateConfig = (updates: Partial<CalendarConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleConnectCalendar = async () => {
    try {
      await connectCalendar();
      // Após conectar, habilitar agendamento automaticamente
      updateConfig({ enable_calendar_booking: true });
    } catch (error) {
      console.error('Erro ao conectar calendar:', error);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      await disconnectCalendar();
      // Desabilitar agendamento quando desconectar
      updateConfig({ enable_calendar_booking: false });
    } catch (error) {
      console.error('Erro ao desconectar calendar:', error);
    }
  };

  const addTimeSlot = () => {
    if (newSlot.start_time && newSlot.end_time && newSlot.day_of_week !== undefined) {
      const slot: TimeSlot = {
        id: Date.now().toString(),
        start_time: newSlot.start_time!,
        end_time: newSlot.end_time!,
        day_of_week: newSlot.day_of_week!,
        is_available: newSlot.is_available ?? true,
        max_bookings: newSlot.max_bookings ?? 1
      };

      updateConfig({
        available_slots: [...config.available_slots, slot]
      });

      // Reset form
      setNewSlot({
        start_time: '09:00',
        end_time: '10:00',
        day_of_week: 1,
        is_available: true,
        max_bookings: 1
      });
    }
  };

  const removeTimeSlot = (slotId: string) => {
    updateConfig({
      available_slots: config.available_slots.filter(slot => slot.id !== slotId)
    });
  };

  const toggleSlotAvailability = (slotId: string) => {
    updateConfig({
      available_slots: config.available_slots.map(slot =>
        slot.id === slotId 
          ? { ...slot, is_available: !slot.is_available }
          : slot
      )
    });
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[dayOfWeek] || 'Inválido';
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'online': return Video;
      case 'in_person': return MapPin;
      case 'phone': return Phone;
      case 'flexible': return Globe;
      default: return Settings;
    }
  };

  const getMeetingTypeColor = (type: string) => {
    switch (type) {
      case 'online': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in_person': return 'text-green-600 bg-green-50 border-green-200';
      case 'phone': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'flexible': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAvailableSlotsCount = () => {
    return config.available_slots.filter(slot => slot.is_available).length;
  };

  const getTotalWeeklySlots = () => {
    return config.available_slots.reduce((total, slot) => {
      if (slot.is_available) {
        const durationHours = (
          (new Date(`2000-01-01 ${slot.end_time}`).getTime() - 
           new Date(`2000-01-01 ${slot.start_time}`).getTime()) / 
          (1000 * 60 * 60)
        );
        const slotsInPeriod = Math.floor((durationHours * 60) / config.booking_duration);
        return total + (slotsInPeriod * (slot.max_bookings || 1));
      }
      return total;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* HEADER E CONEXÃO */}
      <BlurFade delay={0.1}>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Integração com Google Calendar</h3>
              <p className="text-sm text-muted-foreground">
                Permita agendamentos diretos do formulário para seu calendário
              </p>
            </div>
            {hasIntegration && config.enable_calendar_booking && (
              <Badge variant="secondary" className="ml-auto">
                <CheckCircle className="w-3 h-3 mr-1" />
                Agendamento Ativo
              </Badge>
            )}
          </div>

          {/* STATUS DA CONEXÃO */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {hasIntegration ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                )}
                <div>
                  <p className="font-medium">
                    {hasIntegration ? 'Google Calendar Conectado' : 'Google Calendar Desconectado'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {hasIntegration 
                      ? 'Calendário sincronizado e pronto para agendamentos' 
                      : 'Conecte seu Google Calendar para habilitar agendamentos'
                    }
                  </p>
                </div>
              </div>
              
              <Button
                onClick={hasIntegration ? handleDisconnectCalendar : handleConnectCalendar}
                disabled={calendarLoading || disabled}
                variant={hasIntegration ? "outline" : "default"}
                size="sm"
              >
                {calendarLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {hasIntegration ? 'Desconectar' : 'Conectar Calendar'}
              </Button>
            </div>

            {/* ATIVAÇÃO DO AGENDAMENTO */}
            {hasIntegration && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enable-calendar-booking"
                  checked={config.enable_calendar_booking}
                  onChange={(e) => updateConfig({ enable_calendar_booking: e.target.checked })}
                  disabled={disabled}
                  className="w-4 h-4"
                />
                <div>
                  <Label htmlFor="enable-calendar-booking" className="cursor-pointer">
                    Habilitar agendamentos via formulário
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Leads poderão agendar reuniões diretamente ao preencher o formulário
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </BlurFade>

      {/* CONFIGURAÇÕES BÁSICAS */}
      {hasIntegration && config.enable_calendar_booking && (
        <BlurFade delay={0.2}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">Configurações de Agendamento</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="booking-duration">Duração do agendamento (minutos)</Label>
                <Select 
                  value={config.booking_duration.toString()} 
                  onValueChange={(value) => updateConfig({ booking_duration: parseInt(value) })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h 30min</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="buffer-time">Tempo entre agendamentos (minutos)</Label>
                <Select 
                  value={config.buffer_time.toString()} 
                  onValueChange={(value) => updateConfig({ buffer_time: parseInt(value) })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sem intervalo</SelectItem>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="advance-booking">Antecedência máxima (dias)</Label>
                <Input
                  id="advance-booking"
                  type="number"
                  min="1"
                  max="365"
                  value={config.advance_booking_days}
                  onChange={(e) => updateConfig({ advance_booking_days: parseInt(e.target.value) || 30 })}
                  disabled={disabled}
                />
              </div>

              <div>
                <Label htmlFor="timezone">Fuso horário</Label>
                <Select 
                  value={config.timezone} 
                  onValueChange={(value) => updateConfig({ timezone: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Sao_Paulo">Brasília (UTC-3)</SelectItem>
                    <SelectItem value="America/New_York">Nova York (UTC-5)</SelectItem>
                    <SelectItem value="Europe/London">Londres (UTC+0)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (UTC+1)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tóquio (UTC+9)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Opções Avançadas</Label>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="auto-confirm"
                    checked={config.auto_confirm_bookings}
                    onChange={(e) => updateConfig({ auto_confirm_bookings: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="auto-confirm" className="cursor-pointer text-sm">
                    Confirmar agendamentos automaticamente
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="confirmation-email"
                    checked={config.confirmation_email}
                    onChange={(e) => updateConfig({ confirmation_email: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="confirmation-email" className="cursor-pointer text-sm">
                    Enviar email de confirmação
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="reminder-email"
                    checked={config.reminder_email}
                    onChange={(e) => updateConfig({ reminder_email: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="reminder-email" className="cursor-pointer text-sm">
                    Enviar lembrete antes da reunião
                  </Label>
                </div>
              </div>
            </div>
          </Card>
        </BlurFade>
      )}

      {/* TIPO DE REUNIÃO */}
      {hasIntegration && config.enable_calendar_booking && (
        <BlurFade delay={0.3}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">Tipo de Reunião</h4>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'online', label: 'Online', description: 'Google Meet/Zoom' },
                  { value: 'in_person', label: 'Presencial', description: 'No escritório' },
                  { value: 'phone', label: 'Telefone', description: 'Ligação' },
                  { value: 'flexible', label: 'Flexível', description: 'Lead escolhe' }
                ].map(type => {
                  const TypeIcon = getMeetingTypeIcon(type.value);
                  
                  return (
                    <button
                      key={type.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateConfig({ meeting_type: type.value as any })}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-left
                        ${config.meeting_type === type.value 
                          ? getMeetingTypeColor(type.value) 
                          : 'border-border hover:border-border-accent'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <TypeIcon className="w-4 h-4" />
                        <span className="font-medium text-sm">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* CONFIGURAÇÕES ESPECÍFICAS DO TIPO */}
              {config.meeting_type === 'online' && (
                <div>
                  <Label htmlFor="meeting-link">Link padrão da reunião</Label>
                  <Input
                    id="meeting-link"
                    type="url"
                    value={config.meeting_link || ''}
                    onChange={(e) => updateConfig({ meeting_link: e.target.value })}
                    disabled={disabled}
                    placeholder="https://meet.google.com/new"
                  />
                </div>
              )}

              {config.meeting_type === 'in_person' && (
                <div>
                  <Label htmlFor="default-location">Endereço padrão</Label>
                  <Input
                    id="default-location"
                    type="text"
                    value={config.default_location || ''}
                    onChange={(e) => updateConfig({ default_location: e.target.value })}
                    disabled={disabled}
                    placeholder="Rua Example, 123 - São Paulo, SP"
                  />
                </div>
              )}
            </div>
          </Card>
        </BlurFade>
      )}

      {/* HORÁRIOS DISPONÍVEIS */}
      {hasIntegration && config.enable_calendar_booking && (
        <BlurFade delay={0.4}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Horários Disponíveis</h4>
              </div>
              <Badge variant="outline">
                {getAvailableSlotsCount()} períodos • {getTotalWeeklySlots()} slots/semana
              </Badge>
            </div>

            {/* ADICIONAR NOVO SLOT */}
            <div className="p-4 bg-accent/30 rounded-lg border mb-4">
              <Label className="text-sm font-medium mb-3 block">Adicionar Horário</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs">Dia da semana</Label>
                  <Select 
                    value={newSlot.day_of_week?.toString() || '1'} 
                    onValueChange={(value) => setNewSlot(prev => ({ ...prev, day_of_week: parseInt(value) }))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 7 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {getDayName(i)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="time"
                    value={newSlot.start_time || '09:00'}
                    onChange={(e) => setNewSlot(prev => ({ ...prev, start_time: e.target.value }))}
                    className="text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs">Fim</Label>
                  <Input
                    type="time"
                    value={newSlot.end_time || '10:00'}
                    onChange={(e) => setNewSlot(prev => ({ ...prev, end_time: e.target.value }))}
                    className="text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs">Max. agendamentos</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newSlot.max_bookings || 1}
                    onChange={(e) => setNewSlot(prev => ({ ...prev, max_bookings: parseInt(e.target.value) || 1 }))}
                    className="text-xs"
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={addTimeSlot} size="sm" className="w-full">
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* LISTA DE SLOTS */}
            <div className="space-y-2">
              {config.available_slots.map(slot => (
                <div
                  key={slot.id}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border
                    ${slot.is_available ? 'bg-background' : 'bg-muted/50 opacity-60'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-xs font-medium">{getDayName(slot.day_of_week)}</p>
                      <p className="text-xs text-muted-foreground">
                        {slot.start_time} - {slot.end_time}
                      </p>
                    </div>
                    
                    <Separator orientation="vertical" className="h-8" />
                    
                    <div>
                      <p className="text-sm">
                        Máx. {slot.max_bookings || 1} agendamento{(slot.max_bookings || 1) > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(((new Date(`2000-01-01 ${slot.end_time}`).getTime() - 
                                     new Date(`2000-01-01 ${slot.start_time}`).getTime()) / 
                                    (1000 * 60)) / config.booking_duration)} slots disponíveis
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={slot.is_available ? "default" : "secondary"}>
                      {slot.is_available ? 'Ativo' : 'Inativo'}
                    </Badge>
                    
                    <Button
                      onClick={() => toggleSlotAvailability(slot.id)}
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                    >
                      {slot.is_available ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </Button>
                    
                    <Button
                      onClick={() => removeTimeSlot(slot.id)}
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {config.available_slots.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum horário configurado</p>
                <p className="text-xs">Adicione horários para habilitar agendamentos</p>
              </div>
            )}
          </Card>
        </BlurFade>
      )}

      {/* RESUMO DA CONFIGURAÇÃO */}
      <BlurFade delay={0.5}>
        <Card className="p-4 bg-accent/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">Resumo do Agendamento</span>
          </div>
          
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Status:</span> {
                hasIntegration && config.enable_calendar_booking ? 'Agendamento Ativo' : 'Agendamento Desativado'
              }
            </p>
            {hasIntegration && config.enable_calendar_booking && (
              <>
                <p>
                  <span className="font-medium">Duração:</span> {config.booking_duration} minutos
                </p>
                <p>
                  <span className="font-medium">Tipo:</span> {
                    config.meeting_type === 'online' ? 'Online' :
                    config.meeting_type === 'in_person' ? 'Presencial' :
                    config.meeting_type === 'phone' ? 'Telefone' : 'Flexível'
                  }
                </p>
                <p>
                  <span className="font-medium">Horários:</span> {getAvailableSlotsCount()} períodos configurados
                </p>
                <p>
                  <span className="font-medium">Capacidade:</span> {getTotalWeeklySlots()} agendamentos/semana
                </p>
                <p>
                  <span className="font-medium">Confirmação:</span> {config.auto_confirm_bookings ? 'Automática' : 'Manual'}
                </p>
              </>
            )}
          </div>
        </Card>
      </BlurFade>
    </div>
  );
}; 