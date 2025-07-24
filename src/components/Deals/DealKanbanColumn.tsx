import React from 'react';
import { Plus, MoreVertical, DollarSign } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Deal } from '../../types/deals';

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  color: string;
  probability: number;
}

interface DealKanbanColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  onViewDeal: (deal: Deal) => void;
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (deal: Deal) => void;
  onCreateDeal: () => void;
}

export const DealKanbanColumn: React.FC<DealKanbanColumnProps> = ({
  stage,
  deals,
  onViewDeal,
  onEditDeal,
  onDeleteDeal,
  onCreateDeal
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

  const totalValue = deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);

  return (
    <div className="flex flex-col w-80 bg-slate-50 rounded-lg">
      {/* Column Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-slate-900">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {deals.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateDeal}
            className="p-1 h-auto"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{stage.probability}% probabilidade</span>
          <span className="font-medium">{formatCurrency(totalValue)}</span>
        </div>
      </div>

      {/* Area dos deals (drag-and-drop temporariamente desabilitado) */}
      <div className="flex-1 p-4 space-y-3 min-h-[400px]">
        {deals.map((deal, index) => (
          <div
            key={deal.id}
            className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer group"
            onClick={() => onViewDeal(deal)}
          >
                    {/* Deal Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 truncate">
                          {deal.deal_name || 'Deal sem nome'}
                        </h4>
                        <p className="text-sm text-slate-500 truncate">
                          {deal.company_name || 'Empresa não informada'}
                        </p>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
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

                    {/* Deal Value */}
                    <div className="flex items-center gap-1 mb-3">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(deal.amount || 0)}
                      </span>
                    </div>

                    {/* Deal Info */}
                    <div className="space-y-2">
                      {deal.close_date && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Fechamento:</span>
                          <span className="font-medium">{formatDate(deal.close_date)}</span>
                        </div>
                      )}
                      
                      {deal.probability !== undefined && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Probabilidade:</span>
                          <Badge 
                            variant={deal.probability >= 70 ? 'default' : deal.probability >= 40 ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {deal.probability}%
                          </Badge>
                        </div>
                      )}
                      
                      {deal.owner_name && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Responsável:</span>
                          <span className="font-medium truncate max-w-[120px]">
                            {deal.owner_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Deal Status */}
                    {deal.status && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <Badge 
                          variant={
                            deal.status === 'won' ? 'default' : 
                            deal.status === 'lost' ? 'destructive' : 
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {deal.status === 'open' && 'Aberto'}
                          {deal.status === 'won' && 'Ganho'}
                          {deal.status === 'lost' && 'Perdido'}
                        </Badge>
                      </div>
                    )}
            </div>
          ))}
          
          {/* Empty State */}
          {deals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center mb-3">
                <DollarSign className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 mb-2">Nenhum deal neste estágio</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCreateDeal}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Adicionar deal
              </Button>
            </div>
          )}
        </div>
    </div>
  );
}; 