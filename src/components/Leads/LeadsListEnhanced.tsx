import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Trash2, Target, UserPlus, Edit2 } from 'lucide-react';
import { BlurFade } from '../ui/blur-fade';
import LeadStatusTag from './LeadStatusTag';
import LeadAssignmentDropdown from './LeadAssignmentDropdown';
import CreateOpportunityModal from './CreateOpportunityModal';
import LeadToOpportunityModal from './LeadToOpportunityModal';
import LeadViewModal from './LeadViewModal';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { showSuccessToast, showErrorToast } from '../../lib/toast';

interface LeadMaster {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  lead_temperature?: string;
  status?: string;
  lead_source?: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  assigned_to?: string;
  estimated_value?: number;
  created_by: string;
  job_title?: string;
  last_contact_date?: string;
  next_action_date?: string;
  lead_score?: number;
  probability?: number;
  campaign_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  ip_address?: string;
  user_agent?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
}

interface AssignedUser {
  id: string;
  first_name: string;
  last_name: string;
}

interface Pipeline {
  id: string;
  name: string;
  pipeline_custom_fields?: any[];
  pipeline_stages?: any[];
}

interface LeadsListProps {
  leads: LeadMaster[];
  loading: boolean;
  onViewDetails: (lead: LeadMaster) => void;
  onEditLead: (lead: LeadMaster) => void;
  onDeleteLead: (leadId: string) => void;
  currentUserRole: string;
  onLeadUpdate?: () => void;
}

// Componente para exibir atribuição de usuário
const AssignmentDisplay: React.FC<{
  lead: LeadMaster;
  assignedUserName: string;
  isAdmin: boolean;
  onAssign: (leadId: string, memberId: string) => void;
}> = ({ lead, assignedUserName, isAdmin, onAssign }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  if (!isAdmin) {
    // Member só visualiza
    return (
      <div className="text-sm text-gray-900">
        {assignedUserName}
      </div>
    );
  }

  // Admin pode editar
  if (!lead.assigned_to) {
    // Não atribuído - mostrar dropdown para atribuir
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Não atribuído</span>
        <LeadAssignmentDropdown
          currentAssignedTo={lead.assigned_to}
          onAssign={(memberId) => onAssign(lead.id, memberId)}
          className="inline-block"
        />
      </div>
    );
  }

  // Atribuído - mostrar nome com opção de editar
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer flex items-center gap-1"
        title="Clique para alterar atribuição"
      >
        {assignedUserName}
        <Edit2 size={12} className="opacity-60" />
      </button>
      {showDropdown && (
        <div className="relative">
          <LeadAssignmentDropdown
            currentAssignedTo={lead.assigned_to}
            onAssign={(memberId) => {
              onAssign(lead.id, memberId);
              setShowDropdown(false);
            }}
            className="absolute top-0 left-0 z-10"
          />
        </div>
      )}
    </div>
  );
};

