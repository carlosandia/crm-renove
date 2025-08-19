import React, { useMemo } from 'react';
import SubHeader, { FilterOption } from '../components/SubHeader/SubHeader';
import { Button } from '../components/ui/button';
import { Plus, Archive, MoreHorizontal, Download, Upload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { countLeadsWithoutOpportunity } from '../utils/leadOpportunityUtils';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface SubHeaderConfig {
  title: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  actions?: React.ReactNode;
  showSearch?: boolean;
  showFilterBadge?: boolean;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export const useSubHeaderContent = (config?: SubHeaderConfig): React.ReactNode => {
  return useMemo(() => {
    if (!config) return null;
    
    return React.createElement(SubHeader, {
      title: config.title,
      searchPlaceholder: config.searchPlaceholder,
      searchValue: config.searchValue,
      onSearchChange: config.onSearchChange,
      filters: config.filters,
      activeFilter: config.activeFilter,
      onFilterChange: config.onFilterChange,
      actions: config.actions,
      showSearch: config.showSearch,
      showFilterBadge: config.showFilterBadge
    });
  }, [config]);
};

// ============================================
// HOOKS ESPECÍFICOS POR MÓDULO
// ============================================

/**
 * Hook específico para o módulo de Pipelines
 */
export const usePipelineSubHeader = ({
  pipelines = [],
  searchTerm = '',
  selectedFilter = 'active',
  onSearchChange,
  onFilterChange,
  onCreatePipeline
}: {
  pipelines?: any[];
  searchTerm?: string;
  selectedFilter?: 'all' | 'active' | 'archived';
  onSearchChange?: (value: string) => void;
  onFilterChange?: (filterId: string) => void;
  onCreatePipeline?: () => void;
}) => {
  const config: SubHeaderConfig = useMemo(() => {
    const filters: FilterOption[] = [
      { 
        id: 'all', 
        label: 'Todas',
        count: pipelines.length
      },
      { 
        id: 'active', 
        label: 'Ativas',
        count: pipelines.filter(p => p.is_active !== false && !p.is_archived).length
      },
      { 
        id: 'archived', 
        label: 'Arquivadas', 
        icon: React.createElement(Archive, { className: "h-4 w-4" }),
        count: pipelines.filter(p => p.is_active === false || p.is_archived === true).length
      }
    ];

    const actions = onCreatePipeline ? React.createElement(
      Button,
      {
        onClick: onCreatePipeline,
        className: "h-8 px-2.5 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
      },
      React.createElement(Plus, { className: "h-4 w-4" }),
      "Nova Pipeline"
    ) : undefined;

    return {
      title: 'Gestão de Pipelines',
      searchPlaceholder: 'Buscar pipelines...',
      searchValue: searchTerm,
      onSearchChange,
      filters,
      activeFilter: selectedFilter,
      onFilterChange,
      actions,
      showSearch: true
    };
  }, [pipelines.length, searchTerm, selectedFilter, onSearchChange, onFilterChange, onCreatePipeline]);

  return useSubHeaderContent(config);
};

/**
 * Hook específico para o módulo de Leads
 */
export const useLeadsSubHeader = ({
  leads = [],
  leadsWithOpportunities = new Set(),
  searchTerm = '',
  selectedFilter = 'all',
  onSearchChange,
  onFilterChange,
  onCreateLead,
  onImportClick,
  onExportClick
}: {
  leads?: any[];
  leadsWithOpportunities?: Set<string>;
  searchTerm?: string;
  selectedFilter?: string;
  onSearchChange?: (value: string) => void;
  onFilterChange?: (filterId: string) => void;
  onCreateLead?: () => void;
  onImportClick?: () => void;
  onExportClick?: () => void;
}) => {
  const config: SubHeaderConfig = useMemo(() => {
    // Contadores baseados nos dados reais dos leads
    const totalLeads = leads.length;
    
    const assignedLeads = leads.filter(l => {
      // Lead tem um vendedor atribuído
      return l.assigned_to;
    }).length;
    
    const notAssignedLeads = leads.filter(l => {
      // Lead não tem vendedor atribuído
      return !l.assigned_to;
    }).length;
    
    // 🎯 Usar a mesma lógica da tag "Nunca registrou oportunidade"
    const withoutOpportunityLeads = countLeadsWithoutOpportunity(leads, leadsWithOpportunities);

    const filters: FilterOption[] = [
      { id: 'all', label: 'Todos', count: totalLeads },
      { id: 'assigned', label: 'Atribuídos', count: assignedLeads },
      { id: 'not_assigned', label: 'Não Atribuídos', count: notAssignedLeads },
      { id: 'without_opportunity', label: 'Sem Oportunidade', count: withoutOpportunityLeads }
    ];

    // Criar menu de três pontos para import/export
    const importExportMenu = (onImportClick && onExportClick) ? React.createElement(
      DropdownMenu,
      {},
      React.createElement(
        DropdownMenuTrigger,
        { asChild: true },
        React.createElement(
          Button,
          {
            variant: "ghost",
            size: "sm",
            className: "h-8 px-2.5 gap-2 border-0 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900"
          },
          React.createElement(MoreHorizontal, { className: "h-4 w-4" })
        )
      ),
      React.createElement(
        DropdownMenuContent,
        { align: "end" },
        React.createElement(
          DropdownMenuItem,
          { onClick: onImportClick, className: "gap-2 cursor-pointer" },
          React.createElement(Upload, { className: "h-4 w-4" }),
          "Importar Leads"
        ),
        React.createElement(
          DropdownMenuItem,
          { onClick: onExportClick, className: "gap-2 cursor-pointer" },
          React.createElement(Download, { className: "h-4 w-4" }),
          "Exportar Leads"
        )
      )
    ) : undefined;

    // Criar botão de novo lead
    const newLeadButton = onCreateLead ? React.createElement(
      Button,
      {
        onClick: onCreateLead,
        className: "h-8 px-2.5 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
      },
      React.createElement(Plus, { className: "h-4 w-4" }),
      "Novo Lead"
    ) : undefined;

    // Combinar ações: menu três pontos + botão novo lead
    const actions = React.createElement(
      React.Fragment,
      {},
      importExportMenu,
      newLeadButton
    );

    return {
      title: 'Gestão de Leads',
      searchPlaceholder: 'Buscar por nome, email, empresa...',
      searchValue: searchTerm,
      onSearchChange,
      filters,
      activeFilter: selectedFilter,
      onFilterChange,
      actions,
      showSearch: true
    };
  }, [leads, leadsWithOpportunities, searchTerm, selectedFilter, onSearchChange, onFilterChange, onCreateLead]);

  return useSubHeaderContent(config);
};

// ============================================
// HOOK PARA INTEGRAÇÕES SUBHEADER
// ============================================

export const useIntegrationsSubHeader = ({
  activeTab = 'config',
  onTabChange
}: {
  activeTab?: 'config' | 'calendar' | 'email';
  onTabChange?: (tab: 'config' | 'calendar' | 'email') => void;
}) => {
  const config: SubHeaderConfig = useMemo(() => {
    // Criar filtros que funcionam como abas
    const filters: FilterOption[] = [
      {
        id: 'config',
        label: 'Configurações'
      },
      {
        id: 'calendar',
        label: 'Google Calendar'
      },
      {
        id: 'email',
        label: 'E-mail pessoal'
      }
    ];

    return {
      title: 'Integrações',
      searchPlaceholder: '',
      searchValue: '',
      filters,
      activeFilter: activeTab,
      onFilterChange: onTabChange,
      showSearch: false, // Sem busca para integrações
      showFilterBadge: false // Sem badge de filtro para integrações (são abas, não filtros)
    };
  }, [activeTab, onTabChange]);

  return useSubHeaderContent(config);
};

/**
 * Hook específico para o módulo de Empresas
 */
export const useEmpresasSubHeader = ({
  companies = [],
  searchTerm = '',
  selectedFilters = { status: 'all', industry: 'all', adminStatus: 'all' },
  onSearchChange,
  onFiltersChange,
  onCreateCompany,
  onRefresh
}: {
  companies?: any[];
  searchTerm?: string;
  selectedFilters?: {
    status: string;
    industry: string;
    adminStatus: string;
  };
  onSearchChange?: (value: string) => void;
  onFiltersChange?: (filters: any) => void;
  onCreateCompany?: () => void;
  onRefresh?: () => void;
}) => {
  const config: SubHeaderConfig = useMemo(() => {
    // Contadores baseados nos dados reais das empresas
    const totalCompanies = companies.length;
    
    const activeCompanies = companies.filter(c => c.status === 'active').length;
    const inactiveCompanies = companies.filter(c => c.status === 'inactive').length;
    const pendingAdmins = companies.filter(c => c.admin_status === 'pending').length;

    const filters: FilterOption[] = [
      { id: 'all', label: 'Todas', count: totalCompanies },
      { id: 'active', label: 'Ativas', count: activeCompanies },
      { id: 'inactive', label: 'Inativas', count: inactiveCompanies },
      { id: 'pending_admin', label: 'Admin Pendente', count: pendingAdmins }
    ];

    // Criar botão de nova empresa
    const newCompanyButton = onCreateCompany ? React.createElement(
      Button,
      {
        onClick: onCreateCompany,
        className: "h-8 px-2.5 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
      },
      React.createElement(Plus, { className: "h-4 w-4" }),
      "Nova Empresa"
    ) : undefined;

    return {
      title: 'Gestão de Clientes',
      searchPlaceholder: 'Buscar por nome da empresa ou email do admin...',
      searchValue: searchTerm,
      onSearchChange,
      filters,
      activeFilter: 'all', // Empresas usa sistema de filtros customizado
      onFilterChange: undefined, // Filtros customizados via onFiltersChange
      actions: newCompanyButton,
      showSearch: true
    };
  }, [companies, searchTerm, selectedFilters, onSearchChange, onFiltersChange, onCreateCompany, onRefresh]);

  return useSubHeaderContent(config);
};

export default useSubHeaderContent;