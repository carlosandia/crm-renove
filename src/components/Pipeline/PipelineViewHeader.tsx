
import React from 'react';
import { Plus, Users, DollarSign, CheckCircle, Search, Filter } from 'lucide-react';

interface Pipeline {
  id: string;
  name: string;
  description: string;
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
  return (
    <div className="pipeline-internal-header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold text-gray-900">Pipeline de Vendas</h1>
          
          {/* Métricas inline */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">Total de Leads:</span>
              <span className="font-semibold text-gray-900">{totalLeads}</span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-gray-600">Receita Total:</span>
              <span className="font-semibold text-gray-900">R$ {totalRevenue.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-purple-500" />
              <span className="text-gray-600">Fechados:</span>
              <span className="font-semibold text-gray-900">R$ 0</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <select 
            value={selectedPipeline?.id || ''} 
            onChange={(e) => {
              const pipeline = pipelines.find(p => p.id === e.target.value);
              onPipelineChange(pipeline || null);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pipelines.map(pipeline => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
          
          <button
            onClick={onAddLead}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Oportunidade</span>
          </button>
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar leads por nome, email, telefone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span>Filtro Personalizado</span>
          </button>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Ativos (Novo → Negociação)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default PipelineViewHeader;
