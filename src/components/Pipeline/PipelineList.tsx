import React from 'react';
import { Settings, Plus, GitBranch } from 'lucide-react';
import { Pipeline } from '../../hooks/usePipelines';
import { User } from '../../hooks/useMembers';
import PipelineCard from './PipelineCard';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  role?: string;
}

interface PipelineListProps {
  pipelines: Pipeline[];
  members: Member[];
  onEdit: (pipelineId: string) => void;
  onDelete: (pipelineId: string) => void;
  onAddMember: (pipelineId: string, memberId: string) => void;
  onRemoveMember: (pipelineId: string, memberId: string) => void;
  onCreateNew: () => void;
}

const PipelineList: React.FC<PipelineListProps> = ({
  pipelines,
  members,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
  onCreateNew,
}) => {
  if (pipelines.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-sm">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <GitBranch className="w-8 h-8 text-gray-400" />
        </div>
        <h4 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma Pipeline Criada</h4>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Você ainda não criou nenhuma pipeline de vendas. Crie sua primeira pipeline para começar a organizar seu processo de vendas.
        </p>
        <button 
          onClick={onCreateNew} 
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md mx-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Primeira Pipeline</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid de pipelines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {pipelines.map((pipeline) => (
          <PipelineCard
            key={pipeline.id}
            pipeline={pipeline}
            members={members}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddMember={onAddMember}
            onRemoveMember={onRemoveMember}
          />
        ))}
      </div>
    </div>
  );
};

export default PipelineList; 