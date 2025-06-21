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
      <div className="space-y-6">
        {/* Header com título e botão criar */}
        <div className="card-modern border border-border shadow-sm">
          <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Criador de Pipeline</h1>
                  <p className="text-sm text-muted-foreground">Gerencie suas pipelines de vendas</p>
                </div>
              </div>
              <button 
                onClick={onCreateNew} 
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Pipeline</span>
              </button>
            </div>
          </div>
        </div>

        {/* Estado vazio */}
        <div className="text-center py-12 card-modern border-2 border-dashed border-border shadow-sm">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <GitBranch className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="text-xl font-semibold text-foreground mb-2">Nenhuma Pipeline Criada</h4>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Você ainda não criou nenhuma pipeline de vendas. Crie sua primeira pipeline para começar a organizar seu processo de vendas.
          </p>
          <button 
            onClick={onCreateNew} 
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeira Pipeline</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com título e botão criar */}
      <div className="card-modern border border-border shadow-sm">
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Criador de Pipeline</h1>
                <p className="text-sm text-muted-foreground">Gerencie suas pipelines de vendas ({pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''})</p>
              </div>
            </div>
            <button 
              onClick={onCreateNew} 
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Pipeline</span>
            </button>
          </div>
        </div>
      </div>

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