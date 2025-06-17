import React from 'react';
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
}

const PipelineViewHeader: React.FC<PipelineViewHeaderProps> = ({
  pipelines,
  selectedPipeline,
  onPipelineChange,
  onAddLead,
  totalLeads,
  totalRevenue,
  closedDeals
}) => {
  // Calcular métricas adicionais
  const conversionRate = totalLeads > 0 ? (closedDeals / totalLeads) * 100 : 0;
  const averageDealSize = closedDeals > 0 ? totalRevenue / closedDeals : 0;
  const averageCycleTime = 12; // Mock data

  const handleSearchChange = (search: string) => {
    // Implementar lógica de busca
    console.log('Search:', search);
  };

  const handleStatusFilter = (status: string) => {
    // Implementar filtro por status
    console.log('Status filter:', status);
  };

  const handleDateFilter = (dateRange: { start: string; end: string }) => {
    // Implementar filtro por data
    console.log('Date filter:', dateRange);
  };

  const handleAssigneeFilter = (assigneeId: string) => {
    // Implementar filtro por responsável
    console.log('Assignee filter:', assigneeId);
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
    <div className="pipeline-internal-header bg-white border-b border-gray-200 flex-shrink-0">
      <div className="p-6 pb-2 space-y-4">
        {/* Cabeçalho principal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Pipeline de Vendas</h1>
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

        {/* Estatísticas */}
        <PipelineStats
          totalLeads={totalLeads}
          totalRevenue={totalRevenue}
          closedDeals={closedDeals}
          conversionRate={conversionRate}
          averageDealSize={averageDealSize}
          averageCycleTime={averageCycleTime}
        />
      </div>

      {/* Filtros - sem padding extra */}
      <PipelineFilters
        pipelines={pipelines}
        selectedPipeline={selectedPipeline}
        onPipelineChange={onPipelineChange}
        onSearchChange={handleSearchChange}
        onStatusFilter={handleStatusFilter}
        onDateFilter={handleDateFilter}
        onAssigneeFilter={handleAssigneeFilter}
        onSortChange={handleSortChange}
      />
    </div>
  );
};

export default PipelineViewHeader;
