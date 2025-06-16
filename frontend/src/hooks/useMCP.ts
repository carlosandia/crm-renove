import { useState } from 'react';

const API_BASE_URL = 'http://localhost:5001/api/mcp';

interface MCPUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  created_at: string;
}

interface MCPCompany {
  id: string;
  name: string;
  email?: string;
  website?: string;
  segment?: string;
  tenant_id: string;
  status: string;
  created_at: string;
}

interface MCPLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company_id?: string;
  status: string;
  source?: string;
  assigned_to?: string;
  tenant_id: string;
  created_at: string;
}

interface DashboardStats {
  users: number;
  companies: number;
  leads: number;
}

interface MCPResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const useMCP = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const result: MCPResponse<T> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro na requisição');
      }

      return result.data as T;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Operações com usuários
  const getUsers = async (filters?: {
    role?: string;
    tenant_id?: string;
    limit?: number;
  }): Promise<MCPUser[]> => {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.tenant_id) params.append('tenant_id', filters.tenant_id);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall<MCPUser[]>(`/users${query}`);
  };

  const createUser = async (userData: {
    email: string;
    name: string;
    role: string;
    tenant_id: string;
  }): Promise<MCPUser> => {
    return apiCall<MCPUser>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  };

  // Operações com empresas
  const getCompanies = async (filters?: {
    tenant_id: string;
    status?: string;
    limit?: number;
  }): Promise<MCPCompany[]> => {
    const params = new URLSearchParams();
    if (filters?.tenant_id) params.append('tenant_id', filters.tenant_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall<MCPCompany[]>(`/companies${query}`);
  };

  const createCompany = async (companyData: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    segment?: string;
    tenant_id: string;
  }): Promise<MCPCompany> => {
    return apiCall<MCPCompany>('/companies', {
      method: 'POST',
      body: JSON.stringify(companyData),
    });
  };

  // Operações com leads
  const getLeads = async (filters?: {
    tenant_id: string;
    status?: string;
    assigned_to?: string;
    limit?: number;
  }): Promise<MCPLead[]> => {
    const params = new URLSearchParams();
    if (filters?.tenant_id) params.append('tenant_id', filters.tenant_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall<MCPLead[]>(`/leads${query}`);
  };

  const createLead = async (leadData: {
    name: string;
    email?: string;
    phone?: string;
    company_id?: string;
    source?: string;
    assigned_to?: string;
    tenant_id: string;
  }): Promise<MCPLead> => {
    return apiCall<MCPLead>('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  };

  // Dashboard
  const getDashboardStats = async (tenantId: string): Promise<DashboardStats> => {
    return apiCall<DashboardStats>(`/dashboard/${tenantId}`);
  };

  // Query personalizada
  const executeQuery = async (table: string, options?: {
    select?: string;
    where?: Record<string, any>;
    order_by?: string;
    limit?: number;
  }): Promise<any[]> => {
    return apiCall<any[]>('/query', {
      method: 'POST',
      body: JSON.stringify({ table, options }),
    });
  };

  // Status do MCP
  const getMCPStatus = async () => {
    return apiCall<{ message: string; timestamp: string; version: string }>('/status');
  };

  return {
    loading,
    error,
    // Usuários
    getUsers,
    createUser,
    // Empresas
    getCompanies,
    createCompany,
    // Leads
    getLeads,
    createLead,
    // Dashboard
    getDashboardStats,
    // Utils
    executeQuery,
    getMCPStatus,
  };
}; 