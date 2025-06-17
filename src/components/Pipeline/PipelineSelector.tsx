
import React from 'react';
import { ChevronDown, Plus } from 'lucide-react';

interface Pipeline {
  id: string;
  name: string;
  description: string;
}

interface PipelineSelectorProps {
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  onPipelineChange: (pipeline: Pipeline | null) => void;
  onCreateNew?: () => void;
  canCreate?: boolean;
}

const PipelineSelector: React.FC<PipelineSelectorProps> = ({
  pipelines,
  selectedPipeline,
  onPipelineChange,
  onCreateNew,
  canCreate = false
}) => {
  return (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <select 
          value={selectedPipeline?.id || ''} 
          onChange={(e) => {
            const pipeline = pipelines.find(p => p.id === e.target.value);
            onPipelineChange(pipeline || null);
          }}
          className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
        >
          {pipelines.map(pipeline => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {canCreate && onCreateNew && (
        <button
          onClick={onCreateNew}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Criar nova pipeline"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Informações da pipeline selecionada */}
      {selectedPipeline && (
        <div className="text-sm text-gray-500">
          <span>{selectedPipeline.description}</span>
        </div>
      )}
    </div>
  );
};

export default PipelineSelector;
