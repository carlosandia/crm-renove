import { useState, useEffect, useMemo, useCallback } from 'react';
import { Lead, PipelineStage } from '../types/Pipeline';

interface StageMetrics {
  stageId: string;
  stageName: string;
  leadsCount: number;
  totalValue: number;
  avgTimeInStage: number;
  conversionRate: number;
}

interface PipelineMetrics {
  totalLeads: number;
  totalRevenue: number; // Receita total de leads ganhos
  closedDeals: number; // Negócios fechados (leads ganhos)
  conversionRate: number; // Taxa de conversão para ganho
  averageTicket: number; // Ticket médio dos ganhos
  averageCycleTime: number; // Ciclo médio em dias
  averageCycleTimeFormatted: string;
  stageMetrics: StageMetrics[];
  loading: boolean;
}

export const usePipelineMetrics = (
  leads: Lead[],
  stages: PipelineStage[],
  pipelineId?: string
): PipelineMetrics => {
  const [loading, setLoading] = useState(false);

  // Memoizar funções auxiliares para evitar recriações
  const calculateAverageCycleTime = useCallback((wonLeads: Lead[], stages: PipelineStage[]): number => {
    if (wonLeads.length === 0) return 0;

    const cycleTimes = wonLeads.map(lead => {
      const createdAt = new Date(lead.created_at);
      const movedAt = lead.moved_at ? new Date(lead.moved_at) : new Date();
      const diffInDays = Math.floor((movedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return diffInDays;
    });

    const totalCycleTime = cycleTimes.reduce((sum, time) => sum + time, 0);
    return totalCycleTime / cycleTimes.length;
  }, []);

  const calculateAvgTimeInStage = useCallback((stageLeads: Lead[]): number => {
    if (stageLeads.length === 0) return 0;

    const times = stageLeads.map(lead => {
      const movedAt = lead.moved_at ? new Date(lead.moved_at) : new Date(lead.created_at);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - movedAt.getTime()) / (1000 * 60 * 60));
      return diffInHours;
    });

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    return totalTime / times.length;
  }, []);

  const formatTime = useCallback((days: number): string => {
    if (days === 0) return '0 dias';
    if (days < 1) return 'Menos de 1 dia';
    return `${Math.round(days)} dias`;
  }, []);

  // Usar useMemo para calcular métricas apenas quando dependências mudarem
  const metrics = useMemo(() => {
    // Evitar cálculos se não há dados essenciais
    if (!leads || !stages || leads.length === 0 || stages.length === 0) {
      return {
        totalLeads: 0,
        totalRevenue: 0,
        closedDeals: 0,
        conversionRate: 0,
        averageTicket: 0,
        averageCycleTime: 0,
        averageCycleTimeFormatted: '0 dias',
        stageMetrics: [],
        loading: false,
      };
    }

    try {
      setLoading(true);

      // Identificar etapas de ganho e perdido pelas etapas fixas
      const winStages = stages.filter(stage => 
        stage.name.toLowerCase().includes('ganho') ||
        stage.name.toLowerCase().includes('fechado') ||
        stage.name.toLowerCase().includes('won') ||
        stage.name.toLowerCase().includes('vendido') ||
        stage.is_system_stage === true && stage.name.toLowerCase() === 'ganho'
      );

      const lostStages = stages.filter(stage =>
        stage.name.toLowerCase().includes('perdido') ||
        stage.name.toLowerCase().includes('lost') ||
        stage.is_system_stage === true && stage.name.toLowerCase() === 'perdido'
      );

      // Leads ganhos (na etapa de ganho)
      const wonLeads = leads.filter(lead => 
        winStages.some(stage => stage.id === lead.stage_id)
      );

      // Leads perdidos (na etapa de perdido)
      const lostLeads = leads.filter(lead =>
        lostStages.some(stage => stage.id === lead.stage_id)
      );

      // Calcular receita total dos ganhos
      const totalRevenue = wonLeads.reduce((sum, lead) => {
        const value = lead.custom_data?.valor || 0;
        const numValue = typeof value === 'string' ? 
          parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) : value;
        return sum + (isNaN(numValue) ? 0 : numValue);
      }, 0);

      // Ticket médio dos ganhos
      const averageTicket = wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;

      // Taxa de conversão (leads ganhos / total de leads ativos)
      const activeLeads = leads.filter(lead => !lostLeads.some(lost => lost.id === lead.id));
      const conversionRate = activeLeads.length > 0 ? (wonLeads.length / activeLeads.length) * 100 : 0;

      // Calcular ciclo médio (tempo médio do primeiro estágio até ganho)
      const avgCycleTime = calculateAverageCycleTime(wonLeads, stages);

      // Métricas por etapa
      const stageMetrics: StageMetrics[] = stages.map(stage => {
        const stageLeads = leads.filter(lead => lead.stage_id === stage.id);
        const stageValue = stageLeads.reduce((sum, lead) => {
          const value = lead.custom_data?.valor || 0;
          const numValue = typeof value === 'string' ? 
            parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) : value;
          return sum + (isNaN(numValue) ? 0 : numValue);
        }, 0);

        return {
          stageId: stage.id,
          stageName: stage.name,
          leadsCount: stageLeads.length,
          totalValue: stageValue,
          avgTimeInStage: calculateAvgTimeInStage(stageLeads),
          conversionRate: leads.length > 0 ? (stageLeads.length / leads.length) * 100 : 0
        };
      });

      const result = {
        totalLeads: leads.length,
        totalRevenue,
        closedDeals: wonLeads.length,
        conversionRate,
        averageTicket,
        averageCycleTime: avgCycleTime,
        averageCycleTimeFormatted: formatTime(avgCycleTime),
        stageMetrics,
        loading: false,
      };

      setLoading(false);
      return result;

    } catch (error) {
      console.error('Erro ao calcular métricas:', error);
      setLoading(false);
      return {
        totalLeads: 0,
        totalRevenue: 0,
        closedDeals: 0,
        conversionRate: 0,
        averageTicket: 0,
        averageCycleTime: 0,
        averageCycleTimeFormatted: '0 dias',
        stageMetrics: [],
        loading: false,
      };
    }
  }, [leads, stages, pipelineId, calculateAverageCycleTime, calculateAvgTimeInStage, formatTime]);

  return { ...metrics, loading };
}; 