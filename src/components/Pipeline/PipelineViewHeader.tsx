import React from 'react';
import PipelineStats from './PipelineStats';
import PipelineFilters from './PipelineFilters';
import PipelineActions from './PipelineActions';
import PipelineSelector from './PipelineSelector';
import EnterpriseMetricsHeader from './metrics/EnterpriseMetricsHeader';

interface Pipeline {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface PipelineViewHeaderProps {
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  onPipelineChange: (pipeline: Pipeline | null) => void;
  onAddLead: () => void;
  totalLeads: number;
  totalRevenue: number;
  closedDeals: number;
  conversionRate?: number;
  averageCycleTime?: string;
  loading?: boolean;
  // Novos props para filtros
  showOnlyMyPipelines?: boolean;
  selectedVendorFilter?: string;
  searchFilter?: string;
  statusFilter?: string;
  availableVendors?: any[];
  onToggleMyPipelines?: () => void;
  onVendorFilterChange?: (vendorId: string) => void;
  onSearchFilterChange?: (search: string) => void;
  onStatusFilterChange?: (status: string) => void;
  onClearFilters?: () => void;
  userRole?: string;
  // Novos props para métricas enterprise
  useEnterpriseMetrics?: boolean;
  onMetricsRefresh?: () => void;
}

const PipelineViewHeader: React.FC<PipelineViewHeaderProps> = ({
  pipelines,
  selectedPipeline,
  onPipelineChange,
  onAddLead,
  totalLeads,
  totalRevenue,
  closedDeals,
  conversionRate = 0,
  averageCycleTime = '0 dias',
  loading = false,
  // Novos props para filtros
  showOnlyMyPipelines = false,
  selectedVendorFilter = '',
  searchFilter = '',
  statusFilter = '',
  availableVendors = [],
  onToggleMyPipelines,
  onVendorFilterChange,
  onSearchFilterChange,
  onStatusFilterChange,
  onClearFilters,
  userRole,
  // Novos props para métricas enterprise
  useEnterpriseMetrics = true,
  onMetricsRefresh
}) => {
  // Calcular métricas adicionais
  const averageDealSize = closedDeals > 0 ? totalRevenue / closedDeals : 0;

  const handleSearchChange = (search: string) => {
    onSearchFilterChange?.(search);
  };

  const handleStatusFilter = (status: string) => {
    onStatusFilterChange?.(status);
  };

  const handleDateFilter = (dateRange: { start: string; end: string }) => {
    // Implementar filtro por data
    console.log('Date filter:', dateRange);
  };

  const handleAssigneeFilter = (assigneeId: string) => {
    onVendorFilterChange?.(assigneeId);
  };

  const handleSortChange = (sortBy: string, direction: 'asc' | 'desc') => {
    // Implementar ordenação
    console.log('Sort:', sortBy, direction);
  };

  const handleExport = () => {
    // Implementar exportação
    console.log('Export data');
  };

  const handleImport = () => {
    // Implementar importação
    console.log('Import data');
  };

  const handleSettings = () => {
    // Implementar configurações
    console.log('Settings');
  };

  const handleManageMembers = () => {
    // Implementar gerenciamento de membros
    console.log('Manage members');
  };

  return (
    <div className="pipeline-internal-header flex-shrink-0">
      {/* Container centralizado com largura máxima */}
      <div className="max-w-full mx-auto">
        {/* Cabeçalho simplificado - apenas métricas */}
        <div className="px-6 py-4">
          {/* 🎯 APENAS MÉTRICAS: Controles movidos para o subheader específico */}
          <div className="w-full">
            {useEnterpriseMetrics ? (
              <EnterpriseMetricsHeader
                selectedPipelineId={selectedPipeline?.id}
                compact={false}
                showComparison={true}
                showBenchmarks={true}
                onRefresh={onMetricsRefresh}
                className="mb-0"
              />
            ) : (
              <PipelineStats
                totalLeads={totalLeads}
                totalRevenue={totalRevenue}
                closedDeals={closedDeals}
                conversionRate={conversionRate}
                averageDealSize={averageDealSize}
                averageCycleTime={averageCycleTime}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipelineViewHeader;
