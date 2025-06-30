import { supabase } from '../config/supabase';
import { getCache } from './cacheService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AdminDashboardMetrics {
  kpis: {
    total_leads: number;
    total_deals: number;
    total_revenue: number;
    conversion_rate: number;
    avg_deal_size: number;
    pipeline_value: number;
    team_performance_avg: number;
    active_targets: number;
  };
  
  trends: {
    leads_trend: Array<{ date: string; value: number; }>;
    revenue_trend: Array<{ date: string; value: number; }>;
    conversion_trend: Array<{ date: string; value: number; }>;
    team_performance_trend: Array<{ date: string; value: number; }>;
  };
  
  team_performance: Array<{
    user_id: string;
    name: string;
    email: string;
    role: string;
    performance_score: number;
    ranking: number;
    metrics: {
      leads_created: number;
      deals_won: number;
      revenue_generated: number;
      activities_completed: number;
      conversion_rate: number;
    };
    growth_rates: {
      leads: number;
      deals: number;
      revenue: number;
    };
  }>;
  
  sales_targets: Array<{
    id: string;
    target_name: string;
    target_type: string;
    target_value: number;
    current_value: number;
    achievement_percentage: number;
    period_end: string;
    status: string;
    assignee_name?: string;
  }>;
  
  alerts: Array<{
    id: string;
    alert_type: string;
    severity: string;
    title: string;
    message: string;
    created_at: string;
    status: string;
  }>;
  
  forecast: {
    predicted_revenue: number;
    confidence_range: { min: number; max: number; };
    period_breakdown: Array<{
      period: string;
      predicted_value: number;
      confidence_level: number;
    }>;
  };
}

export interface SalesTarget {
  id: string;
  tenant_id: string;
  created_by: string;
  target_name: string;
  target_type: 'revenue' | 'deals' | 'leads' | 'activities' | 'conversion_rate';
  target_scope: 'company' | 'team' | 'individual' | 'pipeline';
  target_value: number;
  current_value: number;
  unit: string;
  assignee_user_id?: string;
  pipeline_id?: string;
  team_ids?: string[];
  period_type: string;
  period_start: string;
  period_end: string;
  status: string;
  achievement_percentage: number;
  notification_thresholds: number[];
  created_at: string;
  updated_at: string;
}

export interface TeamPerformanceSnapshot {
  id: string;
  tenant_id: string;
  user_id: string;
  snapshot_date: string;
  period_type: string;
  metrics: Record<string, number>;
  performance_score: number;
  team_ranking: number;
  previous_metrics: Record<string, number>;
  growth_rates: Record<string, number>;
  created_at: string;
}

export interface AdminAlert {
  id: string;
  tenant_id: string;
  admin_user_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  context_data: Record<string, any>;
  related_user_id?: string;
  related_deal_id?: string;
  related_target_id?: string;
  status: 'unread' | 'read' | 'acknowledged' | 'resolved';
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

class AdminDashboardService {
  private readonly CACHE_TTL = {
    DASHBOARD: 300, // 5 minutes
    TEAM_PERFORMANCE: 600, // 10 minutes
    TARGETS: 180, // 3 minutes
    ALERTS: 60, // 1 minute
    FORECAST: 1800, // 30 minutes
  };

  private readonly CACHE_KEYS = {
    DASHBOARD: (tenantId: string) => `admin_dashboard:${tenantId}`,
    TEAM_PERFORMANCE: (tenantId: string, period: string) => `team_performance:${tenantId}:${period}`,
    TARGETS: (tenantId: string) => `sales_targets:${tenantId}`,
    ALERTS: (adminId: string) => `admin_alerts:${adminId}`,
    FORECAST: (tenantId: string, scope: string) => `forecast:${tenantId}:${scope}`,
  };

  // ========================================================================
  // MAIN DASHBOARD METRICS
  // ========================================================================

  async getDashboardMetrics(
    tenantId: string,
    adminUserId: string,
    timeRange: string = '30d'
  ): Promise<AdminDashboardMetrics> {
    const cacheKey = `${this.CACHE_KEYS.DASHBOARD(tenantId)}:${timeRange}`;
    
    const cached = await getCache().get<AdminDashboardMetrics>(cacheKey);
    if (cached) return cached;

    try {
      // Parallel data fetching for performance
      const [
        kpisData,
        trendsData,
        teamPerformanceData,
        targetsData,
        alertsData,
        forecastData
      ] = await Promise.all([
        this.getKPIs(tenantId, timeRange),
        this.getTrends(tenantId, timeRange),
        this.getTeamPerformance(tenantId, timeRange),
        this.getSalesTargets(tenantId),
        this.getAdminAlerts(adminUserId),
        this.getForecast(tenantId, 'company')
      ]);

      const metrics: AdminDashboardMetrics = {
        kpis: kpisData,
        trends: trendsData,
        team_performance: teamPerformanceData,
        sales_targets: targetsData,
        alerts: alertsData,
        forecast: {
          predicted_revenue: (forecastData as any)?.predicted_revenue || 0,
          confidence_range: (forecastData as any)?.confidence_range || { min: 0, max: 0 },
          period_breakdown: (forecastData as any)?.period_breakdown || []
        },
      };

      await getCache().set(cacheKey, metrics, { ttl: this.CACHE_TTL.DASHBOARD });
      return metrics;

    } catch (error) {
      console.error('Error fetching admin dashboard metrics:', error);
      throw new Error('Failed to fetch dashboard metrics');
    }
  }

