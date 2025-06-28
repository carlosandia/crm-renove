import React from 'react';
import { FilterPanel } from '../ui/filter-panel';

interface FeedbackFiltersProps {
  searchTerm: string;
  filterType: 'all' | 'positive' | 'negative';
  companyFilter: string;
  vendorFilter: string;
  sourceFilter: string;
  companies: string[];
  vendors: { id: string; name: string; }[];
  onSearchChange: (value: string) => void;
  onTypeChange: (value: 'all' | 'positive' | 'negative') => void;
  onCompanyChange: (value: string) => void;
  onVendorChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onClearFilters: () => void;
}

const FeedbackFilters: React.FC<FeedbackFiltersProps> = ({
  searchTerm,
  filterType,
  companyFilter,
  vendorFilter,
  sourceFilter,
  companies,
  vendors,
  onSearchChange,
  onTypeChange,
  onCompanyChange,
  onVendorChange,
  onSourceChange,
  onClearFilters
}) => {
  const activeFiltersCount = [
    filterType !== 'all',
    companyFilter,
    vendorFilter,
    sourceFilter
  ].filter(Boolean).length;

  const filters = [
    {
      key: 'type',
      label: 'Tipo de Feedback',
      type: 'select' as const,
      placeholder: 'Todos os Feedbacks',
      value: filterType,
      onChange: onTypeChange,
      options: [
        { value: 'all', label: 'Todos os Feedbacks' },
        { value: 'positive', label: 'Apenas Positivos' },
        { value: 'negative', label: 'Apenas Negativos' }
      ]
    },
    {
      key: 'company',
      label: 'Empresa',
      type: 'select' as const,
      placeholder: 'Todas as Empresas',
      value: companyFilter,
      onChange: onCompanyChange,
      options: [
        { value: 'all', label: 'Todas as Empresas' },
        ...companies.map(company => ({
          value: company,
          label: company
        }))
      ]
    },
    {
      key: 'vendor',
      label: 'Vendedor',
      type: 'select' as const,
      placeholder: 'Todos os Vendedores',
      value: vendorFilter,
      onChange: onVendorChange,
      options: [
        { value: 'all', label: 'Todos os Vendedores' },
        ...vendors.map(vendor => ({ value: vendor.id, label: vendor.name }))
      ]
    },
    {
      key: 'source',
      label: 'Canal',
      type: 'select' as const,
      placeholder: 'Todos os Canais',
      value: sourceFilter,
      onChange: onSourceChange,
      options: [
        { value: 'all', label: 'Todos os Canais' },
        { value: 'meta', label: 'Meta Ads' },
        { value: 'google', label: 'Google Ads' },
        { value: 'linkedin', label: 'LinkedIn Ads' },
        { value: 'webhook', label: 'Webhook' },
        { value: 'form', label: 'Formulário' },
        { value: 'manual', label: 'Manual' }
      ]
    }
  ];

  return (
    <FilterPanel 
      filters={filters}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      searchPlaceholder="Buscar por vendedor, empresa, lead, pipeline, canal..."
      onReset={onClearFilters}
      showSearch={true}
    />
  );
};

export default FeedbackFilters; 