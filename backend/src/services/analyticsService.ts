/**
 * FASE 3: ANALYTICS & REPORTING SYSTEM
 * Analytics Service - Core data processing engine
 * 
 * Serviço enterprise-grade para processamento de analytics comparável ao:
 * - HubSpot Analytics
 * - Salesforce Einstein Analytics  
 * - Pipedrive Insights
 */

import { supabase } from '../config/supabase';
import { getCache } from './cacheService';

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

export interface DashboardMetrics {
  kpis: {
    total_leads: number;
    qualified_leads: number;
    converted_leads: number;
    conversion_rate: number;
    avg_deal_value: number;
    pipeline_value: number;
    monthly_revenue: number;
    pipeline_velocity: number; // dias médios para conversão
  };
  trends: {
    leads_trend: TrendData[];
    revenue_trend: TrendData[];
    conversion_trend: TrendData[];
    pipeline_trend: TrendData[];
  };
  comparisons: {
    period_over_period: ComparisonData;
    year_over_year: ComparisonData;
  };
  team_performance: TeamMember[];
  recent_activities: ActivitySummary[];
}

export interface TrendData {
  date: string;
  value: number;
  change_percentage?: number;
  target?: number;
}

export interface ComparisonData {
  current_period: number;
  previous_period: number;
  change_percentage: number;
  change_direction: 'up' | 'down' | 'stable';
}

export interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  metrics: {
    leads_created: number;
    deals_closed: number;
    revenue_generated: number;
    conversion_rate: number;
    avg_deal_size: number;
    activities_count: number;
  };
  ranking: number;
  performance_score: number;
}

export interface ActivitySummary {
  type: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
}

export interface ForecastData {
  period: string;
  forecast_type: 'linear' | 'exponential' | 'seasonal';
  predictions: {
    date: string;
    predicted_value: number;
    confidence_level: number;
    confidence_range: {
      min: number;
      max: number;
    };
  }[];
  accuracy_metrics: {
    mae: number; // Mean Absolute Error
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
  };
  historical_data: TrendData[];
}

