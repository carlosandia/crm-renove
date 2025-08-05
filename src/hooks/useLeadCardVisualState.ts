// =====================================================================================
// HOOK: useLeadCardVisualState (Nova Arquitetura)
// Autor: Claude (Arquiteto Sênior) 
// Data: 2025-01-24
// Descrição: Hook para determinar estado visual dos cards baseado em tarefas
// AIDEV-NOTE: Implementação baseada na especificação - cards vermelhos para overdue
// =====================================================================================

import React from 'react';
import { useLeadTasksForCard } from './useLeadTasksForCard';
import type { CombinedActivityView } from '../shared/types/cadenceTaskInstance';

// ===================================
// INTERFACES
// ===================================

export interface LeadCardVisualState {
  // Estado principal
  variant: 'default' | 'warning' | 'danger' | 'success' | 'neutral';
  
  // Indicadores visuais
  borderColor: string;
  backgroundColor: string;
  shadowClass: string;
  textColorClass: string;
  
  // Informações de contexto
  hasOverdueTasks: boolean;
  hasPendingTasks: boolean;
  isAllComplete: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Dados para badge
  badgeData: {
    show: boolean;
    variant: 'success' | 'warning' | 'danger' | 'neutral';
    label: string;
    count: number;
  };
  
  // Animações
  shouldPulse: boolean;
  shouldGlow: boolean;
}

export interface UseLeadCardVisualStateOptions {
  enableAnimations?: boolean;
  prioritizeOverdue?: boolean;
  showCompletedState?: boolean;
}

// ===================================
// HOOK PRINCIPAL
// ===================================

export const useLeadCardVisualState = (
  leadId: string,
  options: UseLeadCardVisualStateOptions = {}
): LeadCardVisualState => {
  const {
    enableAnimations = true,
    prioritizeOverdue = true,
    showCompletedState = true
  } = options;

  const {
    tasks,
    loading,
    error,
    pendingCount,
    overdueCount,
    completedCount
  } = useLeadTasksForCard(leadId);

  // Calcular estado visual baseado nas tarefas
  const visualState = React.useMemo((): LeadCardVisualState => {
    // Estado padrão (loading ou erro)
    if (loading || error || !tasks) {
      return {
        variant: 'neutral',
        borderColor: 'border-gray-200',
        backgroundColor: 'bg-white',
        shadowClass: 'shadow-sm',
        textColorClass: 'text-gray-900',
        hasOverdueTasks: false,
        hasPendingTasks: false,
        isAllComplete: false,
        urgencyLevel: 'low',
        badgeData: {
          show: false,
          variant: 'neutral',
          label: '',
          count: 0
        },
        shouldPulse: false,
        shouldGlow: false
      };
    }

    const total = tasks.length;
    const hasOverdue = overdueCount > 0;
    const hasPending = pendingCount > 0;
    const isAllComplete = total > 0 && completedCount === total && pendingCount === 0;

    // Determinar urgência baseada em tarefas vencidas e próximas
    let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const overdueTasksCount = overdueCount;
    const dueSoonCount = tasks.filter(task => {
      if (task.status !== 'pending') return false;
      const scheduledDate = new Date(task.scheduled_at);
      const now = new Date();
      const hoursDiff = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursDiff > 0 && hoursDiff <= 24; // Devido nas próximas 24 horas
    }).length;

    if (overdueTasksCount >= 3) {
      urgencyLevel = 'critical';
    } else if (overdueTasksCount >= 1) {
      urgencyLevel = 'high';
    } else if (dueSoonCount >= 2) {
      urgencyLevel = 'medium';
    }

    // ===================================
    // LÓGICA DE PRIORIDADE VISUAL
    // ===================================

    let variant: LeadCardVisualState['variant'];
    let borderColor: string;
    let backgroundColor: string;
    let shadowClass: string;
    let textColorClass: string;
    let shouldPulse: boolean = false;
    let shouldGlow: boolean = false;

    if (prioritizeOverdue && hasOverdue) {
      // PRIORIDADE 1: Cards com tarefas vencidas (VERMELHO)
      variant = 'danger';
      borderColor = 'border-red-300';
      backgroundColor = 'bg-red-50';
      shadowClass = 'shadow-red-100 shadow-md';
      textColorClass = 'text-red-900';
      
      if (enableAnimations && urgencyLevel === 'critical') {
        shouldPulse = true; // Pulsar se muitas tarefas vencidas
      }
      
      if (enableAnimations && urgencyLevel === 'high') {
        shouldGlow = true; // Brilhar se algumas tarefas vencidas
      }
      
    } else if (hasPending) {
      // PRIORIDADE 2: Cards com tarefas pendentes (AMARELO/LARANJA)
      variant = urgencyLevel === 'medium' ? 'warning' : 'warning';
      borderColor = urgencyLevel === 'medium' ? 'border-orange-300' : 'border-amber-300';
      backgroundColor = urgencyLevel === 'medium' ? 'bg-orange-50' : 'bg-amber-50';
      shadowClass = urgencyLevel === 'medium' ? 'shadow-orange-100 shadow-md' : 'shadow-amber-100 shadow-sm';
      textColorClass = urgencyLevel === 'medium' ? 'text-orange-900' : 'text-amber-900';
      
      if (enableAnimations && urgencyLevel === 'medium') {
        shouldGlow = true;
      }
      
    } else if (showCompletedState && isAllComplete) {
      // PRIORIDADE 3: Cards com todas tarefas concluídas (VERDE)
      variant = 'success';
      borderColor = 'border-green-300';
      backgroundColor = 'bg-green-50';
      shadowClass = 'shadow-green-100 shadow-sm';
      textColorClass = 'text-green-900';
      
    } else {
      // PADRÃO: Cards sem tarefas ou neutros
      variant = 'default';
      borderColor = 'border-gray-200';
      backgroundColor = 'bg-white';
      shadowClass = 'shadow-sm';
      textColorClass = 'text-gray-900';
    }

    // ===================================
    // DADOS DO BADGE
    // ===================================

    let badgeData: LeadCardVisualState['badgeData'];

    if (hasOverdue) {
      badgeData = {
        show: true,
        variant: 'danger',
        label: overdueCount === 1 ? '1 vencida' : `${overdueCount} vencidas`,
        count: overdueCount
      };
    } else if (hasPending) {
      badgeData = {
        show: true,
        variant: 'warning',
        label: total > 0 ? `${completedCount}/${total} ✓` : `${pendingCount} pendentes`,
        count: pendingCount
      };
    } else if (isAllComplete) {
      badgeData = {
        show: true,
        variant: 'success',
        label: 'Completo ✓',
        count: completedCount
      };
    } else {
      badgeData = {
        show: false,
        variant: 'neutral',
        label: '',
        count: 0
      };
    }

    return {
      variant,
      borderColor,
      backgroundColor,
      shadowClass,
      textColorClass,
      hasOverdueTasks: hasOverdue,
      hasPendingTasks: hasPending,
      isAllComplete,
      urgencyLevel,
      badgeData,
      shouldPulse,
      shouldGlow
    };

  }, [
    tasks, 
    loading, 
    error, 
    overdueCount, 
    pendingCount, 
    completedCount, 
    enableAnimations, 
    prioritizeOverdue, 
    showCompletedState
  ]);

  return visualState;
};

