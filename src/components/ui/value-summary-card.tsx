// =====================================================================================
// COMPONENT: ValueSummaryCard
// Autor: Claude (Arquiteto Sênior)
// Descrição: Card visual para resumo de valores flexíveis
// =====================================================================================

import React, { useMemo } from 'react';
import { DollarSign, Repeat, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { NumberTicker } from '../magicui/number-ticker';
import { cn } from '../../lib/utils';

// Interface para os valores
interface ValueSummaryData {
  valorUnico?: number;
  valorRecorrente?: number;
  recorrenciaPeriodo?: number;
  recorrenciaUnidade?: 'mes' | 'ano';
  tipoVenda: 'unico' | 'recorrente' | 'hibrido';
  valorObservacoes?: string;
}

// Props do componente
interface ValueSummaryCardProps {
  values: ValueSummaryData;
  variant?: 'default' | 'compact' | 'dashboard';
  showAnimation?: boolean;
  showBreakdown?: boolean;
  className?: string;
  onClick?: () => void;
}

export const ValueSummaryCard: React.FC<ValueSummaryCardProps> = ({
  values,
  variant = 'default',
  showAnimation = true,
  showBreakdown = false,
  className,
  onClick
}) => {
  // Valor total calculado
  const valorTotal = useMemo(() => {
    const unico = values.valorUnico || 0;
    const recorrente = (values.valorRecorrente || 0) * (values.recorrenciaPeriodo || 0);
    return unico + recorrente;
  }, [values.valorUnico, values.valorRecorrente, values.recorrenciaPeriodo]);

  // Formatação de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Configurações visuais por tipo
  const typeConfigs = {
    unico: {
      icon: DollarSign,
      color: 'bg-blue-500',
      badge: 'Venda Única',
      badgeVariant: 'default' as const
    },
    recorrente: {
      icon: Repeat,
      color: 'bg-purple-500',
      badge: 'Recorrente',
      badgeVariant: 'secondary' as const
    },
    hibrido: {
      icon: TrendingUp,
      color: 'bg-green-500',
      badge: 'Híbrido',
      badgeVariant: 'outline' as const
    }
  };

  const config = typeConfigs[values.tipoVenda];
  const IconComponent = config.icon;

  // Renderização compacta
  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors",
          className
        )}
        onClick={onClick}
      >
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config.color)}>
          <IconComponent className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">
            {showAnimation ? (
              <span>R$ <NumberTicker value={valorTotal} /></span>
            ) : (
              formatCurrency(valorTotal)
            )}
          </div>
          <div className="text-xs text-gray-500">{config.badge}</div>
        </div>
      </div>
    );
  }

  // Renderização para dashboard
  if (variant === 'dashboard') {
    return (
      <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", className)} onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.color)}>
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <Badge variant={config.badgeVariant} className="text-xs">
              {config.badge}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">
              {showAnimation ? (
                <span>R$ <NumberTicker value={valorTotal} /></span>
              ) : (
                formatCurrency(valorTotal)
              )}
            </div>
            
            {values.tipoVenda === 'recorrente' && values.valorRecorrente && values.recorrenciaPeriodo && (
              <div className="text-sm text-gray-600">
                {formatCurrency(values.valorRecorrente)}/mês × {values.recorrenciaPeriodo}m
              </div>
            )}
            
            {values.tipoVenda === 'hibrido' && showBreakdown && (
              <div className="text-xs text-gray-500 space-y-1">
                {values.valorUnico && values.valorUnico > 0 && (
                  <div>Único: {formatCurrency(values.valorUnico)}</div>
                )}
                {values.valorRecorrente && values.recorrenciaPeriodo && (
                  <div>Rec.: {formatCurrency(values.valorRecorrente)} × {values.recorrenciaPeriodo}m</div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Renderização padrão
  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4",
        config.color.replace('bg-', 'border-l-'),
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", config.color)}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Valor da Oportunidade</h3>
              <Badge variant={config.badgeVariant} className="mt-1">
                {config.badge}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Valor Total */}
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {showAnimation ? (
                <span>R$ <NumberTicker value={valorTotal} decimalPlaces={2} /></span>
              ) : (
                formatCurrency(valorTotal)
              )}
            </div>
            <p className="text-sm text-gray-500">Valor Total</p>
          </div>

          {/* Breakdown detalhado */}
          {showBreakdown && (
            <div className="border-t pt-3 space-y-2">
              {values.tipoVenda === 'unico' && values.valorUnico && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Venda única:</span>
                  <span className="font-medium">{formatCurrency(values.valorUnico)}</span>
                </div>
              )}

              {values.tipoVenda === 'recorrente' && values.valorRecorrente && values.recorrenciaPeriodo && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Valor mensal:</span>
                    <span className="font-medium">{formatCurrency(values.valorRecorrente)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Período:
                    </span>
                    <span className="font-medium">{values.recorrenciaPeriodo} meses</span>
                  </div>
                </div>
              )}

              {values.tipoVenda === 'hibrido' && (
                <div className="space-y-2">
                  {values.valorUnico && values.valorUnico > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Venda única:</span>
                      <span className="font-medium">{formatCurrency(values.valorUnico)}</span>
                    </div>
                  )}
                  {values.valorRecorrente && values.recorrenciaPeriodo && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Recorrente:</span>
                      <span className="font-medium">
                        {formatCurrency(values.valorRecorrente)} × {values.recorrenciaPeriodo}m
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Observações */}
          {values.valorObservacoes && (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 italic">
                {values.valorObservacoes.length > 60 
                  ? values.valorObservacoes.substring(0, 60) + '...'
                  : values.valorObservacoes
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para badge de tipo de venda
interface SaleTypeBadgeProps {
  type: 'unico' | 'recorrente' | 'hibrido';
  className?: string;
}

export const SaleTypeBadge: React.FC<SaleTypeBadgeProps> = ({ type, className }) => {
  const configs = {
    unico: {
      label: 'Único',
      variant: 'default' as const,
      icon: DollarSign
    },
    recorrente: {
      label: 'Recorrente',
      variant: 'secondary' as const,
      icon: Repeat
    },
    hibrido: {
      label: 'Híbrido',
      variant: 'outline' as const,
      icon: TrendingUp
    }
  };

  const config = configs[type];
  const IconComponent = config.icon;

  return (
    <Badge variant={config.variant} className={cn("flex items-center gap-1", className)}>
      <IconComponent className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

// Hook para formatação de valores
export const useValueFormatting = () => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return formatCurrency(value);
  };

  const getValueDescription = (values: ValueSummaryData) => {
    const { tipoVenda, valorUnico, valorRecorrente, recorrenciaPeriodo } = values;
    
    if (tipoVenda === 'unico') {
      return 'Pagamento único';
    } else if (tipoVenda === 'recorrente') {
      return `${formatCurrency(valorRecorrente || 0)}/mês por ${recorrenciaPeriodo} meses`;
    } else {
      return 'Pagamento híbrido (único + recorrente)';
    }
  };

  return {
    formatCurrency,
    formatCompactCurrency,
    getValueDescription
  };
};

export default ValueSummaryCard;