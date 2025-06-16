import React, { useState } from 'react';
import { Pipeline } from '../../hooks/usePipelines';
import { User } from '../../hooks/useMembers';
import CustomFieldsManager from './CustomFieldsManager';

interface PipelineCardProps {
  pipeline: Pipeline;
  members: User[];
  onEdit: (pipelineId: string) => void;
  onDelete: (pipelineId: string) => void;
  onAddMember: (pipelineId: string, memberId: string) => void;
  onRemoveMember: (pipelineId: string, memberId: string) => void;
}

const PipelineCard: React.FC<PipelineCardProps> = ({
  pipeline,
  members,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
}) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);

  const pipelineMembers = pipeline.pipeline_members || [];
  const assignedMemberIds = pipelineMembers.map(pm => pm.member_id);
  const availableMembers = members.filter(member => !assignedMemberIds.includes(member.id));

  const handleAddMember = (memberId: string) => {
    onAddMember(pipeline.id, memberId);
    setShowAddMember(false);
  };

  return (
    <div className="pipeline-card">
      <div className="card-header">
        <h4>{pipeline.name}</h4>
        <div className="card-actions">
          <button 
            onClick={() => setShowCustomFields(true)} 
            className="fields-btn" 
            title="Gerenciar Campos"
          >
            🎛️
          </button>
          <button onClick={() => onEdit(pipeline.id)} className="edit-btn" title="Editar">
            ✏️
          </button>
          <button onClick={() => onDelete(pipeline.id)} className="delete-btn" title="Excluir">
            🗑️
          </button>
        </div>
      </div>

      {pipeline.description && (
        <p className="pipeline-description">{pipeline.description}</p>
      )}

      <div className="pipeline-stats">
        <div className="stat">
          <span className="stat-label">Etapas:</span>
          <span className="stat-value">{pipeline.pipeline_stages?.length || 0}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Membros:</span>
          <span className="stat-value">{pipelineMembers.length}</span>
        </div>
      </div>

      <div className="pipeline-members">
        <div className="members-header">
          <h5>👥 Membros Atribuídos</h5>
          <button 
            onClick={() => setShowAddMember(!showAddMember)}
            className="add-member-btn"
            disabled={availableMembers.length === 0}
          >
            ➕
          </button>
        </div>

        {showAddMember && availableMembers.length > 0 && (
          <div className="add-member-dropdown">
            <select 
              onChange={(e) => e.target.value && handleAddMember(e.target.value)}
              defaultValue=""
            >
              <option value="">Selecionar membro...</option>
              {availableMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="members-list">
          {pipelineMembers.length === 0 ? (
            <p className="no-members">Nenhum membro atribuído</p>
          ) : (
            pipelineMembers.map((pm) => (
              <div key={pm.id} className="member-item">
                <span className="member-name">
                  {pm.member?.first_name || 'N/A'} {pm.member?.last_name || ''}
                </span>
                <button 
                  onClick={() => onRemoveMember(pipeline.id, pm.member_id)}
                  className="remove-member-btn"
                  title="Remover membro"
                >
                  ❌
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card-footer">
        <small>Criado em: {new Date(pipeline.created_at).toLocaleDateString('pt-BR')}</small>
      </div>

      {/* Modal de Campos Customizados */}
      {showCustomFields && (
        <div className="modal-overlay">
          <div className="modal-content">
            <CustomFieldsManager
              pipelineId={pipeline.id}
              onClose={() => setShowCustomFields(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineCard; 