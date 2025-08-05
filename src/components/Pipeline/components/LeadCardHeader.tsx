import React from 'react';
import { UserIcon } from 'lucide-react';
import TasksDropdown from './TasksDropdown';

interface LeadCardHeaderProps {
  opportunityName: string;
  leadName: string;
  leadId: string; // Necessário para TasksDropdown
  pipelineId?: string; // ✅ NOVO: Para TasksDropdown modal
  isCreating: boolean;
  tasks: any[];
  tasksLoading: boolean;
  tasksPending: number;
  tasksOverdue: number;
  tasksCompleted: number;
  isGeneratingTasks: boolean;
  completeTask: (taskId: string, notes?: string) => Promise<boolean>;
  deleteTask?: (taskId: string) => Promise<boolean>; // ✅ NOVO: Função para deletar tarefa
  forceRefreshCache: () => void;
  progressBadge: {
    text: string;
    color: string;
    title: string;
    onClick?: (e: React.MouseEvent) => void;
  };
}

export const LeadCardHeader: React.FC<LeadCardHeaderProps> = ({
  opportunityName,
  leadName,
  leadId,
  pipelineId,
  isCreating,
  tasks,
  tasksLoading,
  tasksPending,
  tasksOverdue,
  tasksCompleted,
  isGeneratingTasks,
  completeTask,
  deleteTask,
  forceRefreshCache,
  progressBadge
}) => {
  return (
    <div className="flex-1 overflow-hidden">
      {/* LINHA 1: Nome da Oportunidade (esquerda) + Badge de Progresso (direita) */}
      <div className="flex items-center justify-between mb-1.5 overflow-hidden">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h4 
            className="text-sm font-semibold text-gray-900 truncate tracking-wide"
            title={opportunityName}
          >
            {opportunityName}
          </h4>
        </div>
        
        <div className="flex items-center gap-1.5 overflow-hidden">
          {/* ✨ OPTIMISTIC UPDATES: Indicador de criação */}
          {isCreating && (
            <div 
              title="Criando oportunidade..."
              className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full"
            >
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">Criando...</span>
            </div>
          )}
          
          {/* 📊 BADGE DE PROGRESSO - LADO DIREITO (clicável) */}
          {!isCreating && (
            <TasksDropdown
              tasks={tasks}
              tasksLoading={tasksLoading}
              tasksPending={tasksPending}
              tasksOverdue={tasksOverdue}
              isGeneratingTasks={isGeneratingTasks}
              completeTask={completeTask}
              deleteTask={deleteTask} // ✅ NOVO: Passar função de deletar
              forceRefreshCache={forceRefreshCache}
              leadId={leadId}
              pipelineId={pipelineId} // ✅ NOVO: Pipeline ID para modal
              leadName={leadName} // ✅ NOVO: Nome do lead para modal
              progressBadge={progressBadge}
            />
          )}
        </div>
      </div>

      {/* LINHA 2: Nome do Lead */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <UserIcon className="h-3 w-3 text-gray-400" />
        <span className="text-xs font-medium text-gray-700 truncate tracking-wide">
          {leadName}
        </span>
      </div>
    </div>
  );
};

export default LeadCardHeader;