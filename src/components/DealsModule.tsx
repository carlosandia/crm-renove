import React, { useState } from 'react';
import { Plus, Download, Upload, BarChart3, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { BlurFade } from './ui/blur-fade';

// Temporary mock data and interfaces until we create the full deal components
interface Deal {
  id: string;
  deal_name: string;
  company_name?: string;
  amount?: number;
  stage_id: string;
  status?: 'open' | 'won' | 'lost';
  probability?: number;
  close_date?: string;
  owner_name?: string;
}

interface DealStats {
  totalValue: number;
  totalDeals: number;
  wonDeals: number;
  conversionRate: number;
  averageDealSize: number;
  monthlyGrowth: number;
}

interface DealFilters {
  search?: string;
  pipeline_id?: string;
  stage_id?: string;
  status?: 'open' | 'won' | 'lost';
}

// Mock components until we create the real ones
const DealStatsCards: React.FC<{ stats?: DealStats; loading?: boolean }> = ({ stats, loading }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-20"></div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
                <div className="h-3 bg-slate-200 rounded w-24"></div>
              </div>
              <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { title: 'Valor Total', value: formatCurrency(stats?.totalValue || 0), subtitle: `${stats?.totalDeals || 0} deals` },
    { title: 'Deals Fechados', value: stats?.wonDeals?.toString() || '0', subtitle: `${stats?.conversionRate || 0}% conversão` },
    { title: 'Ticket Médio', value: formatCurrency(stats?.averageDealSize || 0), subtitle: 'Por deal fechado' },
    { title: 'Crescimento', value: `${stats?.monthlyGrowth || 0}%`, subtitle: 'Vs mês anterior' }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <BlurFade key={card.title} delay={0.1 + (index * 0.05)} inView>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500">{card.subtitle}</p>
            </div>
          </div>
        </BlurFade>
      ))}
    </div>
  );
};

const DealFilters: React.FC<{ filters: DealFilters; onFiltersChange: (filters: DealFilters) => void }> = ({ filters, onFiltersChange }) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar deals..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select
          value={filters.pipeline_id || ''}
          onChange={(e) => onFiltersChange({ ...filters, pipeline_id: e.target.value })}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os pipelines</option>
          <option value="1">Vendas</option>
          <option value="2">Parcerias</option>
        </select>
        <select
          value={filters.stage_id || ''}
          onChange={(e) => onFiltersChange({ ...filters, stage_id: e.target.value })}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os estágios</option>
          <option value="1">Qualificação</option>
          <option value="2">Proposta</option>
          <option value="3">Negociação</option>
          <option value="4">Fechamento</option>
        </select>
        <select
          value={filters.status || ''}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as any })}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="open">Aberto</option>
          <option value="won">Ganho</option>
          <option value="lost">Perdido</option>
        </select>
      </div>
    </div>
  );
};

const DealPipelineView: React.FC<{ deals: Deal[]; loading?: boolean }> = ({ deals, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-500">Carregando pipeline...</p>
        </div>
      </div>
    );
  }

  const stages = [
    { id: '1', name: 'Qualificação', color: '#3b82f6' },
    { id: '2', name: 'Proposta', color: '#f59e0b' },
    { id: '3', name: 'Negociação', color: '#8b5cf6' },
    { id: '4', name: 'Fechamento', color: '#10b981' }
  ];

  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(deal => deal.stage_id === stage.id);
    return acc;
  }, {} as Record<string, Deal[]>);

  return (
    <div className="flex overflow-x-auto p-6 gap-6 h-full">
      {stages.map((stage) => (
        <div key={stage.id} className="flex flex-col w-80 bg-slate-50 rounded-lg">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
              <h3 className="font-semibold text-slate-900">{stage.name}</h3>
              <Badge variant="secondary">{dealsByStage[stage.id]?.length || 0}</Badge>
            </div>
          </div>
          <div className="flex-1 p-4 space-y-3">
            {dealsByStage[stage.id]?.map((deal) => (
              <div key={deal.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                <h4 className="font-medium text-slate-900 mb-2">{deal.deal_name}</h4>
                <p className="text-sm text-slate-500 mb-2">{deal.company_name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-600">
                    R$ {(deal.amount || 0).toLocaleString()}
                  </span>
                  {deal.probability && (
                    <Badge variant="outline">{deal.probability}%</Badge>
                  )}
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">Nenhum deal neste estágio</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export const DealsModule: React.FC = () => {
  const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline');
  const [filters, setFilters] = useState<DealFilters>({});
  const [loading] = useState(false);

  // Mock data
  const mockStats: DealStats = {
    totalValue: 450000,
    totalDeals: 12,
    wonDeals: 3,
    conversionRate: 25,
    averageDealSize: 37500,
    monthlyGrowth: 15.5
  };

  const mockDeals: Deal[] = [
    { id: '1', deal_name: 'Venda Sistema CRM', company_name: 'TechCorp', amount: 50000, stage_id: '1', probability: 30, status: 'open' },
    { id: '2', deal_name: 'Consultoria Digital', company_name: 'StartupXYZ', amount: 25000, stage_id: '2', probability: 60, status: 'open' },
    { id: '3', deal_name: 'Licenças Software', company_name: 'BigCorp', amount: 75000, stage_id: '3', probability: 80, status: 'open' },
    { id: '4', deal_name: 'Projeto Custom', company_name: 'MediumCorp', amount: 40000, stage_id: '4', probability: 95, status: 'open' }
  ];

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <BlurFade delay={0.1} inView>
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Pipeline de Vendas
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Gerencie seus deals e oportunidades de vendas
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'pipeline' ? 'table' : 'pipeline')}
                className="flex items-center gap-2"
              >
                {viewMode === 'pipeline' ? (
                  <>
                    <Eye className="w-4 h-4" />
                    Tabela
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Pipeline
                  </>
                )}
              </Button>

              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
              
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Importar
              </Button>
              
              <Button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600">
                <Plus className="w-4 h-4" />
                Novo Deal
              </Button>
            </div>
          </div>
        </div>
      </BlurFade>

      {/* Stats Cards */}
      <BlurFade delay={0.2} inView>
        <div className="px-6 py-4">
          <DealStatsCards stats={mockStats} loading={loading} />
        </div>
      </BlurFade>

      {/* Filters */}
      <BlurFade delay={0.3} inView>
        <div className="px-6 pb-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-900">Filtros</h3>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <DealFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </div>
      </BlurFade>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6 min-h-0">
        <BlurFade delay={0.4} inView className="h-full">
          <div className="bg-white rounded-lg border border-slate-200 h-full">
            {viewMode === 'pipeline' ? (
              <DealPipelineView deals={mockDeals} loading={loading} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Visualização em Tabela
                  </h3>
                  <p className="text-slate-500">
                    Em desenvolvimento - Use a visualização em Pipeline
                  </p>
                </div>
              </div>
            )}
          </div>
        </BlurFade>
      </div>
    </div>
  );
}; 