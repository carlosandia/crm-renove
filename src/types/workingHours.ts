// ================================================================================
// 🕒 TIPOS PARA CONFIGURAÇÃO DE HORÁRIOS ESPECÍFICOS
// ================================================================================
// Tipos TypeScript para o sistema de horários de distribuição

export interface WorkingHours {
  start: string;  // Formato "HH:MM:SS" 
  end: string;    // Formato "HH:MM:SS"
  days: number[]; // Array de dias da semana (1=Domingo, 2=Segunda...)
}

export interface WorkingHoursConfig {
  enabled: boolean;
  hours: WorkingHours;
}

// Constantes úteis para dias da semana
export const WEEK_DAYS = {
  SUNDAY: 1,
  MONDAY: 2,
  TUESDAY: 3,
  WEDNESDAY: 4,
  THURSDAY: 5,
  FRIDAY: 6,
  SATURDAY: 7,
} as const;

export const WEEK_DAYS_LABELS = {
  [WEEK_DAYS.SUNDAY]: 'Domingo',
  [WEEK_DAYS.MONDAY]: 'Segunda',
  [WEEK_DAYS.TUESDAY]: 'Terça',
  [WEEK_DAYS.WEDNESDAY]: 'Quarta', 
  [WEEK_DAYS.THURSDAY]: 'Quinta',
  [WEEK_DAYS.FRIDAY]: 'Sexta',
  [WEEK_DAYS.SATURDAY]: 'Sábado',
} as const;

export const BUSINESS_DAYS_DEFAULT = [
  WEEK_DAYS.MONDAY,
  WEEK_DAYS.TUESDAY,
  WEEK_DAYS.WEDNESDAY,
  WEEK_DAYS.THURSDAY,
  WEEK_DAYS.FRIDAY,
];

// Tipos para o componente de time picker
export type TimeValue = Date | null;

export interface TimePickerProps {
  value: TimeValue;
  onChange: (time: TimeValue) => void;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

// Utilitários para conversão de horários
export interface TimeUtils {
  timeToString: (time: Date) => string;
  stringToTime: (timeString: string) => Date | null;
  formatTime: (timeString: string) => string;
  isValidTimeString: (timeString: string) => boolean;
}

// Props para o componente principal de configuração
export interface WorkingHoursConfigProps {
  value: WorkingHoursConfig;
  onChange: (config: WorkingHoursConfig) => void;
  disabled?: boolean;
}