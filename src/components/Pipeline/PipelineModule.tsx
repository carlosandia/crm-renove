import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePipelines } from '../../hooks/usePipelines';
import { useMembers } from '../../hooks/useMembers';
import PipelineList from './PipelineList';
import PipelineForm from './PipelineForm';
import PipelineCreator from './PipelineCreator';
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
        <PipelineCreator
          onCreateComplete={handleCreateCompletePipeline}
          onCancel={() => setActiveTab('list')}
        />
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
