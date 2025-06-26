import React from 'react';
import PipelineLeadDetailsModal from '../Pipeline/LeadDetailsModal';
import { convertLeadToLeadMaster, LeadMaster } from '../../utils/leadToLeadMasterConverter';
import { Lead } from '../../types/Pipeline';

interface LeadDetailsModalProps {
  lead: LeadMaster;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (lead: LeadMaster) => void;
  onLeadUpdated?: (updatedLead: LeadMaster) => void;
}

/**
 * Wrapper do LeadDetailsModal completo para manter compatibilidade
 * com módulos que usam a interface LeadMaster
 */
const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  lead,
  isOpen,
  onClose,
  onEdit,
  onLeadUpdated
}) => {
  // Converter LeadMaster de volta para Lead (formato simplificado)
  const convertedLead: Lead = {
    id: lead.id,
    pipeline_id: '', // Não usado neste contexto
    stage_id: '', // Não usado neste contexto
    custom_data: {
      nome_lead: `${lead.first_name} ${lead.last_name}`,
      email: lead.email,
      telefone: lead.phone,
      empresa: lead.company,
      cargo: lead.job_title,
      valor: lead.estimated_value?.toString(),
      origem: lead.lead_source,
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
      score: lead.lead_score?.toString(),
      probabilidade: lead.probability?.toString()
    },
    temperature_level: (lead.lead_temperature as 'warm' | 'hot' | 'cold' | 'frozen') || 'warm',
    status: lead.status === 'converted' ? 'won' : lead.status === 'lost' ? 'lost' : 'active',
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    assigned_to: lead.assigned_to,
    created_by: lead.created_by,
    moved_at: lead.updated_at
  };

  const handleUpdate = (leadId: string, updatedData: any) => {
    console.log('📡 [LeadDetailsModal Wrapper] Lead atualizado via wrapper:', leadId, updatedData);
    
    // Converter de volta para LeadMaster
    const updatedLeadMaster: LeadMaster = {
      ...lead,
      ...updatedData,
      updated_at: new Date().toISOString()
    };
    
    // Chamar callback de edição (para compatibilidade)
    onEdit(updatedLeadMaster);
    
    // ✅ Chamar callback de atualização para sincronização
    if (onLeadUpdated) {
      console.log('📡 [LeadDetailsModal Wrapper] Chamando onLeadUpdated para sincronização');
      onLeadUpdated(updatedLeadMaster);
    }
  };

  return (
    <PipelineLeadDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      lead={convertedLead}
      customFields={[]} // Campos customizados não são usados neste contexto
      onUpdate={handleUpdate}
    />
  );
};

export default LeadDetailsModal; 