  // ========================================================================
  // KPIs CALCULATION
  // ========================================================================

  private async getKPIs(tenantId: string, timeRange: string) {
    const { startDate, endDate } = this.parseDateRange(timeRange);

    const { data: kpisData, error } = await supabase.rpc('get_admin_kpis', {
      p_tenant_id: tenantId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Error fetching KPIs:', error);
      // Fallback para dados mock se a função não existir
      return this.getMockKPIs(tenantId, startDate, endDate);
    }

    return kpisData?.[0] || {};
  }

  private async getMockKPIs(tenantId: string, startDate: string, endDate: string) {
    try {
      // Buscar leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, status, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Buscar deals
      const { data: deals } = await supabase
        .from('deals')
        .select('id, amount, deal_status, closed_date')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Buscar pipeline value
      const { data: pipelineDeals } = await supabase
        .from('deals')
        .select('amount, probability')
        .eq('tenant_id', tenantId)
        .eq('deal_status', 'open');

      // Buscar performance da equipe
      const { data: teamPerf } = await supabase
        .from('team_performance_snapshots')
        .select('performance_score')
        .eq('tenant_id', tenantId)
        .gte('snapshot_date', startDate);

      // Buscar metas ativas
      const { data: targets } = await supabase
        .from('sales_targets')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      const totalLeads = leads?.length || 0;
      const totalDeals = deals?.length || 0;
      const wonDeals = deals?.filter(d => d.deal_status === 'won') || [];
      const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
      const conversionRate = totalLeads > 0 ? (wonDeals.length / totalLeads) * 100 : 0;
      const avgDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;
      const pipelineValue = pipelineDeals?.reduce((sum, d) => sum + ((d.amount || 0) * (d.probability || 0) / 100), 0) || 0;
      const teamPerformanceAvg = (teamPerf && teamPerf.length > 0) 
        ? teamPerf.reduce((sum, t) => sum + (t.performance_score || 0), 0) / teamPerf.length 
        : 0;
      const activeTargets = targets?.length || 0;

      return {
        total_leads: totalLeads,
        total_deals: totalDeals,
        total_revenue: totalRevenue,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        avg_deal_size: Math.round(avgDealSize * 100) / 100,
        pipeline_value: Math.round(pipelineValue * 100) / 100,
        team_performance_avg: Math.round(teamPerformanceAvg * 100) / 100,
        active_targets: activeTargets,
      };

    } catch (error) {
      console.error('Error in getMockKPIs:', error);
      return {
        total_leads: 0,
        total_deals: 0,
        total_revenue: 0,
        conversion_rate: 0,
        avg_deal_size: 0,
        pipeline_value: 0,
        team_performance_avg: 0,
        active_targets: 0,
      };
    }
  }

  // ========================================================================
  // TRENDS CALCULATION
  // ========================================================================

  private async getTrends(tenantId: string, timeRange: string) {
    const { startDate } = this.parseDateRange(timeRange);
    
    try {
      // Gerar trends diários para leads
      const { data: leadsTrend } = await supabase
        .from('leads')
        .select('created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate)
        .order('created_at');

      // Gerar trends de receita
      const { data: revenueTrend } = await supabase
        .from('deals')
        .select('closed_date, amount')
        .eq('tenant_id', tenantId)
        .eq('deal_status', 'won')
        .gte('closed_date', startDate)
        .order('closed_date');

      // Processar dados em trends diários
      const leadsDaily = this.processDataByDay(leadsTrend || [], 'created_at');
      const revenueDaily = this.processRevenueByDay(revenueTrend || []);
      const conversionDaily = this.calculateConversionTrend(tenantId, startDate);

      return {
        leads_trend: leadsDaily,
        revenue_trend: revenueDaily,
        conversion_trend: await conversionDaily,
        team_performance_trend: [], // TODO: implementar
      };

    } catch (error) {
      console.error('Error fetching trends:', error);
      return {
        leads_trend: [],
        revenue_trend: [],
        conversion_trend: [],
        team_performance_trend: [],
      };
    }
  }

  // ========================================================================
  // TEAM PERFORMANCE
  // ========================================================================

  async getTeamPerformance(tenantId: string, period: string = '30d') {
    const cacheKey = this.CACHE_KEYS.TEAM_PERFORMANCE(tenantId, period);
    
    const cached = await getCache().get(cacheKey);
    if (cached && Array.isArray(cached)) return cached;

    try {
      const { data: teamData, error } = await supabase
        .from('team_performance_snapshots')
        .select(`
          *,
          users:user_id (
            id,
            first_name,
            last_name,
            email,
            role
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('period_type', 'monthly')
        .order('performance_score', { ascending: false })
        .limit(50);

      if (error) throw error;

      const processedData = teamData?.map(snapshot => ({
        user_id: snapshot.user_id,
        name: `${snapshot.users?.first_name || ''} ${snapshot.users?.last_name || ''}`.trim(),
        email: snapshot.users?.email || '',
        role: snapshot.users?.role || '',
        performance_score: snapshot.performance_score || 0,
        ranking: snapshot.team_ranking || 0,
        metrics: snapshot.metrics || {},
        growth_rates: snapshot.growth_rates || {},
      })) || [];

      await getCache().set(cacheKey, processedData, { ttl: this.CACHE_TTL.TEAM_PERFORMANCE });
      return processedData;

    } catch (error) {
      console.error('Error fetching team performance:', error);
      return [];
    }
  }

  // ========================================================================
  // SALES TARGETS MANAGEMENT
  // ========================================================================

  async getSalesTargets(tenantId: string): Promise<SalesTarget[]> {
    const cacheKey = this.CACHE_KEYS.TARGETS(tenantId);
    
    const cached = await getCache().get<SalesTarget[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('sales_targets')
        .select(`
          *,
          assignee:assignee_user_id (
            first_name,
            last_name
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const targets = data?.map(target => ({
        ...target,
        assignee_name: target.assignee 
          ? `${target.assignee.first_name} ${target.assignee.last_name}`.trim()
          : undefined
      })) || [];

      await getCache().set(cacheKey, targets, { ttl: this.CACHE_TTL.TARGETS });
      return targets;

    } catch (error) {
      console.error('Error fetching sales targets:', error);
      return [];
    }
  }

  async createSalesTarget(targetData: Partial<SalesTarget>): Promise<SalesTarget> {
    try {
      const { data, error } = await supabase
        .from('sales_targets')
        .insert([targetData])
        .select()
        .single();

      if (error) throw error;

      // Invalidar cache
      await getCache().delete(this.CACHE_KEYS.TARGETS(targetData.tenant_id!));

      return data;

    } catch (error) {
      console.error('Error creating sales target:', error);
      throw new Error('Failed to create sales target');
    }
  }

  async updateSalesTarget(targetId: string, updates: Partial<SalesTarget>): Promise<SalesTarget> {
    try {
      const { data, error } = await supabase
        .from('sales_targets')
        .update(updates)
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;

      // Invalidar cache
      await getCache().delete(this.CACHE_KEYS.TARGETS(updates.tenant_id!));

      return data;

    } catch (error) {
      console.error('Error updating sales target:', error);
      throw new Error('Failed to update sales target');
    }
  }

  // ========================================================================
  // ADMIN ALERTS
  // ========================================================================

  async getAdminAlerts(adminUserId: string): Promise<AdminAlert[]> {
    const cacheKey = this.CACHE_KEYS.ALERTS(adminUserId);
    
    const cached = await getCache().get<AdminAlert[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('admin_user_id', adminUserId)
        .in('status', ['unread', 'read'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const alerts = data || [];
      await getCache().set(cacheKey, alerts, { ttl: this.CACHE_TTL.ALERTS });
      return alerts;

    } catch (error) {
      console.error('Error fetching admin alerts:', error);
      return [];
    }
  }

  async createAlert(alertData: Partial<AdminAlert>): Promise<AdminAlert> {
    try {
      const { data, error } = await supabase
        .from('admin_alerts')
        .insert([alertData])
        .select()
        .single();

      if (error) throw error;

      // Invalidar cache
      await getCache().delete(this.CACHE_KEYS.ALERTS(alertData.admin_user_id!));

      return data;

    } catch (error) {
      console.error('Error creating alert:', error);
      throw new Error('Failed to create alert');
    }
  }

  async markAlertAsRead(alertId: string, adminUserId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_alerts')
        .update({ 
          status: 'read', 
          read_at: new Date().toISOString() 
        })
        .eq('id', alertId)
        .eq('admin_user_id', adminUserId);

      if (error) throw error;

      // Invalidar cache
      await getCache().delete(this.CACHE_KEYS.ALERTS(adminUserId));

    } catch (error) {
      console.error('Error marking alert as read:', error);
      throw new Error('Failed to mark alert as read');
    }
  }

  // ========================================================================
  // FORECAST
  // ========================================================================

  private async getForecast(tenantId: string, scope: string) {
    const cacheKey = this.CACHE_KEYS.FORECAST(tenantId, scope);
    
    const cached = await getCache().get(cacheKey);
    if (cached && typeof cached === 'object' && (cached as any).predicted_revenue !== undefined) return cached;

    try {
      // Buscar forecast mais recente
      const { data: forecasts } = await supabase
        .from('sales_forecasts_advanced')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('scope', scope)
        .eq('status', 'published')
        .order('generated_at', { ascending: false })
        .limit(1);

      const latestForecast = forecasts?.[0];

      if (!latestForecast) {
        // Gerar forecast básico se não houver
        return this.generateBasicForecast(tenantId);
      }

      const forecastData = {
        predicted_revenue: latestForecast.predicted_revenue || 0,
        confidence_range: latestForecast.confidence_range || { min: 0, max: 0 },
        period_breakdown: latestForecast.period_breakdown || [],
      };

      await getCache().set(cacheKey, forecastData, { ttl: this.CACHE_TTL.FORECAST });
      return forecastData;

    } catch (error) {
      console.error('Error fetching forecast:', error);
      return this.generateBasicForecast(tenantId);
    }
  }

  private async generateBasicForecast(tenantId: string) {
    try {
      // Calcular forecast baseado no pipeline atual
      const { data: openDeals } = await supabase
        .from('deals')
        .select('amount, probability')
        .eq('tenant_id', tenantId)
        .eq('deal_status', 'open');

      const pipelineValue = openDeals?.reduce((sum, deal) => 
        sum + ((deal.amount || 0) * (deal.probability || 50) / 100), 0) || 0;

      return {
        predicted_revenue: Math.round(pipelineValue * 0.7), // 70% do pipeline
        confidence_range: {
          min: Math.round(pipelineValue * 0.5),
          max: Math.round(pipelineValue * 0.9)
        },
        period_breakdown: this.generatePeriodBreakdown(pipelineValue),
      };

    } catch (error) {
      console.error('Error generating basic forecast:', error);
      return {
        predicted_revenue: 0,
        confidence_range: { min: 0, max: 0 },
        period_breakdown: [],
      };
    }
  }

  // ========================================================================
  // TEAM PERFORMANCE SNAPSHOTS
  // ========================================================================

  async generateTeamSnapshot(tenantId: string, periodType: string = 'monthly'): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('generate_team_performance_snapshot', {
        p_tenant_id: tenantId,
        p_snapshot_date: new Date().toISOString().split('T')[0],
        p_period_type: periodType
      });

      if (error) throw error;

      // Invalidar cache
      await getCache().delete(this.CACHE_KEYS.TEAM_PERFORMANCE(tenantId, periodType));

      return data || 0;

    } catch (error) {
      console.error('Error generating team snapshot:', error);
      throw new Error('Failed to generate team performance snapshot');
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  private parseDateRange(timeRange: string): { startDate: string; endDate: string } {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  private processDataByDay(data: any[], dateField: string) {
    const dailyData: Record<string, number> = {};
    
    data.forEach(item => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + 1;
    });

    return Object.entries(dailyData).map(([date, value]) => ({ date, value }));
  }

  private processRevenueByDay(data: any[]) {
    const dailyRevenue: Record<string, number> = {};
    
    data.forEach(item => {
      const date = new Date(item.closed_date).toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + (item.amount || 0);
    });

    return Object.entries(dailyRevenue).map(([date, value]) => ({ date, value }));
  }

  private async calculateConversionTrend(tenantId: string, startDate: string) {
    // TODO: Implementar cálculo de trend de conversão
    return [];
  }

  private generatePeriodBreakdown(pipelineValue: number) {
    const breakdown = [];
    const baseValue = pipelineValue / 6; // 6 meses
    
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      
      breakdown.push({
        period: date.toISOString().split('T')[0].substring(0, 7), // YYYY-MM
        predicted_value: Math.round(baseValue * (0.8 + Math.random() * 0.4)), // Variação de ±20%
        confidence_level: 0.75 - (i * 0.05), // Diminui confiança ao longo do tempo
      });
    }
    
    return breakdown;
  }

  // ========================================================================
  // CACHE MANAGEMENT
  // ========================================================================

  async clearCache(tenantId: string): Promise<void> {
    await Promise.all([
      getCache().delete(this.CACHE_KEYS.DASHBOARD(tenantId)),
      getCache().delete(this.CACHE_KEYS.TEAM_PERFORMANCE(tenantId, '30d')),
      getCache().delete(this.CACHE_KEYS.TARGETS(tenantId)),
      getCache().delete(this.CACHE_KEYS.FORECAST(tenantId, 'company')),
    ]);
  }
}

export const adminDashboardService = new AdminDashboardService();
export default adminDashboardService;