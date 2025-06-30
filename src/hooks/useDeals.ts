import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseCrud } from './useSupabaseCrud';

export interface Deal {
  id: string;
  title: string;
  description?: string;
  value: number;
  currency?: string;
  status: 'open' | 'won' | 'lost' | 'pending';
  stage: string;
  probability?: number;
  expected_close_date?: string;
  actual_close_date?: string;
  contact_id?: string;
  company_id?: string;
  pipeline_id?: string;
  assigned_to?: string;
  lead_source?: string;
  tags?: string[];
  notes?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  
  // Relacionamentos
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    company?: string;
  };
  company?: {
    id: string;
    name: string;
  };
  assigned_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const useDeals = () => {
  const { user } = useAuth();
  
  // ✅ USANDO NOVO HOOK BASE UNIFICADO
  const dealsCrud = useSupabaseCrud<Deal>({
    tableName: 'deals',
    selectFields: `
      id, title, description, value, currency, status, stage, probability,
      expected_close_date, actual_close_date, contact_id, company_id,
      pipeline_id, assigned_to, lead_source, tags, notes,
      tenant_id, created_at, updated_at, created_by,
      contacts(id, first_name, last_name, email, company),
      companies(id, name),
      users(id, first_name, last_name, email)
    `,
    defaultOrderBy: { column: 'created_at', ascending: false },
    enableCache: true,
    cacheKeyPrefix: 'deals',
    cacheDuration: 300000 // 5 minutos
  });

  // ============================================
  // CARREGAMENTO AUTOMÁTICO
  // ============================================

  useEffect(() => {
    if (user?.tenant_id) {
      // Carregar deals do tenant automaticamente
      dealsCrud.fetchAll({
        filters: {
          tenant_id: user.tenant_id
        }
      }).catch(error => {
        console.warn('⚠️ [useDeals] Erro no carregamento automático:', error);
      });
    }
  }, [user?.tenant_id]);

  // ============================================
  // FUNÇÕES DE CONVENIÊNCIA (MANTIDAS)
  // ============================================

  // Filtrar deals por status
  const getDealsByStatus = useCallback((status: Deal['status']): Deal[] => {
    return dealsCrud.data.filter(deal => deal.status === status);
  }, [dealsCrud.data]);

  // Filtrar deals por estágio
  const getDealsByStage = useCallback((stage: string): Deal[] => {
    return dealsCrud.data.filter(deal => deal.stage === stage);
  }, [dealsCrud.data]);

  // Filtrar deals por pipeline
  const getDealsByPipeline = useCallback((pipelineId: string): Deal[] => {
    return dealsCrud.data.filter(deal => deal.pipeline_id === pipelineId);
  }, [dealsCrud.data]);

  // Filtrar deals por vendedor
  const getDealsByAssignedUser = useCallback((userId: string): Deal[] => {
    return dealsCrud.data.filter(deal => deal.assigned_to === userId);
  }, [dealsCrud.data]);

  // Filtrar deals por empresa
  const getDealsByCompany = useCallback((companyId: string): Deal[] => {
    return dealsCrud.data.filter(deal => deal.company_id === companyId);
  }, [dealsCrud.data]);

  // Obter deals em risco (próximos do vencimento)
  const getDealsAtRisk = useCallback((): Deal[] => {
    const today = new Date();
    const riskThreshold = new Date();
    riskThreshold.setDate(today.getDate() + 7); // Próximos 7 dias

    return dealsCrud.data.filter(deal => {
      if (!deal.expected_close_date || deal.status !== 'open') return false;
      
      const closeDate = new Date(deal.expected_close_date);
      return closeDate <= riskThreshold && closeDate >= today;
    });
  }, [dealsCrud.data]);

  // Obter deals vencidos
  const getOverdueDeals = useCallback((): Deal[] => {
    const today = new Date();
    
    return dealsCrud.data.filter(deal => {
      if (!deal.expected_close_date || deal.status !== 'open') return false;
      
      const closeDate = new Date(deal.expected_close_date);
      return closeDate < today;
    });
  }, [dealsCrud.data]);

  // Obter estatísticas dos deals
  const getDealsStats = useCallback(() => {
    const total = dealsCrud.data.length;
    const open = getDealsByStatus('open').length;
    const won = getDealsByStatus('won').length;
    const lost = getDealsByStatus('lost').length;
    const pending = getDealsByStatus('pending').length;

    const totalValue = dealsCrud.data.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const wonValue = getDealsByStatus('won').reduce((sum, deal) => sum + (deal.value || 0), 0);
    const openValue = getDealsByStatus('open').reduce((sum, deal) => sum + (deal.value || 0), 0);

    const averageDealValue = total > 0 ? totalValue / total : 0;
    const winRate = total > 0 ? (won / (won + lost)) * 100 : 0;

    const atRisk = getDealsAtRisk().length;
    const overdue = getOverdueDeals().length;

    return {
      total,
      open,
      won,
      lost,
      pending,
      totalValue,
      wonValue,
      openValue,
      averageDealValue,
      winRate: Math.round(winRate * 100) / 100,
      atRisk,
      overdue,
      conversionRate: total > 0 ? Math.round((won / total) * 100) : 0
    };
  }, [dealsCrud.data, getDealsByStatus, getDealsAtRisk, getOverdueDeals]);

  // Buscar deals com filtros avançados
  const searchDeals = useCallback(async (searchFilters: {
    search?: string;
    status?: Deal['status'];
    stage?: string;
    pipelineId?: string;
    assignedTo?: string;
    companyId?: string;
    minValue?: number;
    maxValue?: number;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const filters: any = {
      tenant_id: user?.tenant_id
    };

    // Aplicar filtros específicos
    if (searchFilters.status) {
      filters.status = searchFilters.status;
    }
    if (searchFilters.stage) {
      filters.stage = searchFilters.stage;
    }
    if (searchFilters.pipelineId) {
      filters.pipeline_id = searchFilters.pipelineId;
    }
    if (searchFilters.assignedTo) {
      filters.assigned_to = searchFilters.assignedTo;
    }
    if (searchFilters.companyId) {
      filters.company_id = searchFilters.companyId;
    }

    // Buscar com os filtros
    return dealsCrud.fetchAll({
      filters,
      search: searchFilters.search ? {
        field: 'title,description',
        value: searchFilters.search
      } : undefined
    });
  }, [user?.tenant_id, dealsCrud.fetchAll]);

  // Mover deal para outro estágio
  const moveDealToStage = useCallback(async (dealId: string, newStage: string) => {
    console.log('🔄 [useDeals] Movendo deal para estágio:', { dealId, newStage });
    
    const updateData: Partial<Deal> = {
      stage: newStage
    };

    // Se moveu para 'won' ou 'lost', atualizar status e data de fechamento
    if (newStage === 'won' || newStage === 'lost') {
      updateData.status = newStage;
      updateData.actual_close_date = new Date().toISOString();
    }

    return dealsCrud.update(dealId, updateData);
  }, [dealsCrud.update]);

  // Atribuir deal a um vendedor
  const assignDeal = useCallback(async (dealId: string, userId: string) => {
    console.log('👤 [useDeals] Atribuindo deal:', { dealId, userId });
    
    return dealsCrud.update(dealId, {
      assigned_to: userId
    });
  }, [dealsCrud.update]);

  // Clonar deal
  const cloneDeal = useCallback(async (dealId: string) => {
    const originalDeal = dealsCrud.findOne(deal => deal.id === dealId);
    if (!originalDeal) {
      throw new Error('Deal não encontrado para clonagem');
    }

    console.log('📋 [useDeals] Clonando deal:', dealId);

    const clonedData: Omit<Deal, 'id' | 'created_at' | 'updated_at'> = {
      ...originalDeal,
      title: `${originalDeal.title} (Cópia)`,
      status: 'open',
      actual_close_date: undefined
    };

    // Remover campos que não devem ser clonados
    delete (clonedData as any).id;
    delete (clonedData as any).created_at;
    delete (clonedData as any).updated_at;
    delete (clonedData as any).contact;
    delete (clonedData as any).company;
    delete (clonedData as any).assigned_user;

    return dealsCrud.create(clonedData);
  }, [dealsCrud.findOne, dealsCrud.create]);

  // ============================================
  // INTERFACE COMPATÍVEL (MANTIDA)
  // ============================================

  return {
    // ✅ DADOS DO HOOK BASE UNIFICADO
    deals: dealsCrud.data,
    loading: dealsCrud.isLoading,
    error: dealsCrud.error,
    totalCount: dealsCrud.totalCount,
    
    // ✅ OPERAÇÕES DO HOOK BASE UNIFICADO
    loadDeals: () => dealsCrud.fetchAll({
      filters: {
        tenant_id: user?.tenant_id
      }
    }),
    getDealById: dealsCrud.fetchById,
    createDeal: dealsCrud.create,
    updateDeal: dealsCrud.update,
    deleteDeal: dealsCrud.remove,
    
    // ✅ FUNÇÕES ESPECÍFICAS MANTIDAS
    getDealsByStatus,
    getDealsByStage,
    getDealsByPipeline,
    getDealsByAssignedUser,
    getDealsByCompany,
    getDealsAtRisk,
    getOverdueDeals,
    getDealsStats,
    searchDeals,
    moveDealToStage,
    assignDeal,
    cloneDeal,
    
    // ✅ FUNCIONALIDADES EXTRAS DO HOOK BASE
    refresh: dealsCrud.refresh,
    findDeal: (predicate: (deal: Deal) => boolean) => dealsCrud.findOne(predicate),
    findDeals: (predicate: (deal: Deal) => boolean) => dealsCrud.findMany(predicate),
    
    // ✅ ESTADOS DETALHADOS
    states: {
      isEmpty: dealsCrud.isEmpty,
      hasData: dealsCrud.hasData,
      fetchState: dealsCrud.fetchState,
      createState: dealsCrud.createState,
      updateState: dealsCrud.updateState,
      deleteState: dealsCrud.deleteState
    },
    
    // ✅ CONTROLES DE CACHE
    clearCache: dealsCrud.clearCache
  };
}; 