/**
 * Utilitários para sistema de temperatura
 */

import { TemperatureConfig } from '../hooks/useTemperatureAPI';

/**
 * Converte cor hex para classes Tailwind de fundo, texto e borda
 */
export function hexToTailwindClasses(hex: string, intensity: 'light' | 'medium' | 'dark' = 'light') {
  // Mapeamento de cores hex para classes Tailwind
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    // Vermelhos (hot)
    '#ef4444': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    '#dc2626': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    '#b91c1c': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    
    // Laranjas (warm)
    '#f97316': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    '#ea580c': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    '#fb923c': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    
    // Azuis (cold)
    '#3b82f6': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    '#2563eb': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    '#1d4ed8': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    
    // Cinzas (frozen)
    '#6b7280': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
    '#4b5563': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
    '#374151': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
    
    // Amarelos
    '#eab308': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    '#f59e0b': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    
    // Verdes
    '#22c55e': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    '#16a34a': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    
    // Roxos
    '#a855f7': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    '#9333ea': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' }
  };

  // Buscar correspondência exata
  const exactMatch = colorMap[hex.toLowerCase()];
  if (exactMatch) {
    return `${exactMatch.bg} ${exactMatch.text} ${exactMatch.border}`;
  }

  // Fallback baseado na cor predominante
  const hexValue = hex.replace('#', '').toLowerCase();
  const r = parseInt(hexValue.substr(0, 2), 16);
  const g = parseInt(hexValue.substr(2, 2), 16);
  const b = parseInt(hexValue.substr(4, 2), 16);

  // Determinar cor predominante
  if (r > g && r > b) {
    // Vermelho predominante
    return 'bg-red-100 text-red-700 border-red-200';
  } else if (g > r && g > b) {
    // Verde predominante
    return 'bg-green-100 text-green-700 border-green-200';
  } else if (b > r && b > g) {
    // Azul predominante
    return 'bg-blue-100 text-blue-700 border-blue-200';
  } else if (r > 150 && g > 100 && b < 100) {
    // Laranja/amarelo
    return 'bg-orange-100 text-orange-700 border-orange-200';
  } else {
    // Cinza como fallback
    return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

/**
 * Gera badge de temperatura baseado na configuração personalizada
 */
export function generateTemperatureBadge(
  temperatureLevel: string,
  config: TemperatureConfig | null
) {
  // Fallback para configuração padrão se não houver configuração personalizada
  const defaultConfig = {
    hot_color: '#ef4444',
    warm_color: '#f97316', 
    cold_color: '#3b82f6',
    frozen_color: '#6b7280',
    hot_icon: '🔥',
    warm_icon: '🌡️',
    cold_icon: '❄️',
    frozen_icon: '🧊'
  };

  const activeConfig = config || defaultConfig;

  switch (temperatureLevel) {
    case 'hot':
      return {
        label: 'Quente',
        color: hexToTailwindClasses(activeConfig.hot_color),
        icon: activeConfig.hot_icon,
        tooltip: 'Lead recente na etapa inicial'
      };
    case 'warm':
      return {
        label: 'Morno',
        color: hexToTailwindClasses(activeConfig.warm_color),
        icon: activeConfig.warm_icon,
        tooltip: 'Lead há algumas horas na etapa inicial'
      };
    case 'cold':
      return {
        label: 'Frio',
        color: hexToTailwindClasses(activeConfig.cold_color),
        icon: activeConfig.cold_icon,
        tooltip: 'Lead há alguns dias na etapa inicial'
      };
    case 'frozen':
      return {
        label: 'Gelado',
        color: hexToTailwindClasses(activeConfig.frozen_color),
        icon: activeConfig.frozen_icon,
        tooltip: 'Lead há muito tempo na etapa inicial'
      };
    // Fallback para temperaturas antigas em português
    case 'quente':
      return {
        label: 'Quente',
        color: hexToTailwindClasses(activeConfig.hot_color),
        icon: activeConfig.hot_icon,
        tooltip: 'Lead quente'
      };
    case 'morno':
      return {
        label: 'Morno',
        color: hexToTailwindClasses(activeConfig.warm_color),
        icon: activeConfig.warm_icon,
        tooltip: 'Lead morno'
      };
    case 'frio':
    default:
      return {
        label: 'Frio',
        color: hexToTailwindClasses(activeConfig.cold_color),
        icon: activeConfig.cold_icon,
        tooltip: 'Lead frio'
      };
  }
}