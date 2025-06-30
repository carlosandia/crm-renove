import React, { useState, useMemo } from 'react';
import { Plus, RefreshCw, Search, Filter, Download, Upload, Building } from 'lucide-react';
import { useCompanies } from '../hooks/useCompanies';

import { Company } from '../types/Company';
import CompanyList from './Companies/CompanyList';
import CompanyFormModal from './Companies/CompanyFormModal';
import { 
  PageContainer, 
  PageHeader, 
  PageTitle, 
  PageActions, 
  PageContent 
} from './ui/page-container';
import { Button } from './ui/button';
import { LoadingState } from './ui/loading-state';
import { EmptyState } from './ui/empty-state';
import { FilterPanel, FilterOption } from './ui/filter-panel';
import { ErrorBoundary } from './ui/error-boundary';
import { ResponsiveTable } from './ui/responsive-table';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Eye, Edit, Trash2, FileText, Users } from 'lucide-react';


// Interfaces
interface FilterState {
  searchTerm: string;
  status: string;
  industry: string;
  adminStatus: string;
}

const EmpresasModule: React.FC = () => {
  // Hook personalizado para gerenciar empresas
  const { companies, loading, error, fetchCompanies, toggleCompanyStatus, resendActivationEmail } = useCompanies();

  // 🔍 DEBUG: Logs temporários para identificar o problema
  console.log('🔍 [EmpresasModule] Estado atual:', {
    companiesCount: companies.length,
    loading,
    error,
    companies: companies.map(c => ({ name: c.name, id: c.id }))
  });

  // Estados do componente
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    status: 'all',
    industry: 'all',
    adminStatus: 'all'
  });

  // Configuração dos filtros para o FilterPanel
  const filterOptions: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'Todos os status',
      options: [
        { value: 'all', label: 'Todos' },
        { value: 'active', label: 'Ativas' },
        { value: 'inactive', label: 'Inativas' }
      ],
      value: filters.status || 'all',
      onChange: (value) => setFilters({ ...filters, status: value === 'all' ? '' : value })
    },
    {
      key: 'industry',
      label: 'Nicho',
      type: 'select',
      placeholder: 'Todos os nichos',
      options: [
        { value: 'all', label: 'Todos' },
        { value: 'E-commerce', label: 'E-commerce' },
        { value: 'SaaS', label: 'SaaS' },
        { value: 'Consultoria', label: 'Consultoria' },
        { value: 'Educação', label: 'Educação' },
        { value: 'Saúde', label: 'Saúde' },
        { value: 'Imobiliário', label: 'Imobiliário' },
        { value: 'Tecnologia', label: 'Tecnologia' },
        { value: 'Outros', label: 'Outros' }
      ],
      value: filters.industry || 'all',
      onChange: (value) => setFilters({ ...filters, industry: value === 'all' ? '' : value })
    },
    {
      key: 'adminStatus',
      label: 'Status Admin',
      type: 'select',
      placeholder: 'Todos',
      options: [
        { value: 'all', label: 'Todos' },
        { value: 'activated', label: 'Ativado' },
        { value: 'pending', label: 'Pendente' },
        { value: 'sent', label: 'Enviado' },
        { value: 'expired', label: 'Expirado' }
      ],
      value: filters.adminStatus || 'all',
      onChange: (value) => setFilters({ ...filters, adminStatus: value === 'all' ? '' : value })
    }
  ];

  // Empresas filtradas
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      // Filtro por termo de busca
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          company.name.toLowerCase().includes(searchLower) ||
          company.industry?.toLowerCase().includes(searchLower) ||
          company.admin?.name?.toLowerCase().includes(searchLower) ||
          company.admin?.email?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Filtro por status
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'active' && !company.is_active) return false;
        if (filters.status === 'inactive' && company.is_active) return false;
      }

      // Filtro por nicho
      if (filters.industry && filters.industry !== 'all' && company.industry !== filters.industry) {
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

  // 🔍 DEBUG: Log dos filtros
  console.log('🔍 [EmpresasModule] Filtros:', {
    filters,
    filteredCount: filteredCompanies.length,
    originalCount: companies.length,
    filteredCompanies: filteredCompanies.map(c => ({ name: c.name, id: c.id }))
  });

  // Handlers
  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleRefresh = async () => {
    await fetchCompanies();
  };

  const handleToggleStatus = async (company: Company) => {
    await toggleCompanyStatus(company);
    await fetchCompanies(); // Refresh após alteração
  };

  const handleResendEmail = async (company: Company): Promise<{ success: boolean; message: string; }> => {
    if (company.admin) {
      const result = await resendActivationEmail(company);
      await fetchCompanies(); // Refresh após reenvio
      // Se a função retorna um resultado, usar ele, senão usar default
      if (typeof result === 'object' && result !== null) {
        return result;
      }
      return { success: true, message: 'Email reenviado com sucesso' };
    }
    return { success: false, message: 'Empresa não possui admin' };
  };

  const handleSearchChange = (searchTerm: string) => {
    setFilters({ ...filters, searchTerm });
  };

  const handleResetFilters = () => {
    setFilters({
      searchTerm: '',
      status: '',
      industry: '',
      adminStatus: ''
    });
  };

  // Estados condicionais de conteúdo
  const renderContent = () => {
    console.log('🔍 [renderContent] Verificando condições:', {
      loading,
      error,
      companiesLength: companies.length,
      filteredCompaniesLength: filteredCompanies.length
    });

    if (loading) {
      console.log('🔍 [renderContent] Exibindo loading state');
      return (
        <LoadingState 
          variant="table"
          count={5}
        />
      );
    }

    if (error) {
      console.log('🔍 [renderContent] Exibindo error state:', error);
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
      console.log('🔍 [renderContent] Exibindo empty state - nenhuma empresa');
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
      console.log('🔍 [renderContent] Exibindo empty state - filtro vazio');
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

    console.log('🔍 [renderContent] Exibindo lista de empresas:', filteredCompanies.length);
    return (
      <div 
        role="region"
        aria-label={`Lista de ${filteredCompanies.length} empresas`}
        aria-live="polite"
      >
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredCompanies.length} {filteredCompanies.length === 1 ? 'empresa encontrada' : 'empresas encontradas'}
        </div>
        
        <CompanyList
          companies={filteredCompanies}
          onToggleStatus={handleToggleStatus}
          onResendEmail={handleResendEmail}
          onRefetch={handleRefresh}
        />
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div 
        className="space-y-6"
        role="main"
        aria-labelledby="empresas-heading"
      >
        {/* Header com melhor acessibilidade */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle 
                  id="empresas-heading"
                  className="text-2xl font-bold text-foreground flex items-center gap-2"
                >
                  <Building className="w-6 h-6 text-primary" aria-hidden="true" />
                  Gestão de Clientes
                </CardTitle>
                <p className="text-muted-foreground mt-1">
                  Gerencie empresas, administradores e configurações de clientes
                </p>
              </div>
              
              {/* Ações principais com melhor acessibilidade */}
              <div 
                className="flex gap-2"
                role="group"
                aria-label="Ações principais"
              >
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  aria-label="Atualizar lista de empresas"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Atualizar
                </Button>
                
                <Button
                  onClick={handleCreate}
                  size="sm"
                  aria-label="Criar nova empresa"
                >
                  <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                  Nova Empresa
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Busca e Filtros com acessibilidade */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Campo de busca */}
              <div className="relative">
                <label htmlFor="search-companies" className="sr-only">
                  Buscar empresas por nome ou email do administrador
                </label>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="search-companies"
                  type="text"
                  placeholder="Buscar por nome da empresa ou email do admin..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="pl-10"
                  aria-describedby="search-help"
                />
                <div id="search-help" className="sr-only">
                  Digite o nome da empresa ou email do administrador para filtrar os resultados
                </div>
              </div>
              
              {/* Panel de filtros */}
              <FilterPanel
                filters={filterOptions}
                onReset={handleResetFilters}
                className="border-t pt-4"
                aria-label="Filtros de empresas"
              />
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo principal */}
        <Card>
          <CardContent className="p-6">
            {renderContent()}
          </CardContent>
        </Card>

        {/* Modais */}
        {showCreateModal && (
          <CompanyFormModal
            isOpen={showCreateModal}
            mode="create"
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              console.log('🎉 [EmpresasModule] Modal de criação reportou sucesso, executando refresh...');
              setShowCreateModal(false);
              
              // 🔥 FORÇA BRUTA: Múltiplos refreshes para garantir atualização
              handleRefresh();
              
              // Refreshes adicionais com delays
              setTimeout(() => {
                console.log('🔄 [EmpresasModule] Refresh adicional 1...');
                handleRefresh();
              }, 500);
              
              setTimeout(() => {
                console.log('🔄 [EmpresasModule] Refresh adicional 2...');
                handleRefresh();
              }, 1500);
              
              setTimeout(() => {
                console.log('🔄 [EmpresasModule] Refresh adicional 3...');
                handleRefresh();
              }, 3000);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default EmpresasModule; 