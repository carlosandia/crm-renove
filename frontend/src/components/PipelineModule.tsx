import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface PipelineMember {
  id: string;
  assigned_at: string;
  member_id: string;
  member: User;
}

interface FollowUp {
  id: string;
  day_offset: number;
  note: string;
  is_active: boolean;
}

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  temperature_score: number;
  max_days_allowed: number;
  color: string;
  follow_ups: FollowUp[];
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  pipeline_members?: PipelineMember[];
  pipeline_stages?: PipelineStage[];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PipelineModule: React.FC = () => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);

  // Estados para formulários
  const [pipelineForm, setPipelineForm] = useState({
    name: '',
    description: '',
    member_ids: [] as string[]
  });

  const [stageForm, setStageForm] = useState({
    name: '',
    temperature_score: 50,
    max_days_allowed: 7,
    color: '#3B82F6'
  });

  const [followUpForm, setFollowUpForm] = useState({
    stage_id: '',
    day_offset: 1,
    note: ''
  });

  // ============================================
  // EFEITOS E CARREGAMENTO DE DADOS
  // ============================================

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadPipelines();
      loadMembers();
    }
  }, [user]);

  const loadPipelines = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/pipelines?tenant_id=${user?.tenant_id}`);
      if (response.ok) {
        const data = await response.json();
        setPipelines(data.pipelines || []);
      }
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/users?role=member&tenant_id=${user?.tenant_id}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.users || []);
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    }
  };

  // ============================================
  // FUNÇÕES DE PIPELINE
  // ============================================

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5001/api/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...pipelineForm,
          tenant_id: user?.tenant_id,
          created_by: user?.id
        }),
      });

      if (response.ok) {
        setPipelineForm({ name: '', description: '', member_ids: [] });
        setActiveTab('list');
        loadPipelines();
        alert('Pipeline criada com sucesso!');
      } else {
        alert('Erro ao criar pipeline');
      }
    } catch (error) {
      console.error('Erro ao criar pipeline:', error);
      alert('Erro ao criar pipeline');
    }
  };

  const handleEditPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPipeline) return;

    try {
      const response = await fetch(`http://localhost:5001/api/pipelines/${selectedPipeline.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: pipelineForm.name,
          description: pipelineForm.description
        }),
      });

      if (response.ok) {
        setActiveTab('list');
        setSelectedPipeline(null);
        setPipelineForm({ name: '', description: '', member_ids: [] });
        loadPipelines();
        alert('Pipeline atualizada com sucesso!');
      } else {
        alert('Erro ao atualizar pipeline');
      }
    } catch (error) {
      console.error('Erro ao atualizar pipeline:', error);
      alert('Erro ao atualizar pipeline');
    }
  };

  const handleDeletePipeline = async (pipelineId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pipeline?')) return;

    try {
      const response = await fetch(`http://localhost:5001/api/pipelines/${pipelineId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadPipelines();
        alert('Pipeline excluída com sucesso!');
      } else {
        alert('Erro ao excluir pipeline');
      }
    } catch (error) {
      console.error('Erro ao excluir pipeline:', error);
      alert('Erro ao excluir pipeline');
    }
  };

  // ============================================
  // FUNÇÕES DE MEMBROS
  // ============================================

  const handleAddMember = async (pipelineId: string, memberId: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/pipelines/${pipelineId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ member_id: memberId }),
      });

      if (response.ok) {
        loadPipelines();
        alert('Membro adicionado com sucesso!');
      } else {
        alert('Erro ao adicionar membro');
      }
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      alert('Erro ao adicionar membro');
    }
  };

  const handleRemoveMember = async (pipelineId: string, memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    try {
      const response = await fetch(`http://localhost:5001/api/pipelines/${pipelineId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadPipelines();
        alert('Membro removido com sucesso!');
      } else {
        alert('Erro ao remover membro');
      }
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      alert('Erro ao remover membro');
    }
  };

  // ============================================
  // FUNÇÕES DE ETAPAS
  // ============================================

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPipeline) return;

    try {
      const response = await fetch(`http://localhost:5001/api/pipelines/${selectedPipeline.id}/stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stageForm),
      });

      if (response.ok) {
        setStageForm({ name: '', temperature_score: 50, max_days_allowed: 7, color: '#3B82F6' });
        setShowStageModal(false);
        loadPipelines();
        alert('Etapa criada com sucesso!');
      } else {
        alert('Erro ao criar etapa');
      }
    } catch (error) {
      console.error('Erro ao criar etapa:', error);
      alert('Erro ao criar etapa');
    }
  };

  const handleDeleteStage = async (pipelineId: string, stageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta etapa?')) return;

    try {
      const response = await fetch(`http://localhost:5001/api/pipelines/${pipelineId}/stages/${stageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadPipelines();
        alert('Etapa excluída com sucesso!');
      } else {
        alert('Erro ao excluir etapa');
      }
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
      alert('Erro ao excluir etapa');
    }
  };

  // ============================================
  // FUNÇÕES DE FOLLOW-UP
  // ============================================

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPipeline) return;

    try {
      const response = await fetch(`http://localhost:5001/api/pipelines/${selectedPipeline.id}/follow-ups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(followUpForm),
      });

      if (response.ok) {
        setFollowUpForm({ stage_id: '', day_offset: 1, note: '' });
        setShowFollowUpModal(false);
        loadPipelines();
        alert('Follow-up criado com sucesso!');
      } else {
        alert('Erro ao criar follow-up');
      }
    } catch (error) {
      console.error('Erro ao criar follow-up:', error);
      alert('Erro ao criar follow-up');
    }
  };

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const startEditPipeline = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setPipelineForm({
      name: pipeline.name,
      description: pipeline.description || '',
      member_ids: (pipeline.pipeline_members || []).map(pm => pm.member?.id || pm.member_id)
    });
    setActiveTab('edit');
  };

  const openStageModal = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setShowStageModal(true);
  };

  const openFollowUpModal = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setShowFollowUpModal(true);
  };

  // ============================================
  // VERIFICAÇÕES DE ACESSO
  // ============================================

  if (!user || user.role !== 'admin') {
    return (
      <div className="access-denied">
        <h3>🚫 Acesso Negado</h3>
        <p>Apenas administradores podem acessar o Criador de Pipeline.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Carregando pipelines...</div>;
  }

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="pipeline-module">
      <div className="module-header">
        <h3>🔄 Criador de Pipeline</h3>
        <div className="header-actions">
          <button 
            onClick={() => setActiveTab('list')}
            className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          >
            📋 Lista
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          >
            ➕ Criar Pipeline
          </button>
        </div>
      </div>

      {/* LISTA DE PIPELINES */}
      {activeTab === 'list' && (
        <div className="pipelines-list">
          {pipelines.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma pipeline criada ainda.</p>
              <button onClick={() => setActiveTab('create')} className="create-button">
                Criar primeira pipeline
              </button>
            </div>
          ) : (
            <div className="pipelines-grid">
              {pipelines.map((pipeline) => (
                <div key={pipeline.id} className="pipeline-card">
                  <div className="pipeline-header">
                    <h4>{pipeline.name}</h4>
                    <div className="pipeline-actions">
                      <button 
                        onClick={() => startEditPipeline(pipeline)}
                        className="edit-button"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeletePipeline(pipeline.id)}
                        className="delete-button"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <p className="pipeline-description">
                    {pipeline.description || 'Sem descrição'}
                  </p>
                  
                  <div className="pipeline-info">
                    <p><strong>Criado por:</strong> {pipeline.created_by || 'Sistema'}</p>
                    <p><strong>Data:</strong> {new Date(pipeline.created_at).toLocaleDateString()}</p>
                    <p><strong>Etapas:</strong> {pipeline.pipeline_stages?.length || 0}</p>
                  </div>

                  <div className="pipeline-members">
                    <h5>👥 Vendedores ({pipeline.pipeline_members?.length || 0})</h5>
                    <div className="members-list">
                      {(pipeline.pipeline_members || []).map((pm) => (
                        <div key={pm.id} className="member-item">
                          <span>{pm.member ? `${pm.member.first_name} ${pm.member.last_name}` : 'N/A'}</span>
                          <button 
                            onClick={() => handleRemoveMember(pipeline.id, pm.member_id)}
                            className="remove-member-button"
                            title="Remover"
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="add-member-section">
                      <select 
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMember(pipeline.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="member-select"
                      >
                        <option value="">+ Adicionar vendedor</option>
                        {members
                          .filter(member => !(pipeline.pipeline_members || []).some(pm => pm.member_id === member.id))
                          .map(member => (
                            <option key={member.id} value={member.id}>
                              {member.first_name} {member.last_name}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  <div className="pipeline-stages-section">
                    <div className="stages-header">
                      <h5>🎯 Etapas do Funil</h5>
                      <button 
                        onClick={() => openStageModal(pipeline)}
                        className="add-stage-button"
                      >
                        + Etapa
                      </button>
                    </div>
                    
                    <div className="stages-list">
                      {(pipeline.pipeline_stages || [])
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((stage) => (
                          <div key={stage.id} className="stage-item">
                            <div className="stage-info">
                              <div 
                                className="stage-color" 
                                style={{ backgroundColor: stage.color }}
                              ></div>
                              <div className="stage-details">
                                <strong>{stage.name}</strong>
                                <div className="stage-meta">
                                  <span>🌡️ {stage.temperature_score}%</span>
                                  <span>⏰ {stage.max_days_allowed} dias</span>
                                  <span>📋 {stage.follow_ups?.length || 0} follow-ups</span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteStage(pipeline.id, stage.id)}
                              className="delete-stage-button"
                              title="Excluir etapa"
                            >
                              🗑️
                            </button>
                          </div>
                        ))
                      }
                    </div>

                    <button 
                      onClick={() => openFollowUpModal(pipeline)}
                      className="add-followup-button"
                    >
                      📅 Adicionar Follow-up
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FORMULÁRIO DE CRIAÇÃO */}
      {activeTab === 'create' && (
        <div className="create-pipeline-form">
          <h4>➕ Criar Nova Pipeline</h4>
          <form onSubmit={handleCreatePipeline}>
            <div className="form-group">
              <label>Nome da Pipeline *</label>
              <input
                type="text"
                value={pipelineForm.name}
                onChange={(e) => setPipelineForm({...pipelineForm, name: e.target.value})}
                required
                placeholder="Ex: Pipeline Vendas B2B"
              />
            </div>

            <div className="form-group">
              <label>Descrição</label>
              <textarea
                value={pipelineForm.description}
                onChange={(e) => setPipelineForm({...pipelineForm, description: e.target.value})}
                placeholder="Descreva o objetivo desta pipeline..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Vendedores</label>
              <div className="members-checkboxes">
                {members.map((member) => (
                  <label key={member.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={pipelineForm.member_ids.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPipelineForm({
                            ...pipelineForm,
                            member_ids: [...pipelineForm.member_ids, member.id]
                          });
                        } else {
                          setPipelineForm({
                            ...pipelineForm,
                            member_ids: pipelineForm.member_ids.filter(id => id !== member.id)
                          });
                        }
                      }}
                    />
                    {member.first_name} {member.last_name}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">
                Criar Pipeline
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab('list')}
                className="cancel-button"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FORMULÁRIO DE EDIÇÃO */}
      {activeTab === 'edit' && selectedPipeline && (
        <div className="edit-pipeline-form">
          <h4>✏️ Editar Pipeline</h4>
          <form onSubmit={handleEditPipeline}>
            <div className="form-group">
              <label>Nome da Pipeline *</label>
              <input
                type="text"
                value={pipelineForm.name}
                onChange={(e) => setPipelineForm({...pipelineForm, name: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Descrição</label>
              <textarea
                value={pipelineForm.description}
                onChange={(e) => setPipelineForm({...pipelineForm, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">
                Salvar Alterações
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab('list')}
                className="cancel-button"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE ETAPA */}
      {showStageModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h4>➕ Adicionar Etapa</h4>
              <button 
                onClick={() => setShowStageModal(false)}
                className="close-button"
              >
                ❌
              </button>
            </div>
            
            <form onSubmit={handleCreateStage}>
              <div className="form-group">
                <label>Nome da Etapa *</label>
                <input
                  type="text"
                  value={stageForm.name}
                  onChange={(e) => setStageForm({...stageForm, name: e.target.value})}
                  required
                  placeholder="Ex: Contato Inicial"
                />
              </div>

              <div className="form-group">
                <label>Temperatura (0-100%) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={stageForm.temperature_score}
                  onChange={(e) => setStageForm({...stageForm, temperature_score: parseInt(e.target.value)})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Máximo de Dias *</label>
                <input
                  type="number"
                  min="1"
                  value={stageForm.max_days_allowed}
                  onChange={(e) => setStageForm({...stageForm, max_days_allowed: parseInt(e.target.value)})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Cor</label>
                <input
                  type="color"
                  value={stageForm.color}
                  onChange={(e) => setStageForm({...stageForm, color: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  Criar Etapa
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowStageModal(false)}
                  className="cancel-button"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FOLLOW-UP */}
      {showFollowUpModal && selectedPipeline && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h4>📅 Adicionar Follow-up</h4>
              <button 
                onClick={() => setShowFollowUpModal(false)}
                className="close-button"
              >
                ❌
              </button>
            </div>
            
            <form onSubmit={handleCreateFollowUp}>
              <div className="form-group">
                <label>Etapa *</label>
                <select
                  value={followUpForm.stage_id}
                  onChange={(e) => setFollowUpForm({...followUpForm, stage_id: e.target.value})}
                  required
                >
                  <option value="">Selecione uma etapa</option>
                  {(selectedPipeline.pipeline_stages || [])
                    .sort((a, b) => a.order_index - b.order_index)
                    .map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="form-group">
                <label>Dias após entrada na etapa *</label>
                <input
                  type="number"
                  min="1"
                  value={followUpForm.day_offset}
                  onChange={(e) => setFollowUpForm({...followUpForm, day_offset: parseInt(e.target.value)})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Nota/Lembrete</label>
                <textarea
                  value={followUpForm.note}
                  onChange={(e) => setFollowUpForm({...followUpForm, note: e.target.value})}
                  placeholder="Ex: Enviar proposta comercial"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  Criar Follow-up
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowFollowUpModal(false)}
                  className="cancel-button"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineModule;