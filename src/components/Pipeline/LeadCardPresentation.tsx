import React, { useMemo } from 'react';
import { Lead } from '../../types/Pipeline';
import { useLeadOutcomeStatus } from '../../hooks/useLeadOutcomeStatus';
import { EnhancedLeadCard } from './EnhancedLeadCard';
import { useLeadTasksForCard } from '../../hooks/useLeadTasksForCard';
// import { useCadenceActivityGenerator } from '../../hooks/useCadenceActivityGenerator'; // Removido - agora é automático
import { loggers } from '../../utils/logger';

// Componentes refatorados
import LeadCardHeader from './components/LeadCardHeader';
import LeadCardBody from './components/LeadCardBody';
import LeadCardFooter from './components/LeadCardFooter';

// Hooks customizados
import { useLeadCardData } from './hooks/useLeadCardData';
import { useLeadCardActions } from './hooks/useLeadCardActions';
import { useLeadCardRealTime } from './hooks/useLeadCardRealTime';

interface LeadCardPresentationProps {
  lead: Lead;
  pipelineId: string;
  onViewDetails?: (lead: Lead) => void;
  onViewDetailsWithTab?: (lead: Lead, tab: string) => void;
}

/**
 * ✅ REFATORADO: Componente de UI puro sem Draggable
 * O Draggable agora é implementado no KanbanColumn
 */
