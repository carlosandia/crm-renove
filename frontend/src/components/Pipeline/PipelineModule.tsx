import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePipelines } from '../../hooks/usePipelines';
import { useMembers } from '../../hooks/useMembers';
import PipelineList from './PipelineList';
import PipelineForm from './PipelineForm';
import PipelineFormWithStagesAndFields from './PipelineFormWithStagesAndFields';
import '../../styles/PipelineModule.css';

type ActiveTab = 'list' | 'create' | 'edit' | 'create-complete';

interface PipelineFormData {
  name: string;
  description: string;
  member_ids: string[];
  stages: any[];
  custom_fields: any[];
}

const PipelineModule: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  const {
    pipelines,
    loading: pipelinesLoading,
    error: pipelinesError,
    createPipeline,
    updatePipeline,
    deletePipeline,
    addMember,
    removeMember,
  } = usePipelines();

  const {
    members,
    loading: membersLoading,
    error: membersError,
  } = useMembers();

  // Verificação de acesso
  if (!user || (user.role !== 'admin' && user.role !== 'member')) {
    return (
      <div className="access-denied">
        <h3>🚫 Acesso Negado</h3>
        <p>Apenas administradores e membros podem acessar o Criador de Pipeline.</p>
      </div>
    );
  }

  // Estados de carregamento
  if (pipelinesLoading || membersLoading) {
    return <div className="loading">Carregando pipelines...</div>;
  }

  // Tratamento de erros
  if (pipelinesError || membersError) {
    return (
      <div className="error-state">
        <h3>❌ Erro</h3>
        <p>{pipelinesError || membersError}</p>
      </div>
    );
  }

  // Handlers
  const handleCreatePipeline = async (data: { name: string; description: string; member_ids?: string[] }) => {
    const pipelineData = {
      ...data,
      member_ids: data.member_ids || []
    };
    const success = await createPipeline(pipelineData);
    if (success) {
      setActiveTab('list');
      alert('Pipeline criada com sucesso!');
    } else {
      alert('Erro ao criar pipeline');
    }
  };

  const handleCreateCompletePipeline = async (data: PipelineFormData) => {
    try {
      console.log('🚀 Iniciando criação de pipeline completa');
      
      // Validar dados obrigatórios
      if (!user?.email || !user?.tenant_id) {
        alert('Erro: Usuário não está logado corretamente');
        return;
      }

      if (!data.name || !data.name.trim()) {
        alert('Erro: Nome da pipeline é obrigatório');
        return;
      }

      const payload = {
        name: data.name.trim(),
        description: data.description || '',
        tenant_id: user.tenant_id,
        created_by: user.email,
        member_ids: data.member_ids || [],
        stages: data.stages || [],
        custom_fields: data.custom_fields || []
      };

      console.log('📦 Enviando:', payload);

      const response = await fetch('http://localhost:5001/api/pipelines/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Sucesso:', result);
        alert('✅ Pipeline criada com sucesso!');
        setActiveTab('list');
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('❌ Erro:', errorData);
        alert(`❌ Erro: ${errorData.error}\nDetalhes: ${errorData.details || ''}`);
      }
    } catch (error) {
      console.error('💥 Erro:', error);
      alert('💥 Erro de conexão');
    }
  };

  // Função de teste simples
  const handleTestCreatePipeline = async () => {
    const testData = {
      name: "Pipeline Teste " + new Date().toLocaleTimeString(),
      description: "Pipeline criada via teste",
      member_ids: [],
      stages: [
        {
          name: "Novo Lead",
          temperature_score: 50,
          max_days_allowed: 7,
          color: "#3B82F6",
          order_index: 1
        },
        {
          name: "Oportunidade",
          temperature_score: 75,
          max_days_allowed: 10,
          color: "#10B981",
          order_index: 2
        }
      ],
      custom_fields: [
        {
          field_name: "nome",
          field_label: "Nome",
          field_type: "text",
          is_required: true,
          field_order: 1
        },
        {
          field_name: "email",
          field_label: "Email",
          field_type: "email",
          is_required: true,
          field_order: 2
        }
      ]
    };

    await handleCreateCompletePipeline(testData);
  };

  const handleUpdatePipeline = async (data: { name: string; description: string }) => {
    if (!selectedPipelineId) return;
    
    const success = await updatePipeline(selectedPipelineId, data);
    if (success) {
      setActiveTab('list');
      setSelectedPipelineId(null);
      alert('Pipeline atualizada com sucesso!');
    } else {
      alert('Erro ao atualizar pipeline');
    }
  };

  const handleDeletePipeline = async (pipelineId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pipeline?')) return;
    
    const success = await deletePipeline(pipelineId);
    if (success) {
      alert('Pipeline excluída com sucesso!');
    } else {
      alert('Erro ao excluir pipeline');
    }
  };

  const handleAddMember = async (pipelineId: string, memberId: string) => {
    const success = await addMember(pipelineId, memberId);
    if (success) {
      alert('Membro adicionado com sucesso!');
    } else {
      alert('Erro ao adicionar membro');
    }
  };

  const handleRemoveMember = async (pipelineId: string, memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    
    const success = await removeMember(pipelineId, memberId);
    if (success) {
      alert('Membro removido com sucesso!');
    } else {
      alert('Erro ao remover membro');
    }
  };

  const handleEditPipeline = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    setActiveTab('edit');
  };

  const selectedPipeline = selectedPipelineId 
    ? pipelines.find(p => p.id === selectedPipelineId) 
    : null;

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
            ➕ Criar Simples
          </button>
          <button 
            onClick={() => setActiveTab('create-complete')}
            className={`tab-button ${activeTab === 'create-complete' ? 'active' : ''}`}
          >
            🎛️ Criar Completa
          </button>
        </div>
      </div>

      {/* BOTÃO DE TESTE VISÍVEL */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f0f9ff', 
        border: '2px solid #10B981', 
        borderRadius: '8px', 
        margin: '20px 0',
        textAlign: 'center'
      }}>
        <h4 style={{ color: '#10B981', margin: '0 0 10px 0' }}>🧪 Teste de Criação de Pipeline</h4>
        <p style={{ margin: '0 0 15px 0', color: '#666' }}>
          Clique no botão abaixo para testar a criação de uma pipeline completa
        </p>
        <button 
          onClick={handleTestCreatePipeline}
          style={{
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          🚀 CRIAR PIPELINE DE TESTE
        </button>
      </div>

      {activeTab === 'list' && (
        <PipelineList
          pipelines={pipelines}
          members={members}
          onEdit={handleEditPipeline}
          onDelete={handleDeletePipeline}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onCreateNew={() => setActiveTab('create-complete')}
        />
      )}

      {activeTab === 'create' && (
        <PipelineForm
          members={members}
          onSubmit={handleCreatePipeline}
          onCancel={() => setActiveTab('list')}
          title="➕ Criar Pipeline Simples"
          submitText="Criar Pipeline"
        />
      )}

      {activeTab === 'create-complete' && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '30px', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          margin: '20px 0'
        }}>
          <h4 style={{ marginBottom: '20px' }}>🎛️ Criar Pipeline Completa</h4>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const data = {
              name: formData.get('name') as string,
              description: formData.get('description') as string,
              member_ids: [],
              stages: [
                {
                  name: "Novo Lead",
                  temperature_score: 50,
                  max_days_allowed: 7,
                  color: "#3B82F6",
                  order_index: 1
                },
                {
                  name: "Oportunidade",
                  temperature_score: 75,
                  max_days_allowed: 10,
                  color: "#10B981",
                  order_index: 2
                }
              ],
              custom_fields: [
                {
                  field_name: "nome",
                  field_label: "Nome",
                  field_type: "text",
                  is_required: true,
                  field_order: 1
                },
                {
                  field_name: "email",
                  field_label: "Email",
                  field_type: "email",
                  is_required: true,
                  field_order: 2
                }
              ]
            };
            handleCreateCompletePipeline(data);
          }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Nome da Pipeline *
              </label>
              <input 
                type="text" 
                name="name" 
                required
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
                placeholder="Ex: Pipeline de Vendas"
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Descrição
              </label>
              <textarea 
                name="description"
                rows={3}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px',
                  fontSize: '16px',
                  resize: 'vertical'
                }}
                placeholder="Descreva o objetivo desta pipeline..."
              />
            </div>

            <div style={{ 
              padding: '15px', 
              backgroundColor: '#f9fafb', 
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <h5 style={{ margin: '0 0 10px 0', color: '#374151' }}>📋 Configuração Automática:</h5>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
                <li>2 etapas: "Novo Lead" e "Oportunidade"</li>
                <li>2 campos: "Nome" e "Email"</li>
                <li>Configurações padrão aplicadas</li>
              </ul>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setActiveTab('list')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🚀 Criar Pipeline
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'edit' && selectedPipeline && (
        <PipelineForm
          members={members}
          pipeline={selectedPipeline}
          onSubmit={handleUpdatePipeline}
          onCancel={() => {
            setActiveTab('list');
            setSelectedPipelineId(null);
          }}
          title="✏️ Editar Pipeline"
          submitText="Atualizar Pipeline"
        />
      )}
    </div>
  );
};

export default PipelineModule; 