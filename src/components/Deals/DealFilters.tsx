import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface DealFiltersType {
  search?: string;
  pipeline_id?: string;
  stage_id?: string;
  owner_id?: string;
  status?: 'open' | 'won' | 'lost';
  amount_min?: number;
  amount_max?: number;
  close_date_from?: string;
  close_date_to?: string;
  probability_min?: number;
  probability_max?: number;
}

interface DealFiltersProps {
  filters: DealFiltersType;
  onFiltersChange: (filters: DealFiltersType) => void;
  onClearFilters: () => void;
}

export const DealFilters: React.FC<DealFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const handleInputChange = (key: keyof DealFiltersType, value: string | number) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const handleClearFilter = (key: keyof DealFiltersType) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const getActiveFilters = () => {
    return Object.entries(filters).filter(([key, value]) => 
      value !== undefined && value !== '' && key !== 'search'
    );
  };

  const activeFilters = getActiveFilters();

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar por nome do deal, empresa ou responsável..."
          value={filters.search || ''}
          onChange={(e) => handleInputChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pipeline Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Pipeline
          </label>
          <select
            value={filters.pipeline_id || ''}
            onChange={(e) => handleInputChange('pipeline_id', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os pipelines</option>
            <option value="1">Vendas</option>
            <option value="2">Parcerias</option>
            <option value="3">Upsell</option>
          </select>
        </div>

        {/* Stage Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Estágio
          </label>
          <select
            value={filters.stage_id || ''}
            onChange={(e) => handleInputChange('stage_id', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os estágios</option>
            <option value="1">Qualificação</option>
            <option value="2">Proposta</option>
            <option value="3">Negociação</option>
            <option value="4">Fechamento</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os status</option>
            <option value="open">Aberto</option>
            <option value="won">Ganho</option>
            <option value="lost">Perdido</option>
          </select>
        </div>

        {/* Owner Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Responsável
          </label>
          <select
            value={filters.owner_id || ''}
            onChange={(e) => handleInputChange('owner_id', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os responsáveis</option>
            <option value="1">João Silva</option>
            <option value="2">Maria Santos</option>
            <option value="3">Pedro Costa</option>
          </select>
        </div>
      </div>

      {/* Amount Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Valor Mínimo
          </label>
          <input
            type="number"
            placeholder="R$ 0"
            value={filters.amount_min || ''}
            onChange={(e) => handleInputChange('amount_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Valor Máximo
          </label>
          <input
            type="number"
            placeholder="R$ 999.999"
            value={filters.amount_max || ''}
            onChange={(e) => handleInputChange('amount_max', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Data de Fechamento (De)
          </label>
          <input
            type="date"
            value={filters.close_date_from || ''}
            onChange={(e) => handleInputChange('close_date_from', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Data de Fechamento (Até)
          </label>
          <input
            type="date"
            value={filters.close_date_to || ''}
            onChange={(e) => handleInputChange('close_date_to', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filtros ativos:
          </span>
          {activeFilters.map(([key, value]) => (
            <Badge
              key={key}
              variant="secondary"
              className="flex items-center gap-1 text-xs"
            >
              <span>
                {key === 'pipeline_id' && 'Pipeline'}
                {key === 'stage_id' && 'Estágio'}
                {key === 'status' && 'Status'}
                {key === 'owner_id' && 'Responsável'}
                {key === 'amount_min' && 'Valor Min'}
                {key === 'amount_max' && 'Valor Max'}
                {key === 'close_date_from' && 'Data De'}
                {key === 'close_date_to' && 'Data Até'}
                {key === 'probability_min' && 'Prob. Min'}
                {key === 'probability_max' && 'Prob. Max'}
                : {value}
              </span>
              <button
                onClick={() => handleClearFilter(key as keyof DealFiltersType)}
                className="hover:text-slate-700 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Limpar todos
          </Button>
        </div>
      )}
    </div>
  );
}; 