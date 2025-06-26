import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Target, Plus } from 'lucide-react';

interface DroppableStageAreaProps {
  stageId: string;
  stageName: string;
  stageColor: string;
  children: React.ReactNode;
  leadCount: number;
  className?: string;
}

const DroppableStageArea: React.FC<DroppableStageAreaProps> = ({ 
  stageId, 
  stageName, 
  stageColor,
  children, 
  leadCount,
  className = '' 
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stageId}`,
  });

  return (
    <div className="w-80 flex flex-col bg-gray-50 rounded-lg border border-gray-200">
      {/* Header da Stage */}
      <div 
        className="p-4 rounded-t-lg border-b-2 bg-white transition-all duration-200"
        style={{ 
          backgroundColor: isOver ? `${stageColor}25` : `${stageColor}15`,
          borderBottomColor: stageColor 
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold transition-colors duration-200 ${isOver ? 'text-blue-700' : 'text-gray-900'}`}>
            {stageName}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`text-sm transition-colors duration-200 ${isOver ? 'text-blue-600' : 'text-gray-600'}`}>
              {leadCount}
            </span>
            {isOver && (
              <Plus className="h-4 w-4 text-blue-600 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Área Droppable */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 p-4 rounded-b-lg transition-all duration-200 min-h-[500px] relative
          ${isOver 
            ? 'bg-blue-50 border-2 border-dashed border-blue-400 shadow-inner' 
            : 'bg-white border border-gray-200'
          }
          ${className}
        `}
      >
        {/* Overlay de Drop */}
        {isOver && (
          <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-b-lg flex items-center justify-center pointer-events-none">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Solte aqui</span>
            </div>
          </div>
        )}
        
        <div className="space-y-3 h-full">
          {React.Children.count(children) === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 min-h-[200px]">
              <Target className={`h-8 w-8 mx-auto mb-3 opacity-50 transition-all duration-200 ${isOver ? 'scale-110 text-blue-500' : ''}`} />
              <p className={`text-sm transition-colors duration-200 ${isOver ? 'text-blue-600' : 'text-gray-500'}`}>
                {isOver ? 'Solte o lead aqui' : 'Nenhum lead nesta etapa'}
              </p>
              <p className={`text-xs mt-1 transition-colors duration-200 ${isOver ? 'text-blue-500' : 'text-gray-400'}`}>
                {isOver ? 'Para mover para esta etapa' : 'Arraste um lead para cá'}
              </p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
};

export default DroppableStageArea;
