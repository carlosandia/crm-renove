import React from 'react';
import { Pipeline } from '../../../types/Pipeline';
import { User } from '../../../types/User';
import { BlurFade } from '../../ui/blur-fade';
import { ShimmerButton } from '../../ui/shimmer-button';
import ModernPipelineList from '../ModernPipelineList';
import { Plus } from 'lucide-react';

export interface PipelineListViewProps {
  adminPipelines: Pipeline[];
  availableMembers: User[];
  loading: boolean;
  onCreatePipeline: () => void;
  onEditPipeline: (pipeline: Pipeline) => void;
  onViewPipeline: (pipeline: Pipeline) => void;
  onDeletePipeline?: (pipelineId: string) => void;
}

export const PipelineListView: React.FC<PipelineListViewProps> = ({
  adminPipelines,
  availableMembers,
  loading,
  onCreatePipeline,
  onEditPipeline,
  onViewPipeline,
  onDeletePipeline
}) => {
  // Função de fallback para delete se não fornecida
  const handleDeletePipeline = onDeletePipeline || (() => {
    console.log('Delete pipeline não implementado');
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header da Lista */}
      <BlurFade delay={0.05}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Pipelines</h1>
            <p className="text-muted-foreground">
              Gerencie suas pipelines de vendas e acompanhe o desempenho das equipes
            </p>
          </div>
          <ShimmerButton onClick={onCreatePipeline} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Pipeline
          </ShimmerButton>
        </div>
      </BlurFade>

      {/* Lista de Pipelines */}
      <BlurFade delay={0.1}>
        <ModernPipelineList
          pipelines={adminPipelines}
          members={availableMembers}
          loading={loading}
          onCreatePipeline={onCreatePipeline}
          onEditPipeline={onEditPipeline}
          onViewPipeline={onViewPipeline}
          onDeletePipeline={handleDeletePipeline}
        />
      </BlurFade>
    </div>
  );
};

export default PipelineListView; 