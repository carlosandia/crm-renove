/**
 * Utilitários para verificar se um lead tem oportunidade registrada
 * Garante consistência entre filtros e exibição de tags
 */

// Interface mínima necessária para as funções utilitárias
export interface LeadForOpportunityCheck {
  id: string;
  status?: string;
  pipeline_leads_count?: number;
  estimated_value?: number;
  valor?: number;
}

/**
 * Verifica se um lead tem oportunidade baseado na lógica unificada
 * Esta função garante que tanto os filtros quanto as tags usem o mesmo critério
 * 
 * @param lead - Dados do lead
 * @param leadsWithOpportunities - Set com IDs de leads que têm oportunidades
 * @returns true se o lead tem oportunidade, false caso contrário
 */
export const hasLeadOpportunity = (lead: LeadForOpportunityCheck, leadsWithOpportunities: Set<string>): boolean => {
  return leadsWithOpportunities.has(lead.id);
};

/**
 * Verifica se um lead deve mostrar a tag "Nunca registrou oportunidade"
 * Tag aparece apenas para leads que nunca registraram oportunidade
 * 
 * @param lead - Dados do lead
 * @param leadsWithOpportunities - Set com IDs de leads que têm oportunidades
 * @returns true se deve mostrar a tag, false caso contrário
 */
export const shouldShowNeverRegisteredTag = (lead: LeadForOpportunityCheck, leadsWithOpportunities: Set<string>): boolean => {
  return !hasLeadOpportunity(lead, leadsWithOpportunities);
};

/**
 * Filtra leads que nunca registraram oportunidade
 * Para usar no filtro "Sem Oportunidade"
 * 
 * @param leads - Lista de leads
 * @param leadsWithOpportunities - Set com IDs de leads que têm oportunidades
 * @returns Lista filtrada de leads sem oportunidade
 */
export const filterLeadsWithoutOpportunity = <T extends LeadForOpportunityCheck>(leads: T[], leadsWithOpportunities: Set<string>): T[] => {
  return leads.filter(lead => !hasLeadOpportunity(lead, leadsWithOpportunities));
};

/**
 * Conta quantos leads nunca registraram oportunidade
 * Para usar nos contadores dos filtros
 * 
 * @param leads - Lista de leads
 * @param leadsWithOpportunities - Set com IDs de leads que têm oportunidades
 * @returns Número de leads sem oportunidade
 */
export const countLeadsWithoutOpportunity = <T extends LeadForOpportunityCheck>(leads: T[], leadsWithOpportunities: Set<string>): number => {
  return filterLeadsWithoutOpportunity(leads, leadsWithOpportunities).length;
};