// ===================================
// HOOK AUXILIAR: CLASSES CSS COMBINADAS
// ===================================

export const useLeadCardClasses = (
  leadId: string, 
  baseClasses: string = '',
  options?: UseLeadCardVisualStateOptions
) => {
  const visualState = useLeadCardVisualState(leadId, options);

  return React.useMemo(() => {
    const classes = [
      baseClasses,
      visualState.borderColor,
      visualState.backgroundColor,
      visualState.shadowClass,
      visualState.textColorClass
    ];

    // Adicionar classes de animação
    if (visualState.shouldPulse) {
      classes.push('animate-pulse');
    }
    
    if (visualState.shouldGlow) {
      classes.push('ring-2 ring-opacity-50');
      
      if (visualState.variant === 'danger') {
        classes.push('ring-red-400');
      } else if (visualState.variant === 'warning') {
        classes.push('ring-amber-400');
      }
    }

    // Adicionar transições suaves
    classes.push('transition-all duration-300 ease-in-out');

    return classes.filter(Boolean).join(' ');
  }, [baseClasses, visualState]);
};

// ===================================
// UTILITÁRIOS
// ===================================

// Hook para obter apenas informação de overdue (performance otimizada)
export const useHasOverdueTasks = (leadId: string): boolean => {
  const { overdueCount, loading } = useLeadTasksForCard(leadId);
  return !loading && overdueCount > 0;
};

// Hook para obter informações resumidas
export const useLeadCardSummary = (leadId: string) => {
  const visualState = useLeadCardVisualState(leadId);
  
  return {
    hasUrgentTasks: visualState.hasOverdueTasks || visualState.urgencyLevel === 'high',
    needsAttention: visualState.variant === 'danger' || visualState.variant === 'warning',
    isComplete: visualState.isAllComplete,
    badgeText: visualState.badgeData.label,
    shouldHighlight: visualState.shouldPulse || visualState.shouldGlow
  };
};