const LeadsListEnhanced: React.FC<LeadsListProps> = ({
  leads,
  loading,
  onViewDetails,
  onEditLead,
  onDeleteLead,
  currentUserRole,
  onLeadUpdate
}) => {
  const { user } = useAuth();
  
  // Estados existentes preservados
  const [opportunityModal, setOpportunityModal] = useState<{
    isOpen: boolean;
    leadId: string;
    leadName: string;
  }>({
    isOpen: false,
    leadId: '',
    leadName: ''
  });
  
  const [leadsWithOpportunities, setLeadsWithOpportunities] = useState<Set<string>>(new Set());
  const [assignedUsers, setAssignedUsers] = useState<Record<string, AssignedUser>>({});
  
  // ✅ Estado local para leads atualizados (sincronização com LeadViewModal)
  const [localLeads, setLocalLeads] = useState<LeadMaster[]>([]);

  // ✅ Sincronizar leads locais com props
  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  // ✅ Callback para atualizar lead específico
  const handleLeadUpdated = useCallback((updatedLead: LeadMaster) => {
    console.log('📡 [LeadsListEnhanced] Recebido lead atualizado:', updatedLead.id);
    setLocalLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === updatedLead.id ? updatedLead : lead
      )
    );
  }, []);

  // Novos estados para os novos modais
  const [leadToOpportunityModal, setLeadToOpportunityModal] = useState<{
    isOpen: boolean;
    lead: LeadMaster | null;
  }>({
    isOpen: false,
    lead: null
  });

  const [leadViewModal, setLeadViewModal] = useState<{
    isOpen: boolean;
    lead: LeadMaster | null;
  }>({
    isOpen: false,
    lead: null
  });

  // Verificar quais leads já têm oportunidades (preservado)
  useEffect(() => {
    if (leads.length > 0) {
      checkLeadsWithOpportunities();
      loadAssignedUsers();
    }
  }, [leads]);

  // Supabase Realtime para atualizações em tempo real
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('leads_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'leads_master',
        filter: `tenant_id=eq.${user.tenant_id}`
      }, (payload: any) => {
        console.log('🔄 Lead atualizado via Realtime:', payload);
        if (onLeadUpdate) {
          onLeadUpdate();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.tenant_id, onLeadUpdate]);

  const checkLeadsWithOpportunities = async () => {
    try {
      const leadIds = leads.map(lead => lead.id);
      
      // Buscar leads que já foram convertidos ou têm oportunidades na pipeline
      const { data: pipelineLeads, error } = await supabase
        .from('pipeline_leads')
        .select('custom_data')
        .not('custom_data->lead_master_id', 'is', null);

      if (error) throw error;

      const leadsWithOpps = new Set<string>();
      
      // Verificar leads convertidos
      leads.forEach(lead => {
        if (lead.status === 'converted') {
          leadsWithOpps.add(lead.id);
        }
      });

      // Verificar leads com oportunidades na pipeline
      pipelineLeads?.forEach((pipelineLead: any) => {
        const leadMasterId = pipelineLead.custom_data?.lead_master_id;
        if (leadMasterId) {
          leadsWithOpps.add(leadMasterId);
        }
      });

      setLeadsWithOpportunities(leadsWithOpps);
    } catch (error) {
      console.error('Erro ao verificar oportunidades:', error);
    }
  };

  const loadAssignedUsers = async () => {
    try {
      // Buscar todos os usuários únicos atribuídos aos leads
      const assignedToIds = [...new Set(leads.map(lead => lead.assigned_to).filter(Boolean))];
      
      if (assignedToIds.length === 0) return;

      const { data: users, error } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', assignedToIds);

      if (error) throw error;

      const usersMap: Record<string, AssignedUser> = {};
      users?.forEach((user: any) => {
        usersMap[user.id] = user;
      });

      setAssignedUsers(usersMap);
    } catch (error) {
      console.error('Erro ao carregar usuários atribuídos:', error);
    }
  };

  const handleAssignLead = async (leadId: string, memberId: string) => {
    try {
      const { error } = await supabase
        .from('leads_master')
        .update({ 
          assigned_to: memberId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
      
      if (onLeadUpdate) {
        onLeadUpdate();
      }
    } catch (error) {
      console.error('Erro ao atribuir lead:', error);
    }
  };

  // Handler existente preservado para compatibilidade
  const handleCreateOpportunity = (lead: LeadMaster) => {
    setOpportunityModal({
      isOpen: true,
      leadId: lead.id,
      leadName: `${lead.first_name} ${lead.last_name}`
    });
  };

  // Novo handler para LeadToOpportunityModal
  const handleCreateOpportunityWithNewModal = (lead: LeadMaster) => {
    setLeadToOpportunityModal({
      isOpen: true,
      lead: lead
    });
  };

  // Handler para visualizar lead completo
  const handleViewLeadDetails = (lead: LeadMaster) => {
    setLeadViewModal({
      isOpen: true,
      lead: lead
    });
  };

  // Handler para submissão do LeadToOpportunityModal
  const handleLeadToOpportunitySubmit = async (opportunityData: any) => {
    try {
      console.log('🚀 Iniciando criação de oportunidade:', {
        leadId: leadToOpportunityModal.lead?.id,
        pipelineId: opportunityData.pipeline_id,
        stageId: opportunityData.stage_id,
        responsavel: opportunityData.responsavel,
        user: user?.id,
        tenantId: user?.tenant_id
      });

      // Buscar primeiro estágio da pipeline selecionada
      const { data: stages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id, name, order_index')
        .eq('pipeline_id', opportunityData.pipeline_id)
        .order('order_index')
        .limit(1);

      if (stagesError) {
        console.error('❌ Erro ao buscar estágios:', stagesError);
        throw stagesError;
      }
      
      if (!stages || stages.length === 0) {
        throw new Error('Pipeline não possui estágios configurados');
      }

      const firstStage = stages[0];
      console.log('✅ Estágio encontrado:', firstStage);

      // Processar valor monetário
      const valorNumerico = opportunityData.valor 
        ? parseFloat(opportunityData.valor.replace(/[^\d,]/g, '').replace(',', '.'))
        : 0;

      // Verificar se tenant_id está presente
      if (!user?.tenant_id) {
        throw new Error('Tenant ID não encontrado. Faça login novamente.');
      }

      const insertData = {
        pipeline_id: opportunityData.pipeline_id,
        stage_id: opportunityData.stage_id || firstStage.id,
        assigned_to: opportunityData.responsavel, // Usar responsável selecionado
        created_by: user?.id,
        // tenant_id será preenchido automaticamente pelo trigger
        custom_data: {
          // Dados da oportunidade
          nome_oportunidade: opportunityData.nome_oportunidade,
          valor: valorNumerico.toString(),
          
          // Dados do lead (usar lead_data do modal)
          nome_lead: opportunityData.lead_data?.nome || `${leadToOpportunityModal.lead?.first_name} ${leadToOpportunityModal.lead?.last_name}`,
          email: opportunityData.lead_data?.email || leadToOpportunityModal.lead?.email,
          telefone: opportunityData.lead_data?.telefone || leadToOpportunityModal.lead?.phone,
          empresa: opportunityData.lead_data?.empresa || leadToOpportunityModal.lead?.company,
          cargo: opportunityData.lead_data?.cargo || leadToOpportunityModal.lead?.job_title,
          
          // Metadados
          lead_master_id: leadToOpportunityModal.lead?.id,
          source: 'Lead Master → Pipeline (LeadToOpportunityModal)',
          
          // Campos customizados se existirem
          ...opportunityData.custom_fields
        }
      };

      console.log('📋 Dados para inserção:', insertData);

      // Criar oportunidade na pipeline
      const { error: pipelineError } = await supabase
        .from('pipeline_leads')
        .insert(insertData);

      if (pipelineError) {
        console.error('❌ Erro ao inserir na pipeline_leads:', pipelineError);
        throw pipelineError;
      }

      console.log('✅ Oportunidade criada com sucesso!');

      // Mostrar mensagem de sucesso
      showSuccessToast(
        'Oportunidade criada com sucesso!',
        'A oportunidade foi adicionada à pipeline selecionada.'
      );

      // Atualizar status do lead
      if (leadToOpportunityModal.lead?.id) {
        const { error: updateError } = await supabase
          .from('leads_master')
          .update({ 
            status: 'converted',
            updated_at: new Date().toISOString()
          })
          .eq('id', leadToOpportunityModal.lead.id);

        if (updateError) {
          console.warn('⚠️ Erro ao atualizar status do lead:', updateError);
        } else {
          console.log('✅ Status do lead atualizado para converted');
        }
      }

      // Atualizar lista
      if (onLeadUpdate) {
        onLeadUpdate();
      }
      
      checkLeadsWithOpportunities();
      
      // Fechar modal
      setLeadToOpportunityModal({ isOpen: false, lead: null });
      
    } catch (error) {
      console.error('❌ Erro ao criar oportunidade via LeadToOpportunityModal:', error);
      
      // Mostrar erro mais específico
      let errorMessage = 'Erro ao criar oportunidade: ';
      if (error instanceof Error) {
        if (error.message.includes('JWT')) {
          errorMessage += 'Problema de autenticação. Faça login novamente.';
        } else if (error.message.includes('RLS')) {
          errorMessage += 'Problema de permissão. Contate o administrador.';
        } else if (error.message.includes('tenant')) {
          errorMessage += 'Problema com empresa/tenant. Contate o administrador.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Erro desconhecido.';
      }
      
      showErrorToast(
        'Erro ao criar oportunidade',
        errorMessage
      );
      throw error;
    }
  };

  const handleOpportunitySuccess = () => {
    if (onLeadUpdate) {
      onLeadUpdate();
    }
    checkLeadsWithOpportunities();
  };

  const getAssignedUserName = (assignedTo?: string) => {
    if (!assignedTo) return 'Não atribuído';
    const assignedUser = assignedUsers[assignedTo];
    if (!assignedUser) return 'Usuário não encontrado';
    return `${assignedUser.first_name} ${assignedUser.last_name}`;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Carregando leads...</p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead encontrado</h3>
        <p className="text-gray-500">
          Não foram encontrados leads com os filtros aplicados.
        </p>
      </div>
    );
  }

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin';

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telefone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário Atribuído
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criar Oportunidade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {localLeads.map((lead, index) => (
              <BlurFade key={lead.id} delay={index * 0.05}>
                <tr className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {lead.first_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {lead.first_name} {lead.last_name}
                        </div>
                        {/* Tag de status de oportunidade */}
                        <div className="mt-1">
                          <LeadStatusTag hasOpportunity={leadsWithOpportunities.has(lead.id)} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {lead.phone || 'Não informado'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <AssignmentDisplay
                      lead={lead}
                      assignedUserName={getAssignedUserName(lead.assigned_to)}
                      isAdmin={isAdmin}
                      onAssign={handleAssignLead}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Botão Criar Oportunidade - SEMPRE VISÍVEL */}
                    <button
                      onClick={() => handleCreateOpportunityWithNewModal(lead)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                      title="Criar oportunidade"
                    >
                      <Target size={14} />
                      Criar Oportunidade
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {/* Visualizar - sempre disponível - AGORA ABRE LeadViewModal */}
                      <button
                        onClick={() => handleViewLeadDetails(lead)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors hover:bg-blue-50"
                        title="Ver detalhes completos"
                      >
                        <Eye size={16} />
                      </button>
                      
                      {/* Excluir - apenas admin */}
                      {isAdmin && (
                        <button
                          onClick={() => onDeleteLead(lead.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              </BlurFade>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de criação de oportunidade - PRESERVADO para compatibilidade */}
      <CreateOpportunityModal
        isOpen={opportunityModal.isOpen}
        onClose={() => setOpportunityModal({ isOpen: false, leadId: '', leadName: '' })}
        leadId={opportunityModal.leadId}
        leadName={opportunityModal.leadName}
        onSuccess={handleOpportunitySuccess}
      />

      {/* Novo LeadToOpportunityModal */}
      {leadToOpportunityModal.isOpen && leadToOpportunityModal.lead && (
        <LeadToOpportunityModal
          leadData={leadToOpportunityModal.lead}
          isOpen={leadToOpportunityModal.isOpen}
          onClose={() => setLeadToOpportunityModal({ isOpen: false, lead: null })}
          onSubmit={handleLeadToOpportunitySubmit}
        />
      )}

      {/* Novo LeadViewModal */}
      {leadViewModal.isOpen && leadViewModal.lead && (
        <LeadViewModal
          leadData={leadViewModal.lead}
          isOpen={leadViewModal.isOpen}
          onClose={() => setLeadViewModal({ isOpen: false, lead: null })}
          onLeadUpdated={handleLeadUpdated}
        />
      )}
    </>
  );
};

export default LeadsListEnhanced; 