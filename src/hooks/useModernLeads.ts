import { useState, useEffect, useCallback, useMemo } from 'react';
import { Lead, User, Pipeline } from '../types/CRM';

export interface LeadFilters {
  owner_id?: string;
  team_id?: string;
  stage_id?: string;
  pipeline_id?: string;
  temperature?: 'cold' | 'warm' | 'hot';
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface LeadMetrics {
  total_leads: number;
  leads_by_stage: Record<string, number>;
  leads_by_owner: Record<string, number>;
  conversion_rate: number;
  avg_deal_value: number;
  pipeline_velocity: number;
}

export interface DashboardData {
  leads: Lead[];
  total_leads: number;
  team_members: User[];
  metrics: LeadMetrics;
  pipelines: Pipeline[];
  user_permissions: {
    can_manage_team: boolean;
    can_edit_all_leads: boolean;
    can_view_all_leads: boolean;
  };
}

interface UseModernLeadsResult {
  // Data
  leads: Lead[];
  teamMembers: User[];
  metrics: LeadMetrics | null;
  pipelines: Pipeline[];
  dashboardData: DashboardData | null;
  
  // States
  isLoading: boolean;
  isLoadingDashboard: boolean;
  error: string | null;
  
  // Filters
  filters: LeadFilters;
  setFilters: (filters: LeadFilters) => void;
  clearFilters: () => void;
  
  // Actions
  refreshLeads: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<boolean>;
  
  // Computed
  filteredLeads: Lead[];
  canManageTeam: boolean;
  canEditAllLeads: boolean;
  canViewAllLeads: boolean;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export function useModernLeads(): UseModernLeadsResult {
  // States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<LeadMetrics | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<LeadFilters>({});

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }, []);

  // Helper function to build query string
  const buildQueryString = useCallback((params: LeadFilters) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.append(key, value);
      }
    });
    return searchParams.toString();
  }, []);

  // Fetch leads
  const fetchLeads = useCallback(async (currentFilters: LeadFilters = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryString = buildQueryString(currentFilters);
      const url = `${API_BASE}/api/v2/leads${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setLeads(result.data || []);
      } else {
        throw new Error(result.error || 'Erro ao buscar leads');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, buildQueryString]);

  // Fetch dashboard data (consolidated endpoint)
  const fetchDashboardData = useCallback(async (currentFilters: LeadFilters = {}) => {
    try {
      setIsLoadingDashboard(true);
      setError(null);

      const queryString = buildQueryString(currentFilters);
      const url = `${API_BASE}/api/v2/leads/dashboard${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const data = result.data;
        setDashboardData(data);
        setLeads(data.leads || []);
        setTeamMembers(data.team_members || []);
        setMetrics(data.metrics || null);
        setPipelines(data.pipelines || []);
      } else {
        throw new Error(result.error || 'Erro ao buscar dados do dashboard');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar dashboard:', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [getAuthHeaders, buildQueryString]);

  // Update lead
  const updateLead = useCallback(async (leadId: string, updates: Partial<Lead>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/v2/leads/${leadId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Atualizar lead na lista local
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId ? { ...lead, ...updates } : lead
          )
        );
        return true;
      } else {
        throw new Error(result.error || 'Erro ao atualizar lead');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao atualizar lead:', err);
      return false;
    }
  }, [getAuthHeaders]);

  // Public methods
  const refreshLeads = useCallback(() => fetchLeads(filters), [fetchLeads, filters]);
  const refreshDashboard = useCallback(() => fetchDashboardData(filters), [fetchDashboardData, filters]);

  // Update filters and fetch new data
  const updateFilters = useCallback((newFilters: LeadFilters) => {
    setFilters(newFilters);
    fetchDashboardData(newFilters);
  }, [fetchDashboardData]);

  const clearFilters = useCallback(() => {
    const emptyFilters = {};
    setFilters(emptyFilters);
    fetchDashboardData(emptyFilters);
  }, [fetchDashboardData]);

  // Computed values
  const filteredLeads = useMemo(() => {
    if (!filters.search) return leads;
    
    const searchTerm = filters.search.toLowerCase();
    return leads.filter(lead => 
      lead.title?.toLowerCase().includes(searchTerm) ||
      lead.contact_name?.toLowerCase().includes(searchTerm) ||
      lead.contact_email?.toLowerCase().includes(searchTerm) ||
      lead.contact_phone?.toLowerCase().includes(searchTerm) ||
      lead.company_name?.toLowerCase().includes(searchTerm)
    );
  }, [leads, filters.search]);

  const canManageTeam = useMemo(() => 
    dashboardData?.user_permissions?.can_manage_team || false, 
    [dashboardData]
  );

  const canEditAllLeads = useMemo(() => 
    dashboardData?.user_permissions?.can_edit_all_leads || false, 
    [dashboardData]
  );

  const canViewAllLeads = useMemo(() => 
    dashboardData?.user_permissions?.can_view_all_leads || false, 
    [dashboardData]
  );

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    // Data
    leads,
    teamMembers,
    metrics,
    pipelines,
    dashboardData,
    
    // States
    isLoading,
    isLoadingDashboard,
    error,
    
    // Filters
    filters,
    setFilters: updateFilters,
    clearFilters,
    
    // Actions
    refreshLeads,
    refreshDashboard,
    updateLead,
    
    // Computed
    filteredLeads,
    canManageTeam,
    canEditAllLeads,
    canViewAllLeads,
  };
} 