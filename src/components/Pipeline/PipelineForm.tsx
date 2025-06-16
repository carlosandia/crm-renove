import React, { useState, useEffect } from 'react';
import { Pipeline } from '../../hooks/usePipelines';
import { User } from '../../hooks/useMembers';

interface PipelineFormProps {
  members: User[];
  pipeline?: Pipeline;
  onSubmit: (data: { name: string; description: string; member_ids?: string[] }) => void;
  onCancel: () => void;
  title: string;
  submitText: string;
}

const PipelineForm: React.FC<PipelineFormProps> = ({
  members,
  pipeline,
  onSubmit,
  onCancel,
  title,
  submitText,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    member_ids: [] as string[],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (pipeline) {
      setFormData({
        name: pipeline.name,
        description: pipeline.description || '',
        member_ids: pipeline.pipeline_members?.map(pm => pm.member_id) || [],
      });
    }
  }, [pipeline]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    onSubmit(formData);
  };

  const handleMemberToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(memberId)
        ? prev.member_ids.filter(id => id !== memberId)
        : [...prev.member_ids, memberId]
    }));
  };

  return (
    <div className="pipeline-form">
      <div className="form-header">
        <h4>{title}</h4>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        <div className="form-group">
          <label htmlFor="name">Nome da Pipeline *</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={errors.name ? 'error' : ''}
            placeholder="Ex: Vendas Imóveis"
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Descrição</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descreva o objetivo desta pipeline..."
            rows={3}
          />
        </div>

        {!pipeline && ( // Só mostrar seleção de membros na criação
          <div className="form-group">
            <label>Membros da Equipe</label>
            <div className="members-selection">
              {members.length === 0 ? (
                <p className="no-members">Nenhum membro disponível</p>
              ) : (
                members.map(member => (
                  <div key={member.id} className="member-checkbox">
                    <input
                      type="checkbox"
                      id={`member-${member.id}`}
                      checked={formData.member_ids.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                    />
                    <label htmlFor={`member-${member.id}`}>
                      {member.first_name} {member.last_name}
                      <small>({member.email})</small>
                    </label>
                  </div>
                ))
              )}
            </div>
            <small className="form-hint">
              Selecione os membros que terão acesso a esta pipeline
            </small>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancelar
          </button>
          <button type="submit" className="submit-btn">
            {submitText}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PipelineForm; 