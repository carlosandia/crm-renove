import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Trash2, Target, UserPlus, Edit2, Mail } from 'lucide-react';
import { BlurFade } from '../ui/blur-fade';
import LeadStatusTag from './LeadStatusTag';
import LeadAssignmentDropdown from './LeadAssignmentDropdown';
import CreateOpportunityModal from './CreateOpportunityModal';
import CreateOpportunityModalSimple from './CreateOpportunityModalSimple';
import LeadViewModal from './LeadViewModal';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../providers/AuthProvider';
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
  const [isAssigning, setIsAssigning] = useState(false);

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
        <LeadAssignmentDropdown
          currentAssignedTo={lead.assigned_to}
          onAssign={async (memberId) => {
            setIsAssigning(true);
            try {
              await onAssign(lead.id, memberId);
            } finally {
              setIsAssigning(false);
            }
          }}
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
            onAssign={async (memberId) => {
              setIsAssigning(true);
              try {
                await onAssign(lead.id, memberId);
                setShowDropdown(false);
              } finally {
                setIsAssigning(false);
              }
            }}
            className="absolute top-0 left-0 z-50"
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

  // Estado para o novo modal simplificado
  const [createOpportunitySimpleModal, setCreateOpportunitySimpleModal] = useState<{
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

  // Handler para o novo modal simplificado
  const handleCreateOpportunityWithNewModal = (lead: LeadMaster) => {
    setCreateOpportunitySimpleModal({
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

  // Handler para submissão do novo modal simplificado
  const handleCreateOpportunitySimpleSubmit = async (opportunityData: any) => {
    try {
      console.log('🚀 Iniciando criação de oportunidade via modal simplificado:', {
        leadId: createOpportunitySimpleModal.lead?.id,
        pipelineId: opportunityData.pipeline_id,
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
        stage_id: firstStage.id,
        assigned_to: opportunityData.responsavel,
        created_by: user?.id,
        updated_by: user?.id,  // Incluir updated_by obrigatório
        tenant_id: user?.tenant_id,  // Incluir tenant_id explicitamente
        custom_data: {
          // Dados da oportunidade
          nome_oportunidade: opportunityData.nome_oportunidade,
          valor: valorNumerico.toString(),
          
          // Dados do lead
          nome_lead: opportunityData.lead_data?.nome || `${createOpportunitySimpleModal.lead?.first_name} ${createOpportunitySimpleModal.lead?.last_name}`,
          email: opportunityData.lead_data?.email || createOpportunitySimpleModal.lead?.email,
          telefone: opportunityData.lead_data?.telefone || createOpportunitySimpleModal.lead?.phone,
          empresa: opportunityData.lead_data?.empresa || createOpportunitySimpleModal.lead?.company,
          
          // Metadados
          lead_master_id: createOpportunitySimpleModal.lead?.id,
          source: 'Lead Master → Pipeline (CreateOpportunityModalSimple)'
        }
      };

      console.log('📋 Dados para inserção:', insertData);

      // Criar oportunidade na pipeline
      const { data: insertResult, error: pipelineError } = await supabase
        .from('pipeline_leads')
        .insert(insertData)
        .select('id, custom_data->>"nome_oportunidade" as nome');

      if (pipelineError) {
        console.error('❌ Erro ao inserir na pipeline_leads:', pipelineError);
        console.error('💥 Detalhes do erro:', {
          message: pipelineError.message,
          details: pipelineError.details,
          hint: pipelineError.hint,
          code: pipelineError.code
        });
        throw pipelineError;
      }

      console.log('✅ Oportunidade criada com sucesso!', insertResult);

      // Mostrar mensagem de sucesso
      showSuccessToast(
        'Oportunidade criada com sucesso!',
        'A oportunidade foi adicionada à pipeline selecionada.'
      );

      // Atualizar status do lead
      if (createOpportunitySimpleModal.lead?.id) {
        const { error: updateError } = await supabase
          .from('leads_master')
          .update({ 
            status: 'converted',
            updated_at: new Date().toISOString()
          })
          .eq('id', createOpportunitySimpleModal.lead.id);

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
      setCreateOpportunitySimpleModal({ isOpen: false, lead: null });
      
    } catch (error) {
      console.error('❌ Erro ao criar oportunidade via CreateOpportunityModalSimple:', error);
      
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
      <div className="overflow-x-auto max-w-full">
        <table className="w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[22%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="w-[15%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telefone
              </th>
              <th className="w-[25%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="w-[20%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário Atribuído
              </th>
              <th className="w-[15%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criar Oportunidade
              </th>
              <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {localLeads.map((lead, index) => (
              <BlurFade 
                key={lead.id} 
                delay={index * 0.05} 
                as="tr"
                className="hover:bg-gray-50 transition-colors duration-200"
              >
                  <td className="w-[22%] px-4 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {lead.first_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 overflow-hidden">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {lead.first_name} {lead.last_name}
                        </div>
                        {/* Tag de status de oportunidade */}
                        <div className="mt-1">
                          <LeadStatusTag hasOpportunity={leadsWithOpportunities.has(lead.id)} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="w-[15%] px-4 py-4">
                    <div className="text-sm text-gray-900 truncate">
                      {lead.phone || 'Não informado'}
                    </div>
                  </td>
                  <td className="w-[25%] px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                      <div className="text-sm text-gray-900 truncate" title={lead.email}>
                        {lead.email}
                      </div>
                    </div>
                  </td>
                  <td className="w-[20%] px-4 py-4">
                    <AssignmentDisplay
                      lead={lead}
                      assignedUserName={getAssignedUserName(lead.assigned_to)}
                      isAdmin={isAdmin}
                      onAssign={handleAssignLead}
                    />
                  </td>
                  <td className="w-[15%] px-2 py-4">
                    {/* Botão Criar Oportunidade - SEMPRE VISÍVEL */}
                    <button
                      onClick={() => handleCreateOpportunityWithNewModal(lead)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-1 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 justify-center min-w-0"
                      title="Criar oportunidade"
                    >
                      <Target size={12} />
                      <span className="hidden lg:inline whitespace-nowrap">Criar Oportunidade</span>
                      <span className="lg:hidden">Oportunidade</span>
                    </button>
                  </td>
                  <td className="w-[8%] px-2 py-4 text-sm font-medium">
                    <div className="flex items-center justify-center space-x-1">
                      {/* Visualizar - sempre disponível - AGORA ABRE LeadViewModal */}
                      <button
                        onClick={() => handleViewLeadDetails(lead)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors hover:bg-blue-50"
                        title="Ver detalhes completos"
                      >
                        <Eye size={14} />
                      </button>
                      
                      {/* Excluir - apenas admin */}
                      {isAdmin && (
                        <button
                          onClick={() => onDeleteLead(lead.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
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

      {/* Novo CreateOpportunityModalSimple */}
      {createOpportunitySimpleModal.isOpen && createOpportunitySimpleModal.lead && (
        <CreateOpportunityModalSimple
          leadData={createOpportunitySimpleModal.lead}
          isOpen={createOpportunitySimpleModal.isOpen}
          onClose={() => setCreateOpportunitySimpleModal({ isOpen: false, lead: null })}
          onSubmit={handleCreateOpportunitySimpleSubmit}
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