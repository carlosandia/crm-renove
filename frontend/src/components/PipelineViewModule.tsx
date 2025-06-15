import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number' | 'date';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
  placeholder?: string;
}

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  temperature_score: number;
  max_days_allowed: number;
  color: string;
  is_system_stage?: boolean; // Para identificar etapas fixas do sistema
}

interface Lead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  custom_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  status?: 'active' | 'won' | 'lost'; // Status do lead
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  pipeline_stages?: PipelineStage[];
  pipeline_custom_fields?: CustomField[];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PipelineViewModule: React.FC = () => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [leadFormData, setLeadFormData] = useState<Record<string, any>>({});
  const [leads, setLeads] = useState<Lead[]>([]);

  // ============================================
  // EFEITOS E CARREGAMENTO DE DADOS
  // ============================================

  useEffect(() => {
    if (user && user.role === 'member') {
      loadMemberPipelines();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPipeline) {
      loadLeads(selectedPipeline.id);
    }
  }, [selectedPipeline]);

  const loadMemberPipelines = async () => {
    try {
      console.log('🔍 Carregando pipelines do membro:', user?.id);
      
      const response = await fetch(`http://localhost:5001/api/pipelines/member/${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Pipelines recebidas:', data);
        
        setPipelines(data.pipelines || []);
        
        // Selecionar primeira pipeline automaticamente
        if (data.pipelines && data.pipelines.length > 0) {
          setSelectedPipeline(data.pipelines[0]);
          console.log('✅ Pipeline selecionada:', data.pipelines[0].name);
          console.log('📝 Campos customizados:', data.pipelines[0].pipeline_custom_fields);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Erro ao carregar pipelines do membro:', errorData);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async (pipelineId: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/pipelines/${pipelineId}/leads`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar leads:', error);
    }
  };

  const handleAddLead = (stageId: string) => {
    setSelectedStageId(stageId);
    setLeadFormData({});
    setShowAddLeadModal(true);
  };

  const handleCreateLead = async () => {
    if (!selectedPipeline || !selectedStageId) return;

    try {
      // Determinar o status baseado na etapa
      let leadStatus = 'active';
      if (selectedStageId === 'system-won') {
        leadStatus = 'won';
      } else if (selectedStageId === 'system-lost') {
        leadStatus = 'lost';
      }

      // Para etapas do sistema, usar a primeira etapa real como stage_id no banco
      // mas marcar o status apropriado
      let actualStageId = selectedStageId;
      if (selectedStageId.startsWith('system-')) {
        const regularStages = (selectedPipeline.pipeline_stages || [])
          .sort((a, b) => a.order_index - b.order_index);
        if (regularStages.length > 0) {
          actualStageId = regularStages[0].id;
        }
      }

      const response = await fetch(`http://localhost:5001/api/pipelines/${selectedPipeline.id}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage_id: actualStageId,
          custom_data: {
            ...leadFormData,
            _system_status: leadStatus, // Adicionar status do sistema aos dados customizados
            _system_stage: selectedStageId // Guardar a etapa do sistema original
          },
          created_by: user?.id
        }),
      });

      if (response.ok) {
        setShowAddLeadModal(false);
        setLeadFormData({});
        loadLeads(selectedPipeline.id);
        
        const statusMessage = leadStatus === 'won' ? 'Lead criado como GANHO!' : 
                             leadStatus === 'lost' ? 'Lead criado como PERDIDO!' : 
                             'Lead criado com sucesso!';
        alert(statusMessage);
      } else {
        alert('Erro ao criar lead');
      }
    } catch (error) {
      console.error('❌ Erro ao criar lead:', error);
      alert('Erro ao criar lead');
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setLeadFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const getLeadsByStage = (stageId: string) => {
    if (stageId === 'system-won') {
      // Retornar leads marcados como ganhos
      return leads.filter(lead => 
        lead.custom_data?._system_status === 'won' || 
        lead.custom_data?._system_stage === 'system-won'
      );
    } else if (stageId === 'system-lost') {
      // Retornar leads marcados como perdidos
      return leads.filter(lead => 
        lead.custom_data?._system_status === 'lost' || 
        lead.custom_data?._system_stage === 'system-lost'
      );
    } else {
      // Para etapas regulares, filtrar leads que não são do sistema
      return leads.filter(lead => 
        lead.stage_id === stageId && 
        !lead.custom_data?._system_status && 
        !lead.custom_data?._system_stage?.startsWith('system-')
      );
    }
  };

  // Função para criar as etapas fixas do sistema
  const getSystemStages = (): PipelineStage[] => {
    return [
      {
        id: 'system-won',
        name: 'Ganho',
        order_index: 9999,
        temperature_score: 100,
        max_days_allowed: 0,
        color: '#10B981', // Verde
        is_system_stage: true
      },
      {
        id: 'system-lost',
        name: 'Perdido',
        order_index: 10000,
        temperature_score: 0,
        max_days_allowed: 0,
        color: '#EF4444', // Vermelho
        is_system_stage: true
      }
    ];
  };

  // Função para obter todas as etapas (regulares + sistema)
  const getAllStages = (): PipelineStage[] => {
    const regularStages = (selectedPipeline?.pipeline_stages || [])
      .sort((a, b) => a.order_index - b.order_index);
    const systemStages = getSystemStages();
    return [...regularStages, ...systemStages];
  };

  // ============================================
  // VERIFICAÇÕES DE ACESSO
  // ============================================

  if (!user || user.role !== 'member') {
    return (
      <div className="access-denied">
        <h3>🚫 Acesso Negado</h3>
        <p>Apenas vendedores podem acessar esta seção.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Carregando suas pipelines...</div>;
  }

  if (pipelines.length === 0) {
    return (
      <div className="empty-state">
        <h3>📋 Nenhuma Pipeline Atribuída</h3>
        <p>Você ainda não foi atribuído a nenhuma pipeline de vendas.</p>
        <p>Entre em contato com seu administrador para ser adicionado a uma pipeline.</p>
      </div>
    );
  }

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="pipeline-view-module">
      <div className="module-header">
        <h3>🎯 Minhas Pipelines</h3>
        <div className="pipeline-selector">
          <label>Pipeline Ativa:</label>
          <select 
            value={selectedPipeline?.id || ''} 
            onChange={(e) => {
              const pipeline = pipelines.find(p => p.id === e.target.value);
              setSelectedPipeline(pipeline || null);
            }}
            className="pipeline-select"
          >
            {pipelines.map(pipeline => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPipeline && (
        <div className="pipeline-kanban">
          <div className="pipeline-info">
            <h4>{selectedPipeline.name}</h4>
            <p>{selectedPipeline.description || 'Sem descrição'}</p>
          </div>

          <div className="kanban-board">
            {getAllStages().map((stage) => (
              <div 
                key={stage.id} 
                className="kanban-column"
                data-system-stage={stage.is_system_stage || false}
                data-stage-id={stage.id}
              >
                <div className="column-header" style={{ borderTopColor: stage.color }}>
                  <div className="stage-info">
                    <h5>
                      {stage.name}
                      {stage.is_system_stage && (
                        <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                          {stage.id === 'system-won' ? '🏆' : '❌'}
                        </span>
                      )}
                    </h5>
                    <div className="stage-meta">
                      <span className="temperature">🌡️ {stage.temperature_score}%</span>
                      {!stage.is_system_stage && (
                        <span className="max-days">⏰ {stage.max_days_allowed} dias</span>
                      )}
                      {stage.is_system_stage && (
                        <span className="max-days">
                          {stage.id === 'system-won' ? '✅ Final' : '🚫 Final'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="leads-count">
                    <span className="count">{getLeadsByStage(stage.id).length}</span>
                    <span className="label">leads</span>
                  </div>
                </div>
                
                <div className="column-content">
                  {getLeadsByStage(stage.id).length > 0 ? (
                    <div className="leads-list">
                      {getLeadsByStage(stage.id).map((lead) => (
                        <div key={lead.id} className="lead-card">
                          <div className="lead-header">
                            <h6>Lead #{lead.id.slice(-6)}</h6>
                            <span className="lead-date">
                              {new Date(lead.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="lead-fields">
                            {(selectedPipeline?.pipeline_custom_fields || [])
                              .sort((a, b) => a.field_order - b.field_order)
                              .map((field) => (
                                <div key={field.id} className="lead-field">
                                  <label>{field.field_label}:</label>
                                  <span>{lead.custom_data[field.field_name] || '-'}</span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      ))}
                      <button className="add-lead-button" onClick={() => handleAddLead(stage.id)}>
                        ➕ Adicionar Lead
                      </button>
                    </div>
                  ) : (
                    <div className="empty-column">
                      <p>Nenhum lead nesta etapa</p>
                      <button className="add-lead-button" onClick={() => handleAddLead(stage.id)}>
                        ➕ Adicionar Lead
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(selectedPipeline.pipeline_stages || []).length === 0 && (
            <div className="no-stages">
              <h4>⚠️ Pipeline sem etapas</h4>
              <p>Esta pipeline ainda não possui etapas configuradas.</p>
              <p>Entre em contato com seu administrador para configurar as etapas.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE ADICIONAR LEAD */}
      {showAddLeadModal && selectedPipeline && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h4>➕ Adicionar Novo Lead</h4>
              <button 
                onClick={() => setShowAddLeadModal(false)}
                className="close-button"
              >
                ❌
              </button>
            </div>
            
            <div className="modal-content">
              <p>Preencha os campos abaixo para criar um novo lead:</p>
              
              <div className="lead-form">
                {(selectedPipeline.pipeline_custom_fields || [])
                  .sort((a, b) => a.field_order - b.field_order)
                  .map((field) => (
                    <div key={field.id} className="form-group">
                      <label>
                        {field.field_label}
                        {field.is_required && <span className="required">*</span>}
                      </label>
                      
                      {field.field_type === 'textarea' ? (
                        <textarea
                          value={leadFormData[field.field_name] || ''}
                          onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.is_required}
                          rows={3}
                        />
                      ) : field.field_type === 'select' ? (
                        <select
                          value={leadFormData[field.field_name] || ''}
                          onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                          required={field.is_required}
                        >
                          <option value="">Selecione...</option>
                          {(field.field_options || []).map((option, index) => (
                            <option key={index} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.field_type}
                          value={leadFormData[field.field_name] || ''}
                          onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.is_required}
                        />
                      )}
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={handleCreateLead} className="submit-button">
                ✅ Criar Lead
              </button>
              <button 
                onClick={() => setShowAddLeadModal(false)}
                className="cancel-button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineViewModule;