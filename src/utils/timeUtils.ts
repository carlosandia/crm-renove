// ================================================================================
// 🕒 UTILITÁRIOS PARA MANIPULAÇÃO DE HORÁRIOS
// ================================================================================
// Funções utilitárias para conversão e formatação de horários

import { TimeUtils } from '../types/workingHours';

/**
 * Converte objeto Date para string no formato HH:MM:SS
 */
export const timeToString = (time: Date): string => {
  if (!time || isNaN(time.getTime())) return '09:00:00';
  
  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Converte string HH:MM:SS para objeto Date
 */
export const stringToTime = (timeString: string): Date | null => {
  if (!timeString || !isValidTimeString(timeString)) return null;
  
  const [hours, minutes, seconds = '00'] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
  date.setSeconds(parseInt(seconds, 10));
  date.setMilliseconds(0);
  
  return date;
};

/**
 * Formata string de horário para exibição (HH:MM)
 */
export const formatTime = (timeString: string): string => {
  if (!timeString) return '--:--';
  
  const [hours, minutes] = timeString.split(':');
  return `${hours}:${minutes}`;
};

/**
 * Valida se string está no formato HH:MM:SS válido
 */
export const isValidTimeString = (timeString: string): boolean => {
  if (!timeString) return false;
  
  const timeRegex = /^([01]?\d|2[0-3]):([0-5]?\d):([0-5]?\d)$/;
  return timeRegex.test(timeString);
};

/**
 * Cria horário padrão para início do dia comercial
 */
export const createDefaultStartTime = (): Date => {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  return date;
};

/**
 * Cria horário padrão para fim do dia comercial  
 */
export const createDefaultEndTime = (): Date => {
  const date = new Date();
  date.setHours(18, 0, 0, 0);
  return date;
};

/**
 * Valida se horário de início é anterior ao horário de fim
 */
export const isValidTimeRange = (start: string, end: string): boolean => {
  if (!isValidTimeString(start) || !isValidTimeString(end)) return false;
  
  const startTime = stringToTime(start);
  const endTime = stringToTime(end);
  
  if (!startTime || !endTime) return false;
  
  return startTime.getTime() < endTime.getTime();
};

/**
 * Objeto com todas as funções utilitárias
 */
export const timeUtils: TimeUtils = {
  timeToString,
  stringToTime,
  formatTime,
  isValidTimeString,
};

/**
 * Hook personalizado para gerenciar horários
 */
export const useTimeManager = () => {
  return {
    ...timeUtils,
    createDefaultStartTime,
    createDefaultEndTime,
    isValidTimeRange,
  };
};