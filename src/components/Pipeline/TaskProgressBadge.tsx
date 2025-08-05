// =====================================================================================
// COMPONENT: TaskProgressBadge (Nova Arquitetura)
// Autor: Claude (Arquiteto Sênior)
// Data: 2025-01-24
// Descrição: Badge de progresso real para cards (2/5 ✓, 3 vencidas, etc.)
// AIDEV-NOTE: Implementação baseada na especificação - mostrar progresso real
// =====================================================================================

import React, { memo, useMemo, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Clock, Minus, Loader2 } from 'lucide-react';
import { useLeadTasksForCard } from '../../hooks/useLeadTasksForCard';
import type { CombinedActivityView } from '../../shared/types/cadenceTaskInstance';

// ===================================
// INTERFACES
// ===================================

interface TaskProgressBadgeProps {
  leadId: string;
  variant?: 'compact' | 'detailed';
  className?: string;
  onClick?: () => void;
}

interface BadgeData {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  skipped: number;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
  label: string;
  icon: React.ReactNode;
  showProgress: boolean;
}

// ===================================
// COMPONENTE PRINCIPAL
// ===================================

export const TaskProgressBadge: React.FC<TaskProgressBadgeProps> = memo(({
  leadId,
  variant = 'compact',
  className = '',
  onClick
}) => {
  const { 
    tasks, 
    loading, 
    error,
    pendingCount, 
    overdueCount, 
    completedCount 
  } = useLeadTasksForCard(leadId);

  // Calcular dados do badge memoizado
  const badgeData = useMemo((): BadgeData => {
    if (loading) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        skipped: 0,
        variant: 'neutral',
        label: '...',
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        showProgress: false
      };
    }

    if (error) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        skipped: 0,
        variant: 'danger',
        label: 'Erro',
        icon: <AlertTriangle className="w-3 h-3" />,
        showProgress: false
      };
    }

    if (!tasks) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        skipped: 0,
        variant: 'neutral',
        label: 'N/A',
        icon: <Clock className="w-3 h-3" />,
        showProgress: false
      };
    }

    const total = tasks.length;
    const completed = completedCount;
    const pending = pendingCount;
    const overdue = overdueCount;
    const skipped = tasks.filter(t => t.status === 'skipped').length;

    // Determinar variante e label baseado na prioridade
    let badgeVariant: 'success' | 'warning' | 'danger' | 'neutral';
    let label: string;
    let icon: React.ReactNode;
    let showProgress: boolean = true;

    if (overdue > 0) {
      // Prioridade 1: Tarefas vencidas
      badgeVariant = 'danger';
      label = overdue === 1 ? '1 vencida' : `${overdue} vencidas`;
      icon = <AlertTriangle className="w-3 h-3" />;
      showProgress = variant === 'detailed';
    } else if (pending > 0) {
      // Prioridade 2: Tarefas pendentes com progresso
      badgeVariant = 'warning';
      if (total > 0) {
        label = `${completed}/${total} ✓`;
        icon = <CheckCircle className="w-3 h-3" />;
      } else {
        label = `${pending} pendente${pending > 1 ? 's' : ''}`;
        icon = <Clock className="w-3 h-3" />;
      }
    } else if (completed > 0) {
      // Prioridade 3: Todas concluídas
      badgeVariant = 'success';
      label = total === completed ? 'Completo ✓' : `${completed}/${total} ✓`;
      icon = <CheckCircle className="w-3 h-3" />;
    } else if (total === 0) {
      // Sem tarefas
      badgeVariant = 'neutral';
      label = 'Sem tarefas';
      icon = <Minus className="w-3 h-3" />;
      showProgress = false;
    } else {
      // Estado desconhecido
      badgeVariant = 'neutral';
      label = 'N/A';
      icon = <Clock className="w-3 h-3" />;
      showProgress = false;
    }

    return {
      total,
      completed,
      pending,
      overdue,
      skipped,
      variant: badgeVariant,
      label,
      icon,
      showProgress
    };
  }, [tasks, loading, error, pendingCount, overdueCount, completedCount, variant]);

  // Classes CSS memoizadas baseadas na variante
  const getVariantClasses = useCallback((variant: string): string => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200';
      case 'danger':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
    }
  }, []);

  // Renderização compacta
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border
          transition-colors cursor-pointer
          ${getVariantClasses(badgeData.variant)}
          ${className}
        `}
        title={`Total: ${badgeData.total} | Concluídas: ${badgeData.completed} | Pendentes: ${badgeData.pending} | Vencidas: ${badgeData.overdue}`}
      >
        {badgeData.icon}
        <span>{badgeData.label}</span>
      </button>
    );
  }

  // Renderização detalhada
  return (
    <div
      onClick={onClick}
      className={`
        inline-flex flex-col items-center gap-1 px-3 py-2 rounded-lg border
        transition-colors ${onClick ? 'cursor-pointer' : ''}
        ${getVariantClasses(badgeData.variant)}
        ${className}
      `}
    >
      <div className="flex items-center gap-1">
        {badgeData.icon}
        <span className="text-sm font-semibold">{badgeData.label}</span>
      </div>
      
      {badgeData.showProgress && badgeData.total > 0 && (
        <>
          {/* Barra de progresso */}
          <div className="w-16 h-1.5 bg-white/50 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                badgeData.variant === 'success' ? 'bg-green-600' :
                badgeData.variant === 'warning' ? 'bg-amber-600' :
                badgeData.variant === 'danger' ? 'bg-red-600' : 'bg-gray-400'
              }`}
              style={{ 
                width: `${Math.max(5, (badgeData.completed / badgeData.total) * 100)}%` 
              }}
            />
          </div>
          
          {/* Detalhes */}
          <div className="text-xs opacity-75">
            {badgeData.overdue > 0 && (
              <span className="text-red-700">
                {badgeData.overdue} vencida{badgeData.overdue > 1 ? 's' : ''}
              </span>
            )}
            {badgeData.overdue === 0 && badgeData.pending > 0 && (
              <span>
                {badgeData.pending} pendente{badgeData.pending > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </>
      )}
    </div>  
  );
}, (prevProps, nextProps) => {
  // ✅ CORREÇÃO FASE 2: Função de comparação customizada para React.memo evitar warning "Expected static flag was missing"
  return (
    prevProps.leadId === nextProps.leadId &&
    prevProps.variant === nextProps.variant &&
    prevProps.className === nextProps.className &&
    prevProps.onClick === nextProps.onClick
  );
});

