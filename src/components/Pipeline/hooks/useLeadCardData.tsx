import { useMemo, useRef } from 'react';
import React from 'react';
import { Lead } from '../../../types/Pipeline';
import { useTemperatureAPI } from '../../../hooks/useTemperatureAPI';
import { generateTemperatureBadge } from '../../../utils/temperatureUtils';
import { logLeadCard } from '../../../utils/optimizedLogger';
import { 
  Flame,
  Snowflake,
  Sun,
  Thermometer
} from 'lucide-react';

interface UseLeadCardDataProps {
  lead: Lead;
  pipelineId: string;
}

export const useLeadCardData = ({ lead, pipelineId }: UseLeadCardDataProps) => {
  // ✅ THROTTLING: Refs para controle de logs
  const loggedValuesRef = useRef(new Map<string, { value: any, time: number }>());
  
  // 🌡️ Hook para configuração de temperatura personalizada
  const { config: temperatureConfig } = useTemperatureAPI({ 
    pipelineId: pipelineId || lead.pipeline_id || '', 
    autoLoad: true 
  });

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

  // 🚀 MEMOIZAÇÃO DE TAG DE TEMPERATURA COM CONFIGURAÇÃO PERSONALIZADA
  const temperatureBadge = useMemo(() => {
    // Determinar nível de temperatura baseado no lead
    const temperatureLevel = lead.temperature_level || 'hot'; // fallback para 'hot' se não definido
    
    const badge = generateTemperatureBadge(temperatureLevel, temperatureConfig ?? null);
    
    // Converter ícones emoji para componentes React
    let iconComponent;
    switch (badge.icon) {
      case '🔥':
        iconComponent = <Flame className="h-3 w-3" />;
        break;
      case '🌡️':
        iconComponent = <Thermometer className="h-3 w-3" />;
        break;
      case '☀️':
        iconComponent = <Sun className="h-3 w-3" />;
        break;
      case '❄️':
        iconComponent = <Snowflake className="h-3 w-3" />;
        break;
      default:
        iconComponent = <Thermometer className="h-3 w-3" />;
    }
    
    return {
      ...badge,
      icon: iconComponent
    };
  }, [lead.temperature_level, temperatureConfig]);

  // ✨ OPTIMISTIC UPDATES: Identificar se é lead otimista
  const optimisticState = useMemo(() => ({
    isOptimistic: Boolean((lead as any).isOptimistic),
    isCreating: Boolean((lead as any).isCreating),
    tempId: (lead as any).tempId
  }), [lead]);

  return {
    ...leadData,
    temperatureBadge,
    optimisticState
  };
};

export default useLeadCardData;