import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Clock, User, Mail, Phone, Building, Calendar, UserPlus, Eye } from 'lucide-react';

interface PendingLead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  custom_data: Record<string, any>;
  created_at: string;
  created_via: 'form' | 'webhook' | 'manual';
  assigned_to: string | null;
  pipeline: {
    id: string;
    name: string;
  };
  stage: {
    id: string;
    name: string;
    color: string;
  };
}

interface PipelineMember {
  id: string;
  member_id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
  };
}

interface PendingLeadsTabProps {
  selectedPipelineId?: string;
}

const PendingLeadsTab: React.FC<PendingLeadsTabProps> = ({ selectedPipelineId }) => {
  const { user } = useAuth();
  const [pendingLeads, setPendingLeads] = useState<PendingLead[]>([]);
  const [availableMembers, setAvailableMembers] = useState<PipelineMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<PendingLead | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [distributing, setDistributing] = useState(false);

  // Carregar leads pendentes
  const loadPendingLeads = useCallback(async () => {
    if (!user || user.role !== 'admin') return;

    try {
      setLoading(true);

      // Query para buscar leads pendentes
      let query = supabase
        .from('pipeline_leads')
        .select(`
          *,
          pipelines!inner (
            id,
            name,
            tenant_id
          ),
          pipeline_stages!inner (
            id,
            name,
            color
          ),
          pipeline_distribution_rules!inner (
            mode
          )
        `)
        .is('assigned_to', null)
        .eq('pipeline_distribution_rules.mode', 'manual');

      // Se tem pipeline específica selecionada, filtrar por ela
      if (selectedPipelineId) {
        query = query.eq('pipeline_id', selectedPipelineId);
      }

      // Filtrar por tenant do admin
      query = query.eq('pipelines.tenant_id', user.tenant_id);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar leads pendentes:', error);
        return;
      }

      // Transformar dados para o formato esperado
      const formattedLeads: PendingLead[] = (data || []).map(lead => ({
        id: lead.id,
        pipeline_id: lead.pipeline_id,
        stage_id: lead.stage_id,
        custom_data: lead.custom_data || {},
        created_at: lead.created_at,
        created_via: lead.created_via || 'manual',
        assigned_to: lead.assigned_to,
        pipeline: {
          id: lead.pipelines.id,
          name: lead.pipelines.name
        },
        stage: {
          id: lead.pipeline_stages.id,
          name: lead.pipeline_stages.name,
          color: lead.pipeline_stages.color
        }
      }));

      setPendingLeads(formattedLeads);

    } catch (error) {
      console.error('Erro ao carregar leads pendentes:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedPipelineId]);

  // Carregar membros disponíveis para uma pipeline
  const loadPipelineMembers = useCallback(async (pipelineId: string) => {
    try {
      const { data, error } = await supabase
        .from('pipeline_members')
        .select(`
          id,
          member_id,
          users!inner (
            id,
            first_name,
            last_name,
            email,
            is_active
          )
        `)
        .eq('pipeline_id', pipelineId)
        .eq('users.is_active', true);

      if (error) {
        console.error('Erro ao carregar membros:', error);
        return [];
      }

      return (data || []).map((member: any) => ({
        id: member.id,
        member_id: member.member_id,
        user: {
          id: member.users.id,
          first_name: member.users.first_name,
          last_name: member.users.last_name,
          email: member.users.email,
          is_active: member.users.is_active
        }
      }));

    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      return [];
    }
  }, []);

  // Distribuir lead para um membro
  const distributeLead = useCallback(async (leadId: string, memberId: string) => {
    if (!user) return;

    try {
      setDistributing(true);

      // Atualizar lead
      const { error: updateError } = await supabase
        .from('pipeline_leads')
        .update({
          assigned_to: memberId,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // Registrar atribuição
      const { error: assignmentError } = await supabase
        .from('lead_assignments')
        .insert({
          lead_id: leadId,
          assigned_to: memberId,
          assigned_by: user.id,
          is_active: true
        });

      if (assignmentError) {
        console.warn('Erro ao registrar atribuição:', assignmentError);
      }

      // Registrar no histórico
      const { error: historyError } = await supabase
        .from('lead_history')
        .insert({
          lead_id: leadId,
          action: 'manual_assignment',
          performed_by: user.id,
          new_values: {
            assigned_to: memberId,
            assigned_by: user.id
          },
          timestamp: new Date().toISOString()
        });

      if (historyError) {
        console.warn('Erro ao registrar histórico:', historyError);
      }

      // Atualizar lista local
      setPendingLeads(prev => prev.filter(lead => lead.id !== leadId));
      setShowDistributeModal(false);
      setSelectedLead(null);

      alert('Lead distribuído com sucesso!');

    } catch (error: any) {
      console.error('Erro ao distribuir lead:', error);
      alert('Erro ao distribuir lead: ' + error.message);
    } finally {
      setDistributing(false);
    }
  }, [user]);

  // Abrir modal de distribuição
  const handleDistribute = useCallback(async (lead: PendingLead) => {
    setSelectedLead(lead);
    const members = await loadPipelineMembers(lead.pipeline_id);
    setAvailableMembers(members);
    setShowDistributeModal(true);
  }, [loadPipelineMembers]);

  // Abrir modal de detalhes
  const handleViewDetails = useCallback((lead: PendingLead) => {
    setSelectedLead(lead);
    setShowDetailsModal(true);
  }, []);

  // Carregar dados na inicialização
  useEffect(() => {
    loadPendingLeads();
  }, [loadPendingLeads]);

  // Formatação de data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obter origem do lead formatada
  const getCreatedViaLabel = (createdVia: string) => {
    const labels = {
      form: 'Formulário',
      webhook: 'Webhook/API',
      manual: 'Manual'
    };
    return labels[createdVia as keyof typeof labels] || createdVia;
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Apenas administradores podem visualizar leads pendentes.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando leads pendentes...</span>
      </div>
    );
  }

  if (pendingLeads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="text-gray-400" size={24} />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhum lead pendente
        </h3>
        <p className="text-gray-500">
          {selectedPipelineId 
            ? 'Não há leads pendentes de distribuição nesta pipeline.'
            : 'Não há leads pendentes de distribuição no momento.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Leads Pendentes de Distribuição
          </h3>
          <p className="text-sm text-gray-500">
            {pendingLeads.length} lead{pendingLeads.length !== 1 ? 's' : ''} aguardando distribuição manual
          </p>
        </div>
        <button
          onClick={loadPendingLeads}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Atualizar
        </button>
      </div>

      {/* Lista de leads */}
      <div className="space-y-4">
        {pendingLeads.map((lead) => (
          <div
            key={lead.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              {/* Informações do lead */}
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-3">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {lead.custom_data.first_name || lead.custom_data.nome || 'Lead sem nome'}
                      {(lead.custom_data.last_name || lead.custom_data.sobrenome) && (
                        <span> {lead.custom_data.last_name || lead.custom_data.sobrenome}</span>
                      )}
                    </h4>
                    {(lead.custom_data.company || lead.custom_data.empresa) && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Building size={14} className="mr-1" />
                        {lead.custom_data.company || lead.custom_data.empresa}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Email */}
                  {(lead.custom_data.email || lead.custom_data.Email) && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail size={14} className="mr-2 text-gray-400" />
                      <span className="truncate">
                        {lead.custom_data.email || lead.custom_data.Email}
                      </span>
                    </div>
                  )}

                  {/* Telefone */}
                  {(lead.custom_data.phone || lead.custom_data.telefone) && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone size={14} className="mr-2 text-gray-400" />
                      <span>{lead.custom_data.phone || lead.custom_data.telefone}</span>
                    </div>
                  )}

                  {/* Data de entrada */}
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar size={14} className="mr-2 text-gray-400" />
                    <span>{formatDate(lead.created_at)}</span>
                  </div>

                  {/* Origem */}
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock size={14} className="mr-2 text-gray-400" />
                    <span>{getCreatedViaLabel(lead.created_via)}</span>
                  </div>
                </div>

                {/* Pipeline e estágio */}
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-500">Pipeline:</span>
                  <span className="font-medium text-gray-900">{lead.pipeline.name}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-500">Estágio:</span>
                  <span 
                    className="px-2 py-1 rounded-full text-white text-xs font-medium"
                    style={{ backgroundColor: lead.stage.color }}
                  >
                    {lead.stage.name}
                  </span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleViewDetails(lead)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Ver detalhes"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleDistribute(lead)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserPlus size={16} />
                  <span>Distribuir</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Distribuição */}
      {showDistributeModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Distribuir Lead
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Lead: <strong>
                    {selectedLead.custom_data.first_name || selectedLead.custom_data.nome || 'Lead sem nome'}
                  </strong>
                </p>
                <p className="text-sm text-gray-600">
                  Pipeline: <strong>{selectedLead.pipeline.name}</strong>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar Vendedor
                </label>
                {availableMembers.length === 0 ? (
                  <p className="text-sm text-red-600">
                    Nenhum vendedor disponível nesta pipeline.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => distributeLead(selectedLead.id, member.user.id)}
                        disabled={distributing}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User size={16} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.user.first_name} {member.user.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{member.user.email}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDistributeModal(false);
                    setSelectedLead(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalhes do Lead
                </h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedLead(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Informações básicas */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Informações Básicas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedLead.custom_data).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 capitalize">
                          {key.replace(/_/g, ' ')}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {value?.toString() || '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Informações da pipeline */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Pipeline</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Pipeline
                      </label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.pipeline.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Estágio Atual
                      </label>
                      <p className="mt-1">
                        <span 
                          className="px-2 py-1 rounded-full text-white text-xs font-medium"
                          style={{ backgroundColor: selectedLead.stage.color }}
                        >
                          {selectedLead.stage.name}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Data de Entrada
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDate(selectedLead.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Origem
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {getCreatedViaLabel(selectedLead.created_via)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleDistribute(selectedLead);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Distribuir Lead
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedLead(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingLeadsTab; 