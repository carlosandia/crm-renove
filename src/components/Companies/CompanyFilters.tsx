import React from 'react';
import { Search, Building, Filter, RotateCcw } from 'lucide-react';
import { CompanyFilters as CompanyFiltersType } from '../../types/Company';

interface CompanyFiltersProps {
  filters: CompanyFiltersType;
  onFiltersChange: (filters: CompanyFiltersType) => void;
  totalCompanies: number;
  filteredCount: number;
}

const CompanyFilters: React.FC<CompanyFiltersProps> = ({
  filters,
  onFiltersChange,
  totalCompanies,
  filteredCount
}) => {
  const handleSearchChange = (searchTerm: string) => {
    onFiltersChange({ ...filters, searchTerm });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({ ...filters, status });
  };

  const handleReset = () => {
    onFiltersChange({ searchTerm: '', status: '', industry: '', adminStatus: '' });
  };

  const hasActiveFilters = filters.searchTerm || filters.status || filters.industry || filters.adminStatus;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Filter className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Filtrar Empresas</h3>
            <p className="text-sm text-slate-600">
              {filteredCount} de {totalCompanies} empresa{totalCompanies !== 1 ? 's' : ''}
              {hasActiveFilters && ' (filtrado)'}
            </p>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Busca */}
        <div className="md:col-span-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome da empresa, nicho, cidade ou administrador..."
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Status */}
        <div className="md:col-span-4">
          <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: '', label: 'Todas', count: totalCompanies },
              { id: 'active', label: 'Ativas', count: filteredCount },
              { id: 'inactive', label: 'Inativas', count: totalCompanies - filteredCount }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => handleStatusChange(option.id)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  filters.status === option.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span>{option.label}</span>
                  <span className="text-xs opacity-75">({option.count})</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Indicador de resultados */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-slate-600">
              <Building className="w-4 h-4" />
              <span>
                Mostrando <strong>{filteredCount}</strong> de <strong>{totalCompanies}</strong> empresas
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {filters.searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                  Busca: "{filters.searchTerm}"
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                  Status: {filters.status === 'active' ? 'Ativas' : 'Inativas'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyFilters; 