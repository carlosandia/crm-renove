import { Lead } from '../types/Pipeline';

// Interface LeadMaster baseada no LeadDetailsModal
interface LeadMaster {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_temperature?: string;
  status?: string;
  lead_source?: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  assigned_to?: string;
  estimated_value?: number;
  created_by: string;
  last_contact_date?: string;
  next_action_date?: string;
  lead_score?: number;
  probability?: number;
  campaign_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/**
 * Converte um Lead para o formato LeadMaster para uso no LeadDetailsModal
 */
export const convertLeadToLeadMaster = (lead: Lead): LeadMaster => {
  const leadData = lead.custom_data || {};
  
  // Extrair nome e sobrenome
  const fullName = leadData.nome_lead || leadData.nome_contato || leadData.contato || leadData.nome || 'Lead sem nome';
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || 'Lead';
  const lastName = nameParts.slice(1).join(' ') || 'sem nome';
  
  return {
    id: lead.id,
    first_name: firstName,
    last_name: lastName,
    email: leadData.email || 'email@nao-informado.com',
    phone: leadData.telefone || leadData.phone || undefined,
    company: leadData.empresa || leadData.company || undefined,
    job_title: leadData.cargo || leadData.job_title || undefined,
    lead_temperature: lead.temperature_level || leadData.temperatura || leadData.lead_temperature || 'warm',
    status: lead.status === 'won' ? 'converted' : lead.status === 'lost' ? 'lost' : 'active',
    lead_source: leadData.origem || leadData.source || leadData.traffic_source || leadData.lead_source || undefined,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    tenant_id: leadData.empresa_id || leadData.company_id || '',
    assigned_to: lead.assigned_to || undefined,
    estimated_value: leadData.valor ? Number(leadData.valor) : undefined,
    created_by: lead.created_by || '',
    last_contact_date: leadData.ultimo_contato || leadData.last_contact_date || undefined,
    next_action_date: leadData.proxima_acao_data || leadData.next_action_date || undefined,
    lead_score: leadData.score || leadData.lead_score ? Number(leadData.score || leadData.lead_score) : undefined,
    probability: leadData.probabilidade || leadData.probability ? Number(leadData.probabilidade || leadData.probability) : undefined,
    campaign_name: leadData.campanha || leadData.campaign_name || undefined,
    utm_source: leadData.utm_source || undefined,
    utm_medium: leadData.utm_medium || undefined,
    utm_campaign: leadData.utm_campaign || undefined
  };
};

export type { LeadMaster }; 