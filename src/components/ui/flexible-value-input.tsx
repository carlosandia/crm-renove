// =====================================================================================
// COMPONENT: FlexibleValueInput
// Autor: Claude (Arquiteto Sênior)
// Descrição: Input flexível para valores únicos, recorrentes e híbridos
// =====================================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Repeat, TrendingUp, Calculator, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { CurrencyInput } from './masked-input';
import { NumberTicker } from '../magicui/number-ticker';
import { cn } from '../../lib/utils';
import { useFlexibleValues, FlexibleValues } from '../../hooks/useFlexibleValues';

// Tipos de venda disponíveis
type SaleType = 'unico' | 'recorrente' | 'hibrido';

// Interface local do componente (compatível com o hook)
interface ComponentFlexibleValues {
  valor_unico?: number;
  valor_recorrente?: number;
  recorrencia_periodo?: number;
  recorrencia_unidade?: 'mes' | 'ano';
  tipo_venda: SaleType;
}

// Props do componente
interface FlexibleValueInputProps {
  initialValues?: Partial<ComponentFlexibleValues>;
  onValueChange?: (values: ComponentFlexibleValues) => void;
  disabled?: boolean;
  className?: string;
  leadId: string; // Obrigatório para persistência
  pipelineId: string; // Obrigatório para persistência
  autoSave?: boolean; // Se deve salvar automaticamente
}

