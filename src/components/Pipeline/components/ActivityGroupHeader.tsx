import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';

interface ActivityGroupHeaderProps {
  stageName: string;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  isExpanded: boolean;
  onToggle: () => void;
  stageColor: string;
  stageIndex: number;
}

const ActivityGroupHeader: React.FC<ActivityGroupHeaderProps> = ({
  stageName,
  totalTasks,
  pendingTasks,
  completedTasks,
  isExpanded,
  onToggle,
  stageColor,
  stageIndex
}) => {
  return (
    <Collapsible.Trigger asChild>
      <button
        className={`w-full flex items-center justify-between p-3 text-left border-l-3 transition-all duration-200 hover:bg-gray-50 ${stageColor} bg-gradient-to-r from-gray-50 to-transparent`}
        aria-expanded={isExpanded}
        onClick={(e) => {
          e.stopPropagation(); // ✅ CRÍTICO: Impedir propagação para não abrir LeadDetailsModal
        }}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Ícone de expansão */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600 transition-transform" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600 transition-transform" />
            )}
          </div>

          {/* Indicador de etapa */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${stageColor.replace('border-l-', 'bg-').replace('-300', '-500')}`}>
            {stageIndex}
          </div>

          {/* Nome da etapa */}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 text-sm leading-tight">
              {stageName}
            </h4>
            <p className="text-xs text-gray-500">
              {pendingTasks} pendente{pendingTasks !== 1 ? 's' : ''} • {completedTasks} concluída{completedTasks !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Badge com total de atividades */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${stageColor.replace('border-l-', 'bg-').replace('-300', '-100')} ${stageColor.replace('border-l-', 'text-').replace('-300', '-700')}`}>
          {totalTasks}
        </div>
      </button>
    </Collapsible.Trigger>
  );
};

export default ActivityGroupHeader;