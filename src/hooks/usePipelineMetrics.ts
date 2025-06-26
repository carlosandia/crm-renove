import { useState, useEffect, useMemo, useCallback } from 'react';
import { Lead, PipelineStage } from '../types/Pipeline';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

// Sistema de logs condicionais
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'warn';
const isDebugMode = LOG_LEVEL === 'debug';

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Identificar etapas de ganho e perdido pelas etapas fixas (compatibilidade com ambas nomenclaturas)
      const winStages = stages.filter(stage => 
        stage.name.toLowerCase().includes('ganho') ||
        stage.name.toLowerCase().includes('fechado') ||
        stage.name.toLowerCase().includes('won') ||
        stage.name.toLowerCase().includes('vendido') ||
        stage.name.toLowerCase() === 'closed won' ||
        (stage.is_system_stage === true && (
          stage.name.toLowerCase() === 'ganho' || 
          stage.name.toLowerCase() === 'closed won'
        ))
      );

      const lostStages = stages.filter(stage =>
        stage.name.toLowerCase().includes('perdido') ||
        stage.name.toLowerCase().includes('lost') ||
        stage.name.toLowerCase() === 'closed lost' ||
        (stage.is_system_stage === true && (
          stage.name.toLowerCase() === 'perdido' ||
          stage.name.toLowerCase() === 'closed lost'
        ))
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
  }, [leads, stages, calculateAverageCycleTime, calculateAvgTimeInStage, formatTime]);

  return { ...metrics, loading };
};

interface SimplePipelineMetrics {
  totalLeads: number;
  totalValue: number;
  conversionRate: number;
  averageTicket: number;
  stageMetrics: {
    [stageId: string]: {
      count: number;
      value: number;
      conversionRate: number;
    };
  };
}

export function usePipelineMetricsNew(pipelineId?: string) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SimplePipelineMetrics>({
    totalLeads: 0,
    totalValue: 0,
    conversionRate: 0,
    averageTicket: 0,
    stageMetrics: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!user || !pipelineId) {
      if (isDebugMode) {
        console.log('📊 Métricas: Aguardando user/pipeline');
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startTime = performance.now();

      // Buscar leads da pipeline
      const { data: leads, error: leadsError } = await supabase
        .from('pipeline_leads')
        .select(`
          *,
          pipeline_stages!inner(
            id,
            name,
            position,
            pipeline_id
          )
        `)
        .eq('pipeline_stages.pipeline_id', pipelineId);

      if (leadsError) {
        throw leadsError;
      }

      // Calcular métricas
      const totalLeads = leads?.length || 0;
      const totalValue = leads?.reduce((sum, lead) => sum + (lead.value || 0), 0) || 0;
      const averageTicket = totalLeads > 0 ? totalValue / totalLeads : 0;

      // Métricas por estágio
      const stageMetrics: { [stageId: string]: any } = {};
      
      leads?.forEach(lead => {
        const stageId = lead.stage_id;
        if (!stageMetrics[stageId]) {
          stageMetrics[stageId] = {
            count: 0,
            value: 0,
            conversionRate: 0
          };
        }
        stageMetrics[stageId].count++;
        stageMetrics[stageId].value += lead.value || 0;
      });

      // Calcular taxa de conversão (simplificada)
      const conversionRate = totalLeads > 0 ? 
        ((stageMetrics['won']?.count || 0) / totalLeads) * 100 : 0;

      const newMetrics = {
        totalLeads,
        totalValue,
        conversionRate,
        averageTicket,
        stageMetrics
      };

      setMetrics(newMetrics);

      const duration = performance.now() - startTime;
      
      // Log apenas se lento ou em modo debug
      if (duration > 300 || isDebugMode) {
        const logLevel = duration > 1000 ? 'warn' : 'log';
        console[logLevel](`📊 Métricas calculadas: ${duration.toFixed(2)}ms (${totalLeads} leads)`);
      }

    } catch (err: any) {
      console.error('❌ Erro ao buscar métricas:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, pipelineId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Função para atualizar métricas sem logs excessivos
  const refreshMetrics = useCallback(() => {
    if (isDebugMode) {
      console.log('🔄 Atualizando métricas...');
    }
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refreshMetrics
  };
} 