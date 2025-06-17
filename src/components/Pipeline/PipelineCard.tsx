import React, { useState } from 'react';
import { Edit, Trash2, Users, Plus, X, Calendar, GitBranch, TrendingUp, Power } from 'lucide-react';
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

  const pipelineMembers = pipeline.pipeline_members || [];
  const assignedMemberIds = pipelineMembers.map(pm => pm.member_id);
  const availableMembers = members.filter(member => 
    member.is_active && !assignedMemberIds.includes(member.id)
  );

  const handleAddMember = (memberId: string) => {
    onAddMember(pipeline.id, memberId);
    setShowAddMember(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
      {/* Header do Card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-medium flex-shrink-0">
            {pipeline.name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {pipeline.name}
            </h3>
            {pipeline.description && (
              <p className="text-gray-600 text-sm">
                {pipeline.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 ml-4">
          <button 
            onClick={() => onEdit(pipeline.id)} 
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="Editar pipeline"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(pipeline.id)} 
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Desativar pipeline"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>

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
      <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
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
          <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Vendedores Atribuídos</span>
          </h4>
          <button 
            onClick={() => setShowAddMember(!showAddMember)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
            disabled={availableMembers.length === 0}
            title="Adicionar vendedor"
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <p className="text-gray-500 text-sm py-2">Nenhum vendedor atribuído</p>
          ) : (
            pipelineMembers.map((pm) => {
              // Buscar dados do membro na lista de members ou usar dados do pipeline_member
              const memberData = members.find(m => m.id === pm.member_id) || 
                                (pm.users && {
                                  id: pm.users.id,
                                  first_name: pm.users.first_name,
                                  last_name: pm.users.last_name,
                                  email: pm.users.email,
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
                <div key={pm.id || pm.member_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">
                        {(memberData?.first_name || 'V').charAt(0)}{(memberData?.last_name || 'D').charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-700">
                      {memberData?.first_name || 'Vendedor'} {memberData?.last_name || 'Desconhecido'}
                    </span>
                  </div>
                  <button 
                    onClick={() => onRemoveMember(pipeline.id, pm.member_id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200"
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
    </div>
  );
};

export default PipelineCard;