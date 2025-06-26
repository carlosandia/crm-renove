import React, { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Phone, Mail, Building, Thermometer, Target } from 'lucide-react';
import { BlurFade } from '../ui/blur-fade';
import LeadStatusTag from './LeadStatusTag';
import LeadAssignmentDropdown from './LeadAssignmentDropdown';
import CreateOpportunityModal from './CreateOpportunityModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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

const LeadsList: React.FC<LeadsListProps> = ({
  leads,
  loading,
  onViewDetails,
  onEditLead,
  onDeleteLead,
  currentUserRole,
  onLeadUpdate
}) => {
  const { user } = useAuth();
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

  // Verificar quais leads já têm oportunidades
  useEffect(() => {
    if (leads.length > 0) {
      checkLeadsWithOpportunities();
    }
  }, [leads]);

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
      pipelineLeads?.forEach(pipelineLead => {
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

  const handleCreateOpportunity = (lead: LeadMaster) => {
    setOpportunityModal({
      isOpen: true,
      leadId: lead.id,
      leadName: `${lead.first_name} ${lead.last_name}`
    });
  };

  const handleOpportunitySuccess = () => {
    if (onLeadUpdate) {
      onLeadUpdate();
    }
    checkLeadsWithOpportunities();
  };

  const getTemperatureBadge = (temperature?: string) => {
    const colors = {
      hot: 'bg-red-100 text-red-800 border-red-200',
      warm: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cold: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    const labels = {
      hot: 'Quente',
      warm: 'Morno',
      cold: 'Frio'
    };

    const color = colors[temperature as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
    const label = labels[temperature as keyof typeof labels] || temperature || 'Não definido';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
        <Thermometer size={12} className="mr-1" />
        {label}
      </span>
    );
  };

  const getStatusBadge = (status?: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      converted: 'bg-purple-100 text-purple-800',
      lost: 'bg-red-100 text-red-800'
    };

    const labels = {
      active: 'Ativo',
      converted: 'Convertido',
      lost: 'Perdido'
    };

    const color = colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    const label = labels[status as keyof typeof labels] || status || 'Ativo';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Lead
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contato
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Temperatura
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valor Est.
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Criado em
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leads.map((lead, index) => (
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
                      {lead.company && (
                        <div className="text-sm text-gray-500">
                          {lead.company}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-900">
                      {lead.email}
                    </div>
                    {lead.phone && (
                      <div className="text-sm text-gray-500">
                        {lead.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(lead.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getTemperatureBadge(lead.lead_temperature)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(lead.estimated_value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(lead.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => onViewDetails(lead)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors hover:bg-blue-50"
                    title="Ver detalhes"
                  >
                    <Eye size={16} />
                  </button>
                  
                  {(currentUserRole === 'admin' || currentUserRole === 'super_admin') && (
                    <>
                      <button
                        onClick={() => onEditLead(lead)}
                        className="text-green-600 hover:text-green-900 p-1 rounded transition-colors hover:bg-green-50"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteLead(lead.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded transition-colors hover:bg-red-50"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            </BlurFade>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeadsList;
