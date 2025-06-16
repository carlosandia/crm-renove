import React from 'react';
import { Pipeline } from '../../hooks/usePipelines';
import { User } from '../../hooks/useMembers';
import PipelineCard from './PipelineCard';

interface PipelineListProps {
  pipelines: Pipeline[];
  members: User[];
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
      <div className="empty-state">
        <h4>📋 Nenhuma Pipeline Criada</h4>
        <p>Você ainda não criou nenhuma pipeline de vendas.</p>
        <button onClick={onCreateNew} className="create-button">
          ➕ Criar Primeira Pipeline
        </button>
      </div>
    );
  }

  return (
    <div className="pipelines-list">
      <div className="pipelines-grid">
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