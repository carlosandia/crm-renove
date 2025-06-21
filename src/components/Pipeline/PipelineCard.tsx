import React, { useState } from 'react';
import { Edit, Trash2, Users, Plus, X, Calendar, GitBranch, TrendingUp, AlertTriangle } from 'lucide-react';
import { Pipeline } from '../../hooks/usePipelines';
import { User } from '../../hooks/useMembers';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  role?: string;
}

interface PipelineCardProps {
  pipeline: Pipeline;
  members: Member[];
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const pipelineMembers = pipeline.pipeline_members || [];
  const assignedMemberIds = pipelineMembers.map(pm => pm.member_id);
  const availableMembers = members.filter(member => 
    member.is_active && !assignedMemberIds.includes(member.id)
  );

  console.log('🔍 PipelineCard Debug:', {
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    totalMembers: members.length,
    pipelineMembers: pipelineMembers.length,
    availableMembers: availableMembers.length,
    assignedMemberIds
  });

  const handleAddMember = (memberId: string) => {
    console.log('🔗 PipelineCard - Adicionando membro:', { pipelineId: pipeline.id, memberId });
    onAddMember(pipeline.id, memberId);
    setShowAddMember(false);
  };

  const handleRemoveMember = (memberId: string) => {
    console.log('🔓 PipelineCard - Removendo membro:', { pipelineId: pipeline.id, memberId });
    onRemoveMember(pipeline.id, memberId);
  };

  const handleDelete = () => {
    console.log('🗑️ Excluindo pipeline:', pipeline.id);
    onDelete(pipeline.id);
    setShowDeleteConfirm(false);
  };

  const handleEditPipeline = () => {
    console.log('✏️ Editando pipeline:', pipeline.id);
    onEdit(pipeline.id);
  };

  // Verificar se é uma pipeline mock (ID numérico simples)
  const isMockPipeline = pipeline.id.length <= 2 && /^\d+$/.test(pipeline.id);

  return (
    <div className={`card-modern border p-6 hover:shadow-lg transition-all duration-200 ${
      isMockPipeline ? 'border-amber-200 bg-amber-50/30' : 'border-border'
    }`}>
      {/* Header do Card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-medium flex-shrink-0 shadow-md">
            {pipeline.name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-medium text-foreground">
                {pipeline.name}
              </h3>
              {isMockPipeline && (
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
                  DEMO
                </span>
              )}
            </div>
            {pipeline.description && (
              <p className="text-muted-foreground text-sm">
                {pipeline.description}
              </p>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center space-x-1 ml-4">
          <button 
            onClick={handleEditPipeline}
            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
            title="Editar pipeline"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200"
            title="Excluir pipeline"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="modal-modern">
          <div className="card-modern p-6 max-w-md mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Confirmar Exclusão</h3>
                <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-foreground mb-6">
              Tem certeza que deseja excluir a pipeline <strong>"{pipeline.name}"</strong>? 
              Todos os leads e dados associados serão perdidos.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-destructive/90 transition-colors font-medium"
              >
                Sim, Excluir
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Leads</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {(pipeline as any).leads_count || 0}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Etapas</span>
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {(pipeline as any).stages?.length || 0}
          </p>
        </div>
      </div>

      {/* Estatísticas Adicionais */}
      <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-4">
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4" />
          <span>{pipelineMembers.length} vendedores</span>
        </div>
        <div className="flex items-center space-x-1">
          <Calendar className="w-4 h-4" />
          <span>{new Date(pipeline.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      {/* Membros Atribuídos */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Vendedores Atribuídos</span>
          </h4>
          <button 
            onClick={() => setShowAddMember(!showAddMember)}
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              isMockPipeline 
                ? 'text-amber-400 cursor-not-allowed' 
                : 'text-muted-foreground hover:text-green-600 hover:bg-green-50'
            }`}
            disabled={availableMembers.length === 0 || isMockPipeline}
            title={isMockPipeline ? "Funcionalidade disponível apenas para pipelines reais" : "Adicionar vendedor"}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Dropdown para adicionar membro */}
        {showAddMember && availableMembers.length > 0 && (
          <div className="mb-3">
            <select 
              onChange={(e) => e.target.value && handleAddMember(e.target.value)}
              defaultValue=""
              className="input-modern w-full text-sm"
            >
              <option value="">Selecionar vendedor...</option>
              {availableMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Lista de membros */}
        <div className="space-y-2">
          {pipelineMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm py-2">Nenhum vendedor atribuído</p>
          ) : (
            pipelineMembers.map((pm) => {
              // Buscar dados do membro na lista de members ou usar dados do pipeline_member
              const memberData = members.find(m => m.id === pm.member_id) || 
                                ((pm as any).users && {
                                  id: (pm as any).users.id,
                                  first_name: (pm as any).users.first_name,
                                  last_name: (pm as any).users.last_name,
                                  email: (pm as any).users.email,
                                  is_active: true
                                }) ||
                                pm.member || 
                                {
                                  id: pm.member_id,
                                  first_name: 'Vendedor',
                                  last_name: 'Desconhecido',
                                  email: '',
                                  is_active: true
                                };

              return (
                <div key={pm.id || pm.member_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {(memberData?.first_name || 'V').charAt(0)}{(memberData?.last_name || 'D').charAt(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-foreground font-medium">
                        {memberData?.first_name || 'Vendedor'} {memberData?.last_name || 'Desconhecido'}
                      </span>
                      {memberData?.email && (
                        <p className="text-xs text-muted-foreground">{memberData.email}</p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveMember(pm.member_id)}
                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all duration-200"
                    title="Remover vendedor"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Botão de Ação Principal */}
      <div className="pt-4 border-t border-border">
        <button 
          onClick={handleEditPipeline}
          className="btn-primary w-full"
        >
          <GitBranch className="w-4 h-4" />
          <span>Gerenciar Pipeline</span>
        </button>
      </div>
    </div>
  );
};

export default PipelineCard;