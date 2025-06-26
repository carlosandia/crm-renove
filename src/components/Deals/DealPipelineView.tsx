import React, { useState, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Plus, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { BlurFade } from '../ui/blur-fade';
import { DealKanbanColumn } from './DealKanbanColumn';
import { Deal } from '../../types/deals';

interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  color: string;
  probability: number;
}

interface DealPipelineViewProps {
  deals: Deal[];
  loading?: boolean;
  onViewDeal: (deal: Deal) => void;
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (deal: Deal) => void;
  onCreateDeal: (stageId?: string) => void;
}

export const DealPipelineView: React.FC<DealPipelineViewProps> = ({
  deals,
  loading = false,
  onViewDeal,
  onEditDeal,
  onDeleteDeal,
  onCreateDeal
}) => {
  // Mock stages - in real app, this would come from props or API
  const stages: PipelineStage[] = [
    { id: '1', name: 'Qualificação', order_index: 1, color: '#3b82f6', probability: 20 },
    { id: '2', name: 'Proposta', order_index: 2, color: '#f59e0b', probability: 40 },
    { id: '3', name: 'Negociação', order_index: 3, color: '#8b5cf6', probability: 70 },
    { id: '4', name: 'Fechamento', order_index: 4, color: '#10b981', probability: 90 }
  ];

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {};
    
    stages.forEach(stage => {
      grouped[stage.id] = deals.filter(deal => deal.stage_id === stage.id);
    });
    
    return grouped;
  }, [deals, stages]);

  // Calculate stage metrics
  const stageMetrics = useMemo(() => {
    return stages.map(stage => {
      const stageDeals = dealsByStage[stage.id] || [];
      const totalValue = stageDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
      const averageValue = stageDeals.length > 0 ? totalValue / stageDeals.length : 0;
      const weightedValue = totalValue * (stage.probability / 100);
      
      return {
        stageId: stage.id,
        stageName: stage.name,
        dealsCount: stageDeals.length,
        totalValue,
        averageValue,
        weightedValue,
        probability: stage.probability
      };
    });
  }, [dealsByStage, stages]);

  // Calculate total pipeline metrics
  const pipelineMetrics = useMemo(() => {
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
    const weightedValue = stageMetrics.reduce((sum, metric) => sum + metric.weightedValue, 0);
    const averageDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;
    
    return {
      totalDeals,
      totalValue,
      weightedValue,
      averageDealSize
    };
  }, [deals, stageMetrics]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    if (result.source.droppableId === result.destination.droppableId && 
        result.source.index === result.destination.index) {
      return;
    }

    // TODO: Implement actual deal movement logic
    console.log('Move deal:', result.draggableId, 'to stage:', result.destination.droppableId);
  };

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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-500">Carregando pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Pipeline Metrics Dashboard */}
      <BlurFade delay={0.1} inView>
        <div className="p-6 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total de Deals</p>
                  <p className="text-2xl font-bold text-blue-900">{pipelineMetrics.totalDeals}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600">Valor Total</p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {formatCurrency(pipelineMetrics.totalValue)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Valor Ponderado</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {formatCurrency(pipelineMetrics.weightedValue)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-500" />
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Ticket Médio</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(pipelineMetrics.averageDealSize)}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
          
          {/* Stage Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stageMetrics.map((metric, index) => (
              <BlurFade key={metric.stageId} delay={0.1 + (index * 0.05)} inView>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700">{metric.stageName}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {metric.probability}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Deals:</span>
                      <span className="font-medium">{metric.dealsCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Valor:</span>
                      <span className="font-medium">{formatCurrency(metric.totalValue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Ponderado:</span>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(metric.weightedValue)}
                      </span>
                    </div>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </BlurFade>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex h-full overflow-x-auto p-6 gap-6">
            {stages.map((stage, index) => (
              <BlurFade key={stage.id} delay={0.2 + (index * 0.1)} inView>
                <DealKanbanColumn
                  stage={stage}
                  deals={dealsByStage[stage.id] || []}
                  onViewDeal={onViewDeal}
                  onEditDeal={onEditDeal}
                  onDeleteDeal={onDeleteDeal}
                  onCreateDeal={() => onCreateDeal(stage.id)}
                />
              </BlurFade>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}; 