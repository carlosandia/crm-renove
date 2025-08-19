import React from 'react';
import { Clock, Calendar, ChevronDown } from 'lucide-react';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { BlurFade } from '../../ui/blur-fade';
import { Input } from '../../ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../ui/select';

import {
  WorkingHoursConfig,
  WEEK_DAYS_LABELS,
  BUSINESS_DAYS_DEFAULT,
  TimeValue,
} from '../../../types/workingHours';
import { useTimeManager } from '../../../utils/timeUtils';

// ================================================================================
// PRESETS DE DIAS DA SEMANA
// ================================================================================
const DAY_PRESETS = [
  { id: 'business_days', label: 'Dias úteis (Seg-Sex)', days: [1, 2, 3, 4, 5] },
  { id: 'full_week', label: 'Semana completa (Seg-Dom)', days: [1, 2, 3, 4, 5, 6, 0] },
  { id: 'weekend', label: 'Fins de semana (Sáb-Dom)', days: [6, 0] },
  { id: 'monday_friday', label: 'Segunda a Sexta', days: [1, 2, 3, 4, 5] },
  { id: 'custom', label: 'Personalizado', days: [] }
];

// ================================================================================
// INTERFACES E TIPOS
// ================================================================================
interface WorkingHoursSelectorProps {
  value: WorkingHoursConfig;
  onChange: (config: WorkingHoursConfig) => void;
  disabled?: boolean;
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

  const handleStartTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = event.target.value;
    // Garantir formato HH:MM e converter para HH:MM:SS
    const timeString = timeValue ? `${timeValue}:00` : '09:00:00';
    onChange({
      ...value,
      hours: {
        ...value.hours,
        start: timeString,
      },
    });
  };

  const handleEndTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = event.target.value;
    // Garantir formato HH:MM e converter para HH:MM:SS
    const timeString = timeValue ? `${timeValue}:00` : '18:00:00';
    onChange({
      ...value,
      hours: {
        ...value.hours,
        end: timeString,
      },
    });
  };

  const handleDayPresetChange = (presetId: string) => {
    const preset = DAY_PRESETS.find(p => p.id === presetId);
    if (preset && preset.id !== 'custom') {
      onChange({
        ...value,
        hours: {
          ...value.hours,
          days: preset.days.sort(),
        },
      });
    }
  };

  // Função auxiliar para determinar qual preset está ativo
  const getCurrentDayPreset = () => {
    const currentDays = value.hours.days || [];
    const sortedCurrentDays = [...currentDays].sort();
    
    for (const preset of DAY_PRESETS) {
      if (preset.id !== 'custom' && 
          preset.days.length === sortedCurrentDays.length &&
          preset.days.every(day => sortedCurrentDays.includes(day))) {
        return preset.id;
      }
    }
    return 'custom';
  };

  // ============================================
  // VALORES PARA OS COMPONENTES
  // ============================================
  // Converter HH:MM:SS para HH:MM para os inputs
  const startTimeValue = value.hours.start 
    ? value.hours.start.substring(0, 5) // Pega apenas HH:MM
    : '09:00';

  const endTimeValue = value.hours.end 
    ? value.hours.end.substring(0, 5) // Pega apenas HH:MM
    : '18:00';

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
        <BlurFade delay={0.15} direction="up">
          <div className="bg-gradient-to-r from-blue-50/50 to-slate-50/30 border border-blue-200/60 rounded-xl p-6 space-y-5">
            
            {/* LINHA PRINCIPAL: HORÁRIOS + DIAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* HORÁRIO DE INÍCIO */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-md">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <Label className="text-sm font-medium text-slate-800">Início</Label>
                </div>
                <Input
                  type="time"
                  value={startTimeValue}
                  onChange={handleStartTimeChange}
                  disabled={disabled}
                  className="w-full text-sm bg-white hover:bg-slate-50 transition-colors"
                />
              </div>

              {/* HORÁRIO DE FIM */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded-md">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <Label className="text-sm font-medium text-slate-800">Fim</Label>
                </div>
                <Input
                  type="time"
                  value={endTimeValue}
                  onChange={handleEndTimeChange}
                  disabled={disabled}
                  className="w-full text-sm bg-white hover:bg-slate-50 transition-colors"
                />
              </div>

              {/* DIAS DE FUNCIONAMENTO */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-green-100 rounded-md">
                    <Calendar className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <Label className="text-sm font-medium text-slate-800">Dias</Label>
                </div>
                <Select
                  value={getCurrentDayPreset()}
                  onValueChange={handleDayPresetChange}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full text-sm bg-white hover:bg-slate-50 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_PRESETS.filter(preset => preset.id !== 'custom').map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.label}
                      </SelectItem>
                    ))}
                    {getCurrentDayPreset() === 'custom' && (
                      <SelectItem value="custom">
                        Personalizado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
            </div>

            {/* RESUMO VISUAL COMPACTO */}
            <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-200/70 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded">
                    <Clock className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="font-medium text-blue-900">Resumo:</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-blue-800">
                  <span>
                    <span className="font-medium">⏰</span> {timeManager.formatTime(value.hours.start || '09:00:00')} às {timeManager.formatTime(value.hours.end || '18:00:00')}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>
                    <span className="font-medium">📅</span> {selectedDays
                      .map(day => WEEK_DAYS_LABELS[day as keyof typeof WEEK_DAYS_LABELS])
                      .join(', ')
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </BlurFade>
      )}
    </div>
  );
}

export default WorkingHoursSelector;