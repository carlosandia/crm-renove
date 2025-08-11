import React from 'react';
import { Clock, Calendar, CheckSquare, Square } from 'lucide-react';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Button } from '../../ui/button';
import DateTimePicker from 'react-datetime-picker';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';

import {
  WorkingHoursConfig,
  WEEK_DAYS_LABELS,
  BUSINESS_DAYS_DEFAULT,
  TimeValue,
} from '../../../types/workingHours';
import { useTimeManager } from '../../../utils/timeUtils';

// ================================================================================
// INTERFACES E TIPOS
// ================================================================================
interface WorkingHoursSelectorProps {
  value: WorkingHoursConfig;
  onChange: (config: WorkingHoursConfig) => void;
  disabled?: boolean;
}

interface DayCheckboxProps {
  day: number;
  label: string;
  checked: boolean;
  onChange: (day: number, checked: boolean) => void;
  disabled?: boolean;
}

// ================================================================================
// COMPONENTE: CHECKBOX DE DIA DA SEMANA
// ================================================================================
function DayCheckbox({ day, label, checked, onChange, disabled }: DayCheckboxProps) {
  return (
    <Button
      type="button"
      variant={checked ? "default" : "outline"}
      size="sm"
      className={`h-8 px-3 text-xs font-medium transition-all ${
        checked 
          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
          : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
      }`}
      onClick={() => onChange(day, !checked)}
      disabled={disabled}
    >
      {checked ? <CheckSquare className="h-3 w-3 mr-1" /> : <Square className="h-3 w-3 mr-1" />}
      {label}
    </Button>
  );
}

// ================================================================================
// COMPONENTE PRINCIPAL: SELETOR DE HORÁRIOS ESPECÍFICOS
// ================================================================================
export function WorkingHoursSelector({ value, onChange, disabled = false }: WorkingHoursSelectorProps) {
  const timeManager = useTimeManager();

  // ============================================
  // HANDLERS
  // ============================================
  const handleEnabledChange = (enabled: boolean) => {
    onChange({
      ...value,
      enabled,
      // Se habilitando pela primeira vez, definir valores padrão
      hours: enabled && !value.hours.start && !value.hours.end ? {
        start: '09:00:00',
        end: '18:00:00', 
        days: BUSINESS_DAYS_DEFAULT,
      } : value.hours,
    });
  };

  const handleStartTimeChange = (time: TimeValue) => {
    const timeString = time ? timeManager.timeToString(time) : '09:00:00';
    onChange({
      ...value,
      hours: {
        ...value.hours,
        start: timeString,
      },
    });
  };

  const handleEndTimeChange = (time: TimeValue) => {
    const timeString = time ? timeManager.timeToString(time) : '18:00:00';
    onChange({
      ...value,
      hours: {
        ...value.hours,
        end: timeString,
      },
    });
  };

  const handleDayChange = (day: number, checked: boolean) => {
    const currentDays = value.hours.days || [];
    const newDays = checked 
      ? [...currentDays, day]
      : currentDays.filter(d => d !== day);
    
    onChange({
      ...value,
      hours: {
        ...value.hours,
        days: newDays.sort(),
      },
    });
  };

  // ============================================
  // VALORES PARA OS COMPONENTES
  // ============================================
  const startTime = value.hours.start 
    ? timeManager.stringToTime(value.hours.start) 
    : timeManager.createDefaultStartTime();

  const endTime = value.hours.end 
    ? timeManager.stringToTime(value.hours.end)
    : timeManager.createDefaultEndTime();

  const selectedDays = value.hours.days || BUSINESS_DAYS_DEFAULT;

  return (
    <div className="space-y-6">
      {/* ===== SWITCH PRINCIPAL ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <div>
            <Label className="font-medium">Apenas em Horário Específico</Label>
            <p className="text-xs text-muted-foreground">
              Distribuir leads apenas em horários e dias específicos
            </p>
          </div>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={handleEnabledChange}
          disabled={disabled}
        />
      </div>

      {/* ===== CONFIGURAÇÕES DETALHADAS (só aparecem quando habilitado) ===== */}
      {value.enabled && (
        <div className="pl-6 border-l-2 border-blue-200 space-y-4">
          {/* SELETOR DE HORÁRIOS */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horários de Funcionamento
            </Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Início</Label>
                <div className="relative">
                  <DateTimePicker
                    onChange={handleStartTimeChange}
                    value={startTime}
                    disabled={disabled}
                    disableCalendar={true}
                    format="HH:mm"
                    locale="pt-BR"
                    className="w-full text-sm"
                    clockProps={{
                      className: 'text-sm',
                    }}
                    clearIcon={null}
                    calendarIcon={<Clock className="h-4 w-4 text-gray-500" />}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Fim</Label>
                <div className="relative">
                  <DateTimePicker
                    onChange={handleEndTimeChange}
                    value={endTime}
                    disabled={disabled}
                    disableCalendar={true}
                    format="HH:mm"
                    locale="pt-BR"
                    className="w-full text-sm"
                    clockProps={{
                      className: 'text-sm',
                    }}
                    clearIcon={null}
                    calendarIcon={<Clock className="h-4 w-4 text-gray-500" />}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SELETOR DE DIAS DA SEMANA */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dias de Funcionamento
            </Label>
            
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(WEEK_DAYS_LABELS).map(([dayNumber, dayLabel]) => (
                <DayCheckbox
                  key={dayNumber}
                  day={parseInt(dayNumber)}
                  label={dayLabel}
                  checked={selectedDays.includes(parseInt(dayNumber))}
                  onChange={handleDayChange}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>

          {/* RESUMO VISUAL */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-800 font-medium mb-1">
              Resumo da Configuração:
            </div>
            <div className="text-xs text-blue-700">
              <strong>Horário:</strong> {timeManager.formatTime(value.hours.start || '09:00:00')} às {timeManager.formatTime(value.hours.end || '18:00:00')}
            </div>
            <div className="text-xs text-blue-700">
              <strong>Dias:</strong> {selectedDays
                .map(day => WEEK_DAYS_LABELS[day as keyof typeof WEEK_DAYS_LABELS])
                .join(', ')
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkingHoursSelector;