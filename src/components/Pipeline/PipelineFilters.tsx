
import React, { useState } from 'react';
import { Search, Filter, Calendar, User, Tag, SortAsc } from 'lucide-react';

interface PipelineFiltersProps {
  onSearchChange: (search: string) => void;
  onStatusFilter: (status: string) => void;
  onDateFilter: (dateRange: { start: string; end: string }) => void;
  onAssigneeFilter: (assigneeId: string) => void;
  onSortChange: (sortBy: string, direction: 'asc' | 'desc') => void;
}

const PipelineFilters: React.FC<PipelineFiltersProps> = ({
  onSearchChange,
  onStatusFilter,
  onDateFilter,
  onAssigneeFilter,
  onSortChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearchChange(value);
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4 space-y-4">
      {/* Linha principal de filtros */}
      <div className="flex items-center justify-between gap-4">
        {/* Barra de busca */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar leads por nome, email, telefone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center space-x-2">
          <select 
            onChange={(e) => onStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="won">Ganhos</option>
            <option value="lost">Perdidos</option>
          </select>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filtros Avançados</span>
          </button>

          <select 
            onChange={(e) => {
              const [sortBy, direction] = e.target.value.split(':');
              onSortChange(sortBy, direction as 'asc' | 'desc');
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="created_at:desc">Mais Recentes</option>
            <option value="created_at:asc">Mais Antigos</option>
            <option value="value:desc">Maior Valor</option>
            <option value="value:asc">Menor Valor</option>
            <option value="name:asc">Nome A-Z</option>
            <option value="name:desc">Nome Z-A</option>
          </select>
        </div>
      </div>

      {/* Filtros avançados (expandidos) */}
      {showAdvancedFilters && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por data */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Período de Criação
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    // Implementar lógica de filtro por data
                  }}
                />
                <input
                  type="date"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    // Implementar lógica de filtro por data
                  }}
                />
              </div>
            </div>

            {/* Filtro por responsável */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Responsável
              </label>
              <select 
                onChange={(e) => onAssigneeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os Responsáveis</option>
                <option value="user-1">João Silva</option>
                <option value="user-2">Maria Santos</option>
                <option value="user-3">Pedro Costa</option>
              </select>
            </div>

            {/* Filtro por tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todas as Tags</option>
                <option value="hot">Lead Quente</option>
                <option value="cold">Lead Frio</option>
                <option value="vip">Cliente VIP</option>
              </select>
            </div>
          </div>

          {/* Ações dos filtros avançados */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <button className="text-sm text-gray-500 hover:text-gray-700">
              Limpar Filtros
            </button>
            <div className="flex gap-2">
              <button className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Salvar Filtro
              </button>
              <button 
                onClick={() => setShowAdvancedFilters(false)}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineFilters;
