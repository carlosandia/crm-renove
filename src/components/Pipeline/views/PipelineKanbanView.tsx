import React from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { Pipeline, Lead } from '../../../types/Pipeline';
import { User } from '../../../types/User';
import { BlurFade } from '../../ui/blur-fade';
import { AnimatedCard } from '../../ui/animated-card';
import { ShimmerButton } from '../../ui/shimmer-button';
import { Button } from '../../ui/button';
import { CardHeader, CardDescription, CardTitle } from '../../ui/card';
import PipelineKanbanBoard from '../PipelineKanbanBoard';
import { usePipelineMetrics } from '../../../hooks/usePipelineMetrics';
import { useDragDropManager } from '../dnd/DragDropManager';
import { Plus, ArrowLeft, Edit } from 'lucide-react';

export interface PipelineKanbanViewProps {
  viewingPipeline: Pipeline;
  leads: Lead[];
  availableMembers: User[];
  searchFilter: string;
  selectedMemberFilter: string;
  onBackToList: () => void;
  onEditPipeline: (pipeline: Pipeline) => void;
  onAddLead: () => void;
  onEditLead: (lead: Lead) => void;
  onLeadMove: (leadId: string, stageId: string) => Promise<void>;
  onRefreshLeads: () => Promise<void>;
}

export const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({
  viewingPipeline,
  leads,
  availableMembers,
  searchFilter,
  selectedMemberFilter,
  onBackToList,
  onEditPipeline,
  onAddLead,
  onEditLead,
  onLeadMove,
  onRefreshLeads
}) => {
  // Hook para métricas da pipeline - corrigido para usar parâmetros corretos
  const pipelineMetrics = usePipelineMetrics(
    viewingPipeline?.pipeline_stages || [],
    leads,
    viewingPipeline?.id
  );

  // Hook para drag and drop
  const dragDropManager = useDragDropManager({
    viewingPipeline,
    leads,
    onLeadMove,
    onRefreshLeads
  });

  // Configuração dos sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Aumentado para evitar ativação acidental
      },
    }),
    useSensor(KeyboardSensor)
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header da Pipeline */}
      <BlurFade delay={0.05}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBackToList} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{viewingPipeline.name}</h1>
              <p className="text-muted-foreground">{viewingPipeline.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => onEditPipeline(viewingPipeline)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar Pipeline
            </Button>
            <ShimmerButton onClick={onAddLead} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Oportunidade
            </ShimmerButton>
          </div>
        </div>
      </BlurFade>

      {/* Métricas */}
      <BlurFade delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AnimatedCard delay={0.1}>
            <CardHeader className="pb-2">
              <CardDescription>Total de Leads</CardDescription>
              <CardTitle className="text-2xl">{pipelineMetrics?.totalLeads || 0}</CardTitle>
            </CardHeader>
          </AnimatedCard>
          <AnimatedCard delay={0.15}>
            <CardHeader className="pb-2">
              <CardDescription>Leads Ativos</CardDescription>
              <CardTitle className="text-2xl text-blue-600">{pipelineMetrics?.totalLeads || 0}</CardTitle>
            </CardHeader>
          </AnimatedCard>
          <AnimatedCard delay={0.2}>
            <CardHeader className="pb-2">
              <CardDescription>Taxa de Conversão</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {pipelineMetrics?.conversionRate 
                  ? `${pipelineMetrics.conversionRate.toFixed(1)}%`
                  : '0.0%'
                }
              </CardTitle>
            </CardHeader>
          </AnimatedCard>
          <AnimatedCard delay={0.25}>
            <CardHeader className="pb-2">
              <CardDescription>Valor Total</CardDescription>
              <CardTitle className="text-2xl text-purple-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(pipelineMetrics?.averageDealValue || 0)}
              </CardTitle>
            </CardHeader>
          </AnimatedCard>
        </div>
      </BlurFade>

      {/* Kanban Board */}
      <BlurFade delay={0.2}>
        <DndContext
          sensors={sensors}
          onDragStart={dragDropManager.handleDragStart}
          onDragEnd={dragDropManager.handleDragEnd}
        >
          <PipelineKanbanBoard
            pipeline={viewingPipeline}
            leads={leads}
            onEdit={onEditLead}
            onView={onEditLead}
            isDragging={dragDropManager.isDragging}
            activeId={dragDropManager.activeId}
          />
        </DndContext>
      </BlurFade>
    </div>
  );
};

export default PipelineKanbanView; 