const LeadCardPresentation: React.FC<LeadCardPresentationProps> = React.memo(({
  lead,
  pipelineId,
  onViewDetails,
  onViewDetailsWithTab
}) => {
  
  // ✅ OUTCOME REASONS: Hook para verificar se lead tem motivos aplicados
  const { data: outcomeStatus, isLoading: isLoadingOutcome } = useLeadOutcomeStatus(lead.id);
  
  // 📊 TASKS: Hook para dados das tarefas e badge
  const { 
    tasks, 
    loading: tasksLoading, 
    pendingCount: tasksPending, 
    overdueCount: tasksOverdue,
    completeTask,
    deleteTask, // ✅ NOVO: Obter função de deletar
    forceRefreshCache, // ✅ NOVO: Função para invalidar cache
    isGeneratingTasks 
  } = useLeadTasksForCard(lead.id);
  
  // ✅ SIMPLIFICADO: Removido hook de geração manual - agora é automático
  // const { generateActivities, isGenerating: isGeneratingManually } = useCadenceActivityGenerator();
  const isGeneratingManually = false; // Manter compatibilidade
  
  const tasksCompleted = tasks?.filter(t => t.status === 'completed').length || 0;

  // Hooks customizados para separar responsabilidades
  const leadData = useLeadCardData({ lead, pipelineId });
  const actions = useLeadCardActions({ lead, onViewDetails, onViewDetailsWithTab });
  const realTime = useLeadCardRealTime({ leadId: lead.id, tenantId: lead.custom_data?.tenant_id || '' });

  // ✅ SIMPLIFICADO: Função para abrir dropdown de atividades
  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita abrir o modal do lead
    // TODO: Implementar abertura do dropdown de atividades
    console.log('📊 [BADGE-CLICK] Abrindo dropdown de atividades para lead:', lead.id.substring(0, 8));
  };

  // 📊 Badge de progresso das tarefas memoizado com sistema acumulativo
  const progressBadge = useMemo(() => {
    const totalTasks = tasks.length;
    
    // ✅ CORREÇÃO: Lógica mais robusta para detectar discrepâncias reais
    // NOTA: tasksOverdue são um subconjunto de tasksPending, não uma categoria separada
    const expectedTotal = tasksCompleted + tasksPending;
    const discrepancy = totalTasks - expectedTotal;
    
    // Só considerar discrepância real se > 1 (tolerância para race conditions)
    const hasRealDiscrepancy = totalTasks > 0 && Math.abs(discrepancy) > 1;
    
    // ✅ CORREÇÃO: Log apenas problemas genuínos com dados completos para debug
    if (hasRealDiscrepancy) {
      loggers.leadCardBadge('Discrepância real no cálculo de badge de tarefas', {
        leadId: lead.id.substring(0, 8),
        totalTasks,
        tasksCompleted,
        tasksPending,
        tasksOverdue,
        expectedTotal,
        discrepancy,
        tolerance: 1,
        note: 'overdue_tasks_are_subset_of_pending_tasks'
      });
    }
    
    // Estado de geração de tarefas (automática ou manual)
    if (isGeneratingTasks || isGeneratingManually) {
      return {
        text: '⏳',
        color: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200 animate-pulse',
        title: isGeneratingManually ? 'Gerando atividades...' : 'Gerando atividades automaticamente...',
        onClick: undefined // Desabilitar clique durante geração
      };
    }
    
    // ✅ SISTEMA ACUMULATIVO: Sempre mostrar formato "X/Y" mesmo quando Y=0
    // TODO: Implementar cálculo do total esperado baseado na configuração de cadência
    const progressText = `${tasksCompleted}/${totalTasks}`;
    
    // ✅ SIMPLIFICADO: Se não há atividades, mostrar 0/0 informativo
    if (totalTasks === 0) {
      return {
        text: '0/0',
        color: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-200 cursor-pointer',
        title: 'Nenhuma atividade configurada para esta etapa - atividades são geradas automaticamente',
        onClick: handleBadgeClick
      };
    }
    
    if (tasksOverdue > 0) {
      return {
        text: progressText,
        color: 'bg-red-100 text-red-700 ring-1 ring-red-200',
        title: `${tasksOverdue} tarefa(s) vencida(s)`
      };
    }
    
    if (tasksPending > 0) {
      return {
        text: progressText,
        color: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
        title: `${tasksPending} tarefa(s) pendente(s)`
      };
    }
    
    return {
      text: progressText,
      color: 'bg-green-100 text-green-700 ring-1 ring-green-200',
      title: 'Todas as tarefas concluídas'
    };
  }, [tasksCompleted, tasksPending, tasksOverdue, isGeneratingTasks, isGeneratingManually, tasks.length, handleBadgeClick]);
  
  // Log removido para evitar spam - cards otimistas são normais durante operações

  return (
    <EnhancedLeadCard
      leadId={lead.id}
      className={`
        rounded-lg transition-all duration-200 group h-[120px] cursor-pointer overflow-hidden
        ${leadData.optimisticState.isOptimistic 
          ? 'bg-green-50 ring-1 ring-green-200' 
          : 'bg-white'
        }
        ${leadData.optimisticState.isCreating 
          ? 'opacity-80 animate-pulse' 
          : ''
        }
      `}
      enableAnimations={true}
      showTasksDropdown={false}  // TasksDropdown integrado no badge - não mostrar separadamente
      showProgressBadge={false}  // Badge integrado customizado - não usar o padrão
    >
      {/* Conteúdo Principal - Sem área de drag handle */}
      <div 
        className="w-full h-full p-3 flex flex-col justify-between overflow-hidden"
        onClick={actions.handleCardClick}
      >
        {/* HEADER: Nome da Oportunidade + Badge + Nome do Lead */}
        <LeadCardHeader
          opportunityName={leadData.opportunityName}
          leadName={leadData.leadName}
          leadId={lead.id}
          pipelineId={pipelineId} // ✅ NOVO: Pipeline ID para modal
          isCreating={leadData.optimisticState.isCreating}
          tasks={tasks}
          tasksLoading={tasksLoading}
          tasksPending={tasksPending}
          tasksOverdue={tasksOverdue}
          tasksCompleted={tasksCompleted}
          isGeneratingTasks={isGeneratingTasks}
          completeTask={completeTask}
          deleteTask={deleteTask} // ✅ NOVO: Função de deletar implementada
          forceRefreshCache={actions.forceRefreshCache}
          progressBadge={progressBadge}
        />

        {/* BODY: Data + Tempo + Temperatura */}
        <LeadCardBody
          leadCreatedAt={lead.created_at}
          daysInCard={leadData.daysInCard}
          temperatureBadge={leadData.temperatureBadge}
        />

        {/* FOOTER: Valor + Ícones de Ação */}
        <LeadCardFooter
          lead={lead}
          leadValue={leadData.leadValue}
          leadEmail={leadData.leadEmail}
          leadPhone={leadData.leadPhone}
          connectionIndicator={realTime.connectionIndicator}
          connectionStatus={realTime.connectionStatus}
          forceRefresh={realTime.forceRefresh}
          onEmailClick={actions.handleEmailClick}
          onScheduleMeetingClick={actions.handleScheduleMeetingClick}
        />
      </div>
    </EnhancedLeadCard>
  );
}, (prevProps, nextProps) => {
  // 🚀 V2.0: Comparação otimizada para evitar re-renders desnecessários
  
  // Lead core data comparison
  const leadDataChanged = (
    prevProps.lead.id !== nextProps.lead.id ||
    prevProps.lead.stage_id !== nextProps.lead.stage_id ||
    prevProps.lead.temperature_level !== nextProps.lead.temperature_level ||
    prevProps.lead.email !== nextProps.lead.email ||
    prevProps.lead.created_at !== nextProps.lead.created_at
  );
  
  // Props comparison
  const propsChanged = (
    prevProps.pipelineId !== nextProps.pipelineId
  );
  
  // Name comparison (memoized string concat)
  const prevName = (prevProps.lead.first_name || '') + ' ' + (prevProps.lead.last_name || '');
  const nextName = (nextProps.lead.first_name || '') + ' ' + (nextProps.lead.last_name || '');
  const nameChanged = prevName !== nextName;
  
  // Custom data comparison (critical fields for display)
  const customDataChanged = (
    prevProps.lead.custom_data?.valor !== nextProps.lead.custom_data?.valor ||
    prevProps.lead.custom_data?.empresa !== nextProps.lead.custom_data?.empresa ||
    prevProps.lead.custom_data?.nome_oportunidade !== nextProps.lead.custom_data?.nome_oportunidade ||
    prevProps.lead.custom_data?.titulo !== nextProps.lead.custom_data?.titulo ||
    prevProps.lead.custom_data?.email !== nextProps.lead.custom_data?.email ||
    prevProps.lead.custom_data?.telefone !== nextProps.lead.custom_data?.telefone ||
    prevProps.lead.custom_data?.nome_lead !== nextProps.lead.custom_data?.nome_lead
  );
  
  // Functions are stable (useCallback), so we don't need to compare them
  const shouldUpdate = leadDataChanged || propsChanged || nameChanged || customDataChanged;
  
  // Log de re-render removido para evitar spam - re-renders são normais
  
  return !shouldUpdate; // React.memo returns true when props are equal (no re-render needed)
});

// Definir displayName para debugging
LeadCardPresentation.displayName = 'LeadCardPresentation';

export default LeadCardPresentation;