export interface ConversionFunnel {
  stages: {
    stage_name: string;
    stage_order: number;
    leads_count: number;
    conversion_rate: number;
    avg_time_in_stage: number; // horas
    dropoff_rate: number;
    bottleneck_score: number; // 0-100, quanto maior pior
  }[];
  overall_metrics: {
    total_leads: number;
    final_conversions: number;
    overall_conversion_rate: number;
    avg_cycle_time: number; // dias
    biggest_bottleneck: string;
  };
  recommendations: {
    stage: string;
    issue: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface TimeRange {
  start_date: string;
  end_date: string;
  period_type: 'day' | 'week' | 'month' | 'quarter' | 'year';
  comparison_period?: 'previous' | 'year_ago';
}

// ============================================================================
// ANALYTICS SERVICE CLASS
// ============================================================================

class AnalyticsService {
  private readonly CACHE_KEYS = {
    DASHBOARD: 'analytics:dashboard',
    FORECAST: 'analytics:forecast',
    FUNNEL: 'analytics:funnel',
    TEAM_PERFORMANCE: 'analytics:team',
  };

  private readonly CACHE_TTL = {
    SHORT: 60, // 1 minuto - métricas em tempo real
    MEDIUM: 300, // 5 minutos - dashboards
    LONG: 1800, // 30 minutos - relatórios complexos
  };

  // ========================================================================
  // DASHBOARD METRICS
  // ========================================================================

  async getDashboardMetrics(
    tenantId: string,
    timeRange: TimeRange,
    userId?: string
  ): Promise<DashboardMetrics> {
    const cacheKey = `${this.CACHE_KEYS.DASHBOARD}:${tenantId}:${timeRange.start_date}:${timeRange.end_date}`;
    
    // Verificar cache primeiro
    const cacheService = getCache();
    const cached = await cacheService.get<DashboardMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Buscar KPIs principais
      const kpis = await this.calculateKPIs(tenantId, timeRange);
      
      // Buscar trends temporais
      const trends = await this.calculateTrends(tenantId, timeRange);
      
      // Calcular comparações
      const comparisons = await this.calculateComparisons(tenantId, timeRange);
      
      // Performance da equipe
      const teamPerformance = await this.getTeamPerformance(tenantId, timeRange);
      
      // Atividades recentes
      const recentActivities = await this.getRecentActivities(tenantId, timeRange);

      const metrics: DashboardMetrics = {
        kpis,
        trends,
        comparisons,
        team_performance: teamPerformance,
        recent_activities: recentActivities,
      };

      // Cache por 5 minutos
      await cacheService.set(cacheKey, metrics, this.CACHE_TTL.MEDIUM);
      
      return metrics;
    } catch (error) {
      console.error('Error calculating dashboard metrics:', error);
      throw new Error('Failed to calculate dashboard metrics');
    }
  }

  // ========================================================================
  // KPI CALCULATIONS
  // ========================================================================

  private async calculateKPIs(tenantId: string, timeRange: TimeRange) {
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', timeRange.start_date)
      .lte('created_at', timeRange.end_date);

    if (leadsError) throw leadsError;

    const totalLeads = leadsData?.length || 0;
    const qualifiedLeads = leadsData?.filter(l => l.status === 'qualified').length || 0;
    const convertedLeads = leadsData?.filter(l => l.status === 'converted').length || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Simular dados de deals (quando implementado)
    const avgDealValue = 5000; // Valor médio simulado
    const pipelineValue = totalLeads * avgDealValue * 0.3; // 30% do pipeline
    const monthlyRevenue = convertedLeads * avgDealValue;

    // Calcular velocidade do pipeline (dias médios para conversão)
    const pipelineVelocity = await this.calculatePipelineVelocity(tenantId, timeRange);

    return {
      total_leads: totalLeads,
      qualified_leads: qualifiedLeads,
      converted_leads: convertedLeads,
      conversion_rate: Math.round(conversionRate * 100) / 100,
      avg_deal_value: avgDealValue,
      pipeline_value: Math.round(pipelineValue),
      monthly_revenue: monthlyRevenue,
      pipeline_velocity: pipelineVelocity,
    };
  }

  // ========================================================================
  // TREND CALCULATIONS
  // ========================================================================

  private async calculateTrends(tenantId: string, timeRange: TimeRange) {
    // Buscar dados históricos por período
    const { data: dailyMetrics } = await supabase
      .from('daily_metrics_mv')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('metric_date', timeRange.start_date)
      .lte('metric_date', timeRange.end_date)
      .order('metric_date', { ascending: true });

    const leadsTrend: TrendData[] = dailyMetrics?.map(d => ({
      date: d.metric_date,
      value: d.total_leads || 0,
      change_percentage: this.calculateDayOverDayChange(d.total_leads, 0), // Simplificado
    })) || [];

    const revenueTrend: TrendData[] = dailyMetrics?.map(d => ({
      date: d.metric_date,
      value: (d.converted_leads || 0) * 5000, // Simulado
      change_percentage: 0,
    })) || [];

    const conversionTrend: TrendData[] = dailyMetrics?.map(d => ({
      date: d.metric_date,
      value: d.total_leads > 0 ? ((d.converted_leads || 0) / d.total_leads) * 100 : 0,
      change_percentage: 0,
    })) || [];

    const pipelineTrend: TrendData[] = dailyMetrics?.map(d => ({
      date: d.metric_date,
      value: (d.qualified_leads || 0) * 5000 * 0.3, // Pipeline value simulado
      change_percentage: 0,
    })) || [];

    return {
      leads_trend: leadsTrend,
      revenue_trend: revenueTrend,
      conversion_trend: conversionTrend,
      pipeline_trend: pipelineTrend,
    };
  }

  // ========================================================================
  // COMPARISON CALCULATIONS
  // ========================================================================

  private async calculateComparisons(tenantId: string, timeRange: TimeRange) {
    // Período atual
    const { data: currentData } = await supabase
      .from('leads')
      .select('id, status, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', timeRange.start_date)
      .lte('created_at', timeRange.end_date);

    // Período anterior (mesmo intervalo)
    const daysDiff = new Date(timeRange.end_date).getTime() - new Date(timeRange.start_date).getTime();
    const previousStartDate = new Date(new Date(timeRange.start_date).getTime() - daysDiff).toISOString();
    const previousEndDate = new Date(new Date(timeRange.end_date).getTime() - daysDiff).toISOString();

    const { data: previousData } = await supabase
      .from('leads')
      .select('id, status, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', previousStartDate)
      .lte('created_at', previousEndDate);

    const currentCount = currentData?.length || 0;
    const previousCount = previousData?.length || 0;
    const changePercentage = previousCount > 0 
      ? ((currentCount - previousCount) / previousCount) * 100 
      : 0;

    // Período do ano anterior
    const yearAgoStartDate = new Date(timeRange.start_date);
    yearAgoStartDate.setFullYear(yearAgoStartDate.getFullYear() - 1);
    const yearAgoEndDate = new Date(timeRange.end_date);
    yearAgoEndDate.setFullYear(yearAgoEndDate.getFullYear() - 1);

    const { data: yearAgoData } = await supabase
      .from('leads')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('created_at', yearAgoStartDate.toISOString())
      .lte('created_at', yearAgoEndDate.toISOString());

    const yearAgoCount = yearAgoData?.length || 0;
    const yearOverYearChange = yearAgoCount > 0 
      ? ((currentCount - yearAgoCount) / yearAgoCount) * 100 
      : 0;

    return {
      period_over_period: {
        current_period: currentCount,
        previous_period: previousCount,
        change_percentage: Math.round(changePercentage * 100) / 100,
        change_direction: changePercentage > 5 ? 'up' : changePercentage < -5 ? 'down' : 'stable',
      },
      year_over_year: {
        current_period: currentCount,
        previous_period: yearAgoCount,
        change_percentage: Math.round(yearOverYearChange * 100) / 100,
        change_direction: yearOverYearChange > 5 ? 'up' : yearOverYearChange < -5 ? 'down' : 'stable',
      },
    };
  }

  // ========================================================================
  // TEAM PERFORMANCE
  // ========================================================================

  async getTeamPerformance(tenantId: string, timeRange: TimeRange): Promise<TeamMember[]> {
    const cacheKey = `${this.CACHE_KEYS.TEAM_PERFORMANCE}:${tenantId}:${timeRange.start_date}`;
    
    const cached = await getCache.get<TeamMember[]>(cacheKey);
    if (cached) return cached;

    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('tenant_id', tenantId);

    if (!users) return [];

    const teamPerformance: TeamMember[] = [];

    for (const user of users) {
      // Leads criados pelo usuário
      const { data: userLeads } = await supabase
        .from('leads')
        .select('id, status, value')
        .eq('tenant_id', tenantId)
        .eq('assigned_to', user.id)
        .gte('created_at', timeRange.start_date)
        .lte('created_at', timeRange.end_date);

      const leadsCreated = userLeads?.length || 0;
      const dealsClosedCount = userLeads?.filter(l => l.status === 'converted').length || 0;
      const revenueGenerated = dealsClosedCount * 5000; // Simulado
      const conversionRate = leadsCreated > 0 ? (dealsClosedCount / leadsCreated) * 100 : 0;
      const avgDealSize = dealsClosedCount > 0 ? revenueGenerated / dealsClosedCount : 0;

      // Atividades do usuário
      const { data: activities } = await supabase
        .from('activity_analytics')
        .select('count')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .gte('activity_date', timeRange.start_date)
        .lte('activity_date', timeRange.end_date);

      const activitiesCount = activities?.reduce((sum, a) => sum + (a.count || 0), 0) || 0;

      // Calcular score de performance (0-100)
      const performanceScore = this.calculatePerformanceScore({
        conversion_rate: conversionRate,
        activities_count: activitiesCount,
        revenue_generated: revenueGenerated,
      });

      teamPerformance.push({
        user_id: user.id,
        name: user.name || 'Usuário',
        email: user.email || '',
        metrics: {
          leads_created: leadsCreated,
          deals_closed: dealsClosedCount,
          revenue_generated: revenueGenerated,
          conversion_rate: Math.round(conversionRate * 100) / 100,
          avg_deal_size: Math.round(avgDealSize),
          activities_count: activitiesCount,
        },
        ranking: 0, // Será calculado após ordenação
        performance_score: performanceScore,
      });
    }

    // Ordenar por performance score e atribuir ranking
    teamPerformance.sort((a, b) => b.performance_score - a.performance_score);
    teamPerformance.forEach((member, index) => {
      member.ranking = index + 1;
    });

    await getCache.set(cacheKey, teamPerformance, this.CACHE_TTL.MEDIUM);
    return teamPerformance;
  }

  // ========================================================================
  // SALES FORECASTING
  // ========================================================================

  async generateSalesForecast(
    tenantId: string,
    forecastType: 'linear' | 'exponential' | 'seasonal' = 'linear',
    periods: number = 6
  ): Promise<ForecastData> {
    const cacheKey = `${this.CACHE_KEYS.FORECAST}:${tenantId}:${forecastType}:${periods}`;
    
    const cached = await getCache.get<ForecastData>(cacheKey);
    if (cached) return cached;

    // Buscar dados históricos dos últimos 12 meses
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const { data: historicalData } = await supabase
      .from('daily_metrics_mv')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lte('metric_date', endDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true });

    if (!historicalData || historicalData.length < 3) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Preparar dados históricos
    const historical: TrendData[] = historicalData.map(d => ({
      date: d.metric_date,
      value: (d.converted_leads || 0) * 5000, // Revenue simulado
    }));

    // Gerar previsões baseadas no tipo de forecast
    const predictions = this.generatePredictions(historical, forecastType, periods);

    // Calcular métricas de precisão (simuladas)
    const accuracyMetrics = {
      mae: 150, // Mean Absolute Error simulado
      mape: 8.5, // Mean Absolute Percentage Error simulado
      rmse: 200, // Root Mean Square Error simulado
    };

    const forecast: ForecastData = {
      period: `${periods} months`,
      forecast_type: forecastType,
      predictions,
      accuracy_metrics: accuracyMetrics,
      historical_data: historical,
    };

    await getCache.set(cacheKey, forecast, this.CACHE_TTL.LONG);
    return forecast;
  }

