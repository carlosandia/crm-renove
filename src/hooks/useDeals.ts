import { useState, useEffect, useCallback } from 'react';
import { 
  Deal, 
  DealStats, 
  DealFilters, 
  DealCreateRequest, 
  DealUpdateRequest,
  DealResponse,
  DealStatsResponse 
} from '../types/deals';

const API_BASE_URL = 'http://localhost:3001/api';

export const useDeals = (filters: DealFilters = {}) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState<DealStats | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Fetch deals with filters
  const fetchDeals = useCallback(async (currentPage = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      const response = await fetch(`${API_BASE_URL}/deals?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: DealResponse = await response.json();
      
      setDeals(result.data);
      setTotal(result.total);
      setPage(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar deals');
      console.error('Error fetching deals:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, limit]);

  // Fetch deal statistics
  const fetchStats = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      );

      const response = await fetch(`${API_BASE_URL}/deals/stats?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: DealStatsResponse = await response.json();
      setStats(result.data);
    } catch (err) {
      console.error('Error fetching deal stats:', err);
      // Set default stats on error
      setStats({
        totalValue: 0,
        totalDeals: 0,
        wonDeals: 0,
        lostDeals: 0,
        openDeals: 0,
        conversionRate: 0,
        averageDealSize: 0,
        monthlyGrowth: 0,
        averageSalesCycle: 0,
        winRate: 0
      });
    }
  }, [filters]);

  // Create new deal
  const createDeal = useCallback(async (dealData: DealCreateRequest): Promise<Deal> => {
    try {
      const response = await fetch(`${API_BASE_URL}/deals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dealData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newDeal: Deal = await response.json();
      
      // Add to current deals list
      setDeals(prev => [newDeal, ...prev]);
      setTotal(prev => prev + 1);
      
      // Refresh stats
      fetchStats();
      
      return newDeal;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar deal';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchStats]);

  // Update existing deal
  const updateDeal = useCallback(async (dealId: string, dealData: DealUpdateRequest): Promise<Deal> => {
    try {
      const response = await fetch(`${API_BASE_URL}/deals/${dealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dealData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedDeal: Deal = await response.json();
      
      // Update in current deals list
      setDeals(prev => prev.map(deal => 
        deal.id === dealId ? updatedDeal : deal
      ));
      
      // Refresh stats
      fetchStats();
      
      return updatedDeal;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar deal';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchStats]);

  // Delete deal
  const deleteDeal = useCallback(async (dealId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/deals/${dealId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Remove from current deals list
      setDeals(prev => prev.filter(deal => deal.id !== dealId));
      setTotal(prev => prev - 1);
      
      // Refresh stats
      fetchStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir deal';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchStats]);

  // Get deal by ID
  const getDeal = useCallback(async (dealId: string): Promise<Deal> => {
    try {
      const response = await fetch(`${API_BASE_URL}/deals/${dealId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar deal';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Move deal to different stage
  const moveDeal = useCallback(async (dealId: string, newStageId: string): Promise<Deal> => {
    try {
      const response = await fetch(`${API_BASE_URL}/deals/${dealId}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage_id: newStageId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedDeal: Deal = await response.json();
      
      // Update in current deals list
      setDeals(prev => prev.map(deal => 
        deal.id === dealId ? updatedDeal : deal
      ));
      
      // Refresh stats
      fetchStats();
      
      return updatedDeal;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao mover deal';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchStats]);

  // Win deal
  const winDeal = useCallback(async (dealId: string, winReason?: string): Promise<Deal> => {
    return updateDeal(dealId, { 
      status: 'won', 
      won_reason: winReason,
      probability: 100 
    });
  }, [updateDeal]);

  // Lose deal
  const loseDeal = useCallback(async (dealId: string, lostReason?: string): Promise<Deal> => {
    return updateDeal(dealId, { 
      status: 'lost', 
      lost_reason: lostReason,
      probability: 0 
    });
  }, [updateDeal]);

  // Pagination handlers
  const nextPage = useCallback(() => {
    if (page * limit < total) {
      fetchDeals(page + 1);
    }
  }, [page, limit, total, fetchDeals]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      fetchDeals(page - 1);
    }
  }, [page, fetchDeals]);

  const goToPage = useCallback((targetPage: number) => {
    fetchDeals(targetPage);
  }, [fetchDeals]);

  // Initial load and when filters change
  useEffect(() => {
    fetchDeals(1);
    fetchStats();
  }, [fetchDeals, fetchStats]);

  return {
    // Data
    deals,
    stats,
    total,
    page,
    limit,
    hasNext: page * limit < total,
    hasPrev: page > 1,
    
    // State
    loading,
    error,
    
    // Actions
    fetchDeals,
    fetchStats,
    createDeal,
    updateDeal,
    deleteDeal,
    getDeal,
    moveDeal,
    winDeal,
    loseDeal,
    
    // Pagination
    nextPage,
    prevPage,
    goToPage,
    
    // Utilities
    clearError: () => setError(null),
    refresh: () => {
      fetchDeals(page);
      fetchStats();
    }
  };
}; 