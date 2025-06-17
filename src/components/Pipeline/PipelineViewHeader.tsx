import React from 'react';
import { Bell } from 'lucide-react';
import PipelineStats from './PipelineStats';
import PipelineFilters from './PipelineFilters';
import PipelineActions from './PipelineActions';
import PipelineSelector from './PipelineSelector';

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
  userRole
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
    <div className="pipeline-internal-header flex-shrink-0 bg-gray-100">
      {/* Container centralizado com largura máxima */}
      <div className="max-w-full mx-auto">
        {/* Cabeçalho compacto em uma linha */}
        <div className="px-8 py-4 bg-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Pipeline de Vendas</h1>
              <Bell className="w-5 h-5 text-gray-600 hover:text-gray-800 cursor-pointer transition-colors" />
            </div>

            <PipelineActions
              onAddLead={onAddLead}
              onExport={handleExport}
              onImport={handleImport}
              onSettings={handleSettings}
              onManageMembers={handleManageMembers}
              canManage={true}
            />
          </div>

          {/* Estatísticas em linha horizontal compacta */}
          <div className="w-full">
            <PipelineStats
              totalLeads={totalLeads}
              totalRevenue={totalRevenue}
              closedDeals={closedDeals}
              conversionRate={conversionRate}
              averageDealSize={averageDealSize}
              averageCycleTime={averageCycleTime}
              loading={loading}
            />
          </div>
        </div>

        {/* Filtros - fundo branco */}
        <div className="border-t border-gray-200 bg-white">
          <PipelineFilters
            pipelines={pipelines}
            selectedPipeline={selectedPipeline}
            onPipelineChange={onPipelineChange}
            onSearchChange={handleSearchChange}
            onStatusFilter={handleStatusFilter}
            onDateFilter={handleDateFilter}
            onAssigneeFilter={handleAssigneeFilter}
            onSortChange={handleSortChange}
            // Novos props
            availableVendors={availableVendors}
            selectedVendorFilter={selectedVendorFilter}
            searchFilter={searchFilter}
            statusFilter={statusFilter}
            showOnlyMyPipelines={showOnlyMyPipelines}
            onToggleMyPipelines={onToggleMyPipelines}
            onClearFilters={onClearFilters}
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  );
};

export default PipelineViewHeader;
