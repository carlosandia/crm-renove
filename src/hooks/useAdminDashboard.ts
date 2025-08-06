import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../providers/AuthProvider';

export interface SalesTarget {
  id: string;
  tenant_id: string;
  target_name: string;
  target_type: 'revenue' | 'leads' | 'deals' | 'conversion_rate';
  target_value: number;
  current_value: number;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  assigned_to?: string;
  assigned_team?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress_percentage: number;
  target_metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface AdminAlert {
  id: string;
  admin_user_id: string;
  alert_type: 'target_missed' | 'performance_drop' | 'system_issue' | 'team_notification' | 'forecast_alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'unread' | 'read' | 'dismissed';
  action_required: boolean;
  action_url?: string;
  alert_data?: any;
  expires_at?: string;
  created_at: string;
  read_at?: string;
}

export interface TeamPerformance {
  member_id: string;
  member_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  total_leads: number;
  qualified_leads: number;
  deals_closed: number;
  revenue_generated: number;
  conversion_rate: number;
  avg_deal_size: number;
  pipeline_velocity: number;
  activities_count: number;
  performance_score: number;
  performance_grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
}

export interface DashboardMetrics {
  overview: {
    total_revenue: number;
    total_leads: number;
    total_deals: number;
    conversion_rate: number;
    avg_deal_size: number;
    pipeline_velocity: number;
  };
  trends: {
    revenue_trend: number;
    leads_trend: number;
    deals_trend: number;
    conversion_trend: number;
  };
  team_summary: {
    total_members: number;
    active_members: number;
    top_performer: string;
    avg_performance_score: number;
  };
  targets_summary: {
    total_targets: number;
    active_targets: number;
    completed_targets: number;
    on_track_targets: number;
  };
  alerts_summary: {
    total_alerts: number;
    unread_alerts: number;
    critical_alerts: number;
  };
  // ✅ FASE 4: Métricas de no-show e conversão
  noshow_metrics: {
    total_meetings: number;
    scheduled_meetings: number;
    completed_meetings: number;
    noshow_meetings: number;
    noshow_rate: number;
    show_rate: number;
    benchmark_comparison: 'good' | 'warning' | 'critical';
  };
}

interface UseAdminDashboardResult {
  // Data
  dashboardMetrics: DashboardMetrics | null;
  salesTargets: SalesTarget[];
  adminAlerts: AdminAlert[];
  teamPerformance: TeamPerformance[];
  
