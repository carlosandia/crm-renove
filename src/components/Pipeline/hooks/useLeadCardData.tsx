import { useMemo, useRef } from 'react';
import React from 'react';
import { Lead } from '../../../types/Pipeline';
import { logLeadCard } from '../../../utils/optimizedLogger';
import { useQualificationEvaluation } from '../../../hooks/useQualificationEvaluation';
import { 
  Star,
  Trophy,
  User,
  Clock
} from 'lucide-react';

interface UseLeadCardDataProps {
  lead: Lead;
  pipelineId: string;
}

export const useLeadCardData = ({ lead, pipelineId }: UseLeadCardDataProps) => {
  // ✅ THROTTLING: Refs para controle de logs
  const loggedValuesRef = useRef(new Map<string, { value: any, time: number }>());
  
  // 🎯 Hook para avaliação de qualificação (Lead/MQL/SQL)
  const qualificationEvaluation = useQualificationEvaluation(
    pipelineId || lead.pipeline_id || '', 
    lead
  );

  // Função para calcular dias totais do card (desde criação)
  const getDaysInCard = (lead: Lead): number => {
    const now = new Date();
    const createDate = new Date(lead.created_at);
    const diffTime = Math.abs(now.getTime() - createDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // ✅ MEMOIZAÇÃO OTIMIZADA: Dados do lead processados com dependências específicas
  const leadData = useMemo(() => {
    // 🔧 CORREÇÃO CRÍTICA: Separar completamente lógicas de oportunidade vs lead
    // PROBLEMA IDENTIFICADO: Ambos usavam custom_data.nome como fallback
    
    // ✅ OPPORTUNITY NAME: Priorizar campos específicos de oportunidade/negócio
    const opportunityName = lead.custom_data?.nome_oportunidade || 
      lead.custom_data?.titulo || 
      lead.custom_data?.nome ||  // ✅ RESTAURADO: necessário para registros que só têm este campo
      `Oportunidade #${lead.id?.substring(0, 8) || 'nova'}`;
    
    // ✅ LEAD NAME: Priorizar dados reais da pessoa/empresa do leads_master
    const leadName = lead.first_name ? 
      `${lead.first_name} ${lead.last_name || ''}`.trim() : 
      lead.custom_data?.nome_lead || 
      lead.custom_data?.empresa ||  // ✅ USAR: empresa como fallback para lead
      lead.email?.split('@')[0] ||   // ✅ USAR: username do email como último recurso
      'Lead sem nome';
    
    const leadEmail = lead.email || lead.custom_data?.email || '';
    const leadPhone = lead.phone || lead.custom_data?.telefone || '';
    const leadCompany = lead.company || lead.custom_data?.empresa || '';
    
    // ✅ CORREÇÃO VALOR: Melhor tratamento de tipos para valor com logging
    const rawValue = lead.custom_data?.valor || lead.estimated_value || 0;
    const leadValue = typeof rawValue === 'string' ? parseFloat(rawValue) || 0 : Number(rawValue) || 0;
    
    // ✅ OPTIMIZED LOGGING: Logger centralizado com batch e deduplicação
    if (process.env.NODE_ENV === 'development') {
      const leadId = lead.id?.substring(0, 8) || 'unknown';
      const currentTime = Date.now();
      const lastLog = loggedValuesRef.current.get(leadId);
      const valueChanged = !lastLog || lastLog.value !== leadValue;
      const timeExpired = !lastLog || currentTime - lastLog.time > 10000;
      
      if (valueChanged || timeExpired) {
        logLeadCard(`Valor processado - ${leadId}`, {
          leadId,
          leadValue,
          leadValue_type: typeof leadValue,
          change_reason: valueChanged ? 'value_changed' : 'time_expired'
        });
        loggedValuesRef.current.set(leadId, { value: leadValue, time: currentTime });
      }
    }
    const daysInCard = getDaysInCard(lead);

    return {
      opportunityName,
      leadName,
      leadEmail,
      leadPhone,
      leadCompany,
      leadValue,
      daysInCard
    };
  }, [
    // ✅ DEPENDÊNCIAS ESPECÍFICAS: Só recalcular quando campos relevantes mudarem
    lead.id,
    lead.custom_data?.nome_oportunidade,
    lead.custom_data?.titulo, 
    lead.custom_data?.nome,  // ✅ RESTAURADO: usado para opportunityName
    lead.first_name,
    lead.last_name,
    lead.email,
    lead.custom_data?.email,
    lead.custom_data?.nome_lead,  // ✅ ADICIONADO: usado para leadName
    lead.phone,
    lead.custom_data?.telefone,
    lead.company,
    lead.custom_data?.empresa,
    lead.custom_data?.valor,
    lead.estimated_value,
    lead.created_at
  ]);

  // 🚀 MEMOIZAÇÃO DO BADGE DE QUALIFICAÇÃO (Lead/MQL/SQL)
  const qualificationBadge = useMemo(() => {
    const evaluation = qualificationEvaluation.data;
    const isLoading = qualificationEvaluation.isLoading;
    
    if (isLoading) {
      return {
        label: 'Avaliando...',
        color: 'bg-gray-100 text-gray-600 border-gray-300',
        icon: <Clock className="w-3 h-3 animate-spin" />,
        tooltip: 'Avaliando qualificação com base nas regras configuradas...'
      };
    }
    
    if (!evaluation) {
      return {
        label: 'Lead',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <User className="w-3 h-3" />,
        tooltip: 'Lead sem avaliação de qualificação'
      };
    }

    switch (evaluation.qualification_level) {
      case 'MQL':
        return {
          label: 'MQL',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: <Star className="w-3 h-3" />,
          tooltip: `Marketing Qualified Lead (Score: ${evaluation.score}) - ${evaluation.reasoning}`
        };
      case 'SQL':
        return {
          label: 'SQL',
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: <Trophy className="w-3 h-3" />,
          tooltip: `Sales Qualified Lead (Score: ${evaluation.score}) - ${evaluation.reasoning}`
        };
      case 'Hot':
      case 'Warm':
      case 'Cold':
      case 'Lead':
      default:
        return {
          label: 'Lead',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <User className="w-3 h-3" />,
          tooltip: evaluation.reasoning || 'Lead sem qualificação específica'
        };
    }
  }, [qualificationEvaluation.data, qualificationEvaluation.isLoading]);

  // ✨ OPTIMISTIC UPDATES: Identificar se é lead otimista
  const optimisticState = useMemo(() => ({
    isOptimistic: Boolean((lead as any).isOptimistic),
    isCreating: Boolean((lead as any).isCreating),
    tempId: (lead as any).tempId
  }), [lead]);

  return {
    ...leadData,
    qualificationBadge,
    optimisticState
  };
};

export default useLeadCardData;