TaskProgressBadge.displayName = 'TaskProgressBadge';

// ===================================
// HOOK AUXILIAR PARA DADOS DO BADGE
// ===================================

export const useTaskProgressBadgeData = (leadId: string) => {
  const { 
    tasks, 
    loading, 
    error,
    pendingCount, 
    overdueCount, 
    completedCount 
  } = useLeadTasksForCard(leadId);

  return React.useMemo(() => {
    if (loading) {
      return {
        loading: true,
        hasOverdue: false,
        hasPending: false,
        isComplete: false,
        progressText: '...',
        variant: 'neutral' as const,
        total: 0,
        completed: 0
      };
    }

    if (error) {
      return {
        loading: false,
        hasOverdue: false,
        hasPending: false,
        isComplete: false,
        progressText: 'Erro',
        variant: 'neutral' as const,
        total: 0,
        completed: 0
      };
    }

    const total = tasks?.length || 0;
    const hasOverdue = overdueCount > 0;
    const hasPending = pendingCount > 0;
    const isComplete = total > 0 && completedCount === total;
    
    let progressText: string;
    let variant: 'success' | 'warning' | 'danger' | 'neutral';

    if (hasOverdue) {
      progressText = overdueCount === 1 ? '1 vencida' : `${overdueCount} vencidas`;
      variant = 'danger';
    } else if (hasPending) {
      progressText = total > 0 ? `${completedCount}/${total} ✓` : `${pendingCount} pendentes`;
      variant = 'warning';
    } else if (isComplete) {
      progressText = 'Completo ✓';
      variant = 'success';
    } else {
      progressText = 'Sem tarefas';
      variant = 'neutral';
    }

    return {
      loading: false,
      hasOverdue,
      hasPending,
      isComplete,
      progressText,
      variant,
      total,
      completed: completedCount
    };
  }, [tasks, loading, error, pendingCount, overdueCount, completedCount]);
};

export default TaskProgressBadge;