export const FlexibleValueInput: React.FC<FlexibleValueInputProps> = ({
  initialValues = {},
  onValueChange,
  disabled = false,
  className,
  leadId,
  pipelineId,
  autoSave = true
}) => {
  // Hook para valores flexíveis
  const { 
    updateValues: saveValues, 
    isUpdating, 
    isError, 
    error,
    calculateTotal,
    determineSaleType
  } = useFlexibleValues(pipelineId);

  // Estado interno dos valores
  const [values, setValues] = useState<ComponentFlexibleValues>({
    valor_unico: initialValues.valor_unico || 0,
    valor_recorrente: initialValues.valor_recorrente || 0,
    recorrencia_periodo: initialValues.recorrencia_periodo || 1,
    recorrencia_unidade: initialValues.recorrencia_unidade || 'mes',
    tipo_venda: initialValues.tipo_venda || 'unico'
  });

  // Valor total calculado
  const valorTotal = useMemo(() => {
    return calculateTotal({
      valor_unico: values.valor_unico,
      valor_recorrente: values.valor_recorrente,
      recorrencia_periodo: values.recorrencia_periodo
    });
  }, [values.valor_unico, values.valor_recorrente, values.recorrencia_periodo, calculateTotal]);

  // Função para converter valores locais para API
  const convertToApiFormat = (localValues: ComponentFlexibleValues): FlexibleValues => {
    return {
      valor_unico: localValues.valor_unico,
      valor_recorrente: localValues.valor_recorrente,
      recorrencia_periodo: localValues.recorrencia_periodo,
      recorrencia_unidade: localValues.recorrencia_unidade,
      tipo_venda: localValues.tipo_venda
    };
  };

  // Atualizar valores quando mudarem
  const updateValues = async (newValues: Partial<ComponentFlexibleValues>) => {
    const updatedValues = { ...values, ...newValues };
    
    // Determinar tipo de venda automaticamente se não especificado
    if (!newValues.tipo_venda) {
      updatedValues.tipo_venda = determineSaleType({
        valor_unico: updatedValues.valor_unico,
        valor_recorrente: updatedValues.valor_recorrente,
        recorrencia_periodo: updatedValues.recorrencia_periodo
      });
    }
    
    setValues(updatedValues);
    
    // Chamar callback local se fornecido
    if (onValueChange) {
      onValueChange(updatedValues);
    }

    // Auto-save se habilitado
    if (autoSave && leadId && pipelineId) {
      try {
        await saveValues(leadId, convertToApiFormat(updatedValues));
      } catch (error) {
        console.error('Erro ao salvar valores flexíveis:', error);
      }
    }
  };

  // Handler para mudança do select
  const handleTypeChange = (type: SaleType) => {
    updateValues({ tipo_venda: type });
  };

  // Formatação de moeda para exibição
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Configurações das opções de venda
  const saleTypeOptions = [
    {
      value: 'unico' as SaleType,
      label: 'Venda Única',
      icon: '💰',
      description: 'Pagamento único'
    },
    {
      value: 'recorrente' as SaleType,
      label: 'Recorrência',
      icon: '🔄',
      description: 'Pagamento mensal'
    },
    {
      value: 'hibrido' as SaleType,
      label: 'Híbrido',
      icon: '📈',
      description: 'Ambos os tipos'
    }
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status de Salvamento */}
      {isUpdating && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Salvando valores...</span>
        </div>
      )}
      
      {isError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <span>❌ Erro ao salvar: {error?.message}</span>
        </div>
      )}

      {/* Header: Título + Select */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gray-600" />
          <span className="text-lg font-medium text-gray-900">Valor da Oportunidade</span>
        </div>
        
        <Select
          value={values.tipo_venda}
          onValueChange={handleTypeChange}
          disabled={disabled || isUpdating}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo de venda" />
          </SelectTrigger>
          <SelectContent>
            {saleTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Seção Venda Única */}
      {(values.tipo_venda === 'unico' || values.tipo_venda === 'hibrido') && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <DollarSign className="w-4 h-4" />
              Valor da Venda Única
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div>
              <Label htmlFor="valor-unico" className="text-sm font-medium">
                Valor Total
              </Label>
              <CurrencyInput
                id="valor-unico"
                value={values.valor_unico}
                onValueChange={(value) => updateValues({ valor_unico: Number(value) || 0 })}
                placeholder="Ex: R$ 40.000,00"
                disabled={disabled}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção Recorrência */}
      {(values.tipo_venda === 'recorrente' || values.tipo_venda === 'hibrido') && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-purple-700">
              <Repeat className="w-4 h-4" />
              Valor Recorrente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="valor-recorrente" className="text-sm font-medium">
                  Valor Mensal
                </Label>
                <CurrencyInput
                  id="valor-recorrente"
                  value={values.valor_recorrente}
                  onValueChange={(value) => updateValues({ valor_recorrente: Number(value) || 0 })}
                  placeholder="Ex: R$ 1.500,00"
                  disabled={disabled}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="periodo" className="text-sm font-medium">
                  Período (meses)
                </Label>
                <Input
                  id="periodo"
                  type="number"
                  min="1"
                  max="120"
                  value={values.recorrencia_periodo}
                  onChange={(e) => updateValues({ recorrencia_periodo: Number(e.target.value) || 1 })}
                  placeholder="Ex: 6"
                  disabled={disabled}
                  className="mt-1"
                />
              </div>
            </div>
            
            {/* Preview da recorrência */}
            {values.valor_recorrente && values.recorrencia_periodo && (
              <div className="text-sm text-purple-600 bg-purple-100/80 p-2 rounded-lg">
                <span className="font-medium">Resumo:</span>{' '}
                {formatCurrency(values.valor_recorrente)} × {values.recorrencia_periodo} meses = {' '}
                <span className="font-bold">
                  {formatCurrency((values.valor_recorrente || 0) * (values.recorrencia_periodo || 0))}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumo Total */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-600" />
              <span className="text-base font-medium text-green-800">Valor Total:</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-600">
                R$ <NumberTicker 
                  value={valorTotal}
                  decimalPlaces={2}
                  className="text-green-600"
                />
              </div>
            </div>
          </div>
          
          {/* Breakdown detalhado para vendas híbridas */}
          {values.tipo_venda === 'hibrido' && valorTotal > 0 && (
            <div className="mt-2 text-sm text-green-700 space-y-1">
              {values.valor_unico && values.valor_unico > 0 && (
                <div className="flex justify-between">
                  <span>Venda única:</span>
                  <span className="font-medium">{formatCurrency(values.valor_unico)}</span>
                </div>
              )}
              {values.valor_recorrente && values.recorrencia_periodo && (
                <div className="flex justify-between">
                  <span>Recorrente ({values.recorrencia_periodo} meses):</span>
                  <span className="font-medium">
                    {formatCurrency((values.valor_recorrente || 0) * (values.recorrencia_periodo || 0))}
                  </span>
                </div>
              )}
              <hr className="border-green-300" />
            </div>
          )}
          
          {/* Mensagem quando não há valor */}
          {valorTotal === 0 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Configure os valores acima para ver o total
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para exibição resumida (apenas leitura)
interface ValueDisplayProps {
  values: FlexibleValues;
  showBreakdown?: boolean;
  className?: string;
}

export const ValueDisplay: React.FC<ValueDisplayProps> = ({
  values,
  showBreakdown = false,
  className
}) => {
  const valorTotal = useMemo(() => {
    const unico = values.valor_unico || 0;
    const recorrente = (values.valor_recorrente || 0) * (values.recorrencia_periodo || 0);
    return unico + recorrente;
  }, [values.valor_unico, values.valor_recorrente, values.recorrencia_periodo]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-lg font-semibold text-green-600">
        {formatCurrency(valorTotal)}
      </div>
      
      {showBreakdown && values.tipo_venda === 'hibrido' && (
        <div className="text-xs text-gray-600 space-y-1">
          {values.valor_unico && values.valor_unico > 0 && (
            <div>Único: {formatCurrency(values.valor_unico)}</div>
          )}
          {values.valor_recorrente && values.recorrencia_periodo && (
            <div>
              Recorrente: {formatCurrency(values.valor_recorrente)} × {values.recorrencia_periodo}m
            </div>
          )}
        </div>
      )}
      
    </div>
  );
};

export default FlexibleValueInput;