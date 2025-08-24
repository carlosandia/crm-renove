// =====================================================================================
// COMPONENT: EnhancedLeadCard (Nova Arquitetura)
// Autor: Claude (Arquiteto Sênior)
// Data: 2025-01-24  
// Descrição: Wrapper que adiciona sinalização visual baseada em tarefas
// AIDEV-NOTE: Cards vermelhos para overdue, badges reais, animações
// =====================================================================================

import React from 'react';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLeadCardVisualState, useLeadCardClasses } from '../../hooks/useLeadCardVisualState';
import { TaskProgressBadge } from './TaskProgressBadge';
import { TasksDropdown } from './TasksDropdown';

// ===================================
// INTERFACES
// ===================================

interface EnhancedLeadCardProps {
  children: React.ReactNode;
  leadId: string;
  className?: string;
  onTaskCompleted?: () => void;
  enableAnimations?: boolean;
  showTasksDropdown?: boolean;
  showProgressBadge?: boolean;
}

// ===================================
// COMPONENTE PRINCIPAL
// ===================================

export const EnhancedLeadCard: React.FC<EnhancedLeadCardProps> = ({
  children,
  leadId,
  className = '',
  onTaskCompleted,
  enableAnimations = true,
  showTasksDropdown = true,
  showProgressBadge = true,
  ...props
}) => {
  const visualState = useLeadCardVisualState(leadId, {
    enableAnimations,
    prioritizeOverdue: true,
    showCompletedState: true
  });

  // Usar apenas as classes básicas sem bordas e sombras
  const cardClasses = `relative rounded-lg overflow-visible scrollbar-hidden ${className}`;

  return (
    <div 
      className={cardClasses} 
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        overflowX: 'visible',
        overflowY: 'visible'
      }}
      {...props}
    >

      {/* Conteúdo principal do card */}
      <div 
        className="relative z-0 overflow-visible scrollbar-hidden"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          overflowX: 'visible',
          overflowY: 'visible'
        }}
      >
        {children}
      </div>

      {/* ✅ REMOVIDO: Seção de tarefas - causava overflow no card de 120px */}
      {/* TasksDropdown e ProgressBadge agora integrados no LeadCardHeader */}

      {/* Overlay de estado (quando necessário) */}
      {visualState.variant === 'danger' && visualState.urgencyLevel === 'critical' && (
        <div className="absolute inset-0 bg-red-500 bg-opacity-5 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};

EnhancedLeadCard.displayName = 'EnhancedLeadCard';

// ===================================
// COMPONENT ALTERNATIVO: MINI INDICATOR
// ===================================

interface TaskStatusIndicatorProps {
  leadId: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export const TaskStatusIndicator: React.FC<TaskStatusIndicatorProps> = ({
  leadId,
  size = 'md',
  position = 'top-right',
  className = ''
}) => {
  const visualState = useLeadCardVisualState(leadId);

  if (!visualState.badgeData.show) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  const positionClasses = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1'
  };

  const variantClasses = {
    danger: 'bg-red-500 text-white',
    warning: 'bg-amber-500 text-white',
    success: 'bg-green-500 text-white',
    neutral: 'bg-gray-400 text-white'
  };

  return (
    <div className={`absolute ${positionClasses[position]} z-10 ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]} 
          ${variantClasses[visualState.badgeData.variant]}
          rounded-full flex items-center justify-center shadow-sm
        `}
        title={visualState.badgeData.label}
      >
        {visualState.hasOverdueTasks && <AlertTriangle className="w-2 h-2" />}
        {visualState.hasPendingTasks && !visualState.hasOverdueTasks && <Clock className="w-2 h-2" />}
        {visualState.isAllComplete && <CheckCircle className="w-2 h-2" />}
      </div>
      
      {visualState.shouldPulse && (
        <div 
          className={`
            absolute inset-0 ${sizeClasses[size]}
            ${variantClasses[visualState.badgeData.variant]}
            rounded-full animate-ping opacity-75
          `} 
        />
      )}
    </div>
  );
};

// ===================================
// UTILIDADES PARA INTEGRAÇÃO FÁCIL
// ===================================

// AIDEV-NOTE: Hook removido para resolver React Fast Refresh
// Se necessário, mover para src/hooks/useEnhancedCardProps.ts

export default EnhancedLeadCard;