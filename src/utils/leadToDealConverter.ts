import { Lead } from '../types/Pipeline';
import { Deal } from '../types/deals';

/**
 * Converte um Lead para o formato Deal para uso no DealDetailsModal
 */
export const convertLeadToDeal = (lead: Lead): Deal => {
  const leadData = lead.custom_data || {};
  
  return {
    id: lead.id,
    deal_name: leadData.nome_lead || leadData.nome_oportunidade || leadData.titulo || 'Lead sem nome',
    company_name: leadData.empresa || leadData.company || undefined,
    contact_name: leadData.nome_lead || leadData.nome_contato || leadData.contato || undefined,
    pipeline_id: lead.pipeline_id,
    stage_id: lead.stage_id,
    amount: leadData.valor ? Number(leadData.valor) : undefined,
    currency: 'BRL',
    close_date: leadData.data_fechamento || leadData.close_date || undefined,
    probability: leadData.probabilidade || leadData.probability || undefined,
    status: lead.status === 'ganho' ? 'won' : lead.status === 'perdido' ? 'lost' : 'open',
    owner_id: lead.assigned_to || lead.created_by || undefined,
    owner_name: leadData.vendedor || leadData.responsavel || undefined,
    description: leadData.descricao || leadData.description || leadData.observacoes || undefined,
    next_step: leadData.proxima_acao || leadData.next_step || undefined,
    last_activity_date: lead.updated_at,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    created_by: lead.created_by,
    company_id: leadData.empresa_id || leadData.company_id || '',
    
    // Campos adicionais
    source: leadData.origem || leadData.source || leadData.traffic_source || undefined,
    campaign_id: leadData.campaign_id || undefined,
    lost_reason: leadData.motivo_perda || leadData.lost_reason || undefined,
    won_reason: leadData.motivo_ganho || leadData.won_reason || undefined,
    forecast_category: 'pipeline' as const,
    expected_revenue: leadData.valor ? Number(leadData.valor) : undefined,
    weighted_amount: leadData.valor && leadData.probabilidade 
      ? Number(leadData.valor) * (Number(leadData.probabilidade) / 100)
      : undefined
  };
}; 