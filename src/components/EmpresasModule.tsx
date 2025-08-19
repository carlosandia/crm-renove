import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCompanies } from '../hooks/useCompanies';

import { Company } from '../types/Company';
import CompanyList from './Companies/CompanyList';
import CompanyFormModal from './Companies/CompanyFormModal';
import { LoadingState } from './ui/loading-state';
import { EmptyState } from './ui/empty-state';
import { ErrorBoundary } from './ui/error-boundary';

// Interface para filtros (movida do EmpresasSubHeader)
interface FilterState {
  searchTerm: string;
  status: string;
  segmento: string; // ✅ CORRIGIDO: Usar 'segmento' em vez de 'industry'
  adminStatus: string;
}


// AIDEV-NOTE: FilterState definida localmente para comunicação via Custom Events

const EmpresasModule: React.FC = () => {
  // Hook personalizado para gerenciar empresas
  const { companies, loading, error, fetchCompanies, toggleCompanyStatus } = useCompanies();

  // ✅ CORRIGIDO: Log apenas para erros críticos
  if (error && process.env.NODE_ENV === 'development') {
    console.error('❌ [EmpresasModule] Erro crítico:', error);
  }

  // Estados do componente
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    status: 'all',
    segmento: 'all', // ✅ CORRIGIDO: Usar 'segmento' em vez de 'industry'
    adminStatus: 'all'
  });

  // ✅ CORREÇÃO CRÍTICA: useCallback para handleCreate e handleRefresh (Rules of Hooks)
  // AIDEV-NOTE: Estas funções devem ser definidas ANTES do useEffect que as referencia
  const handleCreate = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchCompanies();
  }, [fetchCompanies]);

  // ✅ CORREÇÃO PERFORMANCE: Função de refresh otimizada com retry logic
  const handleSuccessfulCreate = useCallback(async () => {
    console.log('🎉 [EmpresasModule] Modal de criação reportou sucesso, executando refresh otimizado...');
    setShowCreateModal(false);
    
    try {
      // Primeiro refresh imediato
      await handleRefresh();
      
      // ✅ OTIMIZADO: Retry com delay reduzido para melhor responsividade
      await new Promise(resolve => setTimeout(resolve, 500));
      await handleRefresh();
      
      console.log('✅ [EmpresasModule] Refresh otimizado concluído com sucesso');
    } catch (error) {
      console.error('❌ [EmpresasModule] Erro no refresh otimizado:', error);
      // ✅ OTIMIZADO: Fallback retry com timing reduzido
      setTimeout(() => {
        handleRefresh().catch(console.error);
      }, 1500);
    }
  }, [handleRefresh]);

  // ✅ CORRIGIDO: Custom Events listeners com dependencies corretas
  useEffect(() => {
    const handleFiltersUpdate = (event: CustomEvent) => {
      if (event.detail.searchTerm !== undefined) {
        setFilters(prevFilters => ({
          ...prevFilters,
          searchTerm: event.detail.searchTerm
        }));
      }
      if (event.detail.filters) {
        setFilters(prevFilters => ({
          ...prevFilters,
          ...event.detail.filters
        }));
      }
    };

    const handleCreateCompany = (event: CustomEvent) => {
      handleCreate();
    };

    const handleRefreshCompanies = (event: CustomEvent) => {
      handleRefresh();
    };

    // Registrar listeners
    window.addEventListener('empresas-filters-updated', handleFiltersUpdate as EventListener);
    window.addEventListener('company-create-requested', handleCreateCompany as EventListener);
    window.addEventListener('companies-refresh-requested', handleRefreshCompanies as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('empresas-filters-updated', handleFiltersUpdate as EventListener);
      window.removeEventListener('company-create-requested', handleCreateCompany as EventListener);
      window.removeEventListener('companies-refresh-requested', handleRefreshCompanies as EventListener);
    };
  }, [handleCreate, handleRefresh]); // ✅ Adicionadas dependencies obrigatórias

  // ✅ CORRIGIDO: Envio de dados para AppDashboard
  useEffect(() => {
    const empresasDataEvent = new CustomEvent('empresas-data-updated', {
      detail: {
        companies: companies,
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(empresasDataEvent);
  }, [companies]);

  // AIDEV-NOTE: Configuração de filtros movida para EmpresasSubHeader
  // filterOptions removido pois agora é gerenciado internamente pelo SubHeader

  // Empresas filtradas
  const filteredCompanies = useMemo(() => {
    // ✅ OTIMIZAÇÃO: Log apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [EmpresasModule] Filtros aplicados:', filters);
      console.log('🏢 [EmpresasModule] Total empresas:', companies.length);
    }
    
    return companies.filter(company => {
      // Filtro por termo de busca
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          company.name.toLowerCase().includes(searchLower) ||
          company.segmento?.toLowerCase().includes(searchLower) ||
          company.admin?.name?.toLowerCase().includes(searchLower) ||
          company.admin?.email?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Filtro por status
      if (filters.status && filters.status !== 'all') {
        // ✅ OTIMIZAÇÃO: Log verboso apenas em desenvolvimento 
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 [EmpresasModule] Filtrando por status: ${filters.status}, Empresa: ${company.name}, is_active: ${company.is_active}`);
        }
        if (filters.status === 'active' && !company.is_active) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`❌ [EmpresasModule] Empresa ${company.name} rejeitada - filtro 'active' mas empresa inativa`);
          }
          return false;
        }
        if (filters.status === 'inactive' && company.is_active) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`❌ [EmpresasModule] Empresa ${company.name} rejeitada - filtro 'inactive' mas empresa ativa`);
          }
          return false;
        }
      }

      // Filtro por nicho
      if (filters.segmento && filters.segmento !== 'all' && company.segmento !== filters.segmento) {
        return false;
      }

      // Filtro por status do admin
      if (filters.adminStatus && filters.adminStatus !== 'all' && company.admin) {
        const adminStatus = company.admin.activation_status || 'activated';
        if (adminStatus !== filters.adminStatus) return false;
      }

      return true;
    });
  }, [companies, filters]);

  // ✅ OTIMIZADO: Debug melhorado com mais contexto
  if (process.env.NODE_ENV === 'development' && filteredCompanies.length === 0 && companies.length > 0) {
    console.warn('⚠️ [EmpresasModule] Filtros resultaram em lista vazia:', {
      totalCompanies: companies.length,
      activeFilters: Object.entries(filters).filter(([_, value]) => value && value !== 'all')
    });
  }

  // ✅ CORRIGIDO: handleCreate e handleRefresh movidos para cima (useCallback)

  const handleToggleStatus = async (company: Company) => {
    await toggleCompanyStatus(company);
    await fetchCompanies(); // Refresh após alteração
  };


  const handleSearchChange = (searchTerm: string) => {
    setFilters({ ...filters, searchTerm });
  };

  const handleResetFilters = () => {
    setFilters({
      searchTerm: '',
      status: '',
      segmento: '', // ✅ CORRIGIDO: Usar 'segmento' em vez de 'industry'
      adminStatus: ''
    });
  };

  // Estados condicionais de conteúdo
  const renderContent = () => {
    if (loading) {
      return (
        <LoadingState 
          variant="table"
          count={5}
        />
      );
    }

    if (error) {
      return (
        <EmptyState
          variant="generic"
          title="Erro ao carregar empresas"
          description={`Ocorreu um erro: ${error}`}
          actionLabel="Tentar novamente"
          onAction={handleRefresh}
        />
      );
    }

    if (companies.length === 0) {
      return (
        <EmptyState
          variant="companies"
          title="Nenhuma empresa cadastrada"
          description="Comece criando sua primeira empresa para gerenciar clientes e administradores."
          actionLabel="Nova Empresa"
          onAction={handleCreate}
        />
      );
    }

    if (filteredCompanies.length === 0) {
      return (
        <EmptyState
          variant="search"
          title="Nenhuma empresa encontrada"
          description="Tente ajustar os filtros ou termo de busca para encontrar empresas."
          actionLabel="Limpar Filtros"
          onAction={handleResetFilters}
        />
      );
    }
    return (
      <div 
        role="region"
        aria-label={`Lista de ${filteredCompanies.length} empresas`}
        aria-live="polite"
      >
        <CompanyList
          companies={filteredCompanies}
          onToggleStatus={handleToggleStatus}
          onRefetch={handleRefresh}
        />
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div 
        className="space-y-0"
        role="main"
        aria-labelledby="empresas-heading"
      >
        {/* Conteúdo principal - SubHeader agora é renderizado pelo AppDashboard */}
        <div className="p-6 bg-white">
          {renderContent()}
        </div>

        {/* Modais */}
        {showCreateModal && (
          <CompanyFormModal
            isOpen={showCreateModal}
            mode="create"
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleSuccessfulCreate}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default EmpresasModule; 