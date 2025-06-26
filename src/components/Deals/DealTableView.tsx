import React from 'react';
import { MoreVertical, DollarSign, Calendar, TrendingUp, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Deal } from '../../types/deals';

interface DealTableViewProps {
  deals: Deal[];
  loading?: boolean;
  onViewDeal: (deal: Deal) => void;
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (deal: Deal) => void;
}

export const DealTableView: React.FC<DealTableViewProps> = ({
  deals,
  loading = false,
  onViewDeal,
  onEditDeal,
  onDeleteDeal
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'won':
        return <Badge className="bg-emerald-100 text-emerald-800">Ganho</Badge>;
      case 'lost':
        return <Badge variant="destructive">Perdido</Badge>;
      case 'open':
      default:
        return <Badge variant="secondary">Aberto</Badge>;
    }
  };

  const getProbabilityBadge = (probability?: number) => {
    if (probability === undefined) return null;
    
    if (probability >= 80) {
      return <Badge className="bg-emerald-100 text-emerald-800">{probability}%</Badge>;
    } else if (probability >= 50) {
      return <Badge className="bg-amber-100 text-amber-800">{probability}%</Badge>;
    } else {
      return <Badge variant="outline">{probability}%</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                <div className="h-4 bg-slate-200 rounded w-1/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
          <DollarSign className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          Nenhum deal encontrado
        </h3>
        <p className="text-slate-500 text-center max-w-md">
          Não há deals que correspondam aos filtros aplicados. Tente ajustar os filtros ou criar um novo deal.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Deal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Estágio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Probabilidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Fechamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Responsável
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {deals.map((deal) => (
                <tr 
                  key={deal.id} 
                  className="hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                  onClick={() => onViewDeal(deal)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {deal.deal_name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {deal.company_name || 'Empresa não informada'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-emerald-500 mr-1" />
                      <span className="text-sm font-medium text-emerald-600">
                        {formatCurrency(deal.amount || 0)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-900">
                      {/* This would come from stage lookup in real app */}
                      Estágio {deal.stage_id}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getProbabilityBadge(deal.probability)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {deal.close_date ? (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-slate-400 mr-1" />
                        <span className="text-sm text-slate-900">
                          {formatDate(deal.close_date)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Não definida</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-900">
                      {deal.owner_name || 'Não atribuído'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(deal.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onViewDeal(deal);
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onEditDeal(deal);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDeal(deal);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            onClick={() => onViewDeal(deal)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-900 truncate">
                  {deal.deal_name}
                </h3>
                <p className="text-sm text-slate-500 truncate">
                  {deal.company_name || 'Empresa não informada'}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onViewDeal(deal);
                  }}>
                    Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEditDeal(deal);
                  }}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDeal(deal);
                    }}
                  >
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 text-emerald-500 mr-1" />
                <span className="text-sm font-medium text-emerald-600">
                  {formatCurrency(deal.amount || 0)}
                </span>
              </div>
              {getStatusBadge(deal.status)}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Probabilidade:</span>
                <div className="mt-1">
                  {getProbabilityBadge(deal.probability) || (
                    <span className="text-slate-400">Não definida</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Fechamento:</span>
                <div className="mt-1 text-slate-900">
                  {deal.close_date ? formatDate(deal.close_date) : 'Não definida'}
                </div>
              </div>
            </div>

            {deal.owner_name && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">Responsável: </span>
                <span className="text-xs font-medium text-slate-900">
                  {deal.owner_name}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 