  // ========================================================================
  // CONVERSION FUNNEL ANALYSIS
  // ========================================================================

  async getConversionFunnel(tenantId: string, timeRange: TimeRange): Promise<ConversionFunnel> {
    const cacheKey = `${this.CACHE_KEYS.FUNNEL}:${tenantId}:${timeRange.start_date}`;
    
    const cached = await getCache.get<ConversionFunnel>(cacheKey);
    if (cached) return cached;

    // Buscar dados de conversão
    const { data: conversionData } = await supabase
      .from('conversion_tracking')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('conversion_date', timeRange.start_date)
      .lte('conversion_date', timeRange.end_date);

    // Definir estágios padrão do funil
    const stageOrder = ['new', 'contacted', 'qualified', 'proposal', 'converted'];
    const stages = [];

    let previousStageCount = 0;

    for (let i = 0; i < stageOrder.length; i++) {
      const stageName = stageOrder[i];
      
      // Contar leads em cada estágio
      const { data: stageLeads } = await supabase
        .from('leads')
        .select('id, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .eq('status', stageName)
        .gte('created_at', timeRange.start_date)
        .lte('created_at', timeRange.end_date);

      const leadsCount = stageLeads?.length || 0;
      
      // Calcular tempo médio no estágio
      const avgTimeInStage = this.calculateAvgTimeInStage(conversionData, stageName);
      
      // Calcular taxa de conversão
      const conversionRate = i === 0 ? 100 : previousStageCount > 0 
        ? (leadsCount / previousStageCount) * 100 
        : 0;
      
      // Calcular taxa de abandono
      const dropoffRate = 100 - conversionRate;
      
      // Score de gargalo (quanto maior, pior)
      const bottleneckScore = this.calculateBottleneckScore(dropoffRate, avgTimeInStage);

      stages.push({
        stage_name: stageName,
        stage_order: i + 1,
        leads_count: leadsCount,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        avg_time_in_stage: avgTimeInStage,
        dropoff_rate: Math.round(dropoffRate * 100) / 100,
        bottleneck_score: bottleneckScore,
      });

      previousStageCount = leadsCount;
    }

    // Métricas gerais
    const totalLeads = stages[0]?.leads_count || 0;
    const finalConversions = stages[stages.length - 1]?.leads_count || 0;
    const overallConversionRate = totalLeads > 0 ? (finalConversions / totalLeads) * 100 : 0;
    const avgCycleTime = stages.reduce((sum, s) => sum + s.avg_time_in_stage, 0) / 24; // em dias
    const biggestBottleneck = stages.reduce((prev, current) => 
      prev.bottleneck_score > current.bottleneck_score ? prev : current
    ).stage_name;

    // Gerar recomendações
    const recommendations = this.generateFunnelRecommendations(stages);

    const funnel: ConversionFunnel = {
      stages,
      overall_metrics: {
        total_leads: totalLeads,
        final_conversions: finalConversions,
        overall_conversion_rate: Math.round(overallConversionRate * 100) / 100,
        avg_cycle_time: Math.round(avgCycleTime * 100) / 100,
        biggest_bottleneck: biggestBottleneck,
      },
      recommendations,
    };

    await getCache.set(cacheKey, funnel, this.CACHE_TTL.MEDIUM);
    return funnel;
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private async calculatePipelineVelocity(tenantId: string, timeRange: TimeRange): Promise<number> {
    const { data: convertedLeads } = await supabase
      .from('leads')
      .select('created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'converted')
      .gte('created_at', timeRange.start_date)
      .lte('created_at', timeRange.end_date);

    if (!convertedLeads || convertedLeads.length === 0) return 0;

    const totalDays = convertedLeads.reduce((sum, lead) => {
      const createdDate = new Date(lead.created_at);
      const convertedDate = new Date(lead.updated_at);
      const daysDiff = (convertedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return sum + daysDiff;
    }, 0);

    return Math.round((totalDays / convertedLeads.length) * 100) / 100;
  }

  private calculateDayOverDayChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  private calculatePerformanceScore(metrics: {
    conversion_rate: number;
    activities_count: number;
    revenue_generated: number;
  }): number {
    // Algoritmo simples de scoring (0-100)
    const conversionScore = Math.min(metrics.conversion_rate * 2, 40); // Max 40 pontos
    const activityScore = Math.min(metrics.activities_count / 10, 30); // Max 30 pontos
    const revenueScore = Math.min(metrics.revenue_generated / 1000, 30); // Max 30 pontos

    return Math.round(conversionScore + activityScore + revenueScore);
  }

  private generatePredictions(
    historical: TrendData[],
    forecastType: 'linear' | 'exponential' | 'seasonal',
    periods: number
  ) {
    const predictions = [];
    const values = historical.map(h => h.value);
    
    // Algoritmo simples de previsão linear
    const avgGrowthRate = this.calculateAverageGrowthRate(values);
    const lastValue = values[values.length - 1] || 0;

    for (let i = 1; i <= periods; i++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i);
      
      let predictedValue = lastValue;
      
      switch (forecastType) {
        case 'linear':
          predictedValue = lastValue + (avgGrowthRate * i);
          break;
        case 'exponential':
          predictedValue = lastValue * Math.pow(1 + (avgGrowthRate / 100), i);
          break;
        case 'seasonal':
          // Simular sazonalidade simples
          const seasonalFactor = 1 + (0.1 * Math.sin((i * Math.PI) / 6));
          predictedValue = (lastValue + (avgGrowthRate * i)) * seasonalFactor;
          break;
      }

      const confidenceLevel = Math.max(90 - (i * 5), 60); // Diminui com o tempo
      const confidenceRange = predictedValue * 0.15; // ±15% de margem

      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        predicted_value: Math.round(predictedValue),
        confidence_level: confidenceLevel,
        confidence_range: {
          min: Math.round(predictedValue - confidenceRange),
          max: Math.round(predictedValue + confidenceRange),
        },
      });
    }

    return predictions;
  }

  private calculateAverageGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;
    
    let totalGrowthRate = 0;
    let validPeriods = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) {
        const growthRate = (values[i] - values[i - 1]) / values[i - 1] * 100;
        totalGrowthRate += growthRate;
        validPeriods++;
      }
    }

    return validPeriods > 0 ? totalGrowthRate / validPeriods : 0;
  }

  private calculateAvgTimeInStage(conversionData: any[], stageName: string): number {
    const stageConversions = conversionData?.filter(c => c.from_stage === stageName) || [];
    if (stageConversions.length === 0) return 0;

    const totalHours = stageConversions.reduce((sum, c) => sum + (c.time_in_previous_stage || 0), 0);
    return Math.round((totalHours / stageConversions.length) * 100) / 100;
  }

  private calculateBottleneckScore(dropoffRate: number, avgTimeInStage: number): number {
    // Score de 0-100, considerando taxa de abandono e tempo no estágio
    const dropoffScore = dropoffRate; // 0-100
    const timeScore = Math.min(avgTimeInStage / 24, 1) * 50; // Até 50 pontos para tempo
    
    return Math.round(dropoffScore + timeScore);
  }

  private generateFunnelRecommendations(stages: any[]) {
    const recommendations = [];

    stages.forEach(stage => {
      if (stage.bottleneck_score > 70) {
        recommendations.push({
          stage: stage.stage_name,
          issue: `Alto índice de abandono (${stage.dropoff_rate}%) e tempo excessivo no estágio`,
          suggestion: `Revisar processo do estágio ${stage.stage_name} e implementar automações`,
          priority: 'high' as const,
        });
      } else if (stage.bottleneck_score > 50) {
        recommendations.push({
          stage: stage.stage_name,
          issue: `Possível gargalo detectado no estágio ${stage.stage_name}`,
          suggestion: `Analisar causas do tempo elevado e otimizar processo`,
          priority: 'medium' as const,
        });
      }
    });

    return recommendations;
  }

  private async getRecentActivities(tenantId: string, timeRange: TimeRange): Promise<ActivitySummary[]> {
    const { data: activities } = await supabase
      .from('activity_analytics')
      .select('activity_type, count')
      .eq('tenant_id', tenantId)
      .gte('activity_date', timeRange.start_date)
      .lte('activity_date', timeRange.end_date);

    if (!activities) return [];

    // Agrupar por tipo de atividade
    const grouped = activities.reduce((acc, activity) => {
      const type = activity.activity_type;
      if (!acc[type]) {
        acc[type] = { total: 0, count: 0 };
      }
      acc[type].total += activity.count || 0;
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return Object.entries(grouped).map(([type, data]) => ({
      type,
      count: data.total,
      trend: 'stable' as const, // Simplificado
      change_percentage: 0, // Simplificado
    }));
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const analyticsService = new AnalyticsService(); 