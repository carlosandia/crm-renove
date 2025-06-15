import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  temperature_score: number;
  max_days_allowed: number;
  color: string;
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
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PipelineViewModule: React.FC = () => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);

  // ============================================
  // EFEITOS E CARREGAMENTO DE DADOS
  // ============================================

  useEffect(() => {
    if (user && user.role === 'member') {
      loadMemberPipelines();
    }
  }, [user]);

  const loadMemberPipelines = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/pipelines/member/${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setPipelines(data.pipelines || []);
        
        // Selecionar primeira pipeline automaticamente
        if (data.pipelines && data.pipelines.length > 0) {
          setSelectedPipeline(data.pipelines[0]);
        }
      } else {
        console.error('Erro ao carregar pipelines do membro');
      }
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error);
    } finally {
      setLoading(false);
    }
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
            {(selectedPipeline.pipeline_stages || [])
              .sort((a, b) => a.order_index - b.order_index)
              .map((stage) => (
                <div key={stage.id} className="kanban-column">
                  <div className="column-header" style={{ borderTopColor: stage.color }}>
                    <div className="stage-info">
                      <h5>{stage.name}</h5>
                      <div className="stage-meta">
                        <span className="temperature">🌡️ {stage.temperature_score}%</span>
                        <span className="max-days">⏰ {stage.max_days_allowed} dias</span>
                      </div>
                    </div>
                    <div className="leads-count">
                      <span className="count">0</span>
                      <span className="label">leads</span>
                    </div>
                  </div>
                  
                  <div className="column-content">
                    <div className="empty-column">
                      <p>Nenhum lead nesta etapa</p>
                      <button className="add-lead-button">
                        ➕ Adicionar Lead
                      </button>
                    </div>
                  </div>
                </div>
              ))
            }
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
    </div>
  );
};

export default PipelineViewModule;