  // States
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshDashboard: () => Promise<void>;
  createSalesTarget: (target: Omit<SalesTarget, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateSalesTarget: (targetId: string, updates: Partial<SalesTarget>) => Promise<boolean>;
  markAlertAsRead: (alertId: string) => Promise<boolean>;
  batchMarkAlertsAsRead: (alertIds: string[]) => Promise<boolean>;
  generateTeamSnapshot: (periodType: string) => Promise<boolean>;
  clearCache: () => Promise<boolean>;
}

// ✅ CORREÇÃO: Usar client Axios centralizado ao invés de fetch direto
import { api } from '../lib/api';

export function useAdminDashboard(): UseAdminDashboardResult {
  const { user } = useAuth();
  
  // 🔒 VALIDAÇÃO DE ROLE: Só executar se for admin ou super_admin
  const isAuthorized = user?.role === 'admin' || user?.role === 'super_admin';
  
  // ✅ CORREÇÃO: Throttling para evitar chamadas excessivas
  const lastFetchRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const THROTTLE_DELAY = 5000; // 5 segundos entre requests
  
  // States
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([]);
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Removido getAuthHeaders - Axios centralizado já cuida da autenticação

  // Fetch dashboard metrics
  const fetchDashboardMetrics = useCallback(async (timeRange: string = '30d') => {
    // 🔒 EARLY RETURN: Não executar se não autorizado
    if (!isAuthorized) {
      return;
    }

    // ✅ CORREÇÃO: Throttling - evitar chamadas excessivas
    const now = Date.now();
    if (now - lastFetchRef.current < THROTTLE_DELAY) {
      console.log('⚡ [AdminDashboard] Throttled - aguardando', Math.ceil((THROTTLE_DELAY - (now - lastFetchRef.current)) / 1000), 'segundos');
      return;
    }
    lastFetchRef.current = now;

    try {
      setIsLoading(true);
      setError(null);

      // 🔧 FETCH DIRETO com timeout agressivo e fallback imediato
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout agressivo

      const response = await api.get(`/admin-dashboard?timeRange=${timeRange}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // ✅ Axios já retorna JSON automaticamente e trata status codes
      if (response.data.success) {
        setDashboardMetrics(response.data.data);
      } else {
        throw new Error(response.data.error || 'Erro ao buscar métricas do dashboard');
      }

    } catch (err) {
      // 🔧 FALLBACK SILENCIOSO: Sem logs excessivos
      setError(null); // Não mostrar erro para usuário
      setDashboardMetrics(null); // Fallback silencioso
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized]);

  // Fetch sales targets
  const fetchSalesTargets = useCallback(async () => {
    // 🔒 EARLY RETURN: Não executar se não autorizado
    if (!isAuthorized) return;

    try {
      // 🔧 FETCH DIRETO com timeout agressivo
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      const response = await api.get(`/admin-dashboard/sales-targets`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // ✅ Axios já retorna JSON automaticamente
      if (response.data.success) {
        setSalesTargets(response.data.data.targets || []);
      } else {
        throw new Error(response.data.error || 'Erro ao buscar metas de vendas');
      }

    } catch (err) {
      // 🔧 FALLBACK SILENCIOSO: Sem logs
      setSalesTargets([]); // Fallback silencioso
    }
  }, [isAuthorized]);

  // Fetch admin alerts
  const fetchAdminAlerts = useCallback(async () => {
    // 🔒 EARLY RETURN: Não executar se não autorizado
    if (!isAuthorized) return;

    try {
      // 🔧 FETCH DIRETO com timeout agressivo
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      const response = await api.get(`/admin-dashboard/alerts`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // ✅ Axios já retorna JSON automaticamente
      if (response.data.success) {
        setAdminAlerts(response.data.data.alerts || []);
      } else {
        throw new Error(response.data.error || 'Erro ao buscar alertas');
      }

    } catch (err) {
      // 🔧 FALLBACK SILENCIOSO: Sem logs
      setAdminAlerts([]); // Fallback silencioso
    }
  }, [isAuthorized]);

  // Fetch team performance
  const fetchTeamPerformance = useCallback(async (period: string = '30d') => {
    // 🔒 EARLY RETURN: Não executar se não autorizado
    if (!isAuthorized) return;

    try {
      // 🔧 FETCH DIRETO com timeout agressivo
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      const response = await api.get(`/admin-dashboard/team-performance?period=${period}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // ✅ Axios já retorna JSON automaticamente
      if (response.data.success) {
        setTeamPerformance(response.data.data.team_performance || []);
      } else {
        throw new Error(response.data.error || 'Erro ao buscar performance da equipe');
      }

    } catch (err) {
      // 🔧 FALLBACK SILENCIOSO: Sem logs
      setTeamPerformance([]); // Fallback silencioso
    }
  }, [isAuthorized]);

  // Refresh all dashboard data
  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      fetchDashboardMetrics(),
      fetchSalesTargets(),
      fetchAdminAlerts(),
      fetchTeamPerformance()
    ]);
  }, [fetchDashboardMetrics, fetchSalesTargets, fetchAdminAlerts, fetchTeamPerformance]);

  // Create sales target
  const createSalesTarget = useCallback(async (target: Omit<SalesTarget, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      const response = await api.post(`/admin-dashboard/sales-targets`, target);

      // ✅ Axios já retorna JSON automaticamente
      if (response.data.success) {
        await fetchSalesTargets(); // Refresh targets
        return true;
      } else {
        throw new Error(response.data.error || 'Erro ao criar meta de vendas');
      }

    } catch (err) {
      console.error('Erro ao criar meta:', err);
      return false;
    }
  }, [fetchSalesTargets]);

  // Update sales target
  const updateSalesTarget = useCallback(async (targetId: string, updates: Partial<SalesTarget>): Promise<boolean> => {
    try {
      const response = await api.put(`/admin-dashboard/sales-targets/${targetId}`, updates);

      // ✅ Axios já retorna JSON automaticamente
      if (response.data.success) {
        await fetchSalesTargets(); // Refresh targets
        return true;
      } else {
        throw new Error(response.data.error || 'Erro ao atualizar meta de vendas');
      }

    } catch (err) {
      console.error('Erro ao atualizar meta:', err);
      return false;
    }
  }, [fetchSalesTargets]);

  // Mark alert as read
  const markAlertAsRead = useCallback(async (alertId: string): Promise<boolean> => {
    try {
      const response = await api.put(`/admin-dashboard/alerts/${alertId}/read`);

      // ✅ Axios já retorna JSON automaticamente
      if (response.data.success) {
        await fetchAdminAlerts(); // Refresh alerts
        return true;
      } else {
        throw new Error(response.data.error || 'Erro ao marcar alerta como lido');
      }

    } catch (err) {
      console.error('Erro ao marcar alerta:', err);
      return false;
    }
  }, [fetchAdminAlerts]);

  // Batch mark alerts as read
  const batchMarkAlertsAsRead = useCallback(async (alertIds: string[]): Promise<boolean> => {
    try {
      const response = await api.post(`/admin-dashboard/alerts/batch/read`, { alert_ids: alertIds });

      // ✅ Axios já retorna JSON automaticamente
      if (response.data.success) {
        await fetchAdminAlerts(); // Refresh alerts
        return true;
      } else {
        throw new Error(response.data.error || 'Erro ao marcar alertas como lidos');
      }

    } catch (err) {
      console.error('Erro ao marcar alertas:', err);
      return false;
    }
  }, [fetchAdminAlerts]);

  // Generate team snapshot
  const generateTeamSnapshot = useCallback(async (periodType: string): Promise<boolean> => {
    try {
      const response = await api.post(`/admin-dashboard/team-performance/snapshot`, { periodType });

      // ✅ Axios já retorna JSON automaticamente
      if (response.data.success) {
        await fetchTeamPerformance(); // Refresh performance data
        return true;
      } else {
        throw new Error(response.data.error || 'Erro ao gerar snapshot da equipe');
      }

    } catch (err) {
      console.error('Erro ao gerar snapshot:', err);
      return false;
    }
  }, [fetchTeamPerformance]);

  // Clear cache
  const clearCache = useCallback(async (): Promise<boolean> => {
    try {
      const response = await api.post(`/admin-dashboard/cache/clear`);

      // ✅ Axios já retorna JSON automaticamente
      if (response.data.success) {
        await refreshDashboard(); // Refresh all data
        return true;
      } else {
        throw new Error(response.data.error || 'Erro ao limpar cache');
      }

    } catch (err) {
      console.error('Erro ao limpar cache:', err);
      return false;
    }
  }, [refreshDashboard]);

  // Initial load
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      refreshDashboard();
    }
  }, [user, refreshDashboard]);

  return {
    // Data
    dashboardMetrics,
    salesTargets,
    adminAlerts,
    teamPerformance,
    
    // States
    isLoading,
    error,
    
    // Actions
    refreshDashboard,
    createSalesTarget,
    updateSalesTarget,
    markAlertAsRead,
    batchMarkAlertsAsRead,
    generateTeamSnapshot,
    clearCache,
  };
} 