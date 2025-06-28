import React from 'react';
import { FilterPanel } from '../ui/filter-panel';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

interface ReportsFiltersProps {
  filters: {
    startDate: string;
    endDate: string;
    companySearch: string;
    origem: string;
    status: string;
    channel: string;
  };
  onFiltersChange: (newFilters: any) => void;
  onClearFilters: () => void;
}

const ReportsFilters: React.FC<ReportsFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const channelOptions = [
    { value: 'all', label: 'Todos os Canais' },
    { value: 'organic', label: 'Orgânico' },
    { value: 'paid', label: 'Pago' },
    { value: 'social', label: 'Social' },
    { value: 'email', label: 'Email' },
    { value: 'referral', label: 'Referência' },
    { value: 'other', label: 'Outros' }
  ];

  const statusOptions = [
    { value: 'all', label: 'Todos os Status' },
    { value: 'lead', label: 'Lead' },
    { value: 'qualified', label: 'Qualificado' },
    { value: 'proposal', label: 'Proposta' },
    { value: 'negotiation', label: 'Negociação' },
    { value: 'won', label: 'Ganho' },
    { value: 'lost', label: 'Perdido' }
  ];

  const filterOptions = [
    {
      key: 'startDate',
      label: 'Data Inicial',
      type: 'date' as const,
      value: filters.startDate,
      onChange: (value: string) => handleFilterChange('startDate', value)
    },
    {
      key: 'endDate',
      label: 'Data Final',
      type: 'date' as const,
      value: filters.endDate,
      onChange: (value: string) => handleFilterChange('endDate', value)
    },
    {
      key: 'origem',
      label: 'Canal de Origem',
      type: 'select' as const,
      placeholder: 'Todos os Canais',
      value: filters.origem,
      onChange: (value: string) => handleFilterChange('origem', value),
      options: channelOptions
    },
    {
      key: 'status',
      label: 'Status da Empresa',
      type: 'select' as const,
      placeholder: 'Todos os Status',
      value: filters.status,
      onChange: (value: string) => handleFilterChange('status', value),
      options: statusOptions
    }
  ];

  return (
    <Card className="p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label>Canal</Label>
          <Select value={filters.origem || 'all'} onValueChange={(value) => onFiltersChange({ ...filters, origem: value === 'all' ? '' : value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar canal" />
            </SelectTrigger>
            <SelectContent>
              {channelOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={filters.status || 'all'} onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? '' : value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};

export default